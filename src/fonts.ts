import { FONTS } from "./fonts-data";

let cssCache: string | null = null;

/** @font-face rules with the bundled fonts inlined as data URIs (works offline, and html-to-image can embed them). */
export function fontFaceCss(): string {
  if (cssCache) return cssCache;
  cssCache = FONTS.map(
    (f) =>
      `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};font-display:block;` +
      `src:url(data:font/woff2;base64,${f.data}) format('woff2');unicode-range:${f.unicodeRange};}`
  ).join("\n");
  return cssCache;
}

const STYLE_ID = "sermon-sharer-fonts";

/** Inject the bundled fonts into the given document once. */
export function ensureFonts(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = fontFaceCss();
  doc.head.appendChild(style);
}

export function removeFonts(doc: Document = document): void {
  doc.getElementById(STYLE_ID)?.remove();
}

/** Wait until the bundled fonts are usable, so measuring and exporting use the right glyphs. */
export async function fontsReady(doc: Document = document): Promise<void> {
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  const loads = [
    fonts.load("700 48px 'Playfair Display'"),
    fonts.load("italic 400 48px 'Playfair Display'"),
    fonts.load("400 24px 'Be Vietnam Pro'"),
    fonts.load("600 24px 'Be Vietnam Pro'"),
    fonts.load("500 24px 'Be Vietnam Pro'"),
    fonts.load("500 24px 'Inter FFS'"),
    fonts.load("italic 400 24px 'Addington CF'"),
    fonts.load("600 24px 'Cormorant Garamond'"),
    fonts.load("400 24px 'EB Garamond'"),
    fonts.load("italic 400 24px 'EB Garamond'"),
  ];
  try {
    await Promise.all(loads);
  } catch {
    /* fall back to system fonts */
  }
}
