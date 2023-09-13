import traverse from '@babel/traverse'
import t from '@babel/types'

/**
 * 提供一个对象的key, 找到该对象, 并插入一个提供的key_value
 * @param {*} targetKey
 * @param {*} insertKey
 * @param {*} insertValue
 * @returns
 */
export function InsertDefaultLoader(targetKey, insertKey, insertValue) {
  return function (ast) {
    traverse.default(ast, {
      ObjectProperty(path) {
        // 在入口属性后插入目标属性
        if (path.node.key.name === 'path') {
          let exp
          if (Array.isArray(insertValue)) {
            exp = t.arrayExpression([])
          } else if (typeof insertValue === 'string') {
            exp = t.stringLiteral(insertValue)
          } else if (typeof insertValue === 'number') {
            exp = t.numericLiteral(insertValue)
          } else if (typeof insertValue === 'boolean') {
            exp = t.booleanLiteral(insertValue)
          }

          const { parentPath } = path

          const sibling = parentPath.get('properties').find((siblingPath) => siblingPath.node.key.name === insertKey)

          if (!!sibling === false) {
            const urlNode = t.objectProperty(
              t.identifier(insertKey),
              exp,
            )
            path.insertAfter(urlNode)
          }
        }
      },
    })
  }
}
