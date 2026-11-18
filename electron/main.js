import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, dialog, net, protocol, session, shell } from 'electron'

const APP_SCHEME = 'app'
const APP_HOST = 'bundle'
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`
const APP_URL = `${APP_ORIGIN}/index.html`
/** 由 scripts/dev.mjs 注入；存在时连接开发服务器而不是 dist */
const DEV_URL = process.env.ELECTRON_START_URL
const isDev = Boolean(DEV_URL)
const devOrigin = isDev ? new URL(DEV_URL).origin : null
const appRoot = path.join(import.meta.dirname, '..')
const distDir = path.join(appRoot, 'dist')
const indexFile = path.join(distDir, 'index.html')
const preloadPath = path.join(import.meta.dirname, 'preload.cjs')

const CONTENT_SECURITY_POLICY = [
  "default-src 'self' data: blob: https: http:",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  'img-src * data: blob:',
  'media-src * data: blob:',
  'font-src * data:',
  'connect-src *',
  "object-src 'self' data: blob:",
  'frame-src * data: blob:',
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

// 自定义标准协议让页面拥有稳定的 origin，localStorage 与 IndexedDB 才能正常工作。
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

const isTrustedUrl = (url) => {
  if (!url) {
    return false
  }
  const origin = isDev ? devOrigin : APP_ORIGIN
  return url === origin || url.startsWith(`${origin}/`)
}

const isExternalUrl = (url) => {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}

const openExternal = (url) => {
  if (isExternalUrl(url)) {
    void shell.openExternal(url)
  }
}

const registerAppProtocol = () => {
  protocol.handle(APP_SCHEME, async (request) => {
    const { pathname } = new URL(request.url)
    const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html'
    const filePath = path.join(distDir, relative)
    const relativePath = path.relative(distDir, filePath)
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return new Response('Forbidden', { status: 403 })
    }
    try {
      const response = await net.fetch(pathToFileURL(filePath).toString())
      const headers = new Headers(response.headers)
      // 只为文档设置 CSP，静态资源沿用 net.fetch 推导出的 MIME 等响应头。
      if (relative.endsWith('.html')) {
        headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY)
      }
      return new Response(response.body, { status: response.status, headers })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

const setupPermissions = () => {
  const allowed = new Set(['media', 'clipboard-sanitized-write', 'fullscreen'])
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const requestingUrl = details.requestingUrl || webContents.getURL()
      callback(isTrustedUrl(requestingUrl) && allowed.has(permission))
    }
  )
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    return isTrustedUrl(requestingOrigin) && allowed.has(permission)
  })
}

/** 允许预览附件生成的 blob: 页面；外部链接交给系统浏览器。 */
const handleWindowOpen = ({ url }) => {
  if (url.startsWith('blob:')) {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 1080,
        height: 760,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      },
    }
  }
  openExternal(url)
  return { action: 'deny' }
}

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 480,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      navigateOnDragDrop: false,
      spellcheck: true,
    },
  })

  window.once('ready-to-show', () => window.show())

  window.webContents.setWindowOpenHandler(handleWindowOpen)
  window.webContents.on('will-navigate', (event, url) => {
    if (isTrustedUrl(url)) {
      return
    }
    event.preventDefault()
    openExternal(url)
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())

  const loading = isDev ? window.loadURL(DEV_URL) : window.loadURL(APP_URL)
  loading.catch((error) => {
    dialog.showErrorBox('chat-demo', error instanceof Error ? error.message : String(error))
  })

  return window
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows()
    if (window) {
      if (window.isMinimized()) {
        window.restore()
      }
      window.focus()
    }
  })

  void app.whenReady().then(() => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.deepseek.chat-demo')
    }

    if (!isDev) {
      if (!existsSync(indexFile)) {
        dialog.showErrorBox(
          'chat-demo',
          '未找到 dist/index.html，请先运行 pnpm build。\nMissing dist/index.html. Run `pnpm build` first.'
        )
        app.quit()
        return
      }
      registerAppProtocol()
    }

    setupPermissions()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
