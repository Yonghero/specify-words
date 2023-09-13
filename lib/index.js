import traverse from '@babel/traverse';
import '@babel/parser';
import 'path';
import 'fs';
export { b as bootstrap } from './parse-7a5a2983.js';
import t from '@babel/types';
import '@babel/core';
import '@vue/compiler-sfc';
import 'url';
import 'fs/promises';

/**
 * 别名映射
 * @param {object} mapping
 * @returns {string}
 */
function alias(mapping) {
  return function ({ source }) {
    if (!source) return source

    Object.entries(mapping)
      .forEach(([oldKey, newKey]) => {
        source = source.replaceAll(oldKey, newKey);
      });

    return source
  }
}

const pathsToVal = (obj, splitDotArr) => {
  const [variable, ...rest] = splitDotArr;

  const next = obj[variable];

  if (typeof next === 'object') { return pathsToVal(next, rest) }

  return next
};

function createFetchLoader(depends) {
  return function ({ ast, source, result }) {
    // const identifierList = []

    traverse.default(ast, {
      ExpressionStatement(path) {
        const expression = path?.node?.expression;
        if (!expression) return
        const name = expression?.callee?.name;
        const [node] = expression?.arguments ?? [];

        //  1. 解析fetch函数的第一个参数代表请求路径
        if (name === 'fetch') {
          if (node.type === 'StringLiteral' /** 如果是字符串类型直接当作url */) {
            const url = node.value;
            result.push(url);
          } else if (node.type === 'MemberExpression' /** 如果为对象 则截取出对象的字符串路径 后面再进行映射 */) {
            const paths = source.slice(node.start, node.end);

            const url = pathsToVal(depends, paths.split('.'));

            if (url) { result.push(url); }
          }
        }
        // if (name === 'axiosInstance') {
        //   const item = expression.arguments[0].properties.find((item) => item.key.name === 'url')
        //   if (item.type === 'StringLiteral') {
        //     result.push(item.value)
        //   }
        //   if (item.type === 'Identifier') {
        //     identifierList.push(item.value)
        //   }
        // }
      },
      MemberExpression({ node }) {
        if (node.object.name === 'urls') {
          const paths = source.slice(node.start, node.end);
          const url = pathsToVal(depends, paths.split('.'));
          if (url) { result.push(url); }
        }
      },
    });

    return result
  }
}

function create$RestLoader(depends) {
  return function ({ ast, source, result }) {
    traverse.default(ast, {
      ExpressionStatement(path) {
        const expression = path?.node?.expression;
        if (!expression) return

        if (expression?.type === 'CallExpression') {
          const { start, end } = expression;

          const words = source.slice(start, end);

          if (!words.includes('$rest')) return

          // $rest.a.c.get()
          if (!words.includes('this')) {
            const splitArr = words.split('.');
            splitArr.shift(); // 去除$rest
            splitArr.pop(); // 去除.get() / .post ...
            splitArr.unshift('obj'); // 加入 urls 变量名称

            const url = pathsToVal(depends, splitArr);

            result.push(url);
          }
        }
      },
    });

    return result
  }
}

function createUrlLoader(depends) {
  return function ({ ast, source, result }) {
    traverse.default(ast, {
      Property(path) {
        const { node } = path;
        /**
         * url: xxx
         * url = xx
         */
        if (node.key.name === 'url') {
          const { start, end, type } = node.value;

          // 字符串类型无需映射
          if (type === 'StringLiteral') {
            result.push(node.value.value);
          } else if (type === 'MemberExpression' /** 对象类型需要再次映射 */) {
            const splitArr = source.slice(start, end).split('.');
            const url = pathsToVal(depends, splitArr);
            result.push(url);
          }
        }
      },
    });

    return result
  }
}

function ConstantMappingLoader(field, mapping) {
  return function (ast, input, source) {
    traverse.default(ast, {
      Property(path) {
        const { node } = path;
        if (node.key.name === field) {
          if (node.value.type === 'MemberExpression') {
            const { start } = node.value;
            const { end } = node.value;

            const result = source.slice(start, end);

            const value = pathsToVal(mapping, result.split('.'));
            const newNode = t.stringLiteral(value);

            path.get('value').replaceWith(newNode);
          }
        }
      },
    });
  }
}

/**
 * 提供一个对象的key, 找到该对象, 并插入一个提供的key_value
 * @param {*} targetKey
 * @param {*} insertKey
 * @param {*} insertValue
 * @returns
 */
function InsertDefaultLoader(targetKey, insertKey, insertValue) {
  return function (ast) {
    traverse.default(ast, {
      ObjectProperty(path) {
        // 在入口属性后插入目标属性
        if (path.node.key.name === 'path') {
          let exp;
          if (Array.isArray(insertValue)) {
            exp = t.arrayExpression([]);
          } else if (typeof insertValue === 'string') {
            exp = t.stringLiteral(insertValue);
          } else if (typeof insertValue === 'number') {
            exp = t.numericLiteral(insertValue);
          } else if (typeof insertValue === 'boolean') {
            exp = t.booleanLiteral(insertValue);
          }

          const { parentPath } = path;

          const sibling = parentPath.get('properties').find((siblingPath) => siblingPath.node.key.name === insertKey);

          if (!!sibling === false) {
            const urlNode = t.objectProperty(
              t.identifier(insertKey),
              exp,
            );
            path.insertAfter(urlNode);
          }
        }
      },
    });
  }
}

export { ConstantMappingLoader, InsertDefaultLoader, alias, create$RestLoader, createFetchLoader, createUrlLoader, pathsToVal };
