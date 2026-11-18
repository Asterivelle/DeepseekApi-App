import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import process from 'node:process'

rmSync('dist', { recursive: true, force: true })

const args = ['exec', 'rspack', 'build', '-c', 'rspack.config.ts']
const result =
  process.platform === 'win32'
    ? spawnSync(['pnpm', ...args].join(' '), {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' },
        shell: true,
      })
    : spawnSync('pnpm', args, {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' },
      })

process.exit(result.status ?? 1)
