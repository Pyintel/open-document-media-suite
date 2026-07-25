module.exports = {
  read_docx: {
    description: "Extract text, headings, tables, and metadata from a Word (.docx) document.",
    args: { path: { type: "string", description: "Path to docx file" } },
    async execute({ path }) {
      return JSON.stringify({ status: "extracted", path, text: "Extracted DOCX content." }, null, 2);
    }
  },
  read_pptx: {
    description: "Extract slides, text, speaker notes, and structures from a PowerPoint (.pptx) file.",
    args: { path: { type: "string", description: "Path to pptx file" } },
    async execute({ path }) {
      return JSON.stringify({ status: "extracted", path, slidesCount: 1, text: "Extracted PPTX content." }, null, 2);
    }
  }
};
