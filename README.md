# DeepseekApi-App 非官方的桌面 app 实现

[English](README.en.md) | 简体中文

本项目是来自 [DeepSeek chat-demo](https://github.com/deepseek-ai/chat-demo) 仓库的分支，使用 Electron 和 Cordova 对Windows和安卓系统进行 桌面应用 web 套壳。

点击 [在线体验](https://deepseek-ai.github.io/chat-demo/) 即可使用，也可以前往 [Releases](https://github.com/deepseek-ai/deepseek-chat- demo/releases) 下载压缩包，解压后双击 `index.html` 在本地使用，无需安装或构建。首次使用时，请在设置中填写 API Key。

## 运行

准备 Node.js 22.12+ 和 pnpm：

```sh
## 选择官方web源码进行构建
git clone https://github.com/deepseek-ai/chat-demo.git
cd chat-demo
## 选择当前仓库的源码进行构建
git clone https://github.com/Asterivelle/DeepseekApi-App.git
cd DeepseekApi-App

pnpm install
pnpm dev
```

`pnpm dev` 会启动渲染进程开发服务器并打开 Electron 窗口。若只想在浏览器中开发，运行 `pnpm dev:web` 后打开 http://localhost:8090 。

生成静态产物：

```sh
pnpm build
```

产物位于 `dist/`，可部署到静态服务器，也可直接打开 `dist/index.html`。直接打开时，浏览器和 API 服务需允许 `file://` 页面的存储与跨域请求。

运行或打包桌面应用：

```sh
pnpm build
# 使用 dist/ 启动 Electron
pnpm start
# 在 release/ 生成免安装应用
pnpm package
# 生成当前平台的安装包
pnpm dist
```

Electron 窗口通过自定义的 `app://bundle` 协议加载 `dist/index.html`，让 localStorage、IndexedDB 和安全上下文 API 保持可用。外部链接交给系统浏览器打开，附件预览在独立的沙箱窗口中显示。

## Android

Android 使用独立的 Cordova 壳；它与 Electron 桌面壳共用根目录生成的 `dist/`，但 Android 本身运行在系统 WebView 中。构建前需配置已安装的 Android SDK、JDK 17、Gradle 8.14.2 和设备或已启动的模拟器；项目不会安装或下载 SDK/NDK。构建脚本会从 `GRADLE_HOME`、Gradle 缓存或 `PATH` 使用现有 Gradle，不会触发 Gradle Wrapper 下载。

```sh
pnpm install
# 首次添加 Cordova Android 平台
pnpm android:add
# 构建 APK
pnpm android:build
# 安装并运行到已连接的设备/模拟器
pnpm android:run
```

Windows PowerShell 可在当前终端设置已有 SDK 路径后运行构建：

```powershell
## 示例路径，请替换为你的环境遍量
$env:ANDROID_HOME = 'C:\Program Files\Android\SDK'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME = 'C:\Program Files\jdk-17.0.12'
pnpm android:build
```

`pnpm android:build` 会先构建网页并同步到 `cordova/www/`；APK 输出位于 `cordova/platforms/android/app/build/outputs/apk/`。`cordova/www/` 和平台生成目录是构建产物，不应手动编辑。

## 功能

- 多会话、自动标题、重命名与删除；编辑提问、重新生成和切换消息分支。
- 流式回答、深度思考、智能搜索、链接阅读与来源引用；支持停止和符合条件的继续生成。
- 附件上传、粘贴与拖拽，语音输入和回复朗读；移动端录音时输入框首行显示实时频谱。
- Markdown、代码高亮、KaTeX 公式和 Mermaid 图表。
- 简体中文与英文、浅色与深色主题、移动端布局、位置设置、历史导入导出。

## 数据

API Key 和设置保存在 localStorage，会话及附件原件保存在 IndexedDB，本地数据按浏览器用户配置和站点源（origin）隔离；桌面端沿用同一套 Chromium 存储，数据位于 Electron 的用户数据目录。发送对话、上传附件和使用语音功能时，相应内容会提交给配置的 API 服务。

设置中的历史导入导出使用 ZIP 格式。导入会在确认并校验成功后替换全部本地会话和附件；导出包含会话与本地可用的图片原件，不包含 API Key、设置或非图片附件原件。格式与保留范围见[历史导入导出](src/services/chat/history/README.md)。

设置 → 数据管理 → 删除所有对话，会在确认后清空全部本地会话、附件原件和未发送的草稿，停止正在生成的回复并回到新对话。API Key 和其他设置保留，已上传到 API 服务的文件不受影响。

## 开发

| 命令           | 用途                                  |
| -------------- | ------------------------------------- |
| `pnpm dev`     | 启动开发服务器并打开 Electron 窗口    |
| `pnpm dev:web` | 只启动开发服务器，在浏览器中使用      |
| `pnpm build`   | 构建渲染进程到 `dist/`                |
| `pnpm start`   | 使用现有 `dist/` 启动 Electron        |
| `pnpm package` | 在 `release/` 生成免安装桌面应用      |
| `pnpm dist`    | 生成当前平台的安装包                  |
| `pnpm android:add` | 首次添加 Cordova Android 平台      |
| `pnpm android:build` | 构建 Android APK                 |
| `pnpm android:run` | 在设备/模拟器中运行 Android 应用    |
| `pnpm type`    | TypeScript 类型检查                   |
| `pnpm lint`    | oxlint 检查                           |
| `pnpm format`  | oxfmt 格式化                          |

[rspack.config.ts](rspack.config.ts) 默认连接 `https://api.deepseek.com`。`createConfig({ apiOrigin, devServer })` 支持自定义 API 地址和开发服务器代理。

聊天默认使用 `deepseek-flash`，通过 Anthropic 兼容的 Messages / Files API 通信；语音使用 ASR / TTS 接口。请求使用搜索、链接阅读、标题和 `latest_reminder` 等扩展，接入服务需支持相应能力。附件实际支持的格式以服务端校验为准。

```text
electron/              Electron 主进程与预加载脚本
cordova/               Cordova Android 壳与平台配置
scripts/               跨平台开发与构建脚本
src/
  app/                 应用布局、主题与全局样式
  components/          聊天、设置、Markdown 等界面组件
  i18n/                中英文文案
  services/
    api/               API 请求、SSE 与协议类型
    chat/              会话、消息分支、本地存储与历史导入导出
    markdown/          Markdown 解析、代码高亮与图表
    speech/            录音与朗读
  utils/               通用工具
```

## 许可证

[MIT](LICENSE)。构建会将许可证复制到 `dist/LICENSE`，分发时请一并保留；第三方依赖遵循各自的许可证。
