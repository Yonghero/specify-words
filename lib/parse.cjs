'use strict';

var parser = require('@babel/parser');
var fs = require('fs');
var path = require('path');
var traverse = require('@babel/traverse');
var t = require('@babel/types');
var babel = require('@babel/core');
var compilerSfc = require('@vue/compiler-sfc');
var url = require('url');
var promises = require('fs/promises');

const __filename$1 = url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (document.currentScript && document.currentScript.src || new URL('parse.cjs', document.baseURI).href)));
const __dirname$2 = path.dirname(__filename$1);

async function findRootDir(dirPath) {
  try {
    await promises.access(`${dirPath}/package.json`);
    await promises.access(`${dirPath}/node_modules`);
    return dirPath
  } catch (e) {
    if (path.dirname(dirPath) === dirPath) {
      throw new Error('Root directory not found')
    } else {
      console.log('dirPath: ', dirPath);
      return findRootDir(path.dirname(dirPath))
    }
  }
}

async function getConfig() {
  return new Promise((res) => {
    findRootDir(__dirname$2)
      .then((rootDir) => {
        import(path.resolve(rootDir, './specify.config.js'))
          .then((config) => {
            res(config.default);
          })
          .catch(() => {
            res({});
          });
      })
      .catch(() => res({}));
  })
}

let __dirname$1;

// 文件内容已UTF8编码解读
function readUTF8FileSource(url) {
  return fs.readFileSync(path.resolve(__dirname$1, url), { encoding: 'utf8' })
}

// 根据文件路径得到文件ast
function getAst(filePath) {
  const source = getSource(filePath);
  return parser.parse(source, {
    sourceType: 'module',

  })
}

// 根据文件路径得到文件内容
function getSource(filePath) {
  // 无后缀默认添加.js作为后缀
  if (!path.extname(filePath)) {
    filePath += '.js';
  }
  let script;

  if (filePath.endsWith('.vue')/* 处理vue文件 需要先解析fc */) {
    // 读取路径的文件
    const fileSource = readUTF8FileSource(filePath);
    const sfc = compilerSfc.parse(fileSource);

    // vue script内容可能是在setup中
    script = sfc.descriptor?.script?.content
      ? sfc.descriptor.script.content : sfc.descriptor.scriptSetup.content;
  } else if (filePath.endsWith('.js') /* js文件处理，直接读取数据 */) {
    script = readUTF8FileSource(filePath);
  }
  return script
}

// 遍历urls 更新映射
function walkUrls(urls) {
  return urls.map((url) => {
    if (typeof url === 'string') { return url }

    const { filePath, paths, name } = url;
    let newUrl;

    traverse.default(getAst(filePath), {
      enter(path) {
        if (path.isVariableDeclarator(path.node)) {
          // 取到变量声明
          if (path.node.id.name === name) {
            const [, ...rest] = paths.split('.');

            const _walkValue = (properties, variables) => {
              if (!variables.length) { return }
              const [variable, ...rest] = variables;
              properties.some(({ key, value }) => {
                if (key.name === variable) {
                  // 找到了！
                  if (value.type === 'StringLiteral') {
                    newUrl = value.value;
                    return value.value
                  }
                  // 没找到！对象类型的继续递归
                  if (value.type === 'ObjectExpression') {
                    _walkValue(value.properties, rest);
                  }
                  return true
                }
                return false
              });
            };

            const { properties } = path.node.init;
            _walkValue(properties, rest);
          }
        }
      },
    });

    return newUrl
  })
}

