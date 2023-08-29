import '@babel/traverse';
import '@babel/parser';
import 'path';
import 'fs';
export { b as bootstrap } from './parse-0b0ab4f6.js';
import '@babel/types';
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

  if (typeof next === 'string') { return next }

  if (typeof next === 'object') { return pathsToVal(next, rest) }

  return null
};

function createFetchLoader(depends) {
  return function ({ expression, source, result }) {
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

    return result
  }
}

function create$RestLoader(depends) {
  return function ({ expression, source, result }) {
    if (expression?.type === 'CallExpression') {
      const { start, end } = expression;

      const words = source.slice(start, end);

      if (!words.includes('$rest')) return result

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

    return result
  }
}

function createUrlLoader(depends) {
  return function ({ source, result, path }) {
    path.traverse({
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

export { alias, create$RestLoader, createFetchLoader, createUrlLoader };
