import traverse from '@babel/traverse'

export function parseEntryPath({ ast, source, input }, callback) {
  traverse.default(ast, {
    Property(path) {
      if (path.node.key.name === input.entry) {
        const { value } = path.node
        let entryPath = null
        if (value.type === 'Identifier') {
          const entryName = source.slice(value.start, value.end)

          // component: Layout
          traverse.default(ast, {
            ImportDeclaration(importPath) {
              if (importPath?.node?.specifiers[0]?.local?.name === entryName) {
                entryPath = importPath.node.source.value
              }
            },
          })
        } else {
          // component: () => import(./layout.vue)
          entryPath = value.body.arguments[0].value.toString()
        }

        callback({
          entryPath, path, source, input,
        })
      }
    },
  })
}
