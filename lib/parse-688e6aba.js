import parser from '@babel/parser';
import fs from 'fs';
import { dirname, resolve, isAbsolute, extname } from 'path';
import traverse from '@babel/traverse';
import t from '@babel/types';
import babel from '@babel/core';
import { parse } from '@vue/compiler-sfc';
import { fileURLToPath } from 'url';
import { access } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname$1 = dirname(__filename);

async function findRootDir(dirPath) {
  try {
    await access(`${dirPath}/package.json`);
    await access(`${dirPath}/node_modules`);
    return dirPath
  } catch (e) {
    if (dirname(dirPath) === dirPath) {
      throw new Error('Root directory not found')
    } else {
      return findRootDir(dirname(dirPath))
    }
  }
}

async function importConfig(configPath) {
  return new Promise((res) => {
    if (configPath) {
      import(configPath)
        .then((config) => res({ configDirname: dirname(configPath), config: config.default }));
    } else {
      findRootDir(__dirname$1)
        .then((rootDir) => {
          import(resolve(rootDir, './specify.config.js'))
            .then((config) => res({ config: config.default, configDirname: rootDir }))
            .catch(() => res({}));
        })
        .catch(() => res({}));
    }
  })
}

/**
 * 处理该配置 input: {
 *   remove: ['role', 'component', 'meta']
 * }
 * @param ast
 * @param input
 */
function removeInput(ast, input) {
  traverse.default(ast, {
    ObjectProperty(path) {
      // 删除对象属性节点
      if (input.remove && input.remove.length) {
        input.remove.forEach((key) => {
          if (path?.node?.key?.name === key) {
            path.remove();
          }
        });
      }
    },
  });
}

/**
 * 处理该配置 input: {
 *   target: 'xx'
 * }
 * @param ast
 * @param input
 */
function insertInput(ast, input) {
  traverse.default(ast, {
    ObjectProperty(path) {
      // 在入口属性后插入目标属性
      if (path.node.key.name === input.entry) {
        const urlNode = t.objectProperty(
          t.identifier(input.target),
          t.arrayExpression([]),
        );
        path.insertAfter(urlNode);
      }
    },
  });
}

/**
 * 处理该配置 input: {
 *     rewrite: { // 重写对象key
 *       children: 'submenu'
 *     }
 * }
 * @param ast
 * @param input
 */
function rewriteInput(ast, input) {
  traverse.default(ast, {
    Identifier(path) {
      if (input.rewrite) {
        // 查找是否有要重写对象key的配置
        Object.entries(input.rewrite)
          .forEach(([oldKey, newKey]) => {
            const paths = oldKey.split('.');

            if (paths.length === 1 && path.node.name === paths[0]) {
              // 新建key
              const newNode = t.identifier(newKey);

              path.replaceWith(newNode); // 使用新节点替代原节点
            }
          });
      }
    },
  });
}

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
function mapInput(ast, input) {
  traverse.default(ast, {
    Property(path) {
      Object.entries(input.mapping).forEach(([key, newKey]) => {
        const paths = key.split('.');

        if (path?.node?.value?.type === 'ObjectExpression' && paths.length > 1 && paths.shift() === path.node.key.name) {
          let value;
          let property = path.node.value.properties;

          // console.log(path.parentPath.get('properties').find(item => item.node.key.name === 'children'))

          while (paths.length) {
            const item = property.find((p) => p.key.name === paths[0]);

            if (item.key.name === paths.shift()) {
              if (item.value.type === 'StringLiteral') {
                value = item.value.value;
                break
              } else {
                property = item.value;
                continue
              }
            }
          }

          if (value) {
            const newProperty = t.objectProperty(t.identifier(newKey), t.stringLiteral(value));

            const { properties } = path.parentPath.node;

            // 是否有重名
            if (properties.length) {
              properties.some((property, idx) => {
                // 有 -> 删除
                if (property.key.name === newKey) {
                  path.parentPath.get('properties')[idx].remove();
                  return true
                }
                return false
              });
            }

            // 再添加映射的新属性
            path.parentPath.node.properties.push(newProperty);
          }
        }
      });
    },
  });
}

function parseEntryPath({ ast, source, input }, callback) {
  traverse.default(ast, {
    Property(path) {
      if (path.node.key.name === input.entry) {
        const { value } = path.node;
        let entryPath = null;
        if (value.type === 'Identifier') {
          const entryName = source.slice(value.start, value.end);

          // component: Layout
          traverse.default(ast, {
            ImportDeclaration(importPath) {
              if (importPath?.node?.specifiers[0]?.local?.name === entryName) {
                entryPath = importPath.node.source.value;
              }
            },
          });
        } else {
          // component: () => import(./layout.vue)
          entryPath = value.body.arguments[0].value.toString();
        }

        callback({
          entryPath, path, source, input,
        });
      }
    },
  });
}

// 解码 Unicode 转义字符
function decodeUnicode(str) {
  return str.replace(/\\u[0-9a-f]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)))
}

let __dirname;

let loaders = [];