// 遍历文件内容
function walkImport(filePath, urls, keywords = []) {
  const source = getSource(filePath);

  const ast = getAst(filePath);

  const importDecMap = {};

  // 解析函数调用的表达式
  function parseExpression(expression) {
    const name = expression?.callee?.name;
    const [node] = expression.arguments;

    //  1. 解析fetch函数的第一个参数代表请求路径
    if (name === 'fetch') {
      if (node.type === 'StringLiteral' /** 如果是字符串类型直接当作url */) {
        const url = node.value;
        urls.push(url);
      } else if (node.type === 'MemberExpression' /** 如果为对象 则截取出对象的字符串路径 后面再进行映射 */) {
        const result = source.slice(node.start, node.end);
        const [name] = result.split('.');

        Object.entries(importDecMap).some(([fp, values]) => {
          if (values.includes(name)) {
            urls.push({ filePath: fp, paths: result, name });
            return true
          }
          return false
        });
      }
    }
    // 2. 解析函数引用 进入该函数的文件再次解析
    Object.entries(importDecMap).some(([urlPath, specifiers]) => {
      if (specifiers.includes(name)) {
        walkImport(urlPath, urls, [name]);
        return true
      }
      return false
    });
  }

  traverse.default(ast, {
    /** 收集import的依赖模块 */
    ImportDeclaration({ node }) {
      const quotePath = path.resolve(__dirname$1, path.dirname(filePath), node.source.value);

      // 遇到vue组件直接进入遍历
      if (quotePath.endsWith('.vue')) {
        walkImport(quotePath, urls, []);
      }

      // 遇到js文件，先收集依赖，如果用用到js文件中的函数，则再进行遍历
      importDecMap[quotePath] = node.specifiers.map((specifier) => {
        if (specifier.type === 'ImportSpecifier' /** 具名导出 */) return specifier.imported.name
        if (specifier.type === 'ImportDefaultSpecifier' /** 默认导出 */) {
          return specifier.local.name
        }
        return ''
      });
    },
    /** 如有关键词则按需解析用到的函数调用 */
    FunctionDeclaration({ node }) {
      if (keywords.includes(node.id.name)) {
        const expressions = node.body.body;
        for (const { expression } of expressions) {
          parseExpression(expression);
        }
      }
    },
    /** 无关键词 解析文件的所有函数调用 */
    ExpressionStatement({ node }) {
      if (keywords.length) return
      parseExpression(node.expression);
    },
  });
}

// 启动入口
async function bootstrap(routesUrl) {
  const config = await getConfig();
  console.log('config: ', config);
  // 确定根路径
  __dirname$1 = path.dirname(routesUrl);
  const source = readUTF8FileSource(routesUrl);
  const ast = getAst(routesUrl);

  traverse.default(ast, {
    ObjectProperty(path) {
      /* component属性后加入url: [] */
      if (path.node.key.name === 'component') {
        // path.remove(); // 删除对象属性节点
        // console.log('value------', path.node.value);
        const urlNode = t.objectProperty(
          t.identifier('urls'),
          t.arrayExpression([]),
        );
        // console.log('path,node.value: ', path.node.value.arguments);

        path.insertAfter(urlNode);
      }
    },
    Property(path) {
      if (path.node.key.name === 'component') {
        // 拿取到component的路径
        const cPath = path.node.value.arguments[0].value.toString();
        const urls = [];

        // 取到入口文件开始便利
        walkImport(cPath, urls, []);

        // 获取兄弟节点列表的父节点
        const { parentPath } = path;

        // 查找名称为 "urls" 的兄弟节点
        const urlsSibling = parentPath.get('properties').find((siblingPath) => siblingPath.node.key.name === 'urls');

        // 如果找到 "urls" 兄弟节点
        if (urlsSibling) {
          // 获取兄弟节点的值数组节点
          const urlsArray = urlsSibling.get('value');
          //  去重
          console.log('walkUrls(urls): ', walkUrls(urls));

          for (const url of [...new Set(walkUrls(urls))]) {
            // 已经存在 下一项
            if (urlsArray.get('elements').includes(url)) { continue }
            // 如果新项不存在于数组中，则向数组末尾添加新节点
            urlsArray.pushContainer('elements', t.stringLiteral(url));
          }
        }
      }
    },
    Identifier(path) {
      if (path.node.name === 'children') {
        const newNode = t.identifier('submenu');

        if (path.node.type === 'Identifier' && path.node.name === 'children') {
          path.replaceWith(newNode); // 使用新节点替代原节点
        }
      }
    },
  });

  const { code } = babel.transformFromAstSync(ast, source, {
    // presets: ['@babel/preset-env'],
  });
  return code
}

exports.bootstrap = bootstrap;
