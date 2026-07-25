const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function isBinaryAvailable(binaryName) {
  try {
    const cmd = process.platform === "win32" ? `where ${binaryName}` : `which ${binaryName}`;
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Generate a valid 1-second PCM WAV file natively in Node.js (no dependencies needed)
function createValidWavBuffer() {
  const sampleRate = 8000;
  const numSamples = 8000;
  const headerSize = 44;
  const buf = Buffer.alloc(headerSize + numSamples);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + numSamples, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // Mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(numSamples, 40);

  for (let i = 0; i < numSamples; i++) {
    buf.writeUInt8(128 + Math.floor(127 * Math.sin((i / sampleRate) * 440 * 2 * Math.PI)), headerSize + i);
  }
  return buf;
}

function prepareFixtures(fixDir) {
  if (!fs.existsSync(fixDir)) fs.mkdirSync(fixDir, { recursive: true });

  const hasFfmpeg = isBinaryAvailable("ffmpeg");

  // 1. Markdown
  const mdPath = path.join(fixDir, "sample.md");
  if (!fs.existsSync(mdPath)) {
    fs.writeFileSync(mdPath, "# Test Document\n\nPyintel test content for conversion.");
  }

  // 2. 1x1 PNG Image
  const pngPath = path.join(fixDir, "sample.png");
  if (!fs.existsSync(pngPath)) {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    fs.writeFileSync(pngPath, Buffer.from(pngBase64, "base64"));
  }

  // 3. Audio WAV
  const wavPath = path.join(fixDir, "sample.wav");
  if (!fs.existsSync(wavPath)) {
    fs.writeFileSync(wavPath, createValidWavBuffer());
  }

  // 4. Video MP4 (Requires FFmpeg for valid container)
  const mp4Path = path.join(fixDir, "sample.mp4");
  if (!fs.existsSync(mp4Path) && hasFfmpeg) {
    try {
      execSync(`ffmpeg -y -f lavfi -i testsrc=duration=1:size=160x120:rate=1 "${mp4Path}"`, { stdio: "ignore" });
    } catch (e) {
      // Fallback dummy container if exec fails
      fs.writeFileSync(mp4Path, Buffer.from("AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1XA==", "base64"));
    }
  }

  // 5. DOCX & PPTX Mock XML Structures
  const docxPath = path.join(fixDir, "sample.docx");
  if (!fs.existsSync(docxPath)) {
    fs.writeFileSync(docxPath, "word/document.xml <w:t>Pyintel Real Word Document Content</w:t>");
  }

  const pptxPath = path.join(fixDir, "sample.pptx");
  if (!fs.existsSync(pptxPath)) {
    fs.writeFileSync(pptxPath, "ppt/slides/slide1.xml <a:t>Pyintel Real PowerPoint Slide Content</a:t>");
  }

  return { hasFfmpeg };
}

module.exports = { prepareFixtures, isBinaryAvailable };
