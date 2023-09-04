import traverse from '@babel/traverse'
import t from '@babel/types'

/**
 * 处理该配置 input: {
 *     rewrite: { // 重写对象key
 *       children: 'submenu'
 *     }
 * }
 * @param ast
 * @param input
 */
export function rewriteInput(ast, input) {
  traverse.default(ast, {
    Identifier(path) {
      if (input.rewrite) {
        // 查找是否有要重写对象key的配置
        Object.entries(input.rewrite)
          .forEach(([oldKey, newKey]) => {
            const paths = oldKey.split('.')

            if (paths.length === 1 && path.node.name === paths[0]) {
              // 新建key
              const newNode = t.identifier(newKey)

              path.replaceWith(newNode) // 使用新节点替代原节点
            }
          })
      }
    },
  })
}
