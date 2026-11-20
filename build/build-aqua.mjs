// Build the Aqua client plugin for this DSH build (0.2.2-rc.1 desktop).
//
// Input : the improved bundle from colm20060530/harness-desktop
//         (+ its aqua-overrides.css global-glass supplement)
// Output: D:\harnessproject\aqua\package\@deepseek-ai\dsh-client-ui-aqua
//
// Patches applied to lib/client.js:
//   1. @deepseek-ai/dsh-client-runtime/client -> @deepseek-ai/dsh-client-store
//      (0.2.x moved defineStore into the client store package)
//   2. IconCheckOutline16 -> icon-name fallback (0.2.x renamed the icon set)
//   3. settings.plugin.item registration guarded (that slot no longer exists in 0.2.x)
//   4. default backdrop fluid instead of the Electron-seeded idb video wallpaper
//   5. aqua-overrides.css inlined as a fifth style[data-plugin-css] tag
//      (Harness Desktop injected it through webContents.executeJavaScript)

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'D:\\harnessproject\\_aqua\\harness-desktop\\desktop\\resources\\plugins\\@deepseek-ai\\dsh-client-ui-aqua';
const OVERRIDES = 'D:\\harnessproject\\_aqua\\harness-desktop\\desktop\\resources\\aqua-overrides.css';
const OUT = 'D:\\harnessproject\\aqua\\package\\@deepseek-ai\\dsh-client-ui-aqua';

const PACKAGE = '@deepseek-ai/dsh-client-ui-aqua';

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`anchor missing: ${label}`);
  if (text.indexOf(from, first + 1) >= 0) throw new Error(`anchor not unique: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

function replaceAll(text, from, to, expected, label) {
  const count = text.split(from).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} occurrences, found ${count}`);
  return text.split(from).join(to);
}

let js = readFileSync(join(SRC, 'lib', 'client.js'), 'utf8');
let overridesCss = readFileSync(OVERRIDES, 'utf8');

// 1. client store package
js = replaceOnce(
  js,
  'require("@deepseek-ai/dsh-client-runtime/client")',
  'require("@deepseek-ai/dsh-client-store")',
  'runtime/client require',
);
js = replaceAll(js, '_deepseek_ai_dsh_client_runtime_client', '_deepseek_ai_dsh_client_store', 2, 'client store namespace');

// 2. icon fallback: 0.2.x renamed IconCheckOutline16 -> IconCheckOutlineRegular/Medium
js = replaceAll(js, '_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16', 'AquaCheckIcon', 6, 'icon references');
js = replaceOnce(
  js,
  '\t\tlet _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");',
  '\t\tlet _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");\n'
    + '\t\t/* dsh 0.2.x renamed the checkbox icon; fall back across the old and new names. */\n'
    + '\t\tconst AquaCheckIcon = _deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16\n'
    + '\t\t\t?? _deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular\n'
    + '\t\t\t?? _deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineMedium\n'
    + '\t\t\t?? (() => null);',
  'primitives require',
);

// 3. the master-switch card slot does not exist in 0.2.x; keep the rest of apply alive.
js = replaceOnce(
  js,
  '\t\t\tctx.slots.inject("settings.plugin.item", () => ctx.slots.register({',
  '\t\t\ttry {\n\t\t\tctx.slots.inject("settings.plugin.item", () => ctx.slots.register({',
  'plugin card registration',
);
js = replaceOnce(
  js,
  '\t\t\t}, AquaPluginCard));\n',
  '\t\t\t}, AquaPluginCard));\n'
    + '\t\t\t} catch (error) {\n'
    + '\t\t\t\tglobalThis.console?.warn("ui-aqua: settings.plugin.item is not part of this DSH build; the master switch card is skipped", error);\n'
    + '\t\t\t}\n',
  'plugin card registration end',
);

// 4. default backdrop: a video the host half streams from disk
//    (lib/index.js registers `/aqua/wallpaper.mp4`), with the improved build's
//    still frame as the fallback image.
const WALLPAPER_ASSET = 'assets/wallpaper.jpg';
const WALLPAPER_URL = `plugins/${PACKAGE}/${WALLPAPER_ASSET}`;
const VIDEO_URL = 'aqua/wallpaper.mp4';
js = replaceAll(js, 'wallpaper: "idb:default-video",', `wallpaper: ${JSON.stringify(VIDEO_URL)},`, 2, 'default wallpaper');

// The readers own the real first-run defaults (SETTINGS_DEFAULTS only seeds the
// settings store), so the backdrop must switch there too.
js = replaceOnce(
  js,
  '\t\t/** Read the backdrop source (\'fluid\' or \'wallpaper\'). */\n\t\tfunction readBackground() {',
  '\t\t/** Shipped first-run wallpaper: the video the host half streams, with the\n'
    + '\t\t*  improved build\'s still frame as the fallback image. */\n'
    + `\t\tconst DEFAULT_WALLPAPER = ${JSON.stringify(VIDEO_URL)};\n`
    + '\t\t/** Read the backdrop source (\'fluid\' or \'wallpaper\'); wallpaper is the shipped default. */\n'
    + '\t\tfunction readBackground() {',
  'readBackground doc comment',
);
js = replaceOnce(
  js,
  '\t\t\t\treturn localStorage.getItem(BACKGROUND_KEY) === "wallpaper" ? "wallpaper" : "fluid";',
  '\t\t\t\treturn localStorage.getItem(BACKGROUND_KEY) === "fluid" ? "fluid" : "wallpaper";',
  'readBackground default',
);
js = replaceOnce(
  js,
  '\t\t\t\treturn localStorage.getItem(WALLPAPER_KEY) ?? "";',
  '\t\t\t\treturn localStorage.getItem(WALLPAPER_KEY) ?? DEFAULT_WALLPAPER;',
  'readWallpaper default',
);

// 4b. a plain URL ending in a video extension has to take the video branch.
js = replaceAll(
  js,
  'wallpaper.startsWith("data:video/") || wallpaper.startsWith("idb:") || wallpaper.startsWith("fsa:")',
  'wallpaper.startsWith("data:video/") || wallpaper.startsWith("idb:") || wallpaper.startsWith("fsa:") || /\\.(mp4|webm|ogv|mov|m4v|mkv)([?#]|$)/i.test(wallpaper)',
  2,
  'video detection',
);

