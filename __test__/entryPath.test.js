import {
  describe, it, expect, vi, test,
} from 'vitest'
import { resolve } from 'path'
import { importConfig } from '../core/utils/import-config.js'
import { parseEntryPath } from '../core/parse/parseEntryPath.js'
import { getAst, getSource } from '../core/parse/parse.js'

describe('provider routes.js to parse entryPath', async () => {
  const { config, configDirname } = await importConfig()

  const { input } = config

  const routesUrl = resolve(configDirname, input.path)

  it('路由文件是否存在', async () => {
    const { routes } = await import(routesUrl)

    expect(routes).toBeTruthy()
  })

  const cb = vi.fn()
  const urls = [
    ['./components/Test.vue', 0],
    ['./components/Layout.vue', 1],
  ]

  it('是否成功解析路由文件中component的值', async () => {
    const source = getSource(routesUrl)

    parseEntryPath({ ast: getAst(source), source, input }, cb)

    expect(cb).toHaveBeenCalledTimes(urls.length)
  })

  test.each([
    ['./components/Test.vue', 0],
    ['./components/Layout.vue', 1],
  ])('entryPath: %s_%d', (url, idx) => {
    expect(cb.mock.calls[idx][0].entryPath).toBe(url)
  })
})
