export type SermonIcon = { kind: "emoji"; value: string } | { kind: "lucide"; name: string };

export interface SermonData {
  /** Sermon title: the note's file name without its leading emoji. */
  title: string;
  /** The note's icon, if it has one: a leading emoji in the file name, a frontmatter icon, or an Iconize icon. */
  icon?: SermonIcon;
  /** Key verse reference as shown, e.g. "Lu-ca 18:22". */
  verseRef: string;
  /** Key verse text looked up from the linked Bible note. Empty when not found. */
  verseText: string;
  /** Passage reference, e.g. "Lu-ca 18:18-30". */
  passageRef: string;
  church: string[];
  date: string;
  time: string;
}

export type TemplateId = "aurora" | "mist" | "noir" | "sunset" | "pearl" | "glacial" | "glacial-dark" | "golden" | "golden-dark";
export type RatioId = "1:1" | "4:5" | "3:4" | "9:16" | "16:9" | "4:3";

export interface TemplateSpec {
  id: TemplateId;
  name: string;
  /** Content sits on a frosted-glass panel. */
  glass: boolean;
  /** Number of blurred colour blobs in the background. */
  blobs: number;
  /** How the verse reference is shown: plain text, or in a small glass pill. */
  refStyle: "text" | "pill";
  /** Big decorative opening quote mark, or the verse wrapped in “ ” inline. */
  quotes: "mark" | "inline";
  /** Centre the whole layout (Golden) instead of left-aligning it. */
  center: boolean;
}

export const TEMPLATES: TemplateSpec[] = [
  { id: "aurora", name: "Aurora (dark mesh gradient, frosted glass)", glass: true, blobs: 4, refStyle: "text", quotes: "mark", center: false },
  { id: "mist", name: "Mist (light pastel, frosted glass)", glass: true, blobs: 4, refStyle: "text", quotes: "mark", center: false },
  { id: "noir", name: "Noir (black, soft glow, minimal)", glass: false, blobs: 2, refStyle: "pill", quotes: "mark", center: false },
  { id: "sunset", name: "Sunset (warm gradient, glass panel)", glass: true, blobs: 3, refStyle: "text", quotes: "mark", center: false },
  { id: "pearl", name: "Pearl (white, iridescent glass)", glass: true, blobs: 4, refStyle: "text", quotes: "mark", center: false },
  { id: "glacial", name: "Glacial (frosted blue-gray glass, light)", glass: true, blobs: 3, refStyle: "text", quotes: "mark", center: false },
  { id: "glacial-dark", name: "Glacial (frosted blue-gray glass, dark)", glass: true, blobs: 3, refStyle: "text", quotes: "mark", center: false },
  { id: "golden", name: "Golden (ivory paper, gold frame, classic serif)", glass: false, blobs: 0, refStyle: "text", quotes: "inline", center: true },
  { id: "golden-dark", name: "Golden (dark: deep brown, gold frame, classic serif)", glass: false, blobs: 0, refStyle: "text", quotes: "inline", center: true },
];

export const RATIOS: { id: RatioId; name: string; width: number; height: number }[] = [
  { id: "1:1", name: "Square 1:1 (Instagram, Zalo)", width: 1080, height: 1080 },
  { id: "4:5", name: "Portrait 4:5 (Instagram feed)", width: 1080, height: 1350 },
  { id: "3:4", name: "Portrait 3:4", width: 1080, height: 1440 },
  { id: "9:16", name: "Story 9:16 (Stories, Reels, phone wallpaper)", width: 1080, height: 1920 },
  { id: "16:9", name: "Landscape 16:9 (slides, YouTube, Facebook cover)", width: 1920, height: 1080 },
  { id: "4:3", name: "Landscape 4:3", width: 1440, height: 1080 },
];

export function ratioSize(id: RatioId): { width: number; height: number } {
  const r = RATIOS.find((x) => x.id === id) ?? RATIOS[0];
  return { width: r.width, height: r.height };
}
