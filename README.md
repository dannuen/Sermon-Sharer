# Sermon Sharer (Obsidian plugin)

Turns a sermon note into a beautiful hero image you can share on Zalo, Facebook, Instagram or Messenger. Works on desktop and on Obsidian mobile (iOS and Android).
The image shows the sermon title, the key verse text with its reference and the passage. Church, date and time are read from the note but only shown when the "Show church, date and time" setting is on.

Vietnamese diacritics render correctly: the plugin bundles **Playfair Display**, **Be Vietnam Pro**, **Inter FFS**,
**Addington CF** (italic), **Cormorant Garamond** and **EB Garamond**, subset to Latin + Vietnamese, so export works
offline and looks the same on every machine. Addington CF is a commercial face licensed to the vault owner; the other
faces are under the SIL Open Font License.

## How your sermon note should look

The title is the note's file name. A leading emoji in the file name (`🌲Bình An Trên Đất.md`) is removed from the title and kept as the note's icon, which the "Show the note's icon in the title" setting (or the Show icon toggle in the preview) places above the title. Without a leading emoji, a frontmatter `icon` field or the icon assigned by the Iconize plugin is used. Everything else comes from frontmatter:

```yaml
---
bible: "[[lu-18#18|Lu-ca 18:18-30]]"   # Kinh Thánh (passage), shown under the title
verse: "[[lu-18#22|Lu-ca 18:22]]"      # Câu gốc (key verse), its text is looked up and printed
church:
  - Hội Thánh Tin Lành Việt Nam
date:
  - "[[2026-10-19]]"                   # becomes "Chủ nhật, 19/10/2026"
time: "10:00"
---
```

The key verse text is read from the linked Bible note: `[[lu-18#22|…]]` opens note `lu-18`
and takes the text under the heading `22` (up to the next heading of the same or higher level).
Block links (`[[lu-18#^abc]]`) work too. If the display text is a range such as `Lu-ca 18:22-24`
and the link points at heading `22`, headings 22 through 24 are joined.
Field names can be changed in the plugin settings.

## Using it

1. Open a sermon note.
2. Click the **image** ribbon icon, run the command **Create hero image from current sermon**,
   or right-click the note in the file explorer.
3. In the preview, pick a template and an orientation (square 1:1, portrait 4:5, 3:4 and 9:16, landscape 16:9 and 4:3; the default is set in the plugin settings). Templates: **Aurora** (dark mesh gradient, frosted glass), **Mist** (light pastel, frosted glass), **Noir** (black with soft glow, minimal), **Sunset** (warm gradient, glass panel), **Pearl** (white, iridescent glass), **Glacial** light and dark (frosted blue-gray glass: raised panel with a bright rim, slate ink, one navy accent, Inter and Addington italic) **Golden** (ivory paper, gold double frame and fine pattern, Cormorant Garamond title in gold foil, EB Garamond verse, centred) and **Golden dark** (the same on a deep warm-brown ground with ivory text).
4. **Copy to clipboard** to paste into a chat, or **Save to vault** to write a PNG into the
   `Sermon Images` folder (configurable). On phones that cannot take an image on the clipboard the
   image is saved to the vault instead, and the export scale is capped at 1.5× to stay within memory. Long verses are shrunk automatically so they never overflow.

Portrait and square images are 1080 px wide (2160 px at the default 2× export scale); landscape images are 1920 px wide (3840 px at 2×).

## Install

**From GitHub (BRAT):** install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin, add this repository
as a beta plugin, and enable **Sermon Sharer**. BRAT keeps it up to date from the releases here.

**Manually:**

1. In your vault, create the folder `.obsidian/plugins/sermon-sharer/`.
2. Copy `main.js`, `manifest.json` and `styles.css` from this folder into it.
3. In Obsidian: Settings → Community plugins → turn off Restricted mode if needed → reload plugins → enable **Sermon Sharer**.


## How the frosted glass works

html-to-image renders through an SVG `foreignObject`, where `backdrop-filter` is ignored. Each glass panel therefore
contains its own blurred copy of the background, aligned to the card by `layoutCard()`, so the exported PNG shows
real frosted glass, identical to the preview.

## Build from source

```bash
npm install
npm run build        # type-checks and writes main.js
npm run dev          # rebuilds on change
```

### Render sample images without Obsidian

```bash
npm run sample       # writes samples/*.png using headless Chromium (Playwright)
```

If Playwright's browser is not downloaded, point `CHROMIUM_PATH` at any Chrome/Chromium binary.
`SAMPLE_COMBOS='[["aurora","1:1"]]'`, `SAMPLE_VERSE="…"` and `SAMPLE_SCALE=2` override the defaults.

### Refresh the bundled fonts

`scripts/gen-fonts.py` downloads the Vietnamese, Latin and Latin-ext subsets from Google Fonts, subsets the design-system
font files in `fonts/src/` with fontTools (`pip install fonttools brotli`), and regenerates `src/fonts-data.ts`. It needs the CSS files it reads to be fetched into `../fonts/` first
(see the script header); normally you never need to run it.

## Project layout

| Path | What it is |
| --- | --- |
| `src/main.ts` | Plugin entry: ribbon icon, command, file menu, settings |
| `src/sermon.ts` | Reads frontmatter, resolves the key verse text from the linked note |
| `src/render.ts` | Builds the card DOM, auto-fits long text, aligns the frosted-glass backgrounds (no Obsidian APIs) |
| `src/export.ts` | Renders the card to PNG with html-to-image |
| `src/modal.ts` | Preview modal with template/size pickers, copy and save |
| `src/fonts.ts`, `src/fonts-data.ts` | Bundled fonts as data URIs |
| `styles.css` | Card templates and modal styles |
| `scripts/` | Font generator and the headless sample renderer |
| `samples/` | Example output |
