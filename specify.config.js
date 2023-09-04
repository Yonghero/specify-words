/**
 * 1. 路径别名
 * 2. 匹配规则
 *  2.1 特殊制定
 *  2.2 正则匹配
 * 3. 引入vitest
 */

/**
 * 对一个数组对象进行解析
 * 提供一个入口键的名称
 * 收集入口键中的所有url
 */

import path from 'path'
import { createFetchLoader, create$RestLoader, createUrlLoader } from './core/loaders/index.js'
import { alias } from './core/plugins/index.js'
import { obj } from './test/components/urls.js'

export default {
  // 输入
  input: {
    path: './test/routes.js', // 含有目标数组对象的文件路径
    entry: 'component', // 提供的入口键的名称
    target: 'urls', // 收集后的url写入到urls属性中
    rewrite: { // 重写对象key名称
      children: 'submenu',
    },
    mapping: { // 映射对象的键值
      'meta.name': 'name',
      'meta.role': 'key',
    },
    remove: ['role', 'component', 'meta', 'path'], // 需要删除键
  },
  // 输出
  output: {
    // 输出的json格式
    json: {
      key: 'test-system',
      name: '测试系统写入',
    },
    path: './dist/route.json', // 输出路径
  },
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
  ],
}
