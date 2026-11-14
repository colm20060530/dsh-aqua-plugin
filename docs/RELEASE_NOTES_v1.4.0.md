# Aqua v1.4.0

DeepSeek Harness 的玻璃拟态主题，首个发布版本。

## 包含

- **云母布局 / 兼容模式**：悬浮玻璃卡片，或保留官方排版只换材质。
- **总开关**：设置 → 通用设置 → 玻璃主题，或 `Ctrl + Alt + A`。关闭时整套玻璃层被卸载。
- **三种背景**：流体着色器、静态图片、本地视频（由插件自己流式提供，支持拖动进度）。
- **全局覆盖**：聊天列、设置面板、下拉框、代码块、轨迹表格、事件详情的玻璃规则，跟随明暗主题。
- **性能**：隐藏的着色器不再计算；1× DPR；窗口隐藏时动画空转；视频后台暂停。

## 安装

```powershell
git clone https://github.com/colm20060530/dsh-aqua-plugin
cd dsh-aqua-plugin
pwsh -File scripts/install.ps1 -Video 'D:/bg.mp4'   # 不写 -Video 则用自带静态壁纸
```

装完重启一次 DeepSeek Harness。

## 附件

- `aqua-plugin-1.4.0.zip` — 解压到 `~/.dsh/plugins/@deepseek-ai/dsh-client-ui-aqua` 即可
