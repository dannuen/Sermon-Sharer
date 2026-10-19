import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const mode = process.argv[2];
const prod = mode === "production";

if (mode === "harness") {
  // Browser bundle used only by scripts/render-sample.mjs to check the look outside Obsidian.
  await esbuild.build({
    entryPoints: ["scripts/harness.ts"],
    bundle: true,
    format: "iife",
    target: "es2020",
    outfile: "scripts/.harness/harness.js",
    logLevel: "info",
  });
  process.exit(0);
}

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian", "electron",
    "@codemirror/autocomplete", "@codemirror/collab", "@codemirror/commands", "@codemirror/language",
    "@codemirror/lint", "@codemirror/search", "@codemirror/state", "@codemirror/view",
    "@lezer/common", "@lezer/highlight", "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

if (prod) {
  await ctx.rebuild();
  process.exit(0);
} else {
  await ctx.watch();
}
