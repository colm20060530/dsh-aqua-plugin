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
js = replaceOnce(
  js,
  '\t\t/** Read the persisted enable flag (absent storage means on). */',
  '\t\tconst AQUA_SCHEMA_KEY = "dsh.ui-aqua.schema";\n'
    + '\t\tconst AQUA_SCHEMA = "2";\n'
    + '\t\ttry {\n'
    + '\t\t\tif (localStorage.getItem(AQUA_SCHEMA_KEY) !== AQUA_SCHEMA) {\n'
    + '\t\t\t\tfor (const key of Object.keys(localStorage)) if (key.startsWith("dsh.ui-aqua.") && key !== AQUA_SCHEMA_KEY && key !== "dsh.ui-aqua.enabled") localStorage.removeItem(key);\n'
    + '\t\t\t\tlocalStorage.setItem(AQUA_SCHEMA_KEY, AQUA_SCHEMA);\n'
    + '\t\t\t}\n'
    + '\t\t} catch {}\n'
    + '\t\t/** Read the persisted enable flag (absent storage means on). */',
  'settings migration',
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
/* Over a wallpaper the backdrop is a still frame that the wallpaper layer has
   already blurred; a live backdrop-filter on top of it re-filters the same
   pixels every frame and reads as the same picture. Keep the tint, drop the
   filter — this is what removes the per-frame full-screen blur cost. */
html[data-dsh-aqua][data-dsh-aqua-wallpaper] *,
html[data-dsh-aqua][data-dsh-aqua-wallpaper] *::before,
html[data-dsh-aqua][data-dsh-aqua-wallpaper] *::after {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
`;
overridesCss = overridesCss + perfCss;

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
  '<video data-dsh-aqua-wallpaper-video loop playsinline preload=\\"metadata\\"></video>',
  'video preload',
);
// pause the wallpaper decoder (and its 4K decode cost) while hidden
js = replaceOnce(
  js,
  '\t\t//#region src/client/wallpaper-store.ts',
  '\t\t/** Park the wallpaper decoder while the window is hidden (4K decode is not free). */\n'
    + '\t\tdocument.addEventListener("visibilitychange", () => {\n'
    + '\t\t\tconst video = document.querySelector("[data-dsh-aqua-wallpaper-video]");\n'
    + '\t\t\tif (video === null) return;\n'
    + '\t\t\tif (document.hidden) video.pause();\n'
    + '\t\t\telse if (video.getAttribute("src") !== null) video.play().catch(() => {});\n'
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

/** Fallback used when the loader row carries no config.video. */
const DEFAULT_VIDEO = ${JSON.stringify('C:/Users/Administrator/Videos/【哲风壁纸】光影-动漫美女-彩色.mp4')};

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
 * @param config - loader-row config; \`video\` overrides the default file.
 */
export function apply(ctx, config) {
  const file = typeof config?.video === 'string' && config.video !== '' ? config.video : DEFAULT_VIDEO;
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
pkg.version = '1.4.0-dsh0.2.2';
pkg.description = 'Aqua: glassmorphism skin for the DSH Web surface — improved global glass layer (Harness Desktop overrides inlined for dsh 0.2.x)';
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
