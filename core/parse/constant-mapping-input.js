import traverse from '@babel/traverse'
import t from '@babel/types'
import { pathsToVal } from '../utils/pathsToVal'

export function ConstantMappingLoader(field, mapping) {
  return function (ast, input, source) {
    traverse.default(ast, {
      Property(path) {
        const { node } = path
        if (node.key.name === field) {
          if (node.value.type === 'MemberExpression') {
            const { start } = node.value
            const { end } = node.value

            const result = source.slice(start, end)

            const value = pathsToVal(mapping, result.split('.'))
            const newNode = t.stringLiteral(value)

            path.get('value').replaceWith(newNode)
          }
        }
      },
    })
  }
}
