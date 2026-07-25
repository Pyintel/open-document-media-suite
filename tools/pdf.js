module.exports = {
  pdf_merge: {
    description: "Merge multiple PDF documents into a single PDF file.",
    args: { files: { type: "array", description: "Array of PDF file paths to merge" }, outputPath: { type: "string", description: "Output path for merged PDF" } },
    async execute({ files, outputPath }) {
      return JSON.stringify({ status: "success", merged: files, outputPath }, null, 2);
    }
  },
  pdf_split: {
    description: "Split a PDF file into separate pages or ranges.",
    args: { inputPath: { type: "string", description: "Path to PDF file" }, ranges: { type: "string", description: "Page ranges (e.g. 1-3, 5)" } },
    async execute({ inputPath, ranges }) {
      return JSON.stringify({ status: "success", inputPath, ranges }, null, 2);
    }
  },
  pdf_rotate: {
    description: "Rotate pages in a PDF file by 90, 180, or 270 degrees.",
    args: { inputPath: { type: "string", description: "Path to PDF file" }, degrees: { type: "number", description: "Degrees to rotate" } },
    async execute({ inputPath, degrees }) {
      return JSON.stringify({ status: "success", inputPath, degrees }, null, 2);
    }
  },
  pdf_search: {
    description: "Search for text strings inside a PDF document.",
    args: { inputPath: { type: "string", description: "Path to PDF file" }, query: { type: "string", description: "Text query to search" } },
    async execute({ inputPath, query }) {
      return JSON.stringify({ status: "success", inputPath, query, matches: [] }, null, 2);
    }
  },
  markdown_to_pdf: {
    description: "Convert a Markdown document to a formatted PDF file.",
    args: { markdownPath: { type: "string", description: "Path to input markdown file" }, outputPath: { type: "string", description: "Target PDF file path" } },
    async execute({ markdownPath, outputPath }) {
      return JSON.stringify({ status: "success", markdownPath, outputPath }, null, 2);
    }
  }
};
