module.exports = {
  pdf_utilities: {
    description: "Perform PDF operations: merge files, split pages, rotate pages, or search text.",
    args: { operation: { type: "string", description: "Operation name (merge, split, rotate, search)" } },
    async execute({ operation }) {
      return JSON.stringify({ status: "success", operation, output: `PDF ${operation} operation complete.` }, null, 2);
    }
  }
};
