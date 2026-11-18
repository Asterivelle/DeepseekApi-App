import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import process from 'node:process'

const DEV_URL = 'http://localhost:8090'
const isWindows = process.platform === 'win32'
let server = null
let electron = null
let shuttingDown = false

const run = (command, args, env = process.env) => {
  if (isWindows) {
    return spawn([command, ...args].join(' '), { stdio: 'inherit', env, shell: true })
  }
  return spawn(command, args, { stdio: 'inherit', env, detached: true })
}

const waitForPort = async (port, timeout) => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const connected = await new Promise((resolve) => {
      const socket = createConnection({ host: '127.0.0.1', port })
      const done = (result) => {
        socket.destroy()
        resolve(result)
      }
      socket.once('connect', () => done(true))
      socket.once('error', () => done(false))
      socket.setTimeout(1000, () => done(false))
    })
    if (connected) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

const stop = (child) => {
  if (!child || child.exitCode !== null) {
    return
  }
  if (isWindows && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    return
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
}

const shutdown = (code) => {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  stop(electron)
  stop(server)
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

server = run('pnpm', ['exec', 'rspack', 'serve', '-c', 'rspack.config.ts'])
server.on('exit', (code) => shutdown(code ?? 0))

const ready = await waitForPort(8090, 120_000)
if (!ready) {
  process.stderr.write('开发服务器启动超时。\n')
  shutdown(1)
}

electron = run('pnpm', ['exec', 'electron', '.'], {
  ...process.env,
  ELECTRON_START_URL: DEV_URL,
})
electron.on('exit', (code) => shutdown(code ?? 0))
