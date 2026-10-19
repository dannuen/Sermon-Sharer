// Browser harness used by scripts/render-sample.mjs. Not part of the plugin build.
import { ensureFonts } from "../src/fonts";
import { renderPng } from "../src/export";
import { RatioId, SermonData, TemplateId } from "../src/types";

declare global {
  interface Window { renderSample: (data: SermonData, template: TemplateId, ratio: RatioId, pixelRatio: number, showIcon?: boolean) => Promise<string> }
}

ensureFonts(document);
window.renderSample = (data, template, ratio, pixelRatio, showIcon) => renderPng(document, data, template, ratio, { pixelRatio, showIcon });
