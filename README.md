# Aqua · DeepSeek Harness 玻璃拟态主题

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Web/桌面端加一层玻璃拟态皮肤：悬浮玻璃卡片、可换的壁纸/流体背景、统一的圆角与动效，外加一个总开关。

![主界面](docs/screenshots/main-interface.png)

![设置](docs/screenshots/settings.png)

## 特性

- **云母布局**：侧栏、顶栏、输入区、消息气泡、轨迹面板统一改成半透明玻璃卡片；切「兼容模式」则保留官方排版，只换材质。
- **背景可换**：流体渐变（WebGL）/ 静态图片 / 本地视频，视频由插件自己从磁盘流式提供，不经过第三方服务。
- **总开关**：设置 → 通用设置 → 玻璃主题，或任意位置 `Ctrl + Alt + A`。关掉即卸载全部玻璃层，不是只调透明度。
- **全局覆盖**：官方界面里原本不透明的区域（聊天列、设置面板、下拉框、代码块、轨迹表格……）都有对应的玻璃规则，并跟随主题明暗。
- **低开销**：壁纸模式下不再计算被隐藏的着色器；动画循环在窗口隐藏时空转；壁纸视频只在可见时解码。

## 安装

需要一份带 desktop profile 的 dsh 安装（`~/.dsh/profiles/desktop`）。

```powershell
git clone https://github.com/colm20060530/dsh-aqua-plugin
cd dsh-aqua-plugin
pwsh -File scripts/install.ps1                          # 用插件自带的静态壁纸
pwsh -File scripts/install.ps1 -Video 'D:/bg.mp4'       # 用自己的视频当壁纸
```

脚本会做四件事，每一步都会留 `.bak-before-aqua-<时间戳>` 备份：

1. 把包放进 `~/.dsh/plugins/@deepseek-ai/dsh-client-ui-aqua`
2. 在 profile 的 `node_modules` 里建 junction
3. 把依赖写进 profile 的 `package.json`（避免后续 pnpm 操作把它清掉）
4. 在 profile 的 `cordis.patch.yml` 写入 `ui-aqua` 行

装完重启一次 DeepSeek Harness（渲染端只在启动时加载 bundle）。卸载：

```powershell
pwsh -File scripts/install.ps1 -Uninstall
```

手动安装就是把包放到 profile 的 `node_modules/@deepseek-ai/dsh-client-ui-aqua`，再在 `cordis.patch.yml` 加：

```yaml
- insert:
    - id: ui-aqua
      name: '@deepseek-ai/dsh-client-ui-aqua'
      config:
        video: 'D:/bg.mp4'   # 可选；不写则用包内静态壁纸
```

## 设置项

| 位置 | 说明 | 默认 |
| --- | --- | --- |
| 玻璃主题 | 总开关 | 开 |
| 模式 | 云母效果 / 兼容模式 | 云母效果 |
| 玻璃模糊度 / 磨砂度 | 云母模式下所有玻璃面板的模糊与不透明度 | 16 px / 13 % |
| 背景 | 流体 / 壁纸 | 壁纸 |
| 壁纸蒙层 / 模糊 | 图片壁纸的暗度与柔化 | 70 % / 10 px |
| 视频亮度 / 模糊 | 视频壁纸的亮度与柔化 | 50 / 4 px |
| 壁纸 | 选择图片 / 选择视频 / 删除 | 插件自带的静态图 |

快捷键：`Ctrl + Alt + A` 开关整套皮肤。

## 目录结构

```
lib/client.js        浏览器端：皮肤、设置行、开关、动画与着色器
lib/index.js         宿主端：把本地视频以 /aqua/wallpaper.mp4 流式提供（支持 Range）
lib/types/           类型声明
assets/wallpaper.jpg 自带静态壁纸
build/build-aqua.mjs 从基础包生成 lib/client.js 的构建脚本
scripts/install.ps1  安装 / 卸载
docs/                截图与 Release 说明
```

## 构建

`lib/client.js` 由 `build/build-aqua.mjs` 从基础包加上一组锚点补丁生成（补丁里每一处替换都要求唯一命中，改错会直接报错退出）。基础包路径可用环境变量覆盖：

```powershell
$env:AQUA_SRC       = 'C:/path/to/base/dsh-client-ui-aqua'
$env:AQUA_OVERRIDES = 'C:/path/to/aqua-overrides.css'
$env:AQUA_OUT       = 'C:/path/to/output'
node build/build-aqua.mjs
```

## 兼容性

- 目标运行时：dsh `0.2.2-rc.1`（`engines.dsh` 已声明，兼容门禁直接放行）。
- 桌面壳专用：修复了 `[data-windows-titlebar]` 把聊天列刷成不透明的问题；纯浏览器端不需要这条规则也能用。
- 若运行时大版本变化，`lib/client.js` 里对 `@deepseek-ai/dsh-client-store`、图标名、`settings.general.item` 槽位的假设需要重新核对。

## 致谢

皮肤基础来自 [@deepseek-ai/dsh-client-ui-aqua](https://github.com/WYH66666666/DSH-Transparent-UI-Plugin)（MIT，作者 WYH66666666），在此基础上重做了全局覆盖层、设置面板、壁纸管线与性能。

同一套界面的桌面版客户端：[colm20060530/harness-desktop](https://github.com/colm20060530/harness-desktop)。

## License

MIT