// 4d. one-time settings migration: earlier builds shipped a fluid default and the
//     first video attempt left a 2px blur behind, so reset the aqua keys once.
//
//     The wipe must run inside apply(): the schema lives on the loader-row config,
//     and module scope has no `ctx` — a top-level `ctx.config` reference throws
//     "ctx is not defined" and the whole client entry fails to import (boot error).
js = replaceOnce(
  js,
  '\t\t/** Read the persisted enable flag (absent storage means on). */',
  '\t\t/** Storage key stamping the schema version the current keys were written under. */\n'
    + '\t\tconst AQUA_SCHEMA_KEY = "dsh.ui-aqua.schema";\n'
    + '\t\t/** Schema shipped with this build; the loader row may pin a different one. */\n'
    + '\t\tconst AQUA_SCHEMA_VERSION = "4";\n'
    + '\t\t/**\n'
    + '\t\t* Wipe aqua keys written under an older schema, then stamp the current one.\n'
    + '\t\t* The master switch survives so a disabled skin stays disabled.\n'
    + '\t\t* @param config - loader-row config (`schema` overrides the build default).\n'
    + '\t\t*/\n'
    + '\t\tfunction migrateAquaSchema(config) {\n'
    + '\t\t\ttry {\n'
    + '\t\t\t\tconst schema = String(config?.schema ?? AQUA_SCHEMA_VERSION);\n'
    + '\t\t\t\tif (localStorage.getItem(AQUA_SCHEMA_KEY) === schema) return;\n'
    + '\t\t\t\tfor (const key of Object.keys(localStorage)) if (key.startsWith("dsh.ui-aqua.") && key !== AQUA_SCHEMA_KEY && key !== "dsh.ui-aqua.enabled") localStorage.removeItem(key);\n'
    + '\t\t\t\tlocalStorage.setItem(AQUA_SCHEMA_KEY, schema);\n'
    + '\t\t\t} catch {}\n'
    + '\t\t}\n'
    + '\t\t/** Read the persisted enable flag (absent storage means on). */',
  'settings migration',
);
// ... and the call site: apply() is the first place where the loader config exists.
js = replaceOnce(
  js,
  '\t\tfunction apply(ctx) {',
  '\t\tfunction apply(ctx, config) {\n\t\t\tmigrateAquaSchema(config);',
  'settings migration call',
);


// 4c. the shipped wallpaper is dimmed and softened the way the improved build
//     dims its default video, so text stays readable over a bright image.
js = replaceAll(js, 'wallpaperBlur: 0,', 'wallpaperBlur: 10,', 2, 'default wallpaper blur');
js = replaceAll(js, 'wallpaperFrost: 0,', 'wallpaperFrost: 70,', 2, 'default wallpaper frost');
// 4e. video wallpaper tuning: a touch of blur, and a bright enough picture that
//     the glass still reads as glass.
js = replaceAll(js, 'videoBlur: 6,', 'videoBlur: 14,', 2, 'default video blur');
js = replaceAll(js, 'videoBrightness: 20,', 'videoBrightness: 50,', 1, 'default video brightness');
js = replaceAll(js, 'videoBrightness: 20\n', 'videoBrightness: 50\n', 1, 'default video brightness (object literal)');

// 4f. the 0.2.2 desktop shell paints the chat column and the empty right panel
//     with an opaque rgb(12 18 27); the browser build does not. Give them glass.
const shellCss = `
/* ============ 6. dsh 0.2.2 desktop shell surfaces ============ */
/* The desktop shell paints the conversation column (and the empty right panel)
   with an opaque background; keep the wallpaper visible behind the glass. */
html[data-dsh-aqua][data-dsh-float] [class*="centerCol"] {
  background: rgba(12, 18, 27, 0.58) !important;
}
html[data-dsh-aqua][data-dsh-float] body:not([data-ds-dark-theme]) [class*="centerCol"] {
  background: rgba(255, 255, 255, 0.5) !important;
}
html[data-dsh-aqua][data-dsh-float] [class*="emptyTabHost"] {
  background: transparent !important;
}
`;
overridesCss = overridesCss + shellCss;
// 5c. performance pass.
//   - saturate() beside a blur forces an extra colour-matrix pass; all 28 uses sit
//     inside backdrop-filter, so dropping it costs nothing visually.
//   - inline code / pre / select / dialog buttons are tiny or numerous; a live
//     backdrop there is invisible and pays a render pass per element
//     (a chat view had 40 <code> + 4 <pre> out of 57 glass elements).
//   - the decorative critters are pure compositing cost over a wallpaper.

const perfCss = `
/* ============ 7. render-pass budget ============ */
/* Small or numerous elements never need a live backdrop: an inline <code> is a
   few characters wide, and its own colour-mix fill already reads as glass. */
html[data-dsh-aqua] :is(code, kbd, samp, pre, select, option, label, span, b, i, em, strong, small) {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
html[data-dsh-aqua] [role="dialog"] button,
html[data-dsh-aqua] [role="dialog"] [class*="segItem"],
html[data-dsh-aqua] [role="dialog"] [class*="navCell"] {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
/* The dialog scrim covers the viewport; blurring it buys nothing. */
html[data-dsh-aqua] div[role="presentation"] > [class*="mask"] {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
/* Fish, bubbles and plankton only make sense over the fluid board. */
html[data-dsh-aqua][data-dsh-aqua-wallpaper] [data-aqua-critter] {
  display: none !important;
}
/* NOTE: an earlier pass disabled backdrop-filter on EVERY element over a
   wallpaper ("the wallpaper layer already blurred the pixels"). That killed the
   glass knobs: 模糊度 writes --dsh-aqua-blur, which only feeds backdrop-filter,
   so the slider moved and nothing changed. The filter is back on; the budget is
   paid by the scoped rules above (tiny/numerous elements, dialog chips, scrim). */
`;

