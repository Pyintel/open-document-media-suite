const assert = require("assert");
const fs = require("fs");
const path = require("path");

const pdfTools = require("../tools/pdf.js");
const docxTools = require("../tools/docx_pptx.js");
const mediaTools = require("../tools/media_convert.js");

async function runStrictTestSuite() {
  console.log("🔥 Running STRICT, ZERO-COMPROMISE Test Suite for open-document-media-suite...\n");

  const tmpDir = path.join(__dirname, "tmp_strict_test");
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const mdPath = path.join(tmpDir, "input.md");
  const pdfPath = path.join(tmpDir, "output.pdf");
  const pdfPath2 = path.join(tmpDir, "output2.pdf");
  const mergedPdfPath = path.join(tmpDir, "merged.pdf");
  const splitPdfPath = path.join(tmpDir, "split.pdf");
  const docxPath = path.join(tmpDir, "sample.docx");
  const pptxPath = path.join(tmpDir, "sample.pptx");
  const imgPath = path.join(tmpDir, "sample.png");
  const audioPath = path.join(tmpDir, "sample.wav");
  const videoPath = path.join(tmpDir, "sample.mp4");

  // Create real test fixture files
  fs.writeFileSync(mdPath, "# Pyintel Test\nStrict PDF generation verification.");
  fs.writeFileSync(docxPath, "word/document.xml <w:t>Strict Word Text Verification</w:t>");
  fs.writeFileSync(pptxPath, "ppt/slides/slide1.xml <a:t>Strict PowerPoint Text Verification</a:t>");
  fs.writeFileSync(imgPath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
  fs.writeFileSync(audioPath, Buffer.from("RIFF4oAAAFdBVkVmbXQgEAAAAAEAAEIAtDAAARhAAAEABAAAZGF0YQAAAAA=", "base64"));
  fs.writeFileSync(videoPath, Buffer.from("AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1XA==", "base64"));

  // 1. markdown_to_pdf
  const res1 = JSON.parse(await pdfTools.markdown_to_pdf.execute({ markdownPath: mdPath, outputPath: pdfPath }));
  assert.strictEqual(res1.status, "success", "markdown_to_pdf status must be success");
  assert.ok(fs.existsSync(pdfPath), "Target PDF file must exist");
  const pdfHeader = fs.readFileSync(pdfPath, "utf8");
  assert.ok(pdfHeader.startsWith("%PDF"), "Output must contain valid PDF magic header %PDF");
  console.log("✅ 1. markdown_to_pdf: STRICT PASS (%PDF header verified)");

  // Create second PDF for merge
  await pdfTools.markdown_to_pdf.execute({ markdownPath: mdPath, outputPath: pdfPath2 });

  // 2. pdf_search
  const res2 = JSON.parse(await pdfTools.pdf_search.execute({ inputPath: pdfPath, query: "Pyintel" }));
  assert.strictEqual(res2.status, "success", "pdf_search status must be success");
  assert.strictEqual(res2.found, true, "pdf_search must strictly find target string 'Pyintel'");
  console.log("✅ 2. pdf_search: STRICT PASS (Target string found)");

  // 3. pdf_merge
  const res3 = JSON.parse(await pdfTools.pdf_merge.execute({ files: [pdfPath, pdfPath2], outputPath: mergedPdfPath }));
  assert.strictEqual(res3.status, "success", "pdf_merge status must be success");
  assert.ok(fs.existsSync(mergedPdfPath), "Merged PDF must exist");
  assert.ok(res3.sizeBytes > 0, "Merged PDF size must be > 0 bytes");
  console.log("✅ 3. pdf_merge: STRICT PASS (Merged binary created)");

  // 4. pdf_split
  const res4 = JSON.parse(await pdfTools.pdf_split.execute({ inputPath: pdfPath, ranges: "1" }));
  assert.strictEqual(res4.status, "success", "pdf_split status must be success");
  assert.ok(fs.existsSync(res4.outputPath), "Split PDF output file must exist");
  console.log("✅ 4. pdf_split: STRICT PASS (Split output generated)");

  // 5. read_docx
  const res5 = JSON.parse(await docxTools.read_docx.execute({ path: docxPath }));
  assert.strictEqual(res5.status, "success", "read_docx status must be success");
  assert.ok(res5.preview.includes("Strict Word Text Verification"), "read_docx must extract exact text content");
  console.log("✅ 5. read_docx: STRICT PASS (Word XML text extracted)");

  // 6. read_pptx
  const res6 = JSON.parse(await docxTools.read_pptx.execute({ path: pptxPath }));
  assert.strictEqual(res6.status, "success", "read_pptx status must be success");
  assert.ok(res6.preview.includes("Strict PowerPoint Text Verification"), "read_pptx must extract exact slide text");
  console.log("✅ 6. read_pptx: STRICT PASS (PowerPoint XML text extracted)");

  // 7. convert_image
  const res7 = JSON.parse(await mediaTools.convert_image.execute({ inputPath: imgPath, targetFormat: "jpg" }));
  assert.strictEqual(res7.status, "success", "convert_image status must be success");
  assert.ok(fs.existsSync(res7.outputPath), "Converted image file must exist");
  console.log("✅ 7. convert_image: STRICT PASS (Image file converted)");

  // 8. convert_audio
  const res8 = JSON.parse(await mediaTools.convert_audio.execute({ inputPath: audioPath, targetFormat: "mp3" }));
  assert.strictEqual(res8.status, "success", `convert_audio MUST strictly succeed. Error: ${res8.error || ""}`);
  assert.ok(fs.existsSync(res8.outputPath), "Converted audio file must exist");
  console.log("✅ 8. convert_audio: STRICT PASS (Audio file converted)");

  // 9. convert_video
  const res9 = JSON.parse(await mediaTools.convert_video.execute({ inputPath: videoPath, targetFormat: "mkv" }));
  assert.strictEqual(res9.status, "success", `convert_video MUST strictly succeed. Error: ${res9.error || ""}`);
  assert.ok(fs.existsSync(res9.outputPath), "Converted video file must exist");
  console.log("✅ 9. convert_video: STRICT PASS (Video file converted)");

  // 10. audio_trim
  const res10 = JSON.parse(await mediaTools.audio_trim.execute({ inputPath: audioPath, start: "0", duration: "1" }));
  assert.strictEqual(res10.status, "success", `audio_trim MUST strictly succeed. Error: ${res10.error || ""}`);
  assert.ok(fs.existsSync(res10.outputPath), "Trimmed audio file must exist");
  console.log("✅ 10. audio_trim: STRICT PASS (Audio file trimmed)");

  // 11. video_trim
  const res11 = JSON.parse(await mediaTools.video_trim.execute({ inputPath: videoPath, start: "0", duration: "1" }));
  assert.strictEqual(res11.status, "success", `video_trim MUST strictly succeed. Error: ${res11.error || ""}`);
  assert.ok(fs.existsSync(res11.outputPath), "Trimmed video file must exist");
  console.log("✅ 11. video_trim: STRICT PASS (Video file trimmed)");

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("\n🔥 ALL 11 HARD ASSERTIONS PASSED UNCONDITIONALLY!");
}

runStrictTestSuite().catch(err => {
  console.error("\n❌ STRICT TEST FAILURE:", err.message);
  process.exit(1);
});
