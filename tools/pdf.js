const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { PDFDocument: PDFLibDoc } = require("pdf-lib");
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

// Helper: word-wrap text to fit a given width
function wrapText(doc, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (doc.widthOfString(test) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

module.exports = {
  markdown_to_pdf: {
    description: "Convert a Markdown document into a PDF document using pdfkit.",
    args: {
      markdownPath: { type: "string", description: "Input markdown file path" },
      outputPath: { type: "string", description: "Output PDF file path" }
    },
    async execute({ markdownPath, outputPath }) {
      if (!fs.existsSync(markdownPath)) throw new Error(`File not found: ${markdownPath}`);
      const text = fs.readFileSync(markdownPath, "utf8");

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 72, size: "LETTER" });
        const chunks = [];
        doc.on("data", (c) => chunks.push(c));
        doc.on("end", () => {
          const buf = Buffer.concat(chunks);
          fs.writeFileSync(outputPath, buf);
          resolve(JSON.stringify({
            status: "success",
            markdownPath,
            outputPath,
            sizeBytes: buf.length,
            engine: "pdfkit"
          }, null, 2));
        });
        doc.on("error", reject);

        // Strip markdown formatting for plain-text rendering
        const plain = text
          .replace(/```[\s\S]*?```/g, "")
          .replace(/`([^`]+)`/g, "$1")
          .replace(/^#{1,6}\s+/gm, "")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/^>\s+/gm, "")
          .replace(/^[-*]\s+/gm, "  • ")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .trim();

        const lines = plain.split(/\r?\n/);
        const maxWidth = 468; // 612 - 2*72 margins

        for (const line of lines) {
          const wrapped = doc.widthOfString(line) <= maxWidth
            ? [line]
            : wrapText(doc, line, maxWidth);
          for (const w of wrapped) {
            doc.text(w, { width: maxWidth });
          }
          doc.moveDown(0.3);
        }

        doc.end();
      });
    }
  },

  pdf_search: {
    description: "Search for text strings inside a PDF document using pdfjs-dist.",
    args: {
      inputPath: { type: "string", description: "Path to PDF file" },
      query: { type: "string", description: "Text query to search for" }
    },
    async execute({ inputPath, query }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      try {
        const buffer = fs.readFileSync(inputPath);
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
        const doc = await loadingTask.promise;
        let fullText = "";
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
        }
        const lowerText = fullText.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const found = lowerText.includes(lowerQuery);

        let context = "";
        if (found) {
          const idx = lowerText.indexOf(lowerQuery);
          const start = Math.max(0, idx - 50);
          const end = Math.min(fullText.length, idx + query.length + 50);
          context = fullText.substring(start, end);
        }

        return JSON.stringify({
          status: "success",
          inputPath,
          query,
          found,
          snippet: found ? `...${context}...` : "No matches found.",
          engine: "pdfjs-dist"
        }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  pdf_merge: {
    description: "Merge multiple PDF documents into a single PDF using pdf-lib.",
    args: {
      files: { type: "array", description: "Array of PDF file paths to merge" },
      outputPath: { type: "string", description: "Output PDF file path for merged PDF" }
    },
    async execute({ files, outputPath }) {
      const missing = files.filter(f => !fs.existsSync(f));
      if (missing.length > 0) throw new Error(`Missing PDF files: ${missing.join(", ")}`);
      try {
        const merged = await PDFLibDoc.create();
        for (const file of files) {
          const src = await PDFLibDoc.load(fs.readFileSync(file));
          const pages = await merged.copyPages(src, src.getPageIndices());
          pages.forEach((p) => merged.addPage(p));
        }
        const bytes = await merged.save();
        fs.writeFileSync(outputPath, bytes);
        return JSON.stringify({
          status: "success",
          mergedCount: files.length,
          outputPath,
          sizeBytes: bytes.length,
          engine: "pdf-lib"
        }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  pdf_split: {
    description: "Extract page range or split a PDF document using pdf-lib.",
    args: {
      inputPath: { type: "string", description: "Path to PDF file" },
      ranges: { type: "string", description: "Page ranges (e.g. 1-3)" }
    },
    async execute({ inputPath, ranges }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      try {
        const src = await PDFLibDoc.load(fs.readFileSync(inputPath));
        const parsed = path.parse(inputPath);
        const outputPath = path.join(parsed.dir, `${parsed.name}_split.pdf`);

        // Parse ranges like "1-3" or "1" into page indices (0-based)
        const allPages = src.getPageIndices();
        let pageIndices = allPages;
        if (ranges) {
          const match = ranges.match(/^(\d+)(?:-(\d+))?$/);
          if (match) {
            const start = parseInt(match[1], 10) - 1;
            const end = match[2] ? parseInt(match[2], 10) - 1 : start;
            pageIndices = allPages.filter((_, i) => i >= start && i <= end);
          }
        }

        const newDoc = await PDFLibDoc.create();
        const pages = await newDoc.copyPages(src, pageIndices);
        pages.forEach((p) => newDoc.addPage(p));
        const bytes = await newDoc.save();
        fs.writeFileSync(outputPath, bytes);

        return JSON.stringify({
          status: "success",
          inputPath,
          outputPath,
          ranges,
          pagesExtracted: pageIndices.length,
          engine: "pdf-lib"
        }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  }
};
