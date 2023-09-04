// 解码 Unicode 转义字符
export function decodeUnicode(str) {
  return str.replace(/\\u[0-9a-f]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)))
}
