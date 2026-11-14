# Changelog

## 1.4.0 — dsh 0.2.2-rc.1 port

- **Compatibility**: `@deepseek-ai/dsh-client-store` instead of the removed
  `dsh-client-runtime/client`, icon-name fallback, guarded `settings.plugin.item`,
  `engines.dsh` so the loader's compatibility gate accepts the row.
- **Master switch**: a `settings.general.item` row above 外观, plus `Ctrl+Alt+A`.
  Both drive the plugin's durable `dsh.ui-aqua.enabled` flag.
- **Video wallpaper**: the host half streams a local file over
  `/aqua/wallpaper.mp4` (byte ranges, HEAD, 404 reporting); the client half
  defaults to it and detects video URLs.
- **Global glass**: harness-desktop's `aqua-overrides.css` is inlined and
  injected as a plugin stylesheet; adds the desktop-shell fix that makes the
  opaque `[data-windows-titlebar] .centerCol` translucent.
- **Settings migration**: one-time reset (`dsh.ui-aqua.schema = 2`) so earlier
  defaults do not survive an upgrade.
- **Performance**: fluid canvas capped at 1× DPR and skipped while `display:none`
  (the wallpaper mode case), every loop idles while the window is hidden, the
  wallpaper video preloads metadata only and pauses in the background.

## 1.3.0 — upstream baseline

Unmodified Aqua 1.3.0 bundle from WYH66666666/DSH-Transparent-UI-Plugin, plus
harness-desktop's tuned defaults.
