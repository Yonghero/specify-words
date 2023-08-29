import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { access } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function findRootDir(dirPath) {
  try {
    await access(`${dirPath}/package.json`)
    await access(`${dirPath}/node_modules`)
    return dirPath
  } catch (e) {
    if (dirname(dirPath) === dirPath) {
      throw new Error('Root directory not found')
    } else {
      return findRootDir(dirname(dirPath))
    }
  }
}

export async function importConfig(configPath) {
  return new Promise((res) => {
    if (configPath) {
      import(configPath)
        .then((config) => res({ configDirname: dirname(configPath), config: config.default }))
    } else {
      findRootDir(__dirname)
        .then((rootDir) => {
          import(resolve(rootDir, './specify.config.js'))
            .then((config) => res({ config: config.default, configDirname: rootDir }))
            .catch(() => res({}))
        })
        .catch(() => res({}))
    }
  })
}