let plugins = [];

let suffix = ['.js'];

const supportSuffix = ['.js', '.ts', '.vue', '.jsx', '.tsx'];

// 文件内容已UTF8编码解读
function readUTF8FileSource(filePath) {
  return fs.readFileSync(resolve(__dirname, filePath), { encoding: 'utf8' })
}

// 根据文件路径得到文件ast
function getAst(source) {
  return parser.parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'vue'],
  })
}

// 拼接文件路径
function joinSuffix(filePath) {
  if (!isAbsolute(filePath)) {
    filePath = resolve(__dirname, filePath);
  }
  // 是文件夹 代表无后缀 需添加
  if (!fs.existsSync(filePath) || !extname(filePath)) {
    let newFilePath;

    suffix.some((name) => {
      if (fs.existsSync(filePath + name)) {
        newFilePath = filePath + name;
        return true
      }
      return false
    });

    return newFilePath
  }
  return filePath
}

// 根据文件路径得到文件内容
function getSource(filePath, depends = []) {
  if (!supportSuffix.some((suffix) => filePath.endsWith(suffix))) {
    return undefined
  }

  let script;

  if (filePath.endsWith('.vue')/* 处理vue文件 需要先解析fc */) {
    // 读取路径的文件
    const fileSource = readUTF8FileSource(filePath);
    const sfc = parse(fileSource);

    // vue script内容可能是在setup中
    script = sfc.descriptor?.script?.content
      ? sfc.descriptor.script.content : sfc.descriptor.scriptSetup.content;

    depends.push(...collectVueTmplDepends(sfc.descriptor.template.ast));
    // script = sfc.descriptor.source
  } else {
    script = readUTF8FileSource(filePath);
  }

  if (!plugins.length) return script

  return plugins.reduce((source, plugin) => plugin({ source, dirname: dirname(resolve(__dirname, filePath)) }), script)
}

// 收集vue-template的bind属性依赖
function collectVueTmplDepends(tmplAst) {
  if (!tmplAst) return []
  const dependsBind = [];

  const _binds = (child) => {
    if (child?.props?.length) {
      child.props.forEach((prop) => {
        if (prop.name === 'bind') {
          dependsBind.push(prop.exp.content);
        }
      });
    }
    if (child?.children?.length) child.children.forEach((item) => _binds(item));
  };

  _binds(tmplAst);

  return dependsBind
}

function callLoaders({ ast, source, urls }) {
  if (!loaders.length) return
  loaders.reduce((result, loader) => loader({
    ast, result: urls, source,
  }), []);
}
// 遍历文件内容
function walkImport(filePath, urls, keywords = []) {
  // 文件绝对路径
  const absoluteFilePath = joinSuffix(filePath);

  if (!absoluteFilePath) return true

  // 文件内容
  const source = getSource(absoluteFilePath, keywords);

  if (!source) return true

  // 文件ast
  const ast = getAst(source);

  // 调用loaders
  callLoaders({ ast, source, urls });

  const structure = {
    filePath: absoluteFilePath,
    importDecMap: {},
    exportDecMap: {},
    dependsNames: [...keywords],
  };

  // eslint-disable-next-line no-new
  const dependsNamesProxy = new Proxy(structure.dependsNames, {
    get(target, p, receiver) {
      return Reflect.get(target, p, receiver)
    },
    set(target, p, newValue) {
      if (target.includes(newValue)) return true
      target.push(newValue);
      return true
    },
  });

  let exit = false;

  traverse.default(ast, {
    /** 收集import的依赖模块 */
    ImportDeclaration({ node }) {
      const quotePath = resolve(__dirname, dirname(filePath), node.source.value);

      // 遇到vue组件直接进入遍历
      if (quotePath.endsWith('.vue')) {
        walkImport(quotePath, urls, []);
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
      });
    },
    /** 收集export的依赖模块 */
    ExportNamedDeclaration(path) {
      const { node } = path;
      if (node.source) {
        const quotePath = resolve(__dirname, filePath, node.source.value);

        structure.exportDecMap[quotePath] = node.specifiers
          .map((specifier) => {
            if (specifier.exported) {
              const idx = dependsNamesProxy.findIndex((item) => item === specifier.exported.name);
              if (idx !== -1 && specifier?.local?.name !== specifier.exported.name) {
                dependsNamesProxy.splice(idx, 0, specifier.local.name);
              }
            }
            if (specifier.local) {
              if (dependsNamesProxy.some((item) => item === specifier.local.name)) {
                return specifier.local.name
              }
            }

            return false
          })
          .filter(Boolean);
      }
    },
    ExportAllDeclaration(path) {
      if (path.node.type === 'ExportAllDeclaration') {
        // console.log(path.node.source.value, '--')
        const quotePath = resolve(__dirname, filePath, path.node.source.value);
        structure.exportDecMap[quotePath] = ['*'];
      }
    },
    /** 收集用到的依赖 */
    enter(path) {
      // 是一个函数调用
      if (path.type === 'CallExpression') {
        const dependName = path?.node?.callee?.name;
        if (dependName) {
          dependsNamesProxy.push(dependName);
        }
      }
    },
    FunctionDeclaration(path) {
      // 如果依赖项里有该函数声明，则不用再继续往下找了
      if (dependsNamesProxy.includes(path?.node?.id?.name)) {
        exit = true;
      }
    },
  });

  function runImportExportDepends() {
    const _parseDecMap = (decMap) => {
      //  解析函数引用 进入该函数的文件再次解析
      if (!Object.keys(decMap).length) return

      const entries = Object.entries(decMap);

      for (let i = 0; i < entries.length; i++) {
        const [urlPath, depends] = entries[i];
        if (depends.length) {
          const [all] = depends;
          if (all === '*') {
            // 在 所有导入的文件中找到了 使用的依赖,则不用再继续往下找
            const isExit = walkImport(urlPath, urls, dependsNamesProxy);
            if (isExit) break
            else continue
          }
        }
        // 过滤出文件的依赖项
        const fileDepends = dependsNamesProxy.filter((dep) => depends.some((value) => value === dep));

        // import的数据 有被依赖
        if (fileDepends.length) {
          const isExit = walkImport(urlPath, urls, fileDepends);
          if (isExit) break
          else continue
        }

        if (urlPath.endsWith('.vue')) {
          const isExit = walkImport(urlPath, urls, []);
          if (isExit) break
          else continue
        }
      }
    };
    _parseDecMap(structure.importDecMap);
    _parseDecMap(structure.exportDecMap);
  }

  runImportExportDepends();

  return exit
}

