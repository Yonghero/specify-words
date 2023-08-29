import { pathsToVal } from '../utils/pathsToVal.js'

export function create$RestLoader(depends) {
  return function ({ expression, source, result }) {
    if (expression?.type === 'CallExpression') {
      const { start, end } = expression

      const words = source.slice(start, end)

      if (!words.includes('$rest')) return result

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

    return result
  }
}
