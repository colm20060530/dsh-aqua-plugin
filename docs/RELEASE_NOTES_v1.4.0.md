# v1.4.0 — Aqua 玻璃拟态（dsh 0.2.2-rc.1 移植版）

首次发布。把 [WYH66666666/DSH-Transparent-UI-Plugin](https://github.com/WYH66666666/DSH-Transparent-UI-Plugin) 的 Aqua 皮肤移植到 DeepSeek Harness 0.2.x，并合入
[colm20060530/harness-desktop](https://github.com/colm20060530/harness-desktop) 的「全局玻璃」覆盖层。

## 亮点

- **0.2.x 兼容**：`dsh-client-store` 取代已删除的 `dsh-client-runtime/client`；图标名回退；`engines.dsh` 通过兼容门禁。
- **总开关**：设置 → 通用设置 → 玻璃主题；或 `Ctrl+Alt+A`。关掉即卸载全部玻璃层（不是调透明度）。
- **本地视频壁纸**：宿主半边把磁盘上的 mp4 以同源路由 `/aqua/wallpaper.mp4`（支持 Range）流出，客户端默认指向它；在 `cordis.patch.yml` 的 `config.video` 换片源。
- **全局玻璃**：覆盖层内联进 bundle，包含修复 desktop 壳把聊天列刷成不透明的 `[data-windows-titlebar] .centerCol`。
- **性能**：壁纸模式下隐藏的 WebGL 流体不再计算；DPR 上限 1.0；窗口隐藏时所有动画循环空转；壁纸视频仅 `preload="metadata"` 并在后台暂停。

## 安装

```powershell
pwsh -File scripts/install.ps1                       # 默认静态壁纸
pwsh -File scripts/install.ps1 -Video 'D:/bg.mp4'    # 视频壁纸
pwsh -File scripts/install.ps1 -Uninstall            # 卸载
```

装完需重启一次 DeepSeek Harness（渲染端只在启动时加载 bundle）。

## 附件

- `aqua-plugin-1.4.0.zip` — 可直接解压到 `~/.dsh/plugins/@deepseek-ai/dsh-client-ui-aqua`
