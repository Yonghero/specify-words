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

let __dirname;

let loaders = [];

let plugins = [];

let suffix = ['.js'];

// 文件内容已UTF8编码解读
function readUTF8FileSource(filePath) {
  return fs.readFileSync(resolve(__dirname, filePath), { encoding: 'utf8' })
}

// 根据文件路径得到文件ast
function getAst(filePath) {
  const source = getSource(filePath);
  return parser.parse(source, {
    sourceType: 'module',
    plugins: ['typescript'],
  })
}

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
function getSource(filePath) {
  // console.log('filePath: ', filePath)
  filePath = joinSuffix(filePath);

  let script;

  if (filePath.endsWith('.vue')/* 处理vue文件 需要先解析fc */) {
    // 读取路径的文件
    const fileSource = readUTF8FileSource(filePath);
    const sfc = parse(fileSource);

    // vue script内容可能是在setup中
    script = sfc.descriptor?.script?.content
      ? sfc.descriptor.script.content : sfc.descriptor.scriptSetup.content;
  } else {
    script = readUTF8FileSource(filePath);
  }

  if (!plugins.length) return script

  return plugins.reduce((source, plugin) => plugin({ source, dirname: dirname(resolve(__dirname, filePath)) }), script)
}

// 遍历文件内容
function walkImport(filePath, urls, keywords = []) {
  const source = getSource(filePath);

  const ast = getAst(filePath);

  // 导入依赖集合
  const importDecMap = {};
  // 导出依赖集合
  const exportDecMap = {};

  // 依赖的函数名称集合
  const dependsNames = [...keywords];

  // 解析函数调用的表达式
  function parseExpression(expression, path) {
    const name = expression?.callee?.name;
    if (name) {
      dependsNames.push(name);
    }
    // 调用loaders
    if (!loaders.length) return
    const result = loaders.reduce((result, loader) => loader({
      expression, result, source, path,
    }), []);
    urls.push(...result);
  }

  traverse.default(ast, {
    /** 收集import的依赖模块 */
    ImportDeclaration({ node }) {
      const quotePath = resolve(__dirname, dirname(filePath), node.source.value);

      // 遇到vue组件直接进入遍历
      if (quotePath.endsWith('.vue')) {
        walkImport(quotePath, urls, dependsNames);
      }

      // 遇到js文件，先收集依赖，如果有用到js文件中的函数，则再进入js进行遍历 否则不仅入js
      // 建立一个对象 key: js_path value: js_imported_value
      importDecMap[quotePath] = node.specifiers.map((specifier) => {
        if (specifier.type === 'ImportSpecifier' /** 具名导出 */) {
          return specifier.imported.name
        }
        if (specifier.type === 'ImportDefaultSpecifier' /** 默认导出 */) {
          return specifier.local.name
        }
        return ''
      });
    },
    /**
    * 函数声明
    * @example function test() {} 如果有test()调用则进行解析
    * @param {*} path
    */
    FunctionDeclaration(path) {
      const { node } = path;
      if (keywords.includes(node.id.name)) {
        const expressions = node.body.body;
        for (const { expression } of expressions) {
          parseExpression(expression, path);
        }
      }
    },
    /**
     * 解析调用函数的声明
     * @example test() fetch() func() ...
     * @param {*} path
     * @returns
     */
    ExpressionStatement(path) {
      const { node } = path;
      // if (keywords.length) return
      parseExpression(node.expression, path);
    },
    /** 收集export的依赖模块 */
    ExportNamedDeclaration(path) {
      const { node } = path;
      if (node.source) {
        const quotePath = resolve(__dirname, filePath, node.source.value);

        exportDecMap[quotePath] = node.specifiers
          .map((specifier) => {
            if (specifier.exported) {
              const idx = dependsNames.findIndex((item) => item === specifier.exported.name);
              if (idx !== -1 && specifier?.local?.name !== specifier.exported.name) {
                dependsNames.splice(idx, 0, specifier.local.name);
              }
            }
            if (specifier.local) {
              if (dependsNames.some((item) => item === specifier.local.name)) {
                return specifier.local.name
              }
            }

            return false
          })
          .filter(Boolean);
      }
    },
  });

  // console.log('start=============')

  // console.log('filePath: ', filePath)
  // console.log('importDecMap: ', importDecMap)
  // console.log('exportDecMap: ', exportDecMap)
  // console.log('dependsNames: ', dependsNames)

  // console.log('end=============')

  function runImportExportDenpends() {
    const _parseDecMap = (decMap) => {
      //  解析函数引用 进入该函数的文件再次解析
      Object.entries(decMap).forEach(([urlPath, denpends]) => {
        if (denpends.some((val) => dependsNames.includes(val))) {
          walkImport(urlPath, urls, dependsNames);
        }

        if (urlPath.endsWith('.vue')) {
          walkImport(urlPath, urls, []);
        }
      });
    };
    _parseDecMap(importDecMap);
    _parseDecMap(exportDecMap);
  }

  runImportExportDenpends();
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
  const source = readUTF8FileSource(routesUrl);
  const ast = getAst(routesUrl);

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
      // 删除对象属性节点
      if (input.remove && input.remove.length) {
        input.remove.forEach((key) => {
          if (path.node.key.name === key) {
            path.remove();
          }
        });
      }
    },
    Property(path) {
      if (path.node.key.name === input.entry) {
        // 拿取到入口属性的路径
        const cPath = path.node.value.arguments[0].value.toString();
        const urls = [];

        // 取到入口文件开始遍历
        walkImport(cPath, urls, []);

        // 获取兄弟节点列表的父节点
        const { parentPath } = path;

        // 查找名称为 "urls" 的兄弟节点
        const urlsSibling = parentPath.get('properties').find((siblingPath) => siblingPath.node.key.name === input.target);

        // 如果找到 "urls" 兄弟节点
        if (urlsSibling) {
          // 获取兄弟节点的值数组节点
          const urlsArray = urlsSibling.get('value');

          // 去重
          console.log('walkUrls(urls): ', urls);

          for (const url of [...new Set(urls)]) {
            // 已经存在 下一项
            if (urlsArray.get('elements').includes(url)) { continue }
            // 如果新项不存在于数组中，则向数组末尾添加新节点
            urlsArray.pushContainer('elements', t.stringLiteral(url));
          }
        }
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
              const newNode = t.identifier(newKey);

              if (path.node.type === 'Identifier' && path.node.name === oldKey) {
                path.replaceWith(newNode); // 使用新节点替代原节点
              }
            }
          });
      }
    },
  });

  const { code } = babel.transformFromAstSync(ast, source, {
    // presets: ['@babel/preset-env'],
  });

  fs.writeFile(resolve(configDirname, output), code, 'utf-8', () => {});
  return code
}

export { bootstrap as b };
