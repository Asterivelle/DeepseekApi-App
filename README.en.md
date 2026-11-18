# DeepseekApi-App: An Unofficial Desktop App Implementation

English | [简体中文](README.md)

This project is a fork of the [DeepSeek chat-demo](https://github.com/deepseek-ai/chat-demo) repository. It uses Electron and Cordova to wrap the web app for Windows and Android.

Click [Try DeepSeek official version online](https://deepseek-ai.github.io/chat-demo/) to use it, or go to [DeepSeek official version Releases](https://github.com/deepseek-ai/deepseek-chat-demo/releases) to download the archive, extract it, and double-click `index.html` to use it locally without installation or a build. On first use, enter your API key in Settings.

## Running

Prepare Node.js 22.12+ and pnpm:

```sh
## Build from the official web source
git clone https://github.com/deepseek-ai/chat-demo.git
cd chat-demo
## Build from the current repository source
git clone https://github.com/Asterivelle/DeepseekApi-App.git
cd DeepseekApi-App

pnpm install
pnpm dev
```

`pnpm dev` starts the renderer development server and opens the Electron window. If you only want to develop in the browser, run `pnpm dev:web` and open http://localhost:8090.

Build the static output:

```sh
pnpm build
```

The output is in `dist/`. It can be deployed to a static server, or you can open `dist/index.html` directly. When opening it directly, the browser and the API service must allow storage and cross-origin requests for `file://` pages.

Run or package the desktop app:

```sh
pnpm build
# Run Electron against dist/
pnpm start
# Build an unpacked app in release/
pnpm package
# Build an installer for the current platform
pnpm dist
```

The Electron window loads `dist/index.html` through the custom `app://bundle` protocol so that localStorage, IndexedDB, and secure-context APIs remain available. External links are opened in the system browser, and attachment previews are shown in a separate sandboxed window.

## Android

Android uses a separate Cordova shell; it shares the root `dist/` build with the Electron desktop shell, but Android itself runs in the system WebView. Before building, configure an already-installed Android SDK, JDK 17, Gradle 8.14.2, and a device or a running emulator; the project does not install or download the SDK/NDK. The build script uses existing Gradle from `GRADLE_HOME`, the Gradle cache, or `PATH`, and does not trigger a Gradle Wrapper download.

```sh
pnpm install
# Add the Cordova Android platform once
pnpm android:add
# Build the APK
pnpm android:build
# Install and run on a connected device/emulator
pnpm android:run
```

On Windows PowerShell, you can set the existing SDK paths in the current terminal before running the build:

```powershell
## Example paths; replace them with your environment variables
$env:ANDROID_HOME = 'C:\Program Files\Android\SDK'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:JAVA_HOME = 'C:\Program Files\jdk-17.0.12'
pnpm android:build
```

`pnpm android:build` first builds the web app and syncs it to `cordova/www/`; APKs are output under `cordova/platforms/android/app/build/outputs/apk/`. `cordova/www/` and the generated platform directories are build output and should not be edited manually.

## Features

- Multiple conversations, automatic titles, renaming, and deletion; edit prompts, regenerate replies, and switch between message branches.
- Streaming replies, deep thinking, smart search, link reading, and source citations; supports stopping and continuing eligible generations.
- Attachment upload, paste, and drag-and-drop, voice input, and read-aloud replies; on mobile, a live audio spectrum is shown in the first row of the input box while recording.
- Markdown, syntax highlighting, KaTeX math, and Mermaid diagrams.
- Simplified Chinese and English, light and dark themes, mobile layouts, location settings, and history import/export.

## Data

Your API key and settings are stored in localStorage; conversations and original attachments are stored in IndexedDB. Local data is isolated by browser user profile and site origin; the desktop app uses the same Chromium storage, with data located in Electron's user data directory. When sending messages, uploading attachments, and using speech features, the relevant content is submitted to the configured API service.

History import and export in Settings use ZIP archives. After confirmation and successful validation, importing replaces all local conversations and attachments; exports include conversations and locally available original images, but exclude API keys, settings, and original non-image attachments. See [History import/export](src/services/chat/history/README.md) for the archive format and preservation scope.

Settings → Data management → Delete all chats clears all local conversations, original attachments, and unsent drafts after confirmation, stops ongoing replies, and returns to a new chat. Your API key and other settings are preserved; files already uploaded to the API service are not affected.

## Development

| Command           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `pnpm dev`        | Start the development server and open the Electron window |
| `pnpm dev:web`    | Start only the development server for use in the browser |
| `pnpm build`      | Build the renderer into `dist/`                       |
| `pnpm start`      | Run Electron with the existing `dist/` build          |
| `pnpm package`    | Build an unpacked desktop app in `release/`           |
| `pnpm dist`       | Build an installer for the current platform           |
| `pnpm android:add` | Add the Cordova Android platform once                |
| `pnpm android:build` | Build the Android APK                             |
| `pnpm android:run` | Run the Android app on a device/emulator             |
| `pnpm type`       | Run TypeScript type checks                            |
| `pnpm lint`       | Lint with oxlint                                      |
| `pnpm format`     | Format with oxfmt                                     |

[rspack.config.ts](rspack.config.ts) connects to `https://api.deepseek.com` by default. `createConfig({ apiOrigin, devServer })` supports a custom API address and development server proxy.

Chat uses `deepseek-flash` by default and communicates through Anthropic-compatible Messages / Files APIs; speech uses ASR / TTS endpoints. Requests use extensions such as search, link reading, titles, and `latest_reminder`, and the connected service must support the corresponding capabilities. The formats actually supported for attachments are subject to server-side validation.

```text
electron/              Electron main process and preload script
cordova/               Cordova Android shell and platform config
scripts/               Cross-platform development and build scripts
src/
  app/                 Application layout, themes, and global styles
  components/          Chat, settings, Markdown, and other UI components
  i18n/                Chinese and English copy
  services/
    api/               API requests, SSE, and protocol types
    chat/              Conversations, message branches, local storage, and history import/export
    markdown/          Markdown parsing, syntax highlighting, and diagrams
    speech/            Audio recording and read-aloud
  utils/               Shared utilities
```

## License

[MIT](LICENSE). The build copies the license to `dist/LICENSE`; include it when distributing the app. Third-party dependencies are subject to their own licenses.
