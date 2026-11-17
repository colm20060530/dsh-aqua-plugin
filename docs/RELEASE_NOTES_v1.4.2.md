# Aqua v1.4.2

性能与壁纸稳定性修复。**推荐升级**，接口与设置项不变。

## 修复

- **壁纸循环卡顿**：撤掉 1.4.1 里重新编码的 1080p 素材（转码后帧间隔不均，循环点会停顿），默认壁纸改回原片；`<video>` 恢复 `preload="auto"`，本地文件整段缓冲，循环处不再回读。
- **换壁纸不用重启**：窗口重新可见时对 `/aqua/wallpaper.mp4` 做一次 HEAD，`content-length` / `last-modified` 变了就带新查询串重载。
- **鲸鱼粒子与点阵网格只在流体背景挂载**：它们是为流体板绘制的，铺在照片或视频上几乎不可见，却各自跑一个全窗口 30 fps canvas 循环。

## 性能（本机实测，同一台机器、同一段壁纸）

| | 单核占用 |
| --- | --- |
| 优化前 | 124%（GPU 进程 74% + 渲染进程 49%） |
| 1.4.1 | 90%（GPU 48% + 渲染进程 39%） |
| 1.4.2 | 待本机复测（又去掉两个全窗口 canvas 循环） |

主要来源不是视频解码（约 13 个百分点），而是壁纸模式下每个面板都在重复模糊同一片已经模糊过的背景，以及一次视图里 44 个行内 `code` / `pre` 也在做实时模糊。

## 安装

```powershell
git clone https://github.com/colm20060530/dsh-aqua-plugin
cd dsh-aqua-plugin
pwsh -File scripts/install.ps1 -Video 'D:/bg.mp4'
```

装完重启一次 DeepSeek Harness（渲染端只在启动时加载 bundle）。

## 附件

- `aqua-plugin-1.4.2.zip` — 解压到 `~/.dsh/plugins/@deepseek-ai/dsh-client-ui-aqua` 即可