import { toPng } from "html-to-image";
import { fontFaceCss, fontsReady } from "./fonts";
import { RenderOptions, buildCard, layoutCard } from "./render";
import { RatioId, SermonData, TemplateId, ratioSize } from "./types";

export interface ExportOptions extends RenderOptions { pixelRatio: number }

/**
 * Renders the card offscreen and returns a PNG data URL. Used by the sample
 * harness as well as the Obsidian plugin.
 */
export async function renderPng(
  doc: Document,
  data: SermonData,
  template: TemplateId,
  ratio: RatioId,
  opts: ExportOptions
): Promise<string> {
  await fontsReady(doc);
  const stage = doc.createElement("div");
  stage.className = "ss-stage";
  const card = buildCard(doc, data, template, ratio, opts);
  stage.appendChild(card);
  doc.body.appendChild(stage);
  try {
    layoutCard(card);
    const { width, height } = ratioSize(ratio);
    return await toPng(card, {
      width,
      height,
      pixelRatio: opts.pixelRatio,
      cacheBust: false,
      fontEmbedCSS: fontFaceCss(),
      skipAutoScale: true,
    });
  } finally {
    stage.remove();
  }
}

export function dataUrlToBytes(dataUrl: string): ArrayBuffer {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
