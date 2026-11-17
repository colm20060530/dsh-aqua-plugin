# Aqua v1.4.3

出厂默认值改成实际在用的观感，新装即所见。

## 默认值

| 设置项 | 默认值 |
| --- | --- |
| 玻璃模糊度 | 12 px |
| 磨砂度 | 19 % |
| 视频模糊度 | 2 px |
| 视频亮度 | 35 % |
| 背景亮度 | 48 % |
| 背景 | 壁纸（内置视频） |
| 粒子鲸鱼 / 小鱼 / 网格交互 | 关 |
| 鼠标辉光 / 悬停下压 | 关 |

## 修复

- **装饰与悬停效果首装也是关**：五个开关的读取函数原来「没有记录就算开」，新装或新 profile 仍会打开粒子鲸鱼、小鱼、网格交互、鼠标辉光和悬停下压。读取默认值改为关。
- **视频亮度首装就是 35**：`SETTINGS_DEFAULTS` 里原来还留着 50，`readSetting` 缺记录时回退到它；现在两处默认字面量统一为 35。
- **设置架构版本**：`cordis.patch.yml` 的插件行可写 `schema`，默认值调整后老 profile 会一次性重置 `dsh.ui-aqua.*`（保留总开关）。迁移在 `apply(ctx, config)` 内执行；写在模块顶层引用 `ctx` 会让客户端条目 import 失败（`web boot: 1 entry did not activate`）。
- 存储不可用时背景回退到壁纸、壁纸回退到内置视频。

## 升级

替换 `lib/client.js` 与 `package.json` 后重启应用，或重新执行安装脚本：

```powershell
pwsh -File scripts/install.ps1
```

已经存过设置的 profile 不会被覆盖；想回到出厂观感，清掉 `localStorage` 里的 `dsh.ui-aqua.*`（`dsh.ui-aqua.enabled` 除外）即可。
