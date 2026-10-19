import { Notice, Plugin, TFile } from "obsidian";
import { ensureFonts, removeFonts } from "./fonts";
import { PreviewModal } from "./modal";
import { readSermon } from "./sermon";
import { DEFAULT_SETTINGS, SermonSharerSettingTab, SermonSharerSettings } from "./settings";

export default class SermonSharerPlugin extends Plugin {
  settings: SermonSharerSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    ensureFonts(document);

    this.addRibbonIcon("image", "Create sermon hero image", () => this.openForActiveFile());
    // On mobile the ribbon is hidden by default; the command palette and the file menu still reach it.
    this.addCommand({
      id: "create-hero-image",
      name: "Create hero image from current sermon",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) this.openFor(file);
        return true;
      },
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFile && file.extension === "md") {
          menu.addItem((item) =>
            item.setTitle("Create sermon hero image").setIcon("image").onClick(() => this.openFor(file))
          );
        }
      })
    );
    this.addSettingTab(new SermonSharerSettingTab(this.app, this));
  }

  onunload(): void {
    removeFonts(document);
  }

  private openForActiveFile(): void {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new Notice("Open a sermon note first.");
      return;
    }
    this.openFor(file);
  }

  async openFor(file: TFile): Promise<void> {
    const s = this.settings;
    const data = await readSermon(this.app, file, {
      bible: s.fieldBible, verse: s.fieldVerse, church: s.fieldChurch, date: s.fieldDate, time: s.fieldTime,
    });
    new PreviewModal(this.app, data, file, s, (ns) => this.saveSettings(ns)).open();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if ((this.settings.template as string) === "tamdan") this.settings.template = "golden"; // renamed template
  }

  async saveSettings(s: SermonSharerSettings = this.settings): Promise<void> {
    this.settings = s;
    await this.saveData(s);
  }
}
