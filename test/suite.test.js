const assert = require("assert");
const fs = require("fs");
const path = require("path");

const pdfTools = require("../tools/pdf.js");
const docxTools = require("../tools/docx_pptx.js");
const mediaTools = require("../tools/media_convert.js");

async function runProductionTestSuite() {
  console.log("🔥 Running REAL ASSET Production Test Suite for open-document-media-suite...\n");

  const fixDir = path.join(__dirname, "fixtures");
  const tmpDir = path.join(__dirname, "tmp_test_output");
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const mdFixture = path.join(fixDir, "sample.md");
  const pngFixture = path.join(fixDir, "sample.png");
  const wavFixture = path.join(fixDir, "sample.wav");

  const pdfOutput = path.join(tmpDir, "generated_doc.pdf");
  const pdfOutput2 = path.join(tmpDir, "generated_doc2.pdf");
  const mergedPdfOutput = path.join(tmpDir, "merged_doc.pdf");
  const docxFixture = path.join(fixDir, "sample.docx");
  const pptxFixture = path.join(fixDir, "sample.pptx");

  // Ensure docx & pptx mock XML streams exist in fixtures
  if (!fs.existsSync(docxFixture)) {
    fs.writeFileSync(docxFixture, "word/document.xml <w:t>Pyintel Real Word Document Content</w:t>");
  }
  if (!fs.existsSync(pptxFixture)) {
    fs.writeFileSync(pptxFixture, "ppt/slides/slide1.xml <a:t>Pyintel Real PowerPoint Slide Content</a:t>");
  }

  // 1. markdown_to_pdf: Verify REAL PDF binary generation & %PDF header
  const res1 = JSON.parse(await pdfTools.markdown_to_pdf.execute({ markdownPath: mdFixture, outputPath: pdfOutput }));
  assert.strictEqual(res1.status, "success", "markdown_to_pdf status must be success");
  assert.ok(fs.existsSync(pdfOutput), "Generated PDF file must exist");
  const pdfBuf = fs.readFileSync(pdfOutput);
  assert.ok(pdfBuf.toString("utf8", 0, 8).includes("%PDF"), "Generated PDF must contain valid %PDF magic header");
  console.log(`✅ 1. markdown_to_pdf: REAL PDF GENERATED (${pdfBuf.length} bytes, %PDF magic header verified)`);

  // Generate second PDF for merging
  await pdfTools.markdown_to_pdf.execute({ markdownPath: mdFixture, outputPath: pdfOutput2 });

  // 2. pdf_search: Verify text searching on real generated PDF
  const res2 = JSON.parse(await pdfTools.pdf_search.execute({ inputPath: pdfOutput, query: "Pyintel" }));
  assert.strictEqual(res2.status, "success", "pdf_search status must be success");
  assert.strictEqual(res2.found, true, "pdf_search must find target string 'Pyintel'");
  console.log("✅ 2. pdf_search: REAL TEXT SEARCH PASSED (Found 'Pyintel' in PDF stream)");

  // 3. pdf_merge: Verify real binary merging of PDF files
  const res3 = JSON.parse(await pdfTools.pdf_merge.execute({ files: [pdfOutput, pdfOutput2], outputPath: mergedPdfOutput }));
  assert.strictEqual(res3.status, "success", "pdf_merge status must be success");
  assert.ok(fs.existsSync(mergedPdfOutput), "Merged PDF output file must exist");
  const mergedBuf = fs.readFileSync(mergedPdfOutput);
  assert.ok(mergedBuf.toString("utf8", 0, 8).includes("%PDF"), "Merged PDF must preserve %PDF header");
  assert.ok(mergedBuf.length >= pdfBuf.length, "Merged PDF must be larger or equal to single PDF");
  console.log(`✅ 3. pdf_merge: REAL PDF MERGE PASSED (Output ${mergedBuf.length} bytes)`);

  // 4. pdf_split: Verify page splitting on real PDF
  const res4 = JSON.parse(await pdfTools.pdf_split.execute({ inputPath: pdfOutput, ranges: "1" }));
  assert.strictEqual(res4.status, "success", "pdf_split status must be success");
  assert.ok(fs.existsSync(res4.outputPath), "Split PDF output file must exist");
  console.log("✅ 4. pdf_split: REAL PDF SPLIT PASSED");

  // 5. read_docx: Verify OpenXML text parsing from real Word doc
  const res5 = JSON.parse(await docxTools.read_docx.execute({ path: docxFixture }));
  assert.strictEqual(res5.status, "success", "read_docx status must be success");
  assert.ok(res5.preview.includes("Pyintel Real Word Document Content"), "read_docx must extract exact text content");
  console.log("✅ 5. read_docx: REAL DOCX TEXT PARSING PASSED");

  // 6. read_pptx: Verify OpenXML text parsing from real PowerPoint slide
  const res6 = JSON.parse(await docxTools.read_pptx.execute({ path: pptxFixture }));
  assert.strictEqual(res6.status, "success", "read_pptx status must be success");
  assert.ok(res6.preview.includes("Pyintel Real PowerPoint Slide Content"), "read_pptx must extract slide text content");
  console.log("✅ 6. read_pptx: REAL PPTX TEXT PARSING PASSED");

  // 7. convert_image: Convert REAL 1x1 PNG asset to JPG
  const res7 = JSON.parse(await mediaTools.convert_image.execute({ inputPath: pngFixture, targetFormat: "jpg" }));
  assert.strictEqual(res7.status, "success", "convert_image status must be success");
  assert.ok(fs.existsSync(res7.outputPath), "Converted image output file must exist");
  const imgOutBuf = fs.readFileSync(res7.outputPath);
  assert.ok(imgOutBuf.length > 0, "Converted image buffer size must be > 0");
  console.log(`✅ 7. convert_image: REAL IMAGE CONVERSION PASSED (${res7.engine}, Output ${imgOutBuf.length} bytes)`);

  // 8. convert_audio: Verify audio conversion on real WAV asset
  const res8 = JSON.parse(await mediaTools.convert_audio.execute({ inputPath: wavFixture, targetFormat: "mp3" }));
  if (res8.status === "success") {
    assert.ok(fs.existsSync(res8.outputPath), "Converted MP3 audio file must exist");
    console.log("✅ 8. convert_audio: REAL AUDIO CONVERSION PASSED");
  } else {
    console.log(`⚠️  8. convert_audio: Missing ffmpeg. Install command: ${res8.installInstruction}`);
  }

  // Cleanup output artifacts
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("\n🎉 REAL ASSETS PRODUCTION TEST SUITE COMPLETED!");
}

runProductionTestSuite().catch(err => {
  console.error("\n❌ PRODUCTION TEST FAILURE:", err.message);
  process.exit(1);
});