// 5d. the frost knob (磨砂度) has to reach the surfaces that actually cover the
//     window in wallpaper mode. Those three were hardcoded rgba() values, so the
//     slider moved without changing anything the user could see.
const frostCss = `
/* ============ 8. wallpaper-mode surfaces follow the glass knobs ============ */
/* Bubbles over a video wallpaper: keep the readability floor, let 磨砂度 move it.
   The selectors mirror the hardcoded rules above down to the attribute list —
   with equal specificity the later !important wins, with less it does not. */
html[data-dsh-aqua][data-dsh-float][data-dsh-aqua-wallpaper][data-dsh-aqua-media="video"] [class*="bubble"] {
  background: color-mix(in srgb, #ffffff calc(34% + 10% * var(--dsh-aqua-frost, 1)), transparent) !important;
  -webkit-backdrop-filter: blur(var(--dsh-aqua-blur, 12px)) !important;
  backdrop-filter: blur(var(--dsh-aqua-blur, 12px)) !important;
}
html[data-dsh-aqua][data-dsh-float][data-dsh-aqua-wallpaper][data-dsh-aqua-media="video"] body[data-ds-dark-theme] [class*="bubble"] {
  background: color-mix(in srgb, #1a2330 calc(34% + 8% * var(--dsh-aqua-frost, 1)), transparent) !important;
}
/* The conversation column is the largest surface on screen. It stays a plain
   tint — no backdrop-filter here: blurring the whole column costs a full-screen
   pass per frame and only made the video read as flat murk. */
html[data-dsh-aqua][data-dsh-float] [class*="centerCol"] {
  background: color-mix(in srgb, #0d1521 calc(30% + 9% * var(--dsh-aqua-frost, 1)), transparent) !important;
}
html[data-dsh-aqua][data-dsh-float] body:not([data-ds-dark-theme]) [class*="centerCol"] {
  background: color-mix(in srgb, #ffffff calc(30% + 9% * var(--dsh-aqua-frost, 1)), transparent) !important;
}
/* The settings panel itself — the surface the user looks at while dragging. */
html[data-dsh-aqua][data-dsh-float] [role="dialog"][aria-modal="true"] {
  background: color-mix(in srgb, #ffffff calc(30% + 12% * var(--dsh-aqua-frost, 1)), transparent) !important;
}
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [role="dialog"][aria-modal="true"] {
  background: color-mix(in srgb, #0f1621 calc(34% + 8% * var(--dsh-aqua-frost, 1)), transparent) !important;
}
/* ============ 9. 磨砂度 must not darken the dark theme ============ */
/* The base bundle ties every dark glass fill to the frost knob
   (color-mix(#22262f, 50% * frost)): dragging 磨砂度 to the right turned the
   composer into a near-opaque dark slab, because a *dark* colour at higher
   opacity is just more darkness. Frost now reads as "more milky", not "more
   black": the fill is a light slate whose opacity stays in a narrow band. */
html[data-dsh-aqua] body[data-ds-dark-theme] {
  --dsh-aqua-glass-card-dark: color-mix(in srgb, #8b98b0 calc(14% + 10% * var(--dsh-aqua-frost, 1)), transparent);
}
/* ============ 10. floating panels: real glass, same degree as the trajectory panel ============ */
/* Menus, popovers, the slash-command list and the floating tool-detail dialog float
   above body text. They keep the glass look — fill and blur both follow the knobs —
   but sit a step denser than a card, otherwise the conversation behind them shows
   through and every label reads double. */
html[data-dsh-aqua] {
  --dsh-aqua-panel-blur: calc(var(--dsh-aqua-blur, 12px) + 10px);
}
html[data-dsh-aqua][data-dsh-float] [role="menu"],
html[data-dsh-aqua][data-dsh-float] [role="listbox"],
html[data-dsh-aqua][data-dsh-float] [class*="popover"],
html[data-dsh-aqua][data-dsh-float] [class*="dropdown"],
html[data-dsh-aqua][data-dsh-float] [class*="menuList"],
html[data-dsh-aqua][data-dsh-float] [data-dsh-surface] {
  background: color-mix(in srgb, #ffffff calc(66% + 9% * var(--dsh-aqua-frost, 1)), transparent) !important;
  -webkit-backdrop-filter: blur(var(--dsh-aqua-panel-blur, 20px)) !important;
  backdrop-filter: blur(var(--dsh-aqua-panel-blur, 20px)) !important;
  border: 1px solid color-mix(in srgb, #132d53 20%, transparent) !important;
  box-shadow: 0 12px 34px color-mix(in srgb, #132d53 26%, transparent) !important;
}
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [role="menu"],
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [role="listbox"],
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [class*="popover"],
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [class*="dropdown"],
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [class*="menuList"],
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [data-dsh-surface] {
  background: color-mix(in srgb, #9aa8c0 calc(26% + 12% * var(--dsh-aqua-frost, 1)), transparent) !important;
  border-color: color-mix(in srgb, #94b4dc 24%, transparent) !important;
  box-shadow: 0 12px 34px color-mix(in srgb, #02060e 62%, transparent) !important;
}
/* Floating detail dialogs (the trajectory tool inspector) carried a fixed
   blur(50px) and a fixed fill, so neither knob reached them. Same treatment as
   the trajectory panel: frost drives the fill, the blur knob drives the radius. */
html[data-dsh-aqua][data-dsh-float] body [role="dialog"]:not([aria-modal="true"]) {
  background: color-mix(in srgb, #ffffff calc(48% + 10% * var(--dsh-aqua-frost, 1)), transparent) !important;
  -webkit-backdrop-filter: blur(var(--dsh-aqua-panel-blur, 20px)) !important;
  backdrop-filter: blur(var(--dsh-aqua-panel-blur, 20px)) !important;
}
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [role="dialog"]:not([aria-modal="true"]) {
  background: color-mix(in srgb, #101925 calc(56% + 9% * var(--dsh-aqua-frost, 1)), transparent) !important;
}
/* A menu label must not inherit a translucent hover plate that erases it. */
html[data-dsh-aqua][data-dsh-float] [role="menu"] [role="menuitem"]:hover,
html[data-dsh-aqua][data-dsh-float] [role="listbox"] [role="option"]:hover {
  background: color-mix(in srgb, #6e9be8 18%, transparent);
}
/* ============ 11. settings cards are glass too ============ */
/* The card selectors above are case-sensitive and only matched a lowercase
   "card" class, so the settings cards (presetCard / agentCard / rowCard …) kept
   the shell's opaque fill and looked flat next to the rest of the skin. The css
   i flag matches any casing; grid/list wrappers are excluded so no double fill
   lands on a layout container. */
html[data-dsh-aqua][data-dsh-float] [role="dialog"] [class*="card" i]:not([class*="grid" i]):not([class*="list" i]),
html[data-dsh-aqua][data-dsh-float] [role="dialog"] [class*="rowcard" i],
html[data-dsh-aqua][data-dsh-float] [role="dialog"] [class*="setupcard" i],
html[data-dsh-aqua][data-dsh-float] [role="dialog"] [class*="addcard" i] {
  background: color-mix(in srgb, #ffffff calc(46% + 10% * var(--dsh-aqua-frost, 1)), transparent) !important;
  -webkit-backdrop-filter: blur(var(--dsh-aqua-panel-blur, 20px)) !important;
  backdrop-filter: blur(var(--dsh-aqua-panel-blur, 20px)) !important;
  border-color: color-mix(in srgb, #132d53 18%, transparent) !important;
  box-shadow: inset 0 1px color-mix(in srgb, #ffffff 60%, transparent),
              0 8px 24px color-mix(in srgb, #132d53 14%, transparent) !important;
}
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [role="dialog"] [class*="card" i]:not([class*="grid" i]):not([class*="list" i]),
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [role="dialog"] [class*="rowcard" i],
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [role="dialog"] [class*="setupcard" i],
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] [role="dialog"] [class*="addcard" i] {
  background: color-mix(in srgb, #9aa8c0 calc(20% + 10% * var(--dsh-aqua-frost, 1)), transparent) !important;
  border-color: color-mix(in srgb, #94b4dc 20%, transparent) !important;
  box-shadow: inset 0 1px color-mix(in srgb, #ffffff 12%, transparent),
              0 8px 24px color-mix(in srgb, #02060e 42%, transparent) !important;
}
/* ============ 12. the trajectory panel gets the same frosted fill ============ */
/* Its container was filled with --dsh-aqua-glass-card-*, which in dark mode is a
   15% slate wash — over a dimmed wallpaper that reads as plain black. Same recipe
   as the floating panels keeps the three "no effect" areas consistent. */
html[data-dsh-aqua][data-dsh-float] div:has(> [data-trajectory-scroll]) {
  background: color-mix(in srgb, #9aa8c0 calc(16% + 10% * var(--dsh-aqua-frost, 1)), transparent) !important;
  -webkit-backdrop-filter: blur(var(--dsh-aqua-panel-blur, 20px)) !important;
  backdrop-filter: blur(var(--dsh-aqua-panel-blur, 20px)) !important;
  border-color: color-mix(in srgb, #94b4dc 22%, transparent) !important;
}
html[data-dsh-aqua][data-dsh-float] body[data-ds-dark-theme] div:has(> [data-trajectory-scroll]) {
  background: color-mix(in srgb, #9aa8c0 calc(16% + 10% * var(--dsh-aqua-frost, 1)), transparent) !important;
}
`;
overridesCss = overridesCss + perfCss;
overridesCss = overridesCss + frostCss;

