import traverse from '@babel/traverse'
import t from '@babel/types'

/**
 * 处理该配置 input: {
 *   target: 'xx'
 * }
 * @param ast
 * @param input
 */
export function insertInput(ast, input) {
  traverse.default(ast, {
    ObjectProperty(path) {
      // 在入口属性后插入目标属性
      if (path.node.key.name === input.entry) {
        const urlNode = t.objectProperty(
          t.identifier(input.target),
          t.arrayExpression([]),
        )
        path.insertAfter(urlNode)
      }
    },
  })
}
