import { App, CachedMetadata, TFile, parseLinktext } from "obsidian";
import { SermonData, SermonIcon } from "./types";

/** "[[lu-18#22|Lu-ca 18:22]]" -> { target: "lu-18#22", display: "Lu-ca 18:22" } */
export function parseWikilink(raw: string): { target: string; display: string } {
  const s = String(raw ?? "").trim();
  const m = s.match(/^\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/);
  if (!m) return { target: "", display: s };
  const target = m[1].trim();
  const display = (m[2] ?? target.replace(/#.*$/, "")).trim();
  return { target, display };
}

function asList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return [String(v).trim()].filter(Boolean);
}

const WEEKDAYS_VI = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

/** "2026-10-19" -> "Chủ nhật, 19/10/2026"; anything else is returned unchanged. */
export function formatDateVi(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return s;
  return `${WEEKDAYS_VI[d.getDay()]}, ${m[3]}/${m[2]}/${m[1]}`;
}

/** Strip markdown so a verse reads as plain text. */
export function cleanMarkdown(md: string): string {
  return md
    .replace(/<[^>]+>/g, "")
    .replace(/!\[\[[^\]]*\]\]/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\^[A-Za-z0-9-]+\s*$/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Section { text: string }

function headingSection(content: string, cache: CachedMetadata, name: string): Section | null {
  const headings = cache.headings ?? [];
  const idx = headings.findIndex((h) => h.heading.trim().toLowerCase() === name.trim().toLowerCase());
  if (idx < 0) return null;
  const h = headings[idx];
  const next = headings.slice(idx + 1).find((n) => n.level <= h.level);
  const start = h.position.end.offset;
  const end = next ? next.position.start.offset : content.length;
  let text = content.slice(start, end);
  // Drop a leading verse number that repeats the heading ("22. ..." or "22 ...").
  text = text.replace(new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[.:)]?\\s+`), "");
  return { text };
}

function blockSection(content: string, cache: CachedMetadata, id: string): Section | null {
  const b = cache.blocks?.[id];
  if (!b) return null;
  return { text: content.slice(b.position.start.offset, b.position.end.offset) };
}

/**
 * Looks up the text behind a wikilink such as "[[lu-18#22|Lu-ca 18:22]]".
 * - "#22" reads the section under the heading "22" in note lu-18.
 * - "#^id" reads the block with that id.
 * - A range in the display text ("Lu-ca 18:22-24") pulls headings 22 through 24.
 */
export async function lookupLinkedText(app: App, rawLink: string, sourcePath: string): Promise<string> {
  const { target, display } = parseWikilink(rawLink);
  if (!target) return "";
  const { path, subpath } = parseLinktext(target);
  const file = app.metadataCache.getFirstLinkpathDest(path, sourcePath);
  if (!(file instanceof TFile)) return "";
  const cache = app.metadataCache.getFileCache(file);
  if (!cache) return "";
  const content = await app.vault.cachedRead(file);
  const sub = subpath.replace(/^#/, "");
  if (!sub) return "";

  if (sub.startsWith("^")) {
    const s = blockSection(content, cache, sub.slice(1));
    return s ? cleanMarkdown(s.text) : "";
  }

  // Range such as "18:22-24" in the display text, with a numeric heading as the start.
  const range = display.match(/:(\d+)\s*[-–]\s*(\d+)\s*$/);
  const startNum = Number(sub);
  if (range && Number.isInteger(startNum) && Number(range[1]) === startNum) {
    const endNum = Number(range[2]);
    const parts: string[] = [];
    for (let n = startNum; n <= endNum && n - startNum < 30; n++) {
      const s = headingSection(content, cache, String(n));
      if (!s) break;
      parts.push(cleanMarkdown(s.text));
    }
    if (parts.length) return parts.join(" ");
  }

  const s = headingSection(content, cache, sub);
  return s ? cleanMarkdown(s.text) : "";
}

/** Leading emoji (with variation selectors, skin tones and ZWJ sequences) at the start of a name. */
const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E|\u20E3|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic})*)\s*/u;

/** "🌲Bình An Trên Đất" -> { emoji: "🌲", rest: "Bình An Trên Đất" } */
export function splitLeadingEmoji(name: string): { emoji: string; rest: string } {
  const m = name.match(LEADING_EMOJI);
  if (!m) return { emoji: "", rest: name.trim() };
  return { emoji: m[1], rest: name.slice(m[0].length).trim() || name.trim() };
}

/** An Iconize-style identifier ("LiChurch", "LiBookPlus") -> Lucide name ("church", "book-plus"); emoji pass through. */
export function parseIconValue(raw: string): SermonIcon | undefined {
  const v = String(raw ?? "").trim().replace(/^:|:$/g, "");
  if (!v) return undefined;
  if (LEADING_EMOJI.test(v)) return { kind: "emoji", value: v.match(LEADING_EMOJI)![1] };
  const lucide = v.match(/^(?:Li)?([A-Z][A-Za-z0-9]+)$/);
  if (lucide) return { kind: "lucide", name: lucide[1].replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase() };
  if (/^[a-z0-9-]+$/.test(v)) return { kind: "lucide", name: v };
  return undefined;
}

/** Icon that the Iconize plugin assigned to this file, read from its data.json. */
async function iconizeIcon(app: App, filePath: string): Promise<SermonIcon | undefined> {
  try {
    const p = `${app.vault.configDir}/plugins/obsidian-icon-folder/data.json`;
    if (!(await app.vault.adapter.exists(p))) return undefined;
    const data = JSON.parse(await app.vault.adapter.read(p)) as Record<string, unknown>;
    const entry = data[filePath];
    if (typeof entry === "string") return parseIconValue(entry);
    if (entry && typeof entry === "object" && typeof (entry as { iconName?: string }).iconName === "string") {
      return parseIconValue((entry as { iconName: string }).iconName);
    }
  } catch (e) {
    console.warn("Sermon Sharer: could not read Iconize data", e);
  }
  return undefined;
}

export interface SermonFieldNames { bible: string; verse: string; church: string; date: string; time: string }

/** Reads the sermon's details from the note's frontmatter and resolves the key verse text. */
export async function readSermon(app: App, file: TFile, fields: SermonFieldNames): Promise<SermonData> {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const verseRaw = asList(fm[fields.verse])[0] ?? "";
  const bibleRaw = asList(fm[fields.bible])[0] ?? "";
  const verseText = verseRaw ? await lookupLinkedText(app, verseRaw, file.path) : "";
  const { emoji, rest } = splitLeadingEmoji(file.basename);
  // Icon priority: leading emoji in the file name, then a frontmatter `icon`, then Iconize's assignment.
  const icon: SermonIcon | undefined =
    (emoji ? { kind: "emoji", value: emoji } : undefined) ??
    parseIconValue(asList(fm["icon"])[0] ?? "") ??
    (await iconizeIcon(app, file.path));
  return {
    title: rest,
    icon,
    verseRef: parseWikilink(verseRaw).display,
    verseText,
    passageRef: parseWikilink(bibleRaw).display,
    church: asList(fm[fields.church]).map((c) => parseWikilink(c).display),
    date: asList(fm[fields.date]).map((d) => formatDateVi(parseWikilink(d).display)).join(", "),
    time: asList(fm[fields.time]).join(", "),
  };
}
