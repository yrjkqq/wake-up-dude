import { GoogleGenAI } from '@google/genai';
import { Buffer } from 'node:buffer';

export interface Env {
  WAKE_UP_DUDE_KV: KVNamespace;
  GEMINI_API_KEY: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Handle CORS preflight (Crucial for mobile apps & web interfaces)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      // 2. Security Layer: IP Rate Limiting via KV
      const ip = request.headers.get("cf-connecting-ip") || "unknown_ip";
      const date = new Date().toISOString().split('T')[0];
      const kvKey = `rate_limit_${ip}_${date}`;
      
      let count = parseInt((await env.WAKE_UP_DUDE_KV.get(kvKey)) || "0", 10);
      if (count >= 3) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Daily limit exceeded! Free tier allows 3 generations per day to protect server costs." 
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 3. Payload parsing
      const body = await request.json() as any;
      const { time, persona, textModel, ttsModel } = body;

      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured on edge' }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const activePersona = persona || '毒舌监督员';
      const activeTextModel = textModel || 'gemini-3.1-pro-preview';
      const activeTtsModel = ttsModel || 'gemini-2.5-pro-preview-tts';
      
      let personaPrompt = '你是一个毒舌监督员。你的任务是用极其简短、一针见血的话语叫醒用户。风格要严厉、有压迫感。';
      if (activePersona.includes('温柔女友')) {
        personaPrompt = '你是一个温柔且极具魅力的同居女友。你的任务是用甜美、性感、带一点暧昧和撒娇的语气叫醒身边的男朋友。话语要极具诱惑力和私密感，偶尔可以有点小调皮，让他听了瞬间耳根发软、充满起床的动力。千万不要端着，要像真正的热恋情侣一样亲昵。';
      } else if (activePersona.includes('军训教官')) {
        personaPrompt = '你是一个军训教官。你的任务是用硬核、命令式的话语叫醒用户，让他们立刻行动。';
      }

      const prompt = `${personaPrompt}\n当前闹钟设定的时间是：${time}。\n请结合这个时间，生成一段流畅生动的早晨问候或催促，必须适合大声朗读。字数保持在 150 字左右（大约能读 30 秒），根据你的人设自由发挥，可以带点情绪或幽默。直接输出你需要开口说的话。千万不要带有任何多余的解释、也不要有动作神态描写，只要纯粹的对白文本。`;

      // 4. Request Layer: Text Generation
      const textResponse = await ai.models.generateContent({
        model: activeTextModel,
        contents: prompt,
      });
      const alarmText = textResponse.text || 'Wake up dude!';

      // 5. Synthesis Layer: Voice Generation
      const ttsResponse = await ai.models.generateContent({
        model: activeTtsModel,
        contents: alarmText,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                // Correctly matches female/male preset logic
                voiceName: activePersona.includes('温柔女友') ? 'Aoede' : 'Puck',
              },
            },
          },
        },
      });

      const candidate = ttsResponse.candidates?.[0];
      if (!candidate) throw new Error('No candidate returned from TTS API');
      const audioPart = candidate.content?.parts?.find(p => p.inlineData != null);
      if (!audioPart || !audioPart.inlineData) throw new Error('TTS response did not contain audio inlineData');

      // 6. Audio Hex Processing (Serverless Buffer)
      const rawPcmBase64 = audioPart.inlineData.data || '';
      const pcmBuffer = Buffer.from(rawPcmBase64, 'base64');
      const wavBuffer = Buffer.concat([createWavHeader(pcmBuffer.length), pcmBuffer]);
      const finalBase64 = wavBuffer.toString('base64');

      // 7. Atomic Write: Update Rate Limit async (WaitUntil runs in background, doesn't block response TTFB)
      ctx.waitUntil(env.WAKE_UP_DUDE_KV.put(kvKey, (count + 1).toString(), { expirationTtl: 86400 }));

      return new Response(JSON.stringify({
        success: true,
        text: alarmText,
        audioBase64: finalBase64
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: String(e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};

// 8. Low-level Node.js Polyfill Audio processing
function createWavHeader(pcmLength: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24); // Sample rate natively used by Google Voice
  header.writeUInt32LE(24000 * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmLength, 40);
  return header;
}
