// Fixture presence guard.
//
// The test suite in this project works against *on-disk* fixtures that are
// committed to test/fixtures/. Earlier versions of this module synthesized
// fixtures at runtime; we now expect real human-readable files.
//
// This helper simply confirms that every fixture the suites depend on is
// present, and exposes a small set of utility helpers used elsewhere.
//
// To regenerate the small image fixtures (PNG, BMP), run:
//   node tools/build_image_fixtures.js
//   node tools/build_source_samples.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function isBinaryAvailable(binaryName) {
  try {
    const cmd = process.platform === "win32" ? `where ${binaryName}` : `which ${binaryName}`;
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// All fixtures the suite expects to find. If any is missing, prepareFixtures
// throws with a clear message so the test fails fast and visibly.
const REQUIRED_FIXTURES = [
  "sample.md",
  "sample_doc_1.md",
  "sample_doc_2.md",
  "sample.png",
  "sample_red.bmp",
  "sample_green.bmp",
  "sample_blue.bmp",
  "source_sample.png",
  "source_sample.jpg",
  "source_sample.bmp",
  "source_sample.webp",
  "sample.docx",
  "sample.pptx"
];

// These need ffmpeg (or a real human contributor) to produce. They are
// reported as a soft warning, not a hard failure, so the rest of the suite
// can still execute against the on-disk fixtures.
const OPTIONAL_FIXTURES = [
  "sample.wav",
  "sample_audio_440hz.wav",
  "sample_audio_880hz.wav",
  "sample_audio_noise.wav",
  "sample.mp4",
  "sample_input_video.mp4"
];

// Verify the fixture directory and surface what's missing. Returns
// { hasFfmpeg } so callers can branch on encoder availability, matching
// the legacy API.
function prepareFixtures(fixDir) {
  if (!fs.existsSync(fixDir)) {
    throw new Error(`Fixture directory not found: ${fixDir}`);
  }

  const missing = REQUIRED_FIXTURES.filter(n => !fs.existsSync(path.join(fixDir, n)));
  if (missing.length > 0) {
    throw new Error(
      "Missing fixtures in " + fixDir + ":\n  - " + missing.join("\n  - ") +
      "\n\nRestore the missing files (they are part of the repo) or regenerate" +
      " via tools/build_image_fixtures.js and tools/build_source_samples.js."
    );
  }

  const optionalMissing = OPTIONAL_FIXTURES.filter(n => !fs.existsSync(path.join(fixDir, n)));
  if (optionalMissing.length > 0) {
    console.warn(
      "[fixtures_helper] Optional fixtures not present (audio/video):\n  - " +
      optionalMissing.join("\n  - ") +
      "\n  Tests that need ffmpeg will be skipped until these are added."
    );
  }

  return { hasFfmpeg: isBinaryAvailable("ffmpeg") };
}

module.exports = {
  prepareFixtures,
  isBinaryAvailable
};
