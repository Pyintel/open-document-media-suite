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

// Generate PCM WAV audio with custom frequency (Hz) or random noise
function createCustomWavBuffer(freq = 440, durationSec = 1) {
  const sampleRate = 8000;
  const numSamples = sampleRate * durationSec;
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
    if (freq === 0) {
      // White noise generator
      buf.writeUInt8(Math.floor(Math.random() * 256), headerSize + i);
    } else {
      // Sine wave oscillator at specific frequency
      const val = 128 + Math.floor(127 * Math.sin((i / sampleRate) * freq * 2 * Math.PI));
      buf.writeUInt8(val, headerSize + i);
    }
  }
  return buf;
}

// Generate valid BMP image buffer with solid RGB color (width x height)
function createSolidBmpBuffer(width, height, red, green, blue) {
  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const pixelDataSize = width * height * 3;
  const fileSize = fileHeaderSize + infoHeaderSize + pixelDataSize;

  const buf = Buffer.alloc(fileSize);

  // File Header
  buf.write("BM", 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(fileHeaderSize + infoHeaderSize, 10);

  // Info Header
  buf.writeUInt32LE(infoHeaderSize, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26); // Planes
  buf.writeUInt16LE(24, 28); // Bits per pixel (24-bit RGB)
  buf.writeUInt32LE(pixelDataSize, 34);

  // Pixel Data (BGR format)
  let offset = fileHeaderSize + infoHeaderSize;
  for (let i = 0; i < width * height; i++) {
    buf.writeUInt8(blue, offset++);
    buf.writeUInt8(green, offset++);
    buf.writeUInt8(red, offset++);
  }

  return buf;
}

function prepareFixtures(fixDir) {
  if (!fs.existsSync(fixDir)) fs.mkdirSync(fixDir, { recursive: true });

  const hasFfmpeg = isBinaryAvailable("ffmpeg");

  // 1. Official Sample Document 1
  const doc1Path = path.join(fixDir, "sample_doc_1.md");
  fs.writeFileSync(doc1Path, `# Sample Document 1: Executive Technical Report

**Organization:** Pyintel Open Ecosystem  
**Document ID:** PYINTEL-DOC-001  
**Status:** Approved & Verified  

## Executive Summary
This document serves as the official sample asset for verifying native document generation and PDF rendering within Apex Arc.

### System Specifications
- **Core Architecture:** Autonomous AI Agent & Harness
- **Vector Search Engine:** SQLite Vector Embeddings
- **Media Engine:** Zero-Dependency Native JS & FFmpeg Acceleration
`);

  // 2. Official Sample Document 2
  const doc2Path = path.join(fixDir, "sample_doc_2.md");
  fs.writeFileSync(doc2Path, `# Sample Document 2: Architecture & Kinematics Specification

**Organization:** Pyintel Open Ecosystem  
**Document ID:** PYINTEL-DOC-002  
**Status:** In Review  

## Technical Overview
Detailed architectural specifications for hardware toolchains, ROS 2 robotics simulation, and multi-format media conversion.
`);

  // 3. Vibrant Colors Image Assets (Vibrant RED, Vibrant GREEN, Vibrant BLUE)
  const redBmpPath = path.join(fixDir, "sample_red.bmp");
  const greenBmpPath = path.join(fixDir, "sample_green.bmp");
  const blueBmpPath = path.join(fixDir, "sample_blue.bmp");

  fs.writeFileSync(redBmpPath, createSolidBmpBuffer(16, 16, 255, 0, 0));     // Pure Red
  fs.writeFileSync(greenBmpPath, createSolidBmpBuffer(16, 16, 0, 255, 0));   // Pure Green
  fs.writeFileSync(blueBmpPath, createSolidBmpBuffer(16, 16, 0, 0, 255));    // Pure Blue

  // PNG Base Fixture (Red 1x1)
  const pngPath = path.join(fixDir, "sample.png");
  if (!fs.existsSync(pngPath)) {
    const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    fs.writeFileSync(pngPath, Buffer.from(pngBase64, "base64"));
  }

  // 4. Audio Assets with Distinct Frequencies & White Noise
  const audio440Path = path.join(fixDir, "sample_audio_440hz.wav");  // 440Hz A4 Tone
  const audio880Path = path.join(fixDir, "sample_audio_880hz.wav");  // 880Hz A5 Tone
  const audioNoisePath = path.join(fixDir, "sample_audio_noise.wav"); // Random White Noise

  fs.writeFileSync(audio440Path, createCustomWavBuffer(440, 1));
  fs.writeFileSync(audio880Path, createCustomWavBuffer(880, 1));
  fs.writeFileSync(audioNoisePath, createCustomWavBuffer(0, 1));

  // Base WAV
  const wavPath = path.join(fixDir, "sample.wav");
  if (!fs.existsSync(wavPath)) {
    fs.writeFileSync(wavPath, createCustomWavBuffer(440, 1));
  }

  // 5. Video Container Fixture
  const mp4Path = path.join(fixDir, "sample.mp4");
  if (!fs.existsSync(mp4Path) && hasFfmpeg) {
    try {
      execSync(`ffmpeg -y -f lavfi -i testsrc=duration=1:size=160x120:rate=1 "${mp4Path}"`, { stdio: "ignore" });
    } catch (e) {
      fs.writeFileSync(mp4Path, Buffer.from("AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1XA==", "base64"));
    }
  }

  // 6. DOCX & PPTX Mock XML Structures
  const docxPath = path.join(fixDir, "sample.docx");
  if (!fs.existsSync(docxPath)) {
    fs.writeFileSync(docxPath, "word/document.xml <w:t>Pyintel Official Sample Document 1 Text</w:t>");
  }

  const pptxPath = path.join(fixDir, "sample.pptx");
  if (!fs.existsSync(pptxPath)) {
    fs.writeFileSync(pptxPath, "ppt/slides/slide1.xml <a:t>Pyintel Official Presentation Slide 1 Text</a:t>");
  }

  return { hasFfmpeg };
}

module.exports = { prepareFixtures, isBinaryAvailable, createCustomWavBuffer, createSolidBmpBuffer };
