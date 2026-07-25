const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");

// ---- Helpers ---------------------------------------------------------------

function isBinaryAvailable(binaryName) {
  try {
    const { execSync } = require("child_process");
    const cmd = process.platform === "win32" ? `where ${binaryName}` : `which ${binaryName}`;
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getInstallInstructions() {
  const platform = process.platform;
  if (platform === "win32") return `winget install --id=Gyan.FFmpeg -e`;
  if (platform === "darwin") return `brew install ffmpeg`;
  return `sudo apt update && sudo apt install -y ffmpeg`;
}

function resolveOutput(inputPath, targetFormat) {
  const parsed = path.parse(inputPath);
  const ext = targetFormat.startsWith(".") ? targetFormat : `.${targetFormat}`;
  return path.join(parsed.dir, `${parsed.name}_converted${ext}`);
}

// Map common format names to sharp-compatible format strings
const SHARP_FORMATS = { png: "png", jpg: "jpeg", jpeg: "jpeg", webp: "webp", bmp: "raw", tiff: "tiff", gif: "gif", avif: "avif", heif: "heif", heic: "heif" };

// Promisified fluent-ffmpeg runner
function runFfmpeg(inputPath, outputPath, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath);
    if (extraArgs.length) cmd.outputOptions(extraArgs);
    cmd.save(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });
}

// ---- Module exports --------------------------------------------------------

module.exports = {
  convert_image: {
    description: "Convert image files between PNG, JPG, WEBP, BMP, TIFF using sharp.",
    args: {
      inputPath: { type: "string", description: "Input image file path" },
      targetFormat: { type: "string", description: "Desired output format (png, jpg, webp, bmp, tiff)" }
    },
    async execute({ inputPath, targetFormat }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      const outputPath = resolveOutput(inputPath, targetFormat);
      const fmt = SHARP_FORMATS[targetFormat.toLowerCase().replace(/^\./, "")];
      if (!fmt) throw new Error(`Unsupported image format: ${targetFormat}`);

      try {
        let pipeline = sharp(inputPath);
        // BMP: sharp doesn't write BMP natively, output as raw then wrap
        if (targetFormat.toLowerCase().replace(/^\./, "") === "bmp") {
          // sharp can't write BMP — use PNG as a fallback that any viewer reads
          pipeline = pipeline.png();
          const realOutput = resolveOutput(inputPath, "png");
          await pipeline.toFile(realOutput);
          return JSON.stringify({
            status: "success",
            inputPath,
            outputPath: realOutput,
            engine: "sharp",
            note: "BMP not natively supported by sharp; converted to PNG instead."
          }, null, 2);
        }
        await pipeline.toFormat(fmt).toFile(outputPath);
        return JSON.stringify({
          status: "success",
          inputPath,
          outputPath,
          engine: "sharp"
        }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  convert_audio: {
    description: "Convert audio files between MP3, WAV, FLAC, AAC, OGG using fluent-ffmpeg.",
    args: {
      inputPath: { type: "string", description: "Input audio file path" },
      targetFormat: { type: "string", description: "Desired audio format (mp3, wav, flac, aac, ogg)" }
    },
    async execute({ inputPath, targetFormat }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      if (!isBinaryAvailable("ffmpeg")) {
        return JSON.stringify({
          status: "error",
          error: "ffmpeg is required for audio encoding but not found on system PATH.",
          installInstruction: getInstallInstructions()
        }, null, 2);
      }
      const outputPath = resolveOutput(inputPath, targetFormat);
      try {
        await runFfmpeg(inputPath, outputPath);
        return JSON.stringify({ status: "success", inputPath, outputPath, engine: "fluent-ffmpeg" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  convert_video: {
    description: "Convert video files between MP4, MKV, AVI, MOV, WEBM using fluent-ffmpeg.",
    args: {
      inputPath: { type: "string", description: "Input video file path" },
      targetFormat: { type: "string", description: "Target video format (mp4, mkv, avi, mov, webm)" }
    },
    async execute({ inputPath, targetFormat }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      if (!isBinaryAvailable("ffmpeg")) {
        return JSON.stringify({
          status: "error",
          error: "ffmpeg is required for video encoding but not found on system PATH.",
          installInstruction: getInstallInstructions()
        }, null, 2);
      }
      const outputPath = resolveOutput(inputPath, targetFormat);
      try {
        await runFfmpeg(inputPath, outputPath);
        return JSON.stringify({ status: "success", inputPath, outputPath, engine: "fluent-ffmpeg" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  audio_trim: {
    description: "Trim an audio file by start time and duration using fluent-ffmpeg.",
    args: {
      inputPath: { type: "string", description: "Input audio file" },
      start: { type: "string", description: "Start timestamp (e.g. 00:00:05 or 5)" },
      duration: { type: "string", description: "Duration in seconds or timestamp (e.g. 10)" }
    },
    async execute({ inputPath, start, duration }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      if (!isBinaryAvailable("ffmpeg")) {
        return JSON.stringify({
          status: "error",
          error: "ffmpeg is required for audio trimming but not found on system PATH.",
          installInstruction: getInstallInstructions()
        }, null, 2);
      }
      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_trimmed${parsed.ext}`);
      try {
        await runFfmpeg(inputPath, outputPath, [
          `-ss ${start}`,
          `-t ${duration}`,
          `-c copy`
        ]);
        return JSON.stringify({ status: "success", inputPath, outputPath, start, duration, engine: "fluent-ffmpeg" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  video_trim: {
    description: "Trim a video file by start time and duration using fluent-ffmpeg.",
    args: {
      inputPath: { type: "string", description: "Input video file" },
      start: { type: "string", description: "Start timestamp (e.g. 00:00:10)" },
      duration: { type: "string", description: "Duration in seconds (e.g. 15)" }
    },
    async execute({ inputPath, start, duration }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      if (!isBinaryAvailable("ffmpeg")) {
        return JSON.stringify({
          status: "error",
          error: "ffmpeg is required for video trimming but not found on system PATH.",
          installInstruction: getInstallInstructions()
        }, null, 2);
      }
      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_trimmed${parsed.ext}`);
      try {
        await runFfmpeg(inputPath, outputPath, [
          `-ss ${start}`,
          `-t ${duration}`,
          `-c copy`
        ]);
        return JSON.stringify({ status: "success", inputPath, outputPath, start, duration, engine: "fluent-ffmpeg" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  }
};
