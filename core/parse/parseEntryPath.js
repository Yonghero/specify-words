import traverse from '@babel/traverse'

export function parseEntryPath({ ast, source, input }, callback) {
  const tra = traverse.default ? traverse.default : traverse

  tra(ast, {
    Property(path) {
      if (path.node.key.name === input.entry) {
        const { value } = path.node
        let entryPath = null
        if (value.type === 'Identifier') {
          const entryName = source.slice(value.start, value.end)

          // component: Layout
          tra(ast, {
            ImportDeclaration(importPath) {
              if (importPath?.node?.specifiers[0]?.local?.name === entryName) {
                entryPath = importPath.node.source.value
              }
            },
          })
        } else {
          // component: () => import(./layout.vue)

          const arg = value.arguments ? value.arguments : value.body.arguments
          entryPath = arg[0].value.toString()
        }

        if (!entryPath) return

        callback({
          entryPath, path, source, input,
        })
      }
    },
  })
}