// 收集urls
function collectUrls({ entryPath, path, input }) {
  if (!entryPath) return
  const urls = [];

  // 取到入口文件开始遍历
  walkImport(entryPath, urls, []);

  const filterUrls = [...new Set(urls.filter(Boolean))];

  // 获取兄弟节点列表的父节点
  const { parentPath } = path;

  // 查找名称为 "urls" 的兄弟节点
  const urlsSibling = parentPath.get('properties').find((siblingPath) => siblingPath.node.key.name === input.target);

  // 如果找到 "urls" 兄弟节点
  if (urlsSibling) {
    // 获取兄弟节点的值数组节点
    const urlsArray = urlsSibling.get('value');

    for (const url of filterUrls) {
      // 已经存在 下一项
      if (urlsArray.get('elements').includes(url)) { continue }
      // 如果新项不存在于数组中，则向数组末尾添加新节点
      urlsArray.pushContainer('elements', t.stringLiteral(url));
    }
  }
}

function runInputAction(inputArr) {
  return function (ast, input) {
    for (const fuc of inputArr) {
      fuc(ast, input);
    }
  }
}

// 输出文件
function fileOutput(code, output, targetDir) {
  const result = output.json;

  /**
   * 将 AST ArrayExpression 转换为runtime的数组
   * @param aePath ArrayExpressionPath
   * @private
   */
  const _astAEToCode = (aePath) => {
    if (aePath.type !== 'ArrayExpression') { return [] }

    const code = [];
    const { elements } = aePath;

    const _astOEToCode = (oePath, parent) => {
      const { properties } = oePath;

      for (const property of properties) {
        if (property.value.type === 'ArrayExpression') {
          const value = _astAEToCode(property.value);
          parent[property.key.name] = value;
        } else {
          parent[property.key.name] = property.value.value;
        }
      }
    };

    for (const ele of elements) {
      if (ele.type === 'ObjectExpression') {
        const obj = {};
        _astOEToCode(ele, obj);
        code.push(obj);
      } else {
        code.push(ele.value);
      }
    }

    return code
  };

  traverse.default(getAst(code), {
    ArrayExpression(path) {
      if (!result.sub_menu) {
        result.sub_menu = _astAEToCode(path.node);
      }
    },
  });

  fs.writeFile(targetDir, JSON.stringify(result), 'utf-8', () => {
    console.log(`write ${targetDir} file success!`);
  });
}

// 启动入口
async function bootstrap(configPath) {
  const {
    config,
    configDirname,
  } = await importConfig(configPath);

  const { input, output, resolve: configResolve } = config;

  // 初始化loaders
  loaders = config?.loaders ?? [];
  // 初始化plugins
  plugins = config?.plugins ?? [];
  // 初始化后缀扩展
  suffix = configResolve?.suffix ?? [];

  const routesUrl = resolve(configDirname, input.path);

  // 确定根目录
  __dirname = dirname(routesUrl);
  const source = getSource(routesUrl);
  const ast = getAst(source);

  runInputAction([insertInput, rewriteInput])(ast, input);

  parseEntryPath({ ast, source, input }, collectUrls);

  runInputAction([mapInput, removeInput])(ast, input);

  const { code } = babel.transformFromAstSync(ast, source, {
    comments: false,
  });

  const decodedOutputCode = decodeUnicode(code);
  fileOutput(decodedOutputCode, output, (resolve(configDirname, output.path)));

  return code
}

export { bootstrap as b };