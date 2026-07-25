const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = {
  pdf_merge: {
    description: "Merge multiple PDF documents into a single output file using qpdf or pdftk.",
    args: {
      files: { type: "array", description: "Array of PDF file paths to merge" },
      outputPath: { type: "string", description: "Output path for merged PDF file" }
    },
    async execute({ files, outputPath }) {
      const missing = files.filter(f => !fs.existsSync(f));
      if (missing.length > 0) {
        throw new Error(`Missing PDF files: ${missing.join(", ")}`);
      }
      const quoted = files.map(f => `"${f}"`).join(" ");
      const cmd = `qpdf --empty --pages ${quoted} -- "${outputPath}"`;
      try {
        execSync(cmd, { stdio: "pipe" });
        return JSON.stringify({ status: "success", merged: files, outputPath, tool: "qpdf" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message, cmd }, null, 2);
      }
    }
  },

  pdf_split: {
    description: "Extract page ranges from a PDF document into a new PDF using qpdf.",
    args: {
      inputPath: { type: "string", description: "Path to input PDF file" },
      ranges: { type: "string", description: "Page ranges (e.g. 1-3 or 5)" }
    },
    async execute({ inputPath, ranges }) {
      if (!fs.existsSync(inputPath)) {
        throw new Error(`File not found: ${inputPath}`);
      }
      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_split.pdf`);
      const cmd = `qpdf "${inputPath}" --pages . ${ranges} -- "${outputPath}"`;
      try {
        execSync(cmd, { stdio: "pipe" });
        return JSON.stringify({ status: "success", inputPath, outputPath, ranges, tool: "qpdf" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message, cmd }, null, 2);
      }
    }
  },

  pdf_rotate: {
    description: "Rotate pages in a PDF document using qpdf.",
    args: {
      inputPath: { type: "string", description: "Path to input PDF file" },
      degrees: { type: "number", description: "Rotation degrees (+90, +180, +270)" }
    },
    async execute({ inputPath, degrees }) {
      if (!fs.existsSync(inputPath)) {
        throw new Error(`File not found: ${inputPath}`);
      }
      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_rotated.pdf`);
      const cmd = `qpdf "${inputPath}" --rotate=+${degrees} "${outputPath}"`;
      try {
        execSync(cmd, { stdio: "pipe" });
        return JSON.stringify({ status: "success", inputPath, outputPath, degrees, tool: "qpdf" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message, cmd }, null, 2);
      }
    }
  },

  markdown_to_pdf: {
    description: "Convert a Markdown document into a formatted PDF file using pandoc.",
    args: {
      markdownPath: { type: "string", description: "Path to input markdown file" },
      outputPath: { type: "string", description: "Output PDF file path" }
    },
    async execute({ markdownPath, outputPath }) {
      if (!fs.existsSync(markdownPath)) {
        throw new Error(`File not found: ${markdownPath}`);
      }
      const cmd = `pandoc "${markdownPath}" -o "${outputPath}"`;
      try {
        execSync(cmd, { stdio: "pipe" });
        return JSON.stringify({ status: "success", markdownPath, outputPath, tool: "pandoc" }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message, cmd }, null, 2);
      }
    }
  }
};
