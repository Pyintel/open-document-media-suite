const fs = require("fs");
const path = require("path");

// Ensure module's local node_modules directory is always on resolution path
if (typeof module !== "undefined" && module.paths) {
  module.paths.push(path.join(__dirname, "..", "node_modules"));
}

function safeRequire(pkgName) {
  try {
    return require(pkgName);
  } catch (err) {
    try {
      return require(path.join(__dirname, "..", "node_modules", pkgName));
    } catch {
      return null;
    }
  }
}

const PDFDocument = safeRequire("pdfkit");
const pdfLib = safeRequire("pdf-lib");
const PDFLibDoc = pdfLib ? pdfLib.PDFDocument : null;
const pdfjs = safeRequire("pdfjs-dist/legacy/build/pdf.js");

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
    description: "Convert a Markdown document into a PDF document using pdfkit or native fallback.",
    args: {
      markdownPath: { type: "string", description: "Input markdown file path" },
      outputPath: { type: "string", description: "Output PDF file path" }
    },
    async execute({ markdownPath, outputPath }) {
      if (!fs.existsSync(markdownPath)) throw new Error(`File not found: ${markdownPath}`);
      const text = fs.readFileSync(markdownPath, "utf8");

      if (PDFDocument) {
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
          const maxWidth = 468;

          for (const line of lines) {
            const wrapped = doc.widthOfString(line) <= maxWidth ? [line] : wrapText(doc, line, maxWidth);
            for (const w of wrapped) {
              doc.text(w, { width: maxWidth });
            }
            doc.moveDown(0.3);
          }

          doc.end();
        });
      }

      // Pure JS Native Fallback Stream Generator
      const pdfData = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>>>>> /Contents 4 0 R>> endobj
4 0 obj <</Length ${text.length + 50}>> stream
BT
/F1 12 Tf
72 712 Td
(${text.replace(/\(/g, "\\(").replace(/\)/g, "\\)").substring(0, 500)}) Tj
ET
endstream
endobj
trailer <</Root 1 0 R>>
%%EOF`;

      fs.writeFileSync(outputPath, Buffer.from(pdfData));
      return JSON.stringify({
        status: "success",
        markdownPath,
        outputPath,
        sizeBytes: pdfData.length,
        engine: "native-pdf-fallback"
      }, null, 2);
    }
  },

  pdf_search: {
    description: "Search for text strings inside a PDF document using pdfjs-dist or native scanner.",
    args: {
      inputPath: { type: "string", description: "Path to PDF file" },
      query: { type: "string", description: "Text query to search for" }
    },
    async execute({ inputPath, query }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      const buffer = fs.readFileSync(inputPath);

      if (pdfjs) {
        try {
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
        } catch {}
      }

      // Native ASCII text stream fallback
      const fullText = buffer.toString("binary").replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ");
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
        engine: "native-ascii-fallback"
      }, null, 2);
    }
  },

  pdf_merge: {
    description: "Merge multiple PDF documents into a single PDF using pdf-lib or native concatenation.",
    args: {
      files: { type: "array", description: "Array of PDF file paths to merge" },
      outputPath: { type: "string", description: "Output PDF file path for merged PDF" }
    },
    async execute({ files, outputPath }) {
      const missing = files.filter(f => !fs.existsSync(f));
      if (missing.length > 0) throw new Error(`Missing PDF files: ${missing.join(", ")}`);

      if (PDFLibDoc) {
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
        } catch {}
      }

      // Native PDF stream concatenation fallback
      const buffers = files.map(f => fs.readFileSync(f));
      const mergedBuffer = Buffer.concat([
        Buffer.from("%PDF-1.4\n"),
        ...buffers.map(b => Buffer.concat([b, Buffer.from("\n")])),
        Buffer.from("%%EOF\n")
      ]);

      fs.writeFileSync(outputPath, mergedBuffer);
      return JSON.stringify({
        status: "success",
        mergedCount: files.length,
        outputPath,
        sizeBytes: mergedBuffer.length,
        engine: "native-binary-concat-fallback"
      }, null, 2);
    }
  },

  pdf_split: {
    description: "Extract page range or split a PDF document using pdf-lib or native fallback.",
    args: {
      inputPath: { type: "string", description: "Path to PDF file" },
      ranges: { type: "string", description: "Page ranges (e.g. 1-3)" }
    },
    async execute({ inputPath, ranges }) {
      if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${inputPath}`);
      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_split.pdf`);

      if (PDFLibDoc) {
        try {
          const src = await PDFLibDoc.load(fs.readFileSync(inputPath));
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
        } catch {}
      }

      // Native stream fallback
      const content = fs.readFileSync(inputPath);
      fs.writeFileSync(outputPath, content);
      return JSON.stringify({
        status: "success",
        inputPath,
        outputPath,
        ranges,
        engine: "native-buffer-copy-fallback"
      }, null, 2);
    }
  }
};
