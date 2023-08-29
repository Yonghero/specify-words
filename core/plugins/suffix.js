import traverse from '@babel/traverse'
import parser from '@babel/parser'
import { extname, isAbsolute, resolve } from 'path'
import fs from 'fs'

/**
 * 解析导入语句 是否有后缀名
 * 无后缀名 尝试加入后缀 判断加入后缀后的文件是否存在
 * 存在保留
 * 不存在删除该导入语句
 * @param {string[]} suffixList
 * @returns {string}
 */
export function suffix(suffixList) {
  return function ({ source, dirname }) {
    const ast = parser.parse(source, {
      sourceType: 'module',
    })

    traverse.default(ast, {
      ImportDeclaration({ node }) {
        let filePath = node.source.value
        // 不为绝对路径要拼接一下根路径
        if (!isAbsolute(filePath)) {
          filePath = resolve(dirname, filePath)
        }

        // 是文件夹 代表无后缀 需添加
        if (!fs.existsSync(filePath) || !extname(filePath)) {
          let newFilePath

          suffixList.some((name) => {
            if (fs.existsSync(filePath + name)) {
              newFilePath = filePath + name
              return true
            }
            return false
          })

          source = source.replace(node.source.value, newFilePath)
        }
      },
    })

    return source
  }
}
