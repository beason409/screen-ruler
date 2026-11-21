# 屏幕尺子 · Screen Ruler

一个可以直接在浏览器中打开的屏幕尺子。校准后，把物品放在屏幕前，用可拖动方框或多个标记点对比实际尺寸。

[下载离线版 v1.0.0](https://github.com/beason409/screen-ruler/raw/refs/heads/main/downloads/screen-ruler-v1.0.0.zip) · [详细使用说明与硬币规格来源](使用说明.txt)

![屏幕尺子多点测量预览](docs/preview.jpg)

## 使用

1. 下载上方离线压缩包并解压，或下载仓库。
2. 用 Edge、Chrome 或 Firefox 打开 `index.html` 或 `屏幕尺子.html`。两个入口内容相同，单个 HTML 文件即可离线运行，无需安装或启动服务器。
3. 点击“校准屏幕”，选择一种校准方式并保存。
4. 使用“方框对比”或“定点测量”。

## 功能

- **方框对比**：拖动位置、拖动八个角点或边点改尺寸，也可以直接输入宽高；支持正方形、旋转、居中和锁定。
- **四种校准**：屏幕尺寸与分辨率、硬币、银行卡、直尺或已知长度。
- **硬币参照**：内置人民币、美元和欧元共 10 种规格，人民币 1 元区分新旧版本。
- **定点测量**：连续点击添加最多 50 个点，显示相邻段距离、总长度和任意两点的直线距离；支持拖点、键盘微调、删除、撤销和清空。
- **显示设置**：毫米、厘米、英寸，明暗背景，网格，边框颜色，专注模式和全屏。

方向键移动选中的方框或点位 `0.1 mm`，按住 `Shift` 移动 `1 mm`。`F` 切换专注模式，`Esc` 退出专注模式。

## 校准与数据

屏幕尺寸与分辨率方式不需要参照物，结果显示为“参数估算”。它依赖有效显示区域的标称对角线、当前输出分辨率和显示缩放；需要更精确时，请用硬币、银行卡或直尺亲自对齐后校准。代码检查和浏览器测试不能代替实物对齐。

更换显示器，或改变系统显示缩放、浏览器缩放后，需要重新确认校准。参数相同的两块显示器之间切换可能无法自动识别。

校准与设置仅保存在当前浏览器的本地存储中，不上传数据。测量点保留在本次页面中，切换测量模式不会丢失，刷新后清空。浏览器禁止本地存储时，本次打开仍可使用，设置无法跨次保存。

尺寸不会为了适应窗口自动缩小。可完整对比的物品尺寸受屏幕实际大小限制。

## 开发与验证

日常使用不需要 Node.js；以下命令仅用于修改源码后的检查与打包准备，不依赖第三方包。

```sh
node build-offline.cjs
node check.cjs
node verify.cjs
```

`build-offline.cjs` 把 `point-measurement-source.js` 内联到 `屏幕尺子.html`，并同步生成内容相同的 `index.html`，保持两个入口都可独立离线使用。

发布前已通过脚本语法、DOM 引用和无外部依赖检查，以及 15 项核心行为检查。定点测量的点击、拖动、距离换算、撤销、清空、模式切换及校准比例同步已进行浏览器实测。

主要文件：

| 文件 | 用途 |
| --- | --- |
| `index.html` / `屏幕尺子.html` | 可独立打开的完整应用 |
| `point-measurement-source.js` | 定点测量模块源码 |
| `build-offline.cjs` | 更新 HTML 内联模块 |
| `check.cjs` / `verify.cjs` | 静态检查与核心行为检查 |
| `使用说明.txt` | 操作说明、校准公式与硬币规格来源 |

## English

Screen Ruler is a self-contained browser tool for comparing real objects against a draggable rectangle or measuring distances between marked points. Open either HTML entry locally; no installation, server, network connection, or external assets are required.

Calibrate with display dimensions and resolution, a coin, a bank card, or a known length. Display-parameter calibration is an estimate; use a physical reference for greater accuracy, and recalibrate after changing displays or zoom. Settings stay in browser-local storage, and point positions are cleared when the page reloads.
