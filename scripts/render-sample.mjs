// Renders sample images with the real export code (html-to-image) in headless Chromium.
// Usage: npm run sample   -> writes samples/*.png
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = path.join(root, "samples");
mkdirSync(outDir, { recursive: true });

const sample = {
  title: "Người trẻ tuổi giàu có",
  icon: { kind: "emoji", value: "🌲" },
  verseRef: "Lu-ca 18:22",
  verseText:
    "Đức Chúa Jêsus nghe vậy, bèn phán rằng: Còn thiếu cho ngươi một điều; hãy bán hết gia tài mình, phân phát cho kẻ nghèo, thì ngươi sẽ có của cải ở trên trời; bấy giờ hãy đến mà theo ta.",
  passageRef: "Lu-ca 18:18-30",
  church: ["Hội Thánh"],
  date: "Chủ nhật, 19/10/2026",
  time: "10:00",
};

if (process.env.SAMPLE_VERSE) sample.verseText = process.env.SAMPLE_VERSE;
const combos = JSON.parse(process.env.SAMPLE_COMBOS ?? '[["aurora","1:1"],["mist","1:1"],["noir","1:1"],["sunset","4:5"],["pearl","9:16"],["glacial","1:1"],["glacial-dark","1:1"],["golden","1:1"],["golden","4:5"],["golden-dark","1:1"],["golden-dark","4:5"],["glacial","9:16"]]');
const pixelRatio = Number(process.env.SAMPLE_SCALE ?? "1");

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync(path.join(root, "styles.css"), "utf8")}</style>
<script>${readFileSync(path.join(here, ".harness/harness.js"), "utf8")}</script>
</head><body></body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
page.on("pageerror", (e) => console.error("page error:", e));
await page.setContent(html, { waitUntil: "load" });
for (const [template, ratio] of combos) {
  const dataUrl = await page.evaluate(
    ([d, t, r, p, i]) => window.renderSample(d, t, r, p, i), [sample, template, ratio, pixelRatio, !!process.env.SAMPLE_ICON]
  );
  const file = path.join(outDir, `sample-${template}-${ratio.replace(":", "x")}.png`);
  writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log("wrote", file);
}
await browser.close();
