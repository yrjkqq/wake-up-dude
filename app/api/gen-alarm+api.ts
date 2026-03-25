import { GoogleGenAI } from '@google/genai';

function getWavHeader(dataLength: number, sampleRate: number = 24000, numChannels: number = 1, bitDepth: number = 16): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28); // ByteRate
  header.writeUInt16LE(numChannels * (bitDepth / 8), 32); // BlockAlign
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { time, persona, textModel, ttsModel } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'Server missing GEMINI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Ensure we have some defaults
    const activePersona = persona || '毒舌监督员';
    const activeTextModel = textModel || 'gemini-3.1-pro-preview';
    const activeTtsModel = ttsModel || 'gemini-2.5-pro-preview-tts';
    
    let personaPrompt = '你是一个毒舌监督员。你的任务是用极其简短、一针见血的话语叫醒用户。风格要严厉、有压迫感。';
    if (activePersona.includes('温柔女友')) {
      personaPrompt = '你是一个温柔且极具魅力的同居女友。你的任务是用甜美、性感、带一点暧昧和撒娇的语气叫醒身边的男朋友。话语要极具诱惑力和私密感，偶尔可以有点小调皮，让他听了瞬间耳根发软、充满起床的动力。千万不要端着，要像真正的热恋情侣一样亲昵。';
    } else if (activePersona.includes('军训教官')) {
      personaPrompt = '你是一个军训教官。你的任务是用硬核、命令式的话语叫醒用户，让他们立刻行动。';
    }
    
    console.log(`[API] Received Persona: "${activePersona}" => Selected Prompt:`, personaPrompt.substring(0, 15) + '...');

    const prompt = `
${personaPrompt}

当前闹钟设定的时间是：${time}。
请结合这个时间，生成一段流畅生动的早晨问候或催促，必须适合大声朗读。
字数保持在 150 字左右（大约能读 30 秒），根据你的人设自由发挥，可以带点情绪或幽默。
直接输出你需要开口说的话。千万不要带有任何多余的解释、也不要有动作神态描写（比如：*叹气*、*走向你*），只要纯粹的对白文本。`;

    console.log(`[API] Step 1: Requesting ${activeTextModel} for text generation...`);
    
    // Call Gemini 3.1 Pro for supreme TEXT generation
    const textResponse = await ai.models.generateContent({
      model: activeTextModel,
      contents: prompt,
    });
    
    const alarmText = textResponse.text || 'Wake up dude!';
    console.log('[API] Generated Text: ', alarmText);

    console.log(`[API] Step 2: Converting text to audio using ${activeTtsModel}...`);
    
    // Call Pro TTS preview model for audio generation
    const ttsResponse = await ai.models.generateContent({
      model: activeTtsModel,
      contents: alarmText,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: activePersona.includes('温柔女友') ? 'Aoede' : 'Puck',
            },
          },
        },
      },
    });

    // Extract Audio Buffer from multi-part response
    const candidate = ttsResponse.candidates?.[0];
    if (!candidate) {
      throw new Error('No candidate returned from TTS API');
    }

    const audioPart = candidate.content?.parts?.find(p => p.inlineData != null);
    if (!audioPart || !audioPart.inlineData) {
      console.error('Candidate format:', JSON.stringify(candidate, null, 2));
      throw new Error('TTS response did not contain audio inlineData');
    }

    // The Gemini TTS returns raw PCM string without a header
    const rawPcmBase64 = audioPart.inlineData.data || '';

    // Convert raw PCM Base64 to a valid .wav Buffer by appending the 44-byte RIFF header
    const pcmBuffer = Buffer.from(rawPcmBase64, 'base64');
    const wavHeader = getWavHeader(pcmBuffer.length, 24000, 1, 16);
    const fullWavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
    
    // Send valid WAV Base64 to frontend
    const base64Audio = fullWavBuffer.toString('base64');

    return Response.json({
      success: true,
      audioBase64: base64Audio,
      text: alarmText,
    });
  } catch (error: any) {
    console.error('[API] Gemini error:', error);
    return Response.json(
      { error: error.message || 'Unknown server error' },
      { status: 500 }
    );
  }
}
