import traverse from '@babel/traverse'
import { pathsToVal } from '../utils/pathsToVal.js'

export function create$RestLoader(depends) {
  return function ({ ast, source, result }) {
    traverse.default(ast, {
      ExpressionStatement(path) {
        const expression = path?.node?.expression
        if (!expression) return

        if (expression?.type === 'CallExpression') {
          const { start, end } = expression

          const words = source.slice(start, end)

          if (!words.includes('$rest')) return

          // $rest.a.c.get()
          if (!words.includes('this')) {
            const splitArr = words.split('.')
            splitArr.shift() // 去除$rest
            splitArr.pop() // 去除.get() / .post ...
            splitArr.unshift('obj') // 加入 urls 变量名称

            const url = pathsToVal(depends, splitArr)

            result.push(url)
          }
        }
      },
    })

    return result
  }
}
