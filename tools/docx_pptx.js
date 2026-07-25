const fs = require("fs");
const mammoth = require("mammoth");
const JSZip = require("jszip");

// Extract text from OOXML XML by concatenating all <tag>...</tag> text content
function extractXmlText(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "g");
  const matches = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1]) matches.push(match[1]);
  }
  return matches.join(" ").replace(/\s+/g, " ").trim();
}

module.exports = {
  read_docx: {
    description: "Extract text from a Microsoft Word (.docx) document using mammoth.",
    args: {
      path: { type: "string", description: "Path to docx file" }
    },
    async execute({ path: filePath }) {
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;
        return JSON.stringify({
          status: "success",
          path: filePath,
          length: text.length,
          preview: text.substring(0, 500) + (text.length > 500 ? "..." : ""),
          engine: "mammoth"
        }, null, 2);
      } catch (err) {
        const buffer = fs.readFileSync(filePath);
        const str = buffer.toString("utf8");
        const matches = str.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
        let text = matches.map(m => m.replace(/<[^>]+>/g, "")).join(" ");
        if (!text) text = str.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ");
        if (text.trim().length > 0) {
          return JSON.stringify({
            status: "success",
            path: filePath,
            length: text.length,
            preview: text.substring(0, 500) + (text.length > 500 ? "..." : ""),
            engine: "native-fallback"
          }, null, 2);
        }
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  read_pptx: {
    description: "Extract slides and text from a PowerPoint (.pptx) file using jszip.",
    args: {
      path: { type: "string", description: "Path to pptx file" }
    },
    async execute({ path: filePath }) {
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
      try {
        const buffer = fs.readFileSync(filePath);
        const zip = await JSZip.loadAsync(buffer);

        // Find all slide XML files and sort by slide number
        const slideNames = Object.keys(zip.files)
          .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
          .sort((a, b) => {
            const na = parseInt(a.match(/slide(\d+)/)[1], 10);
            const nb = parseInt(b.match(/slide(\d+)/)[1], 10);
            return na - nb;
          });

        const perSlide = [];
        for (const name of slideNames) {
          const xml = await zip.files[name].async("string");
          const t = extractXmlText(xml, "a:t");
          if (t) perSlide.push(`[${name}] ${t}`);
        }
        const text = perSlide.join("\n");

        return JSON.stringify({
          status: "success",
          path: filePath,
          length: text.length,
          preview: text.substring(0, 500) + (text.length > 500 ? "..." : ""),
          engine: "jszip"
        }, null, 2);
      } catch (err) {
        const buffer = fs.readFileSync(filePath);
        const str = buffer.toString("utf8");
        const matches = str.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
        let text = matches.map(m => m.replace(/<[^>]+>/g, "")).join(" ");
        if (!text) text = str.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ");
        if (text.trim().length > 0) {
          return JSON.stringify({
            status: "success",
            path: filePath,
            length: text.length,
            preview: text.substring(0, 500) + (text.length > 500 ? "..." : ""),
            engine: "native-fallback"
          }, null, 2);
        }
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  }
};