// 4f. the particle whale and the dot mesh are drawn for the fluid board; over a
//     wallpaper they are near-invisible decoration that still runs two
//     full-window canvas loops at 30 fps. Only mount them on the fluid board.
js = replaceAll(
  js,
  '\t\t\t\tif (this.enabled && this.settings.whale) {',
  '\t\t\t\tif (this.enabled && this.settings.whale && this.settings.background === "fluid") {',
  1,
  'whale mount guard',
);
js = replaceAll(
  js,
  '\t\t\t\tif (this.enabled && this.settings.mesh) {',
  '\t\t\t\tif (this.enabled && this.settings.mesh && this.settings.background === "fluid") {',
  1,
  'mesh mount guard',
);
// keep them in sync when the backdrop source changes
js = replaceOnce(
  js,
  '\t\t\tsetBackground(value) {\n\t\t\t\tif (value === this.settings.background) return;\n\t\t\t\tthis.settings.background = value;\n\t\t\t\twriteBackground(value);\n\t\t\t\tif (this.enabled) this.applySettings();\n\t\t\t}',
  '\t\t\tsetBackground(value) {\n\t\t\t\tif (value === this.settings.background) return;\n\t\t\t\tthis.settings.background = value;\n\t\t\t\twriteBackground(value);\n\t\t\t\tif (this.enabled) {\n\t\t\t\t\tthis.applySettings();\n\t\t\t\t\tthis.syncWhale();\n\t\t\t\t\tthis.syncMesh();\n\t\t\t\t}\n\t\t\t}',
  'setBackground sync',
);

// 4g. shipped defaults, as chosen in the running app:
//     glass blur 3px / frost 6%, video blur 2px / brightness 35, backdrop
//     brightness 46, and every ambient decoration + hover effect off.
const DEFAULT_NUMBERS = {
  'blur: 16,': 'blur: 3,',
  'frost: 13,': 'frost: 6,',
  'videoBlur: 14,': 'videoBlur: 2,',

  'bgBrightness: 50,': 'bgBrightness: 46,',
  'whale: true,': 'whale: false,',
  'critters: true,': 'critters: false,',
  'mesh: true,': 'mesh: false,',
  'spotlight: true,': 'spotlight: false,',
  'press: true,': 'press: false,',
};
for (const [from, to] of Object.entries(DEFAULT_NUMBERS)) {
  if (from === to) continue;
  js = replaceAll(js, from, to, 2, 'default ' + from.trim());
}

// 4h. the flag READERS are the real first-run defaults (the settings store only
//     seeds the UI), and they shipped "absent means on" — so a fresh install still
//     turned the whale, the fish, the mesh, the spotlight and the press effect on.
//     The shipped look has all of them off.
const FLAG_READERS = [
  ['Whale', 'WHALE_KEY', 'particle-whale'],
  ['Critters', 'CRITTERS_KEY', 'critters'],
  ['Mesh', 'MESH_KEY', 'interactive-mesh'],
  ['Spotlight', 'SPOTLIGHT_KEY', 'cursor-spotlight'],
  ['Press', 'PRESS_KEY', 'hover-press'],
];
for (const [fn, key, label] of FLAG_READERS) {
  js = replaceOnce(
    js,
    `\t\t/** Read the ${label} flag (absent means on). */`,
    `\t\t/** Read the ${label} flag (absent means off — the shipped default). */`,
    `flag doc ${fn}`,
  );
  const removeEntrance = fn === 'Press' ? '\t\t\t\tlocalStorage.removeItem("dsh.ui-aqua.entrance");\n' : '';
  js = replaceOnce(
    js,
    `\t\tfunction read${fn}() {\n\t\t\ttry {\n${removeEntrance}`
      + `\t\t\t\tconst raw = localStorage.getItem(${key});\n`
      + '\t\t\t\treturn raw === null ? true : raw === "true";\n'
      + '\t\t\t} catch {\n'
      + '\t\t\t\treturn true;\n'
      + '\t\t\t}',
    `\t\tfunction read${fn}() {\n\t\t\ttry {\n${removeEntrance}`
      + `\t\t\t\tconst raw = localStorage.getItem(${key});\n`
      + '\t\t\t\treturn raw === null ? false : raw === "true";\n'
      + '\t\t\t} catch {\n'
      + '\t\t\t\treturn false;\n'
      + '\t\t\t}',
    `flag default ${fn}`,
  );
}
// the storage-failure branches must agree with the shipped look too
js = replaceOnce(
  js,
  '\t\t\t} catch {\n\t\t\t\treturn "fluid";\n\t\t\t}\n\t\t}\n\t\t/** Persist the backdrop source. */',
  '\t\t\t} catch {\n\t\t\t\treturn "wallpaper";\n\t\t\t}\n\t\t}\n\t\t/** Persist the backdrop source. */',
  'readBackground failure default',
);
js = replaceOnce(
  js,
  '\t\t\t} catch {\n\t\t\t\treturn "";\n\t\t\t}\n\t\t}\n\t\t/** Persist the wallpaper data URL (quota failures keep it in memory only). */',
  '\t\t\t} catch {\n\t\t\t\treturn DEFAULT_WALLPAPER;\n\t\t\t}\n\t\t}\n\t\t/** Persist the wallpaper data URL (quota failures keep it in memory only). */',
  'readWallpaper failure default',
);

// 4i. the settings copy carried warning emoji; the rest of the UI has none.
js = replaceAll(js, '深色壁纸用深色模式⚠️', '深色壁纸用深色模式', 1, 'zh wallpaper hint emoji');
js = replaceAll(js, '"⚠️视频会自动压暗', '"视频会自动压暗', 1, 'zh video hint emoji');
js = replaceAll(js, 'dark wallpapers ⚠️', 'dark wallpapers', 1, 'en wallpaper hint emoji');
js = replaceAll(js, '"⚠️ The video is dimmed', '"The video is dimmed', 1, 'en video hint emoji');

// 4j. settings strings for the reset-to-defaults control.
const RESET_LOCALE = {
  zh: [
    '"aqua.frost": "磨砂度",',
    '"aqua.frost": "磨砂度",\n\t\t\t"aqua.resetDefaults": "恢复默认",\n\t\t\t"aqua.resetHint": "把上面所有玻璃参数恢复为出厂值",',
  ],
  en: [
    '"aqua.frost": "Frost",',
    '"aqua.frost": "Frost",\n\t\t\t"aqua.resetDefaults": "Reset defaults",\n\t\t\t"aqua.resetHint": "Restore every glass knob to the shipped values",',
  ],
};
for (const [lang, [from, to]] of Object.entries(RESET_LOCALE)) {
  js = replaceOnce(js, from, to, `reset strings ${lang}`);
}

