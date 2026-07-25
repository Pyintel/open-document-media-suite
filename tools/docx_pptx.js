const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Helper to extract text from XML string
function extractXmlText(xml, tag = "w:t") {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "g");
  const matches = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1]) matches.push(match[1]);
  }
  return matches.join(" ");
}

module.exports = {
  read_docx: {
    description: "Extract text and paragraph content from a Microsoft Word (.docx) document natively.",
    args: {
      path: { type: "string", description: "Path to docx file" }
    },
    async execute({ path: filePath }) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      try {
        const buffer = fs.readFileSync(filePath);
        // Simple zip buffer search for word/document.xml
        const str = buffer.toString("binary");
        const docXmlMarker = "word/document.xml";
        const idx = str.indexOf(docXmlMarker);
        
        let text = "";
        if (idx !== -1) {
          // Extract plain text snippets from XML streams
          const xmlTextMatches = str.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
          text = xmlTextMatches.map(m => m.replace(/<[^>]+>/g, "")).join(" ");
        }

        if (!text) {
          // Fallback: extract clean readable string tokens
          const cleanText = buffer.toString("utf8").replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ");
          text = cleanText.substring(0, 2000);
        }

        return JSON.stringify({
          status: "success",
          path: filePath,
          length: text.length,
          preview: text.substring(0, 500) + (text.length > 500 ? "..." : "")
        }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  },

  read_pptx: {
    description: "Extract slides and text from a Microsoft PowerPoint (.pptx) file natively.",
    args: {
      path: { type: "string", description: "Path to pptx file" }
    },
    async execute({ path: filePath }) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      try {
        const buffer = fs.readFileSync(filePath);
        const str = buffer.toString("binary");
        
        // Extract text from PowerPoint XML text tags <a:t>
        const xmlTextMatches = str.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
        let text = xmlTextMatches.map(m => m.replace(/<[^>]+>/g, "")).join(" ");

        if (!text) {
          const cleanText = buffer.toString("utf8").replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ");
          text = cleanText.substring(0, 2000);
        }

        return JSON.stringify({
          status: "success",
          path: filePath,
          length: text.length,
          preview: text.substring(0, 500) + (text.length > 500 ? "..." : "")
        }, null, 2);
      } catch (err) {
        return JSON.stringify({ status: "error", error: err.message }, null, 2);
      }
    }
  }
};
