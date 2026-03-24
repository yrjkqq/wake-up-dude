const fs = require('fs');
const path = require('path');

// Generate a 2-second alarm beep WAV (440Hz + 880Hz alternating)
const sampleRate = 44100;
const duration = 2;
const numSamples = sampleRate * duration;
const amplitude = 16000;

const samples = Buffer.alloc(numSamples * 2);
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const on = (t % 0.3) < 0.2;
  let val = 0;
  if (on) {
    val = Math.round(
      amplitude * (0.7 * Math.sin(2 * Math.PI * 440 * t) + 0.3 * Math.sin(2 * Math.PI * 880 * t))
    );
  }
  val = Math.max(-32768, Math.min(32767, val));
  samples.writeInt16LE(val, i * 2);
}

const dataSize = numSamples * 2;
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataSize, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);       // PCM
header.writeUInt16LE(1, 22);       // mono
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);       // block align
header.writeUInt16LE(16, 34);      // bits per sample
header.write('data', 36);
header.writeUInt32LE(dataSize, 40);

const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'test-alarm.wav');
fs.writeFileSync(outPath, Buffer.concat([header, samples]));
console.log(`Generated: ${outPath} (${header.length + samples.length} bytes)`);