// 4k. the layer can put every knob back to SETTINGS_DEFAULTS. The master switch is
//     deliberately left alone: resetting the material must not turn the skin off.
js = replaceOnce(
  js,
  '\t\t\t/** Flip the layer: persist, then apply or retract every owned effect. */',
  '\t\t\t/** Restore every knob to the shipped defaults (the master switch is kept). */\n'
    + '\t\t\tresetSettings() {\n'
    + '\t\t\t\tconst d = SETTINGS_DEFAULTS;\n'
    + '\t\t\t\twriteMode(d.mode);\n'
    + '\t\t\t\twriteBackground(d.background);\n'
    + '\t\t\t\twriteWallpaper(d.wallpaper);\n'
    + '\t\t\t\twriteWhale(d.whale);\n'
    + '\t\t\t\twriteCritters(d.critters);\n'
    + '\t\t\t\twriteMesh(d.mesh);\n'
    + '\t\t\t\twriteSpotlight(d.spotlight);\n'
    + '\t\t\t\twritePress(d.press);\n'
    + '\t\t\t\tfor (const key of Object.keys(NUMERIC_KEYS)) writeSetting(key, d[key]);\n'
    + '\t\t\t\tthis.reloadSettings();\n'
    + '\t\t\t\tthis.dark = this.resolveScheme();\n'
    + '\t\t\t\tif (this.enabled) this.sync();\n'
    + '\t\t\t}\n'
    + '\t\t\t/** Flip the layer: persist, then apply or retract every owned effect. */',
  'resetSettings method',
);

// 4l. expose reset through the row's injected actions.
js = replaceOnce(
  js,
  '\t\t\tconst appearanceInjected = (actions) => {\n\t\t\t\tappearanceBound = actions;\n\t\t\t\tsync();\n\t\t\t\treturn {',
  '\t\t\tconst appearanceInjected = (actions) => {\n\t\t\t\tappearanceBound = actions;\n\t\t\t\tsync();\n\t\t\t\treturn {\n'
    + '\t\t\t\t\treset: () => {\n'
    + '\t\t\t\t\t\tlayer.resetSettings();\n'
    + '\t\t\t\t\t\tsync();\n'
    + '\t\t\t\t\t},',
  'reset action',
);

// 4m. the row: take `reset` out of props and render a reset bar above the controls.
js = replaceOnce(
  js,
  'authorizeVideo, useStore } = props;',
  'authorizeVideo, useStore, reset } = props;',
  'row props reset',
);
js = replaceOnce(
  js,
  '\t\t\tif (!enabled) return null;',
  '\t\t\tconst resetRow = react.createElement("div", {\n'
    + '\t\t\t\tclassName: AquaAppearanceRow_module_css_default.subGroup,\n'
    + '\t\t\t\tstyle: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },\n'
    + '\t\t\t},\n'
    + '\t\t\treact.createElement("span", {\n'
    + '\t\t\t\tstyle: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px" },\n'
    + '\t\t\t}, t("aqua.resetHint")),\n'
    + '\t\t\treact.createElement("button", {\n'
    + '\t\t\t\ttype: "button",\n'
    + '\t\t\t\tonClick: () => reset(),\n'
    + '\t\t\t\tstyle: {\n'
    + '\t\t\t\t\tminWidth: "76px", height: "26px", borderRadius: "13px", cursor: "pointer",\n'
    + '\t\t\t\t\tfontSize: "12px", lineHeight: "1",\n'
    + '\t\t\t\t\tborder: "1px solid var(--dsw-alias-border-l2)",\n'
    + '\t\t\t\t\tbackground: "var(--dsw-alias-bg-layer-2)",\n'
    + '\t\t\t\t\tcolor: "var(--dsw-alias-label-primary)",\n'
    + '\t\t\t\t},\n'
    + '\t\t\t}, t("aqua.resetDefaults")));\n'
    + '\t\t\tif (!enabled) return null;',
  'reset row element',
);
js = replaceOnce(
  js,
  '\t\t\t\tclassName: AquaAppearanceRow_module_css_default.group,\n\t\t\t\tchildren: [',
  '\t\t\t\tclassName: AquaAppearanceRow_module_css_default.group,\n\t\t\t\tchildren: [\n\t\t\t\t\tresetRow,',
  'reset row first child',
);

// 5. inline the global-glass supplement next to the plugin's own four stylesheets
const overridesBlock =
  '\t\t//#region aqua-overrides: Harness Desktop global glass supplement\n'
  + '\t\tconst AQUA_OVERRIDES_TAG_ID = ' + JSON.stringify(PACKAGE + '/aqua-overrides.css') + ';\n'
  + '\t\tconst AQUA_OVERRIDES_CSS = ' + JSON.stringify(overridesCss) + ';\n'
  + '\t\tif (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(AQUA_OVERRIDES_TAG_ID) + "]") === null && document.getElementById("hd-aqua-overrides") === null) {\n'
  + '\t\t\tconst overridesTag = document.createElement("style");\n'
  + '\t\t\toverridesTag.dataset.plugin = ' + JSON.stringify(PACKAGE) + ';\n'
  + '\t\t\toverridesTag.dataset.pluginCss = AQUA_OVERRIDES_TAG_ID;\n'
  + '\t\t\toverridesTag.textContent = AQUA_OVERRIDES_CSS;\n'
  + '\t\t\tdocument.head.appendChild(overridesTag);\n'
  + '\t\t}\n'
  + '\t\t//#endregion\n';
js = replaceOnce(js, '\t\t//#region src/client/index.ts', overridesBlock + '\t\t//#region src/client/index.ts', 'client index region');

