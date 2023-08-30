import parser from '@babel/parser'
import fs from 'fs'
import {
  dirname, resolve, isAbsolute, extname,
} from 'path'
import traverse from '@babel/traverse'
import t from '@babel/types'
import babel from '@babel/core'
import { parse as sfcParse } from '@vue/compiler-sfc'
import { importConfig } from './utils/import-config.js'

let __dirname

let loaders = []

let plugins = []

let suffix = ['.js']

const supportSuffix = ['.js', '.ts', '.vue', '.jsx', '.tsx']

// 文件内容已UTF8编码解读
function readUTF8FileSource(filePath) {
  return fs.readFileSync(resolve(__dirname, filePath), { encoding: 'utf8' })
}

// 根据文件路径得到文件ast
function getAst(filePath) {
  const source = getSource(filePath)
  return parser.parse(source, {
    sourceType: 'module',
    plugins: ['typescript'],
  })
}

function joinSuffix(filePath) {
  if (!isAbsolute(filePath)) {
    filePath = resolve(__dirname, filePath)
  }
  // 是文件夹 代表无后缀 需添加
  if (!fs.existsSync(filePath) || !extname(filePath)) {
    let newFilePath

    suffix.some((name) => {
      if (fs.existsSync(filePath + name)) {
        newFilePath = filePath + name
        return true
      }
      return false
    })

    return newFilePath
  }
  return filePath
}

// 获取绝对路径
function getAbsoluteFilePath(filePath) {
  filePath = joinSuffix(filePath)

  return filePath
}

// 根据文件路径得到文件内容
function getSource(filePath) {
  if (!supportSuffix.some((suffix) => filePath.endsWith(suffix))) {
    return undefined
  }

  let script

  if (filePath.endsWith('.vue')/* 处理vue文件 需要先解析fc */) {
    // 读取路径的文件
    const fileSource = readUTF8FileSource(filePath)
    const sfc = sfcParse(fileSource)

    // vue script内容可能是在setup中
    script = sfc.descriptor?.script?.content
      ? sfc.descriptor.script.content : sfc.descriptor.scriptSetup.content
  } else {
    script = readUTF8FileSource(filePath)
  }

  if (!plugins.length) return script

  return plugins.reduce((source, plugin) => plugin({ source, dirname: dirname(resolve(__dirname, filePath)) }), script)
}

function callLoaders({ ast, source, urls }) {
  if (!loaders.length) return
  loaders.reduce((result, loader) => loader({
    ast, result: urls, source,
  }), [])
}

// 遍历文件内容
function walkImport(filePath, urls, keywords = []) {
  const absoluteFilePath = getAbsoluteFilePath(filePath)

  if (!absoluteFilePath) return

  const source = getSource(absoluteFilePath)

  if (!source) return

  const ast = getAst(absoluteFilePath)

  callLoaders({ ast, source, urls })

  const structure = {
    filePath: absoluteFilePath,
    importDecMap: {},
    exportDecMap: {},
    dependsNames: [...keywords],
  }

  traverse.default(ast, {
    /** 收集import的依赖模块 */
    ImportDeclaration({ node }) {
      const quotePath = resolve(__dirname, dirname(filePath), node.source.value)

      // 遇到vue组件直接进入遍历
      if (quotePath.endsWith('.vue')) {
        walkImport(quotePath, urls, [])
      }

      // 遇到js文件，先收集依赖，如果有用到js文件中的函数，则再进入js进行遍历 否则不仅入js
      // 建立一个对象 key: js_path value: js_imported_value
      structure.importDecMap[quotePath] = node.specifiers.map((specifier) => {
        if (specifier.type === 'ImportSpecifier' /** 具名导出 */) {
          return specifier.imported.name
        }
        if (specifier.type === 'ImportDefaultSpecifier' /** 默认导出 */) {
          return specifier.local.name
        }
        return ''
      })
    },
    /** 收集export的依赖模块 */
    ExportNamedDeclaration(path) {
      const { node } = path
      if (node.source) {
        const quotePath = resolve(__dirname, filePath, node.source.value)

        structure.exportDecMap[quotePath] = node.specifiers
          .map((specifier) => {
            if (specifier.exported) {
              const idx = structure.dependsNames.findIndex((item) => item === specifier.exported.name)
              if (idx !== -1 && specifier?.local?.name !== specifier.exported.name) {
                structure.dependsNames.splice(idx, 0, specifier.local.name)
              }
            }
            if (specifier.local) {
              if (structure.dependsNames.some((item) => item === specifier.local.name)) {
                return specifier.local.name
              }
            }

            return false
          })
          .filter(Boolean)
      }
    },
    /** 收集用到的依赖 */
    enter(path) {
      // 是一个函数调用
      if (path.type === 'CallExpression') {
        const dependName = path?.node?.callee?.name
        if (dependName) {
          structure.dependsNames.push(dependName)
        }
      }
    },
  })

  function runImportExportDenpends() {
    const _parseDecMap = (decMap) => {
      //  解析函数引用 进入该函数的文件再次解析
      if (!Object.keys(decMap).length) return

      Object.entries(decMap).forEach(([urlPath, denpends]) => {
        // 过滤出文件的依赖项
        const fileDepends = structure.dependsNames.filter((dep) => denpends.some((value) => value === dep))

        // import的数据 有被依赖
        if (fileDepends.length) {
          walkImport(urlPath, urls, fileDepends)
        }

        if (urlPath.endsWith('.vue')) {
          walkImport(urlPath, urls, [])
        }
      })
    }
    _parseDecMap(structure.importDecMap)
    _parseDecMap(structure.exportDecMap)
  }
  // console.log('structure: ', structure)

  runImportExportDenpends()
}

