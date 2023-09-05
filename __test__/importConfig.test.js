import { expect, it } from 'vitest'
import { resolve } from 'path'
import { importConfig } from '../core/utils/import-config.js'

it('没有提供配置文件的路径', async () => {
  expect.assertions(1)
  const result = await importConfig()

  expect(result).toStrictEqual({
    config: expect.any(Object),
    configDirname: '/Users/younghero/Repository/@yh/specify-words',
  })
})

it('提供配置文件的路径', async () => {
  expect.assertions(1)
  const result = await importConfig(resolve(process.cwd(), './specify.config.js'))

  expect(result).toStrictEqual({
    config: expect.any(Object),
    configDirname: '/Users/younghero/Repository/@yh/specify-words',
  })
})