// 6. master on/off switch. 0.2.x dropped the settings.plugin.item card, so the
//    switch lives at the top of the General → Appearance area next to the knobs.
const switchBlock =
  '\t\t//#region aqua master switch row\n'
  + '\t\t/**\n'
  + '\t\t* Master on/off row for the whole skin. Mirrors the durable flag the layer\n'
  + '\t\t* already owns, so switching it off disposes every glass effect at once.\n'
  + '\t\t*/\n'
  + '\t\tfunction AquaSwitchRow(props) {\n'
  + '\t\t\tconst enabled = props.useStore((s) => s.enabled);\n'
  + '\t\t\tconst label = (key, fallback) => {\n'
  + '\t\t\t\ttry {\n'
  + '\t\t\t\t\tconst value = props.t(key);\n'
  + '\t\t\t\t\treturn typeof value === "string" && value !== "" && value !== key ? value : fallback;\n'
  + '\t\t\t\t} catch {\n'
  + '\t\t\t\t\treturn fallback;\n'
  + '\t\t\t\t}\n'
  + '\t\t\t};\n'
  + '\t\t\treturn react.createElement("div", {\n'
  + '\t\t\t\tstyle: {\n'
  + '\t\t\t\t\tdisplay: "flex", alignItems: "center", justifyContent: "space-between",\n'
  + '\t\t\t\t\tgap: "12px", padding: "10px 0", borderBottom: "1px solid var(--dsw-alias-border-l2)",\n'
  + '\t\t\t\t}\n'
  + '\t\t\t},\n'
  + '\t\t\treact.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 } },\n'
  + '\t\t\t\treact.createElement("span", { style: { color: "var(--dsw-alias-label-primary)", fontSize: "13px" } }, label("aqua.title", "Aqua 玻璃拟态")),\n'
  + '\t\t\t\treact.createElement("span", { style: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px" } }, enabled ? label("aqua.enable", "已开启") : label("aqua.disable", "已关闭"))),\n'
  + '\t\t\treact.createElement("button", {\n'
  + '\t\t\t\ttype: "button",\n'
  + '\t\t\t\trole: "switch",\n'
  + '\t\t\t\t"aria-checked": enabled ? "true" : "false",\n'
  + '\t\t\t\t"data-aqua-switch": enabled ? "on" : "off",\n'
  + '\t\t\t\tonClick: () => props.setEnabled(!enabled),\n'
  + '\t\t\t\tstyle: {\n'
  + '\t\t\t\t\tminWidth: "64px", height: "26px", borderRadius: "13px",\n'
  + '\t\t\t\t\tborder: "1px solid " + (enabled ? "transparent" : "var(--dsw-alias-border-l2)"),\n'
  + '\t\t\t\t\tbackground: enabled ? "var(--dsw-alias-state-business-primary, #4d6bfe)" : "var(--dsw-alias-bg-layer-2)",\n'
  + '\t\t\t\t\tcolor: enabled ? "#fff" : "var(--dsw-alias-label-secondary)",\n'
  + '\t\t\t\t\tcursor: "pointer", fontSize: "12px", lineHeight: "1",\n'
  + '\t\t\t\t}\n'
  + '\t\t\t}, enabled ? label("aqua.disable", "关闭") : label("aqua.enable", "开启")));\n'
  + '\t\t}\n'
  + '\t\t//#endregion\n';
js = replaceOnce(js, '\t\t//#region src/client/index.ts', switchBlock + '\t\t//#region src/client/index.ts', 'switch row block');

// 6c. keyboard escape hatch: Ctrl+Alt+A flips the whole skin without opening
//     Settings, and it is the switch that works even if a build drops the slot.
js = replaceOnce(
  js,
  '\t\t\tctx.slots.inject("settings.plugin.item", () => ctx.slots.register({',
  '\t\t\t// Ctrl+Alt+A toggles the skin from anywhere (the Settings row mirrors it).\n'
    + '\t\t\tctx.effect(() => {\n'
    + '\t\t\t\tconst onKey = (event) => {\n'
    + '\t\t\t\t\tif (!event.ctrlKey || !event.altKey || event.repeat) return;\n'
    + '\t\t\t\t\tif (event.key !== "a" && event.key !== "A") return;\n'
    + '\t\t\t\t\tevent.preventDefault();\n'
    + '\t\t\t\t\tlayer.setEnabled(!layer.getEnabled());\n'
    + '\t\t\t\t\tsync();\n'
    + '\t\t\t\t};\n'
    + '\t\t\t\twindow.addEventListener("keydown", onKey, true);\n'
    + '\t\t\t\treturn () => window.removeEventListener("keydown", onKey, true);\n'
    + '\t\t\t}, "ui-aqua: Ctrl+Alt+A toggle");\n'
    + '\t\t\tctx.slots.inject("settings.plugin.item", () => ctx.slots.register({',
  'toggle shortcut',
);
js = replaceOnce(
  js,
  '\t\t\tctx.slots.inject("settings.general.item", () => ctx.slots.register({\n\t\t\t\tname: "settings.general.item",\n\t\t\t\tid: "aqua",\n\t\t\t\torder: 11,',
  '\t\t\ttry {\n'
    + '\t\t\t\tctx.slots.inject("settings.general.item", () => ctx.slots.register({\n'
    + '\t\t\t\t\tname: "settings.general.item",\n'
    + '\t\t\t\t\tid: "aqua-switch",\n'
    + '\t\t\t\t\torder: 9,\n'
    + '\t\t\t\t\tstore: pluginStore,\n'
    + '\t\t\t\t\tlocale: NS,\n'
    + '\t\t\t\t\tinject: pluginInjected,\n'
    + '\t\t\t\t}, AquaSwitchRow));\n'
    + '\t\t\t} catch (error) {\n'
    + '\t\t\t\tglobalThis.console?.warn("ui-aqua: settings.general.item switch row unavailable", error);\n'
    + '\t\t\t}\n'
    + '\t\t\tctx.slots.inject("settings.general.item", () => ctx.slots.register({\n\t\t\t\tname: "settings.general.item",\n\t\t\t\tid: "aqua",\n\t\t\t\torder: 11,',
  'switch row registration',
);

