import { App, DropdownComponent, Modal, Notice, Platform, Setting, TFile, normalizePath, setIcon } from "obsidian";
import { dataUrlToBytes, renderPng } from "./export";
import { buildCard, layoutCard } from "./render";
import { RATIOS, RatioId, SermonData, TEMPLATES, TemplateId, ratioSize } from "./types";
import type { SermonSharerSettings } from "./settings";

export class PreviewModal extends Modal {
  private template: TemplateId;
  private ratio: RatioId;
  private showIcon: boolean;
  private previewHost!: HTMLElement;
  private busy = false;

  constructor(
    app: App,
    private data: SermonData,
    private file: TFile,
    private settings: SermonSharerSettings,
    private onSettingsChange: (s: SermonSharerSettings) => Promise<void>
  ) {
    super(app);
    this.template = settings.template;
    this.ratio = settings.ratio;
    this.showIcon = settings.showIcon;
  }

  private renderOptions() {
    return { showFooter: this.settings.showFooter, showIcon: this.showIcon, renderLucide: (el: HTMLElement, name: string) => setIcon(el, name) };
  }

  onOpen(): void {
    this.modalEl.addClass("ss-modal");
    this.titleEl.setText("Sermon hero image");
    const { contentEl } = this;

    if (!this.data.verseText && this.data.verseRef) {
      contentEl.createDiv({
        cls: "ss-warning",
        text: `Could not find the text for "${this.data.verseRef}". Only the reference will be shown. Check that the verse link points to a heading in the Bible note.`,
      });
    }

    const controls = contentEl.createDiv({ cls: "ss-controls" });
    new Setting(controls).setName("Template").addDropdown((d: DropdownComponent) => {
      TEMPLATES.forEach((t) => d.addOption(t.id, t.name));
      d.setValue(this.template).onChange((v) => {
        this.template = v as TemplateId;
        this.renderPreview();
      });
    });
    new Setting(controls).setName("Orientation").addDropdown((d: DropdownComponent) => {
      RATIOS.forEach((r) => d.addOption(r.id, r.name));
      d.setValue(this.ratio).onChange((v) => {
        this.ratio = v as RatioId;
        this.renderPreview();
      });
    });

    if (this.data.icon) {
      new Setting(controls).setName("Show icon").setDesc("The note's icon above the title.").addToggle((t) =>
        t.setValue(this.showIcon).onChange((v) => {
          this.showIcon = v;
          this.renderPreview();
        })
      );
    }

    this.previewHost = contentEl.createDiv({ cls: "ss-preview-host" });
    this.renderPreview();

    const actions = contentEl.createDiv({ cls: "ss-actions" });
    actions.createEl("button", { text: "Copy to clipboard" }).addEventListener("click", () => this.run(() => this.copy()));
    const saveBtn = actions.createEl("button", { text: "Save to vault", cls: "mod-cta" });
    saveBtn.addEventListener("click", () => this.run(() => this.save()));
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderPreview(): void {
    this.previewHost.empty();
    const { width, height } = ratioSize(this.ratio);
    const hostW = this.previewHost.clientWidth || this.contentEl.clientWidth || 520;
    const maxW = Math.min(520, Math.max(200, hostW));
    const maxH = Platform.isMobile ? Math.max(260, window.innerHeight * 0.45) : 520;
    const scale = Math.min(maxW / width, maxH / height);
    const frame = this.previewHost.createDiv({ cls: "ss-preview-frame" });
    frame.style.width = `${Math.round(width * scale)}px`;
    frame.style.height = `${Math.round(height * scale)}px`;
    const card = buildCard(document, this.data, this.template, this.ratio, this.renderOptions());
    card.style.transform = `scale(${scale})`;
    frame.appendChild(card);
    // Measure at natural size: scale does not affect layout, so autoFit works on the scaled element too.
    layoutCard(card);
  }

  private async run(fn: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.modalEl.addClass("ss-busy");
    try {
      await this.rememberChoice();
      await fn();
    } catch (e) {
      console.error("Sermon Sharer", e);
      new Notice(`Sermon Sharer: ${(e as Error).message ?? e}`);
    } finally {
      this.busy = false;
      this.modalEl.removeClass("ss-busy");
    }
  }

  private async rememberChoice(): Promise<void> {
    if (this.settings.template !== this.template || this.settings.ratio !== this.ratio || this.settings.showIcon !== this.showIcon) {
      this.settings.template = this.template;
      this.settings.ratio = this.ratio;
      this.settings.showIcon = this.showIcon;
      await this.onSettingsChange(this.settings);
    }
  }

  private async png(): Promise<string> {
    const pixelRatio = Platform.isMobile ? Math.min(this.settings.pixelRatio, 1.5) : this.settings.pixelRatio;
    return renderPng(document, this.data, this.template, this.ratio, { pixelRatio, ...this.renderOptions() });
  }

  private async copy(): Promise<void> {
    const dataUrl = await this.png();
    const nav = navigator as Navigator & { clipboard?: Clipboard };
    const ClipboardItemCtor = (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (nav.clipboard?.write && ClipboardItemCtor) {
      try {
        const blob = new Blob([dataUrlToBytes(dataUrl)], { type: "image/png" });
        await nav.clipboard.write([new ClipboardItemCtor({ "image/png": blob })]);
        new Notice("Sermon image copied to clipboard.");
        return;
      } catch (e) {
        console.warn("Sermon Sharer: clipboard write failed", e);
      }
    }
    if (Platform.isDesktopApp) {
      // Desktop fallback through Electron (never present on mobile).
      const electron = (window as Window & { require?: (m: string) => any }).require?.("electron");
      if (electron?.clipboard && electron?.nativeImage) {
        electron.clipboard.writeImage(electron.nativeImage.createFromDataURL(dataUrl));
        new Notice("Sermon image copied to clipboard.");
        return;
      }
    }
    // Mobile without image clipboard support: save the file instead and say so.
    const created = await this.writeToVault(dataUrl);
    new Notice(`Clipboard images are not supported here. Saved ${created.path} instead; share it from the file.`);
  }

  private async save(): Promise<void> {
    const dataUrl = await this.png();
    const created = await this.writeToVault(dataUrl);
    new Notice(`Saved ${created.path}`);
    if (this.settings.openAfterSave) await this.app.workspace.getLeaf("tab").openFile(created);
    this.close();
  }

  private async writeToVault(dataUrl: string): Promise<TFile> {
    const folder = normalizePath(this.settings.outputFolder || "/");
    if (folder && folder !== "/" && !(await this.app.vault.adapter.exists(folder))) {
      await this.app.vault.createFolder(folder);
    }
    const safeTitle = this.data.title.replace(/[\\/:*?"<>|#^[\]]/g, "-").trim() || "sermon";
    const suffix = this.ratio.replace(":", "x");
    let path = normalizePath(`${folder === "/" ? "" : folder + "/"}${safeTitle} (${suffix}).png`);
    let n = 2;
    while (await this.app.vault.adapter.exists(path)) {
      path = normalizePath(`${folder === "/" ? "" : folder + "/"}${safeTitle} (${suffix}) ${n++}.png`);
    }
    return this.app.vault.createBinary(path, dataUrlToBytes(dataUrl));
  }
}
