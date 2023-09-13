import traverse from '@babel/traverse'
import t from '@babel/types'

/**
 * 处理该配置 input: {
 *   mapping: {
 *       'meta.name': 'name',
 *       'meta.role': 'key',
 *     },
 * }
 * @param ast
 * @param input
 */
export function mapInput(ast, input) {
  traverse.default(ast, {
    Property(path) {
      Object.entries(input.mapping).forEach(([key, newKey]) => {
        const paths = key.split('.')

        if (path?.node?.value?.type === 'ObjectExpression' && paths.length > 1 && paths.shift() === path.node.key.name) {
          let value
          let property = path.node.value.properties

          while (paths.length) {
            const item = property.find((p) => p.key.name === paths[0])

            if (item?.key?.name === paths.shift()) {
              if (item.value.type === 'StringLiteral') {
                value = item.value.value
                break
              } else {
                property = item.value
                continue
              }
            }
          }

          if (value) {
            const newProperty = t.objectProperty(t.identifier(newKey), t.stringLiteral(value))

            const { properties } = path.parentPath.node

            // 是否有重名
            if (properties.length) {
              properties.some((property, idx) => {
                // 有 -> 删除
                if (property.key.name === newKey) {
                  path.parentPath.get('properties')[idx].remove()
                  return true
                }
                return false
              })
            }

            // 再添加映射的新属性
            path.parentPath.node.properties.push(newProperty)
          }
        }
      })
    },
  })
}