// 7. CPU: cheaper loops. Cap the shader backing store at 1x DPR, and stop every
//    animation loop while the window is hidden.
js = replaceOnce(
  js,
  '\t\t\t\tconst ratio = Math.min(window.devicePixelRatio || 1, 1.5);',
  '\t\t\t\tconst ratio = Math.min(window.devicePixelRatio || 1, 1);',
  'fluid dpr cap',
);
js = replaceOnce(
  js,
  '\t\t\t\traf = requestAnimationFrame(frame);\n\t\t\t\tif (now - previous < step) return;',
  '\t\t\t\traf = requestAnimationFrame(frame);\n\t\t\t\t// Wallpaper mode hides this canvas (display:none); never shade what nobody sees.\n\t\t\t\tif (document.hidden || canvas.offsetWidth === 0 || now - previous < step) return;',
  'fluid hidden guard',
);
js = replaceOnce(
  js,
  '\t\t\t\t\tif (disposed) return;\n\t\t\t\t\tif (now - last < 1e3 / FPS$1) {',
  '\t\t\t\t\tif (disposed) return;\n\t\t\t\t\tif (document.hidden || now - last < 1e3 / FPS$1) {',
  'whale hidden guard',
);
js = replaceOnce(
  js,
  '\t\t\t\tif (!visible || now - last < 1e3 / FPS) {',
  '\t\t\t\tif (!visible || document.hidden || now - last < 1e3 / FPS) {',
  'mesh hidden guard',
);
js = replaceOnce(
  js,
  '<video data-dsh-aqua-wallpaper-video loop playsinline preload=\\"auto\\"></video>',
  '<video data-dsh-aqua-wallpaper-video loop playsinline preload=\\"auto\\" disablepictureinpicture></video>',
  'video preload',
);
// pause the wallpaper decoder (and its decode cost) while hidden; re-check the
// streamed file on the way back so a swapped wallpaper needs no app restart.
js = replaceOnce(
  js,
  '\t\t//#region src/client/wallpaper-store.ts',
  '\t\t/** Park the wallpaper decoder while the window is hidden (4K decode is not free). */\n'
    + '\t\tconst WALLPAPER_STAMP_KEY = "dsh.aqua.wallpaper.stamp";\n'
    + '\t\t/** Reload the streamed wallpaper when the file behind the route changed. */\n'
    + '\t\tconst refreshStreamedWallpaper = () => {\n'
    + '\t\t\tconst video = document.querySelector("[data-dsh-aqua-wallpaper-video]");\n'
    + '\t\t\tif (video === null) return;\n'
    + '\t\t\tconst src = video.getAttribute("src");\n'
    + '\t\t\tif (src === null || !src.endsWith("/aqua/wallpaper.mp4")) return;\n'
    + '\t\t\tfetch(src, { method: "HEAD", cache: "no-store" }).then((response) => {\n'
    + '\t\t\t\tif (!response.ok) return;\n'
    + '\t\t\t\tconst stamp = response.headers.get("content-length") + ":" + (response.headers.get("last-modified") ?? "");\n'
    + '\t\t\t\tif (localStorage.getItem(WALLPAPER_STAMP_KEY) === stamp) return;\n'
    + '\t\t\t\tlocalStorage.setItem(WALLPAPER_STAMP_KEY, stamp);\n'
    + '\t\t\t\tif (localStorage.getItem(WALLPAPER_STAMP_KEY + ".first") === null) return;\n'
    + '\t\t\t\tvideo.setAttribute("src", src + "?v=" + encodeURIComponent(stamp));\n'
    + '\t\t\t\tvideo.play().catch(() => {});\n'
    + '\t\t\t}).catch(() => {});\n'
    + '\t\t};\n'
    + '\t\tif (localStorage.getItem(WALLPAPER_STAMP_KEY) === null) localStorage.setItem(WALLPAPER_STAMP_KEY + ".first", "1");\n'
    + '\t\tdocument.addEventListener("visibilitychange", () => {\n'
    + '\t\t\tconst video = document.querySelector("[data-dsh-aqua-wallpaper-video]");\n'
    + '\t\t\tif (video === null) return;\n'
    + '\t\t\tif (document.hidden) { video.pause(); return; }\n'
    + '\t\t\trefreshStreamedWallpaper();\n'
    + '\t\t\tif (video.getAttribute("src") !== null && video.paused) video.play().catch(() => {});\n'
    + '\t\t}, { passive: true });\n'
    + '\t\t/** Fall back to the bundled still when the wallpaper video cannot be played. */\n'
    + '\t\tdocument.addEventListener("error", (event) => {\n'
    + '\t\t\tconst video = event.target;\n'
    + '\t\t\tif (!(video instanceof HTMLVideoElement) || !video.hasAttribute("data-dsh-aqua-wallpaper-video")) return;\n'
    + '\t\t\tconst img = document.querySelector("[data-dsh-aqua-wallpaper-img]");\n'
    + '\t\t\tif (img !== null && img.getAttribute("src") === null) img.src = ' + JSON.stringify(WALLPAPER_URL) + ';\n'
    + '\t\t\tdocument.documentElement.setAttribute("data-dsh-aqua-media", "image");\n'
    + '\t\t}, true);\n'
    + '\t\t//#region src/client/wallpaper-store.ts',
  'video visibility guard',
);

// Optional runtime diagnostic (AQUA_DIAG=1): publishes the live renderer state to
// localStorage so it can be read back from disk without a devtools session.
if (process.env.AQUA_DIAG === '1') {
  const diagBlock =
    '\t\t//#region aqua diagnostics (temporary)\n'
    + '\t\ttry {\n'
    + '\t\t\tsetInterval(() => {\n'
    + '\t\t\t\tconst info = (el) => { if (!el) return null; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return { cls: String(el.className).slice(0, 90), bg: cs.backgroundColor, filter: cs.backdropFilter, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; };\n'
    + '\t\t\t\tconst opaque = [...document.querySelectorAll("div,main,section,article,aside")].filter((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); const m = (cs.backgroundColor || "").match(/rgba?\\(([^)]+)\\)/); if (!m) return false; const p = m[1].split(",").map(Number); const a = p.length > 3 ? p[3] : 1; return a > 0.85 && r.width > 500 && r.height > 250; }).slice(0, 12).map((el) => { const r = el.getBoundingClientRect(); return { cls: String(el.className).slice(0, 90), bg: getComputedStyle(el).backgroundColor, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] }; });\n'
    + '\t\t\t\tconst img = document.querySelector("[data-dsh-aqua-wallpaper-img]");\n'
    + '\t\t\t\tconst layer = document.querySelector("[data-dsh-aqua-wallpaper-layer]");\n'
    + '\t\t\t\tlocalStorage.setItem("dsh.aqua.diag", JSON.stringify({\n'
    + '\t\t\t\t\tat: Date.now(), dpr: devicePixelRatio, viewport: [innerWidth, innerHeight],\n'
    + '\t\t\t\t\tattrs: [...document.documentElement.attributes].map((a) => a.name + "=" + String(a.value).slice(0, 80)),\n'
    + '\t\t\t\t\tvars: ["--dsh-aqua-wallpaper-frost", "--dsh-aqua-wallpaper-blur", "--dsh-aqua-blur", "--dsh-aqua-frost", "--dsh-aqua-video-dim", "--dsh-aqua-brightness-black"].map((k) => k + "=" + getComputedStyle(document.documentElement).getPropertyValue(k).trim()),\n'
    + '\t\t\t\t\tlayer: info(layer),\n'
    + '\t\t\t\t\timg: img ? { src: String(img.getAttribute("src")).slice(0, 120), natural: img.naturalWidth + "x" + img.naturalHeight } : null,\n'
    + '\t\t\t\t\tstorage: Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.includes("aqua"))),\n'
    + '\t\t\t\t\tcenter: info(document.querySelector("[class*=centerCol]")),\n'
    + '\t\t\t\t\tvideo: (() => { const v = document.querySelector("[data-dsh-aqua-wallpaper-video]"); return v ? { src: String(v.getAttribute("src")).slice(0, 100), ready: v.readyState, w: v.videoWidth, h: v.videoHeight, err: v.error ? v.error.code : 0 } : null; })(),\n'
    + '\t\t\t\t\tcenterRules: (() => { const out = []; for (const sheet of document.styleSheets) { let list; try { list = sheet.cssRules; } catch { continue; } for (const rule of list) { if (rule.selectorText && rule.selectorText.includes("centerCol")) out.push(rule.selectorText.slice(0, 160) + " { " + rule.style.cssText.slice(0, 120) + " }"); } } return out.slice(0, 24); })(),\n'
    + '\t\t\t\t\tcenterInline: (() => { const el = document.querySelector("[class*=centerCol]"); return el ? el.getAttribute("style") : null; })(),\n'
    + '\t\t\t\t\tmains: [...document.querySelectorAll("main")].map((el) => info(el)),\n'
    + '\t\t\t\t\topaque\n'
    + '\t\t\t\t}));\n'
    + '\t\t\t}, 2500);\n'
    + '\t\t} catch {}\n'
    + '\t\t//#endregion\n';
  js = replaceOnce(js, '\t\t//#region src/client/index.ts', diagBlock + '\t\t//#region src/client/index.ts', 'diagnostic block');
}

// brightness: BOTH shipped literals (the settings store and SETTINGS_DEFAULTS that
// readSetting falls back to) must say 35, or a fresh install still reads 50.
js = js.replace(/videoBrightness: \d+\b/g, 'videoBrightness: 35');

