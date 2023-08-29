/**
 * 1. 路径别名
 * 2. 匹配规则
 *  2.1 特殊制定
 *  2.2 正则匹配
 * 3. 引入vitest
 */

/**
 * 对一个数组对象进行解析
 * 提供一个入口键
 * 收集入口键中的所有url
 */

import path from 'path'
import { createFetchLoader, create$RestLoader, createUrlLoader } from './core/loaders/index.js'
import { alias } from './core/plugins/index.js'
import { obj } from './test/components/urls.js'

export default {
  input: {
    path: './test/routes.js', // 含有目标数组对象的文件路径
    entry: 'component', // 对象的入口键
    target: 'urls', // 收集该入口中的所有url，并写入到urls属性中
    rewrite: { // 重写对象key
      children: 'submenu',
    },
    remove: ['role'], // 删除对象key
  },
  output: './dist/parsed-routes.js',
  resolve: {
    suffix: ['.js', '.ts', '.vue', '/index.js', '/index.ts'],
  },
  loaders: [
    createFetchLoader({ obj }),
    create$RestLoader({ obj }),
    createUrlLoader({ obj }),
  ],
  plugins: [
    alias({ '@': path.resolve('./test') }),
    // suffix(['.js', '.ts', '.vue', '/index.js', '/index.ts']),
  ],
}
