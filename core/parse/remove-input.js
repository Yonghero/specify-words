import traverse from '@babel/traverse'

/**
 * 处理该配置 input: {
 *   remove: ['role', 'component', 'meta']
 * }
 * @param ast
 * @param input
 */
export function removeInput(ast, input) {
  traverse.default(ast, {
    ObjectProperty(path) {
      // 删除对象属性节点
      if (input.remove && input.remove.length) {
        input.remove.forEach((key) => {
          if (path?.node?.key?.name === key) {
            path.remove()
          }
        })
      }
    },
  })
}
