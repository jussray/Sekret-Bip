import sharp from "sharp";
import fs from "fs";
import path from "path";

const inputDir = "assets/images";
const outputDir = "assets/images/resized-bg";

fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(inputDir).filter((f) =>
  /\.(png|jpg|jpeg|webp)$/i.test(f) &&
  (f.includes("bg-") || f.includes("-bg.") || f.includes("room") || f.includes("splash"))
);

for (const file of files) {
  try {
    await sharp(path.join(inputDir, file))
      .resize(1080, 1920, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 82 })
      .toFile(path.join(outputDir, file.replace(/\.(png|jpg|jpeg|webp)$/i, ".jpg")));
    console.log("resized", file);
  } catch (err) {
    console.warn("skipped (unsupported format):", file, err.message);
  }
}