// 启动入口
export async function bootstrap(configPath) {
  const {
    config,
    configDirname,
  } = await importConfig(configPath)

  const { input, output, resolve: configResolve } = config

  // 初始化loaders
  loaders = config?.loaders ?? []
  // 初始化plugins
  plugins = config?.plugins ?? []
  // 初始化后缀扩展
  suffix = configResolve?.suffix ?? []

  const routesUrl = resolve(configDirname, input.path)

  // 确定根目录
  __dirname = dirname(routesUrl)
  const source = readUTF8FileSource(routesUrl)
  const ast = getAst(routesUrl)

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
      // 删除对象属性节点
      if (input.remove && input.remove.length) {
        input.remove.forEach((key) => {
          if (path.node.key.name === key) {
            path.remove()
          }
        })
      }
    },
    Property(path) {
      if (path.node.key.name === input.entry) {
        let entryPath
        const { value } = path.node
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

        const urls = []

        // 取到入口文件开始遍历
        walkImport(entryPath, urls, [])

        console.log('walkUrls(urls): ', [...new Set(urls)])

        // 获取兄弟节点列表的父节点
        // const { parentPath } = path

        // // 查找名称为 "urls" 的兄弟节点
        // const urlsSibling = parentPath.get('properties').find((siblingPath) => siblingPath.node.key.name === input.target)

        // // 如果找到 "urls" 兄弟节点
        // if (urlsSibling) {
        //   // 获取兄弟节点的值数组节点
        //   const urlsArray = urlsSibling.get('value')

        //   // 去重
        //   console.log('walkUrls(urls): ', urls)

        //   for (const url of [...new Set(urls)]) {
        //     // 已经存在 下一项
        //     if (urlsArray.get('elements').includes(url)) { continue }
        //     // 如果新项不存在于数组中，则向数组末尾添加新节点
        //     urlsArray.pushContainer('elements', t.stringLiteral(url))
        //   }
        // }
      }
    },
    Identifier(path) {
      if (input.rewrite) {
        // 查找是否有要重写对象key的配置
        Object.entries(input.rewrite)
          .forEach(([oldKey, newKey]) => {
            // 如果有
            if (path.node.name === oldKey) {
              // 新建key
              const newNode = t.identifier(newKey)

              if (path.node.type === 'Identifier' && path.node.name === oldKey) {
                path.replaceWith(newNode) // 使用新节点替代原节点
              }
            }
          })
      }
    },
  })

  const { code } = babel.transformFromAstSync(ast, source, {
    // presets: ['@babel/preset-env'],
  })

  fs.writeFile(resolve(configDirname, output), code, 'utf-8', () => {})
  return code
}
