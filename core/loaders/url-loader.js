import traverse from '@babel/traverse'
import { pathsToVal } from '../utils/pathsToVal.js'

export function createUrlLoader(depends) {
  return function ({ ast, source, result }) {
    traverse.default(ast, {
      Property(path) {
        const { node } = path
        /**
         * url: xxx
         * url = xx
         */
        if (node.key.name === 'url') {
          const { start, end, type } = node.value

          // 字符串类型无需映射
          if (type === 'StringLiteral') {
            result.push(node.value.value)
          } else if (type === 'MemberExpression' /** 对象类型需要再次映射 */) {
            const splitArr = source.slice(start, end).split('.')
            const url = pathsToVal(depends, splitArr)
            result.push(url)
          }
        }
      },
    })

    return result
  }
}
