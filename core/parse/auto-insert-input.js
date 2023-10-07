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

    // 1.type = 3 代表按钮级别的控制 找到按钮的父级，添加默认的按钮权限
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

    // 2. sub_menu 长度为0 代表为按钮级别控制 ，添加默认按钮权限
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

    // 3. type = 2  代表为tab， tab下需要添加默认的按钮权限
    traverse.default(ast, {
      ObjectProperty(path) {
        const typeEqual2 = !!(path.node.key.name === 'type' && path.node.value.value === '2')

        if (typeEqual2) {
          const { node } = path.parentPath

          if (nodeMap.has(node)) {
            return
          }

          nodeMap.set(node, node)
          // 构造一个sub_menu 数组 插入node中
          const elements = []

          nodeElementsPush(elements)

          node.properties.push(t.objectProperty(
            t.identifier('sub_menu'),
            t.arrayExpression(elements),
          ))
        }
      },
    })
  }
}
