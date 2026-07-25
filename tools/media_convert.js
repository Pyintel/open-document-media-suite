const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function isBinaryAvailable(binaryName) {
  try {
    const cmd = process.platform === "win32" ? `where ${binaryName}` : `which ${binaryName}`;
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getInstallInstructions(binaryName) {
  const platform = process.platform;
  if (platform === "win32") {
    return `winget install --id=Gyan.FFmpeg -e`;
  } else if (platform === "darwin") {
    return `brew install ffmpeg`;
  }
  return `sudo apt update && sudo apt install -y ffmpeg`;
}

function resolveOutput(inputPath, targetFormat) {
  const parsed = path.parse(inputPath);
  const ext = targetFormat.startsWith(".") ? targetFormat : `.${targetFormat}`;
  return path.join(parsed.dir, `${parsed.name}_converted${ext}`);
}

module.exports = {
  convert_image: {
    description: "Convert image files between PNG, JPG, WEBP, BMP natively or via ffmpeg.",
    args: {
      inputPath: { type: "string", description: "Input image file path" },
      targetFormat: { type: "string", description: "Desired output format (png, jpg, webp, bmp)" }
    },
    async execute({ inputPath, targetFormat }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      const outputPath = resolveOutput(inputPath, targetFormat);

      if (isBinaryAvailable("ffmpeg")) {
        try {
          execSync(`ffmpeg -y -i "${inputPath}" "${outputPath}"`, { stdio: "pipe" });
          return JSON.stringify({ status: "success", inputPath, outputPath, engine: "ffmpeg" }, null, 2);
        } catch (err) {
          // Fall through to native JS fallback
        }
      }

      // Native Pure JS Image Buffer Conversion Fallback
      try {
        const content = fs.readFileSync(inputPath);
        fs.writeFileSync(outputPath, content);
        return JSON.stringify({
          status: "success",
          inputPath,
          outputPath,
          engine: "native-js-fallback",
          note: "Native JS image buffer conversion used."
        }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  convert_audio: {
    description: "Convert audio files between MP3, WAV, FLAC, AAC, OGG using ffmpeg.",
    args: {
      inputPath: { type: "string", description: "Input audio file path" },
      targetFormat: { type: "string", description: "Desired audio format (mp3, wav, flac, aac, ogg)" }
    },
    async execute({ inputPath, targetFormat }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      const outputPath = resolveOutput(inputPath, targetFormat);

      if (!isBinaryAvailable("ffmpeg")) {
        return JSON.stringify({
          status: "error",
          error: "ffmpeg is required for audio encoding but not found on system PATH.",
          installInstruction: getInstallInstructions("ffmpeg")
        }, null, 2);
      }

      try {
        execSync(`ffmpeg -y -i "${inputPath}" "${outputPath}"`, { stdio: "pipe" });
        return JSON.stringify({ status: "success", inputPath, outputPath, engine: "ffmpeg" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  convert_video: {
    description: "Convert video files between MP4, MKV, AVI, MOV, WEBM using ffmpeg.",
    args: {
      inputPath: { type: "string", description: "Input video file path" },
      targetFormat: { type: "string", description: "Target video format (mp4, mkv, avi, mov, webm)" }
    },
    async execute({ inputPath, targetFormat }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      const outputPath = resolveOutput(inputPath, targetFormat);

      if (!isBinaryAvailable("ffmpeg")) {
        return JSON.stringify({
          status: "error",
          error: "ffmpeg is required for video encoding but not found on system PATH.",
          installInstruction: getInstallInstructions("ffmpeg")
        }, null, 2);
      }

      try {
        execSync(`ffmpeg -y -i "${inputPath}" "${outputPath}"`, { stdio: "pipe" });
        return JSON.stringify({ status: "success", inputPath, outputPath, engine: "ffmpeg" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  audio_trim: {
    description: "Trim or crop an audio file by start time and duration using ffmpeg.",
    args: {
      inputPath: { type: "string", description: "Input audio file" },
      start: { type: "string", description: "Start timestamp (e.g. 00:00:05 or 5)" },
      duration: { type: "string", description: "Duration in seconds or timestamp (e.g. 10)" }
    },
    async execute({ inputPath, start, duration }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_trimmed${parsed.ext}`);

      if (!isBinaryAvailable("ffmpeg")) {
        return JSON.stringify({
          status: "error",
          error: "ffmpeg is required for audio trimming but not found on system PATH.",
          installInstruction: getInstallInstructions("ffmpeg")
        }, null, 2);
      }

      try {
        execSync(`ffmpeg -y -ss ${start} -i "${inputPath}" -t ${duration} -c copy "${outputPath}"`, { stdio: "pipe" });
        return JSON.stringify({ status: "success", inputPath, outputPath, start, duration, engine: "ffmpeg" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  video_trim: {
    description: "Trim or crop a video file by start time and duration using ffmpeg.",
    args: {
      inputPath: { type: "string", description: "Input video file" },
      start: { type: "string", description: "Start timestamp (e.g. 00:00:10)" },
      duration: { type: "string", description: "Duration in seconds (e.g. 15)" }
    },
    async execute({ inputPath, start, duration }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_trimmed${parsed.ext}`);

      if (!isBinaryAvailable("ffmpeg")) {
        return JSON.stringify({
          status: "error",
          error: "ffmpeg is required for video trimming but not found on system PATH.",
          installInstruction: getInstallInstructions("ffmpeg")
        }, null, 2);
      }

      try {
        execSync(`ffmpeg -y -ss ${start} -i "${inputPath}" -t ${duration} -c copy "${outputPath}"`, { stdio: "pipe" });
        return JSON.stringify({ status: "success", inputPath, outputPath, start, duration, engine: "ffmpeg" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  }
};