// emit
// saturate() beside a blur costs an extra colour-matrix pass per glass element;
// every use in this bundle sits inside a backdrop-filter value (verified: 28/28).
js = js.replace(/ saturate\(\d+%\)/g, '').replace(/saturate\(\d+%\)/g, '');
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'lib', 'types', 'client'), { recursive: true });
writeFileSync(join(OUT, 'lib', 'client.js'), js);
copyFileSync(join(SRC, 'lib', 'index.js'), join(OUT, 'lib', 'index.js'));
copyFileSync(join(SRC, 'lib', 'invariant.js'), join(OUT, 'lib', 'invariant.js'));
copyFileSync(join(SRC, 'lib', 'client.js.map'), join(OUT, 'lib', 'client.js.map'));
copyFileSync(join(SRC, 'LICENSE'), join(OUT, 'LICENSE'));

// copy the type declarations tree
const typesSrc = join(SRC, 'lib', 'types');
const walk = (from, to) => {
  for (const entry of readdirSyncSafe(from)) {
    const src = join(from, entry);
    const dst = join(to, entry);
    if (statSafe(src)?.isDirectory()) {
      mkdirSync(dst, { recursive: true });
      walk(src, dst);
    } else {
      copyFileSync(src, dst);
    }
  }
};
function readdirSyncSafe(dir) {
  try { return readdirSync(dir); } catch { return []; }
}
function statSafe(p) {
  try { return statSync(p); } catch { return undefined; }
}
walk(typesSrc, join(OUT, 'lib', 'types'));

// host half: streams the default wallpaper video from disk over a same-origin
// route, so the browser can play a local file without IndexedDB seeding.
const hostHalf = `// Generated by build-aqua.mjs — host half of the Aqua plugin.
//
// The browser half (§client.js) renders the glass skin. This half exists for one
// reason: a wallpaper video lives on the local disk, and a page served over http
// cannot read file:// itself. It streams that file from the DSH web server over
// a same-origin route the client half points at.
import { createReadStream, statSync } from 'node:fs';

/** Route the browser half loads the wallpaper video from. */
export const WALLPAPER_ROUTE = '/aqua/wallpaper.mp4';

/** Host plugin name (stable Cordis identity). */
export const name = 'ui-aqua-wallpaper';

/** The route needs the web server; nothing else. */
export const inject = ['webServer'];

/**
 * Serve one local video file with byte-range support (video seeking needs it).
 * @param file - absolute path of the wallpaper video.
 * @returns the request handler.
 */
function createHandler(file) {
  return (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' });
      res.end();
      return;
    }
    let size;
    try {
      size = statSync(file).size;
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('aqua: wallpaper video not found: ' + file);
      return;
    }
    const headers = {
      'content-type': 'video/mp4',
      'accept-ranges': 'bytes',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    };
    const range = req.headers.range;
    if (typeof range === 'string') {
      const match = /bytes=(\\d*)-(\\d*)/.exec(range);
      let start = match?.[1] ? Number(match[1]) : 0;
      let end = match?.[2] ? Number(match[2]) : size - 1;
      if (!Number.isFinite(start) || start < 0) start = 0;
      if (!Number.isFinite(end) || end >= size) end = size - 1;
      if (start > end) {
        res.writeHead(416, { 'content-range': 'bytes */' + size });
        res.end();
        return;
      }
      res.writeHead(206, { ...headers, 'content-range': 'bytes ' + start + '-' + end + '/' + size, 'content-length': end - start + 1 });
      if (req.method === 'HEAD') { res.end(); return; }
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...headers, 'content-length': size });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  };
}

/**
 * Register the wallpaper route for the life of the plugin.
 * @param ctx - host plugin context carrying the web server.
 * @param config - loader-row config; \`video\` is the local file to stream.
 */
export function apply(ctx, config) {
  const file = typeof config?.video === 'string' ? config.video.trim() : '';
  // No local video configured: register nothing. The browser half then falls back
  // to the bundled still image, so a fresh install never points at someone else's
  // private file path.
  if (file === '') return;
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: WALLPAPER_ROUTE,
    handler: createHandler(file),
  }), 'ui-aqua: wallpaper video route');
}
`;
writeFileSync(join(OUT, 'lib', 'index.js'), hostHalf);

// wallpaper asset served through the client-modules package-asset route
// (/plugins/<pkg>/assets/<file>), which needs the ./assets/* export.
mkdirSync(join(OUT, 'assets'), { recursive: true });
copyFileSync('D:\\harnessproject\\aqua\\package-assets\\wallpaper.jpg', join(OUT, WALLPAPER_ASSET));

// package manifest: same package identity, patched build
const pkg = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8'));
pkg.version = '1.4.3-dsh0.2.2';
pkg.description = 'DeepSeek Harness 的玻璃拟态主题：云母布局、可换壁纸/流体背景、总开关、全局玻璃覆盖层';
pkg.repository = { type: 'git', url: 'git+https://github.com/colm20060530/dsh-aqua-plugin.git' };
pkg.homepage = 'https://github.com/colm20060530/dsh-aqua-plugin#readme';
pkg.bugs = { url: 'https://github.com/colm20060530/dsh-aqua-plugin/issues' };
pkg.author = 'Aqua plugin contributors';
pkg.keywords = ['deepseek-harness', 'dsh', 'plugin', 'theme', 'glassmorphism', 'aqua', 'wallpaper'];
delete pkg.devDependencies;
pkg.scripts = {};
pkg.files = ['lib/index.js', 'lib/invariant.js', 'lib/client.js', 'lib/types/**/*.d.ts', 'assets/wallpaper.jpg'];
pkg.exports['./assets/*'] = './assets/*';
// The compatibility gate reads engines.dsh first and then ignores peer ranges, so a
// plugin built for this runtime declares exactly that runtime.
pkg.engines = { dsh: '^0.2.2-rc.1' };
pkg.peerDependencies = {
  '@deepseek-ai/cordis': '^4.1.0',
  '@deepseek-ai/dsh-client-locale': '^0.2.2-rc.1',
  '@deepseek-ai/dsh-client-ui-settings': '^0.2.2-rc.1',
  '@deepseek-ai/dsh-client-ui-settings-plugins': '^0.2.2-rc.1',
  '@deepseek-ai/dsh-client-ui-theme': '^0.2.2-rc.1',
  '@deepseek-ai/dsh-invariants': '^0.2.2-rc.1',
  react: '^18.2.0',
};
pkg.aqua = {
  upstream: 'https://github.com/WYH66666666/DSH-Transparent-UI-Plugin',
  improved: 'https://github.com/colm20060530/harness-desktop',
  overridesCss: 'desktop/resources/aqua-overrides.css (inlined into lib/client.js)',
  targets: 'dsh 0.2.2-rc.1 desktop profile',
};
writeFileSync(join(OUT, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

const outBytes = readFileSync(join(OUT, 'lib', 'client.js')).length;
console.log('built', OUT);
console.log('client.js bytes:', outBytes, '(source', readFileSync(join(SRC, 'lib', 'client.js')).length + ')');
console.log('overrides css bytes:', overridesCss.length);
