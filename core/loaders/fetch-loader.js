import traverse from '@babel/traverse'

import { pathsToVal } from '../utils/pathsToVal.js'

export function createFetchLoader(depends) {
  return function ({ ast, source, result }) {
    traverse.default(ast, {
      ExpressionStatement(path) {
        const expression = path?.node?.expression
        if (!expression) return
        const name = expression?.callee?.name
        const [node] = expression?.arguments ?? []

        //  1. 解析fetch函数的第一个参数代表请求路径
        if (name === 'fetch') {
          if (node.type === 'StringLiteral' /** 如果是字符串类型直接当作url */) {
            const url = node.value
            result.push(url)
          } else if (node.type === 'MemberExpression' /** 如果为对象 则截取出对象的字符串路径 后面再进行映射 */) {
            const paths = source.slice(node.start, node.end)

            const url = pathsToVal(depends, paths.split('.'))

            if (url) { result.push(url) }
          }
        }
      },
    })

    return result
  }
}
