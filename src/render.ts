import { RatioId, SermonData, TEMPLATES, TemplateId, ratioSize } from "./types";

export interface RenderOptions {
  /** Show church, date and time in a footer. Off by default. */
  showFooter?: boolean;
  /** Show the note's icon above the title. Off by default. */
  showIcon?: boolean;
  /** Draws a Lucide icon by name into the element (Obsidian's setIcon). Without it only emoji icons render. */
  renderLucide?: (el: HTMLElement, name: string) => void;
}

/**
 * Builds the hero-image card as plain DOM. No Obsidian APIs are used here so the
 * same code renders inside Obsidian and in the sample-rendering harness.
 *
 * Frosted glass: `backdrop-filter` is not rendered by html-to-image (it draws
 * through an SVG foreignObject), so each `.ss-glass` panel carries its own
 * blurred copy of the background (`.ss-glass-bg`), which layoutCard() aligns
 * with the real background. That gives a true frosted look in the exported PNG.
 */
export function buildCard(
  doc: Document,
  data: SermonData,
  template: TemplateId,
  ratio: RatioId,
  opts: RenderOptions = {}
): HTMLElement {
  const { width, height } = ratioSize(ratio);
  const spec = TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0];
  const card = doc.createElement("div");
  card.className = `ss-card ss-t-${template} ss-r-${ratio.replace(":", "-")}${spec.center ? " ss-center" : ""}`;
  card.style.width = `${width}px`;
  card.style.height = `${height}px`;
  card.style.setProperty("--fit", "1");

  const el = (tag: string, cls: string, parent: HTMLElement, text?: string) => {
    const e = doc.createElement(tag);
    e.className = cls;
    if (text !== undefined) e.textContent = text;
    parent.appendChild(e);
    return e;
  };

  const makeBackground = (parent: HTMLElement) => {
    const bg = el("div", "ss-bg", parent);
    el("div", "ss-bg-base", bg);
    const blobs = el("div", "ss-blobs", bg);
    for (let i = 1; i <= spec.blobs; i++) el("div", `ss-blob ss-blob-${i}`, blobs);
    el("div", "ss-bg-overlay", bg);
    return bg;
  };

  const makeGlass = (parent: HTMLElement, cls: string) => {
    const g = el("div", `ss-glass ${cls}`, parent);
    const copy = makeBackground(g);
    copy.className = "ss-bg ss-glass-bg";
    copy.style.width = `${width}px`;
    copy.style.height = `${height}px`;
    el("div", "ss-glass-tint", g);
    el("div", "ss-glass-shine", g);
    return el("div", "ss-glass-content", g);
  };

  makeBackground(card);
  el("div", "ss-frame", card); // decorative frame, used by templates that draw one
  const inner = el("div", "ss-inner", card);
  const panel = spec.glass ? makeGlass(inner, "ss-panel") : el("div", "ss-panel ss-plain", inner);

  const head = el("div", "ss-head", panel);
  el("div", "ss-eyebrow", head, "Bài giảng");
  if (opts.showIcon && data.icon) {
    const ic = el("div", `ss-icon ss-icon-${data.icon.kind}`, head);
    if (data.icon.kind === "emoji") ic.textContent = data.icon.value;
    else if (opts.renderLucide) opts.renderLucide(ic, data.icon.name);
    else ic.remove();
  }
  el("div", "ss-title", head, data.title);
  if (data.passageRef) el("div", "ss-passage", head, `Kinh Thánh: ${data.passageRef}`);

  const body = el("div", "ss-body", panel);
  if (data.verseText) {
    const quote = el("div", "ss-quote", body);
    if (spec.quotes === "mark") el("div", "ss-quote-mark", quote, "“");
    el("div", "ss-verse", quote, spec.quotes === "inline" ? `“${data.verseText}”` : data.verseText);
  }
  if (data.verseRef) {
    const refText = data.verseText ? data.verseRef : `Câu gốc: ${data.verseRef}`;
    if (spec.refStyle === "text") {
      el("div", "ss-verse-ref", body, refText);
    } else {
      // Plain templates still get one frosted element: a glass pill around the reference.
      const pill = makeGlass(body, "ss-pill");
      el("div", "ss-verse-ref", pill, refText);
    }
  }

  if (opts.showFooter) {
    const footParts = [data.church.join(" · "), [data.date, data.time].filter(Boolean).join(" · ")].filter(Boolean);
    if (footParts.length) {
      const foot = el("div", "ss-foot", inner);
      footParts.forEach((p) => el("div", "ss-foot-line", foot, p));
    }
  }
  return card;
}

/** Offset of `el` inside `card`, ignoring CSS transforms (which do not change offset geometry). */
function offsetWithin(el: HTMLElement, card: HTMLElement): { x: number; y: number } {
  let x = 0, y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== card) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/** Aligns each frosted panel's blurred background copy with the card background. */
export function syncGlass(card: HTMLElement): void {
  card.querySelectorAll<HTMLElement>(".ss-glass").forEach((g) => {
    const copy = g.querySelector<HTMLElement>(":scope > .ss-glass-bg");
    if (!copy) return;
    const { x, y } = offsetWithin(g, card);
    copy.style.left = `${-x}px`;
    copy.style.top = `${-y}px`;
  });
}

/**
 * Shrinks the typography (via the --fit CSS variable) until the content fits
 * inside the card, so long verses never overflow, then aligns the glass
 * backgrounds. The card must be attached to a document when this is called.
 */
export function layoutCard(card: HTMLElement, min = 0.45): number {
  const inner = card.querySelector<HTMLElement>(".ss-inner");
  const panel = card.querySelector<HTMLElement>(".ss-panel");
  if (!inner || !panel) return 1;
  // scrollHeight cannot be used on anything containing a glass panel (its
  // background copy is card-sized), so compare the panel's own height with the
  // room inside the padded container, plus the footer if there is one.
  const cs = getComputedStyle(inner);
  const room = () => inner.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const used = () =>
    Array.from(inner.children).reduce((h, c) => h + (c as HTMLElement).offsetHeight, 0) +
    Math.max(0, inner.children.length - 1) * parseFloat(cs.rowGap || "0");
  const textBoxes = Array.from(card.querySelectorAll<HTMLElement>(".ss-title, .ss-verse, .ss-passage, .ss-verse-ref"));
  const overflows = () => used() > room() + 1 || textBoxes.some((b) => b.scrollWidth > b.clientWidth + 1);
  let fit = 1;
  while (fit > min && overflows()) {
    fit = Math.round((fit - 0.04) * 100) / 100;
    card.style.setProperty("--fit", String(fit));
  }
  syncGlass(card);
  return fit;
}

/** @deprecated use layoutCard */
export const autoFit = layoutCard;
