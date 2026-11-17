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
| 粒子鲸鱼 / 小鱼 / 网格交互 | 关 |
| 鼠标辉光 / 悬停下压 | 关 |
| 背景 | 壁纸（可用 流体 切换） |

## 其他

- 新增设置架构版本：`cordis.patch.yml` 的插件行可写 `schema` 字段，默认值调整后老配置会一次性重置到新默认，不用手动清 localStorage。
- 设置面板里所有旋钮仍然可以随时改回流体背景 + 完整玻璃 + 全部装饰。

## 安装

```powershell
git clone https://github.com/colm20060530/dsh-aqua-plugin
cd dsh-aqua-plugin
pwsh -File scripts/install.ps1 -Video 'D:/bg.mp4'
```

装完重启一次 DeepSeek Harness。

## 附件

- `aqua-plugin-1.4.3.zip` — 解压到 `~/.dsh/plugins/@deepseek-ai/dsh-client-ui-aqua` 即可