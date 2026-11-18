import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.join(import.meta.dirname, '..')
const source = path.join(root, 'dist')
const target = path.join(root, 'cordova', 'www')
const sourceHtml = path.join(source, 'index.html')
const targetHtml = path.join(target, 'index.html')

if (!existsSync(sourceHtml)) {
  throw new Error('dist/index.html 不存在，请先运行 pnpm build。')
}

rmSync(target, { recursive: true, force: true })
cpSync(source, target, { recursive: true })

const html = readFileSync(targetHtml, 'utf8')
const withCordova = html.replace(
  /(<head(?:\s[^>]*)?>)/i,
  '$1\n    <script src="cordova.js"></script>'
)
if (withCordova === html) {
  throw new Error('未找到 index.html 的 <head>，无法注入 cordova.js。')
}
writeFileSync(targetHtml, withCordova)
