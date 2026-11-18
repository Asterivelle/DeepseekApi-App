import { existsSync, readdirSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.join(import.meta.dirname, '..')
const cordovaDir = path.join(root, 'cordova')
const platformDir = path.join(cordovaDir, 'platforms', 'android')
const configPath = path.join(platformDir, 'cdv-gradle-config.json')
const cordovaCli = path.join(cordovaDir, 'node_modules', 'cordova', 'bin', 'cordova')
const windows = process.platform === 'win32'

const run = (command, args, options = {}) => {
  const result = windows
    ? spawnSync(
        [command, ...args].map((arg) => `"${String(arg).replaceAll('"', '""')}"`).join(' '),
        { ...options, shell: true }
      )
    : spawnSync(command, args, options)

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (!existsSync(configPath)) {
  throw new Error('Cordova Android 平台未添加，请先运行 pnpm android:add。')
}

if (!existsSync(cordovaCli)) {
  throw new Error('Cordova CLI 未安装，请先运行 pnpm install。')
}

const sdkDir = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
if (!sdkDir || !existsSync(sdkDir)) {
  throw new Error('未找到 Android SDK。请设置 ANDROID_HOME 或 ANDROID_SDK_ROOT 指向已安装的 SDK。')
}

run(process.execPath, [cordovaCli, 'prepare', 'android'], {
  cwd: cordovaDir,
  stdio: 'inherit',
  env: process.env,
})

const { GRADLE_VERSION: gradleVersion } = JSON.parse(readFileSync(configPath, 'utf8'))
const gradleBinary = windows ? 'gradle.bat' : 'gradle'

const findGradle = () => {
  if (process.env.GRADLE_HOME) {
    const candidate = path.join(process.env.GRADLE_HOME, 'bin', gradleBinary)
    if (existsSync(candidate)) {
      return candidate
    }
  }

  const cacheDir = path.join(
    os.homedir(),
    '.gradle',
    'wrapper',
    'dists',
    `gradle-${gradleVersion}-bin`
  )
  if (existsSync(cacheDir)) {
    for (const hash of readdirSync(cacheDir)) {
      const candidate = path.join(cacheDir, hash, `gradle-${gradleVersion}`, 'bin', gradleBinary)
      if (existsSync(candidate)) {
        return candidate
      }
    }
  }

  const lookup = spawnSync(windows ? 'where.exe' : 'which', ['gradle'], {
    encoding: 'utf8',
    windowsHide: true,
  })
  return lookup.status === 0 ? lookup.stdout.split(/\r?\n/).find(Boolean) : undefined
}

const gradle = findGradle()
if (!gradle) {
  throw new Error(
    `未找到 Gradle ${gradleVersion}。请将已安装的 Gradle 目录设为 GRADLE_HOME，或加入 PATH。`
  )
}

const args = ['-p', platformDir, 'assembleDebug', '--parallel', '--max-workers=4']
run(gradle, args, { cwd: cordovaDir, stdio: 'inherit', env: process.env })

process.stdout.write(
  `Android APK: ${path.join(platformDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')}\n`
)
