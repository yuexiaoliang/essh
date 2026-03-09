import type { GlobalConfig, ServerConfig, ServersData } from './types.js'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'

const CONFIG_DIR = path.join(os.homedir(), '.essh')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const CACHE_DIR = path.join(CONFIG_DIR, 'cache')
const SSH_DIR = path.join(os.homedir(), '.ssh')
const ESSH_SSH_DIR = path.join(SSH_DIR, 'essh')

export function getConfigDir(): string {
  return CONFIG_DIR
}

export function getCacheDir(): string {
  return CACHE_DIR
}

export function getSshDir(): string {
  return SSH_DIR
}

export function getEsshSshDir(): string {
  return ESSH_SSH_DIR
}

export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR)
  await fs.ensureDir(CACHE_DIR)
  await fs.ensureDir(SSH_DIR)
  await fs.ensureDir(ESSH_SSH_DIR)
}

export async function loadGlobalConfig(): Promise<GlobalConfig | null> {
  try {
    const exists = await fs.pathExists(CONFIG_FILE)
    if (!exists)
      return null
    const content = await fs.readJson(CONFIG_FILE)
    return content as GlobalConfig
  }
  catch {
    return null
  }
}

export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 })
}

export async function loadServers(): Promise<ServerConfig[]> {
  const serversFile = path.join(CACHE_DIR, 'servers.json')
  try {
    const exists = await fs.pathExists(serversFile)
    if (!exists)
      return []
    const data = await fs.readJson(serversFile) as ServersData
    return data.servers || []
  }
  catch {
    return []
  }
}

export async function saveServers(servers: ServerConfig[]): Promise<void> {
  const serversFile = path.join(CACHE_DIR, 'servers.json')
  const data: ServersData = { servers }
  await fs.writeJson(serversFile, data, { spaces: 2 })
}

const PASSWORD_FILE = path.join(CONFIG_DIR, '.password')

export async function getPassword(): Promise<string> {
  // 1. 检查环境变量
  const envPassword = process.env.ESSH_PASSWORD
  if (envPassword) {
    return envPassword
  }

  // 2. 检查密码文件
  try {
    const exists = await fs.pathExists(PASSWORD_FILE)
    if (exists) {
      const password = await fs.readFile(PASSWORD_FILE, 'utf-8')
      return password.trim()
    }
  }
  catch {
    // 读取失败，继续让用户输入
  }

  // 3. 提示用户输入
  const inquirer = await import('inquirer')
  const { password } = await inquirer.default.prompt([
    {
      type: 'password',
      name: 'password',
      message: '请输入加密密码：',
      mask: '*',
    },
  ])

  // 4. 保存密码到文件
  try {
    await fs.writeFile(PASSWORD_FILE, password, { mode: 0o600 })
  }
  catch (error) {
    console.warn('警告：无法保存密码文件，每次操作都需要输入密码')
  }

  return password
}

export function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return filepath.replace(/^~/, os.homedir())
  }
  return filepath
}
