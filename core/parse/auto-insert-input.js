import traverse from '@babel/traverse'
import t from '@babel/types'

export function AutoInsertInput() {
  const autoInsertValue = [
    {
      name: '新增',
      key: 'create',
      type: '3',
    },
    {
      name: '编辑',
      key: 'update',
      type: '3',
    },
    {
      name: '删除',
      key: 'delete',
      type: '3',
    },
  ]
  return function (ast) {
    const nodeMap = new Map()

    const nodeElementsPush = (elements) => {
      autoInsertValue.forEach((item) => {
        const objectNode = t.objectExpression([
          t.objectProperty(t.identifier('name'), t.stringLiteral(item.name)),
          t.objectProperty(t.identifier('key'), t.stringLiteral(item.key)),
          t.objectProperty(t.identifier('type'), t.stringLiteral(item.type)),
        ])
        elements.push(objectNode)
      })
    }

    traverse.default(ast, {
      ObjectProperty(path) {
        const typeEqual3 = !!(path.node.key.name === 'type' && path.node.value.value === '3')

        if (typeEqual3) {
          const { node } = path.parentPath.parentPath

          if (nodeMap.has(node)) {
            return
          }

          nodeMap.set(node, node)

          nodeElementsPush(node.elements)
        }
      },
    })

    traverse.default(ast, {
      ObjectProperty(path) {
        const submenuLengthEqual0 = !!(path.node.key.name === 'sub_menu' && !path.node.value.elements.length)

        if (submenuLengthEqual0) {
          if (nodeMap.has(path.node)) {
            return
          }
          nodeMap.set(path.node, path.node)
          nodeElementsPush(path.node.value.elements)
        }
      },
    })
  }
}
