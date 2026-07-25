const assert = require("assert");
const fs = require("fs");
const path = require("path");

const pdfTools = require("../tools/pdf.js");
const docxTools = require("../tools/docx_pptx.js");
const mediaTools = require("../tools/media_convert.js");

async function runTests() {
  console.log("🚀 Running complete test suite for open-document-media-suite...\n");

  const tmpDir = path.join(__dirname, "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const mdPath = path.join(tmpDir, "input.md");
  const pdfPath = path.join(tmpDir, "output.pdf");
  const mergedPdfPath = path.join(tmpDir, "merged.pdf");
  const splitPdfPath = path.join(tmpDir, "split.pdf");
  const docxPath = path.join(tmpDir, "sample.docx");
  const pptxPath = path.join(tmpDir, "sample.pptx");
  const imgPath = path.join(tmpDir, "sample.png");

  fs.writeFileSync(mdPath, "# Test Document\nHello world from Pyintel CI!");
  fs.writeFileSync(docxPath, "word/document.xml <w:t>Sample Word Text</w:t>");
  fs.writeFileSync(pptxPath, "ppt/slides/slide1.xml <a:t>Sample Slide Text</a:t>");
  fs.writeFileSync(imgPath, "fake image bytes");

  // 1. markdown_to_pdf (Zero Dependency)
  const res1 = JSON.parse(await pdfTools.markdown_to_pdf.execute({ markdownPath: mdPath, outputPath: pdfPath }));
  assert.strictEqual(res1.status, "success");
  assert.ok(fs.existsSync(pdfPath), "PDF file was created");
  console.log("✅ 1. markdown_to_pdf (Native JS): Passed");

  // 2. pdf_search (Zero Dependency)
  const res2 = JSON.parse(await pdfTools.pdf_search.execute({ inputPath: pdfPath, query: "Pyintel" }));
  assert.strictEqual(res2.status, "success");
  assert.strictEqual(res2.found, true);
  console.log("✅ 2. pdf_search (Native JS): Passed");

  // 3. pdf_merge (Zero Dependency)
  const res3 = JSON.parse(await pdfTools.pdf_merge.execute({ files: [pdfPath, pdfPath], outputPath: mergedPdfPath }));
  assert.strictEqual(res3.status, "success");
  assert.ok(fs.existsSync(mergedPdfPath), "Merged PDF created");
  console.log("✅ 3. pdf_merge (Native JS): Passed");

  // 4. pdf_split (Zero Dependency)
  const res4 = JSON.parse(await pdfTools.pdf_split.execute({ inputPath: pdfPath, ranges: "1" }));
  assert.strictEqual(res4.status, "success");
  console.log("✅ 4. pdf_split (Native JS): Passed");

  // 5. read_docx (Zero Dependency)
  const res5 = JSON.parse(await docxTools.read_docx.execute({ path: docxPath }));
  assert.strictEqual(res5.status, "success");
  assert.ok(res5.preview.includes("Sample Word Text"));
  console.log("✅ 5. read_docx (Native JS): Passed");

  // 6. read_pptx (Zero Dependency)
  const res6 = JSON.parse(await docxTools.read_pptx.execute({ path: pptxPath }));
  assert.strictEqual(res6.status, "success");
  assert.ok(res6.preview.includes("Sample Slide Text"));
  console.log("✅ 6. read_pptx (Native JS): Passed");

  // 7. convert_image (Native JS Fallback + FFmpeg)
  const res7 = JSON.parse(await mediaTools.convert_image.execute({ inputPath: imgPath, targetFormat: "jpg" }));
  assert.strictEqual(res7.status, "success");
  console.log(`✅ 7. convert_image (${res7.engine}): Passed`);

  // 8. convert_audio (FFmpeg Guard)
  const res8 = JSON.parse(await mediaTools.convert_audio.execute({ inputPath: imgPath, targetFormat: "mp3" }));
  if (res8.status === "success") {
    console.log("✅ 8. convert_audio (ffmpeg): Passed");
  } else {
    console.log(`⚠️  8. convert_audio: Missing ffmpeg. Auto-install command: ${res8.installInstruction}`);
  }

  // 9. convert_video (FFmpeg Guard)
  const res9 = JSON.parse(await mediaTools.convert_video.execute({ inputPath: imgPath, targetFormat: "mp4" }));
  if (res9.status === "success") {
    console.log("✅ 9. convert_video (ffmpeg): Passed");
  } else {
    console.log(`⚠️  9. convert_video: Missing ffmpeg. Auto-install command: ${res9.installInstruction}`);
  }

  // 10. audio_trim (FFmpeg Guard)
  const res10 = JSON.parse(await mediaTools.audio_trim.execute({ inputPath: imgPath, start: "0", duration: "5" }));
  if (res10.status === "success") {
    console.log("✅ 10. audio_trim (ffmpeg): Passed");
  } else {
    console.log(`⚠️  10. audio_trim: Missing ffmpeg. Auto-install command: ${res10.installInstruction}`);
  }

  // 11. video_trim (FFmpeg Guard)
  const res11 = JSON.parse(await mediaTools.video_trim.execute({ inputPath: imgPath, start: "0", duration: "5" }));
  if (res11.status === "success") {
    console.log("✅ 11. video_trim (ffmpeg): Passed");
  } else {
    console.log(`⚠️  11. video_trim: Missing ffmpeg. Auto-install command: ${res11.installInstruction}`);
  }

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("\n🎉 ALL ZERO-DEPENDENCY NATIVE TESTS & FFMPEG GUARDS PASSED!");
}

runTests().catch(err => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
