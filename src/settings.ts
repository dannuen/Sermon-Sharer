import { App, PluginSettingTab, Setting } from "obsidian";
import type SermonSharerPlugin from "./main";
import { RATIOS, RatioId, TEMPLATES, TemplateId } from "./types";

export interface SermonSharerSettings {
  template: TemplateId;
  ratio: RatioId;
  pixelRatio: number;
  outputFolder: string;
  openAfterSave: boolean;
  showFooter: boolean;
  showIcon: boolean;
  fieldBible: string;
  fieldVerse: string;
  fieldChurch: string;
  fieldDate: string;
  fieldTime: string;
}

export const DEFAULT_SETTINGS: SermonSharerSettings = {
  template: "aurora",
  ratio: "1:1",
  pixelRatio: 2,
  outputFolder: "Sermon Images",
  openAfterSave: false,
  showFooter: false,
  showIcon: false,
  fieldBible: "bible",
  fieldVerse: "verse",
  fieldChurch: "church",
  fieldDate: "date",
  fieldTime: "time",
};

export class SermonSharerSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SermonSharerPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const save = () => this.plugin.saveSettings();

    new Setting(containerEl).setName("Default template").addDropdown((d) => {
      TEMPLATES.forEach((t) => d.addOption(t.id, t.name));
      d.setValue(s.template).onChange(async (v) => { s.template = v as TemplateId; await save(); });
    });
    new Setting(containerEl).setName("Default orientation and size").setDesc("Used when the preview opens; you can still change it there.").addDropdown((d) => {
      RATIOS.forEach((r) => d.addOption(r.id, r.name));
      d.setValue(s.ratio).onChange(async (v) => { s.ratio = v as RatioId; await save(); });
    });
    new Setting(containerEl)
      .setName("Export scale")
      .setDesc("1 = 1080 px wide, 2 = 2160 px wide (sharper, larger file).")
      .addDropdown((d) => {
        d.addOption("1", "1×").addOption("2", "2×").addOption("3", "3×");
        d.setValue(String(s.pixelRatio)).onChange(async (v) => { s.pixelRatio = Number(v); await save(); });
      });
    new Setting(containerEl)
      .setName("Output folder")
      .setDesc("Vault folder where images are saved.")
      .addText((t) => t.setValue(s.outputFolder).onChange(async (v) => { s.outputFolder = v.trim(); await save(); }));
    new Setting(containerEl)
      .setName("Show the note's icon in the title")
      .setDesc("The leading emoji of the file name (or the note's frontmatter / Iconize icon) above the title. The emoji is always removed from the title text itself.")
      .addToggle((t) => t.setValue(s.showIcon).onChange(async (v) => { s.showIcon = v; await save(); }));
    new Setting(containerEl)
      .setName("Show church, date and time")
      .setDesc("Adds a small footer with the church, date and time fields.")
      .addToggle((t) => t.setValue(s.showFooter).onChange(async (v) => { s.showFooter = v; await save(); }));
    new Setting(containerEl)
      .setName("Open image after saving")
      .addToggle((t) => t.setValue(s.openAfterSave).onChange(async (v) => { s.openAfterSave = v; await save(); }));

    new Setting(containerEl).setName("Frontmatter fields").setHeading();
    const field = (name: string, key: keyof SermonSharerSettings, desc: string) =>
      new Setting(containerEl).setName(name).setDesc(desc).addText((t) =>
        t.setValue(String(s[key])).onChange(async (v) => { (s as any)[key] = v.trim(); await save(); })
      );
    field("Passage (Kinh Thánh)", "fieldBible", 'e.g. bible: "[[lu-18#18|Lu-ca 18:18-30]]"');
    field("Key verse (Câu gốc)", "fieldVerse", 'e.g. verse: "[[lu-18#22|Lu-ca 18:22]]"');
    field("Church", "fieldChurch", "A list of churches.");
    field("Date", "fieldDate", "A date or a list with a wikilink to a daily note.");
    field("Time", "fieldTime", "Service time.");
  }
}
