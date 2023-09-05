/**
 * 将 AST ArrayExpression 转换为runtime的数组
 * @param aePath ArrayExpressionPath
 * @private
 */
export function _astAEToCode(aePath) {
  if (aePath.type !== 'ArrayExpression') { return [] }

  const code = []
  const { elements } = aePath

  const _astOEToCode = (oePath, parent) => {
    const { properties } = oePath

    for (const property of properties) {
      if (property.value.type === 'ArrayExpression') {
        const value = _astAEToCode(property.value)
        parent[property.key.name] = value
      } else {
        parent[property.key.name] = property.value.value
      }
    }
  }

  for (const ele of elements) {
    if (ele.type === 'ObjectExpression') {
      const obj = {}
      _astOEToCode(ele, obj)
      code.push(obj)
    } else {
      code.push(ele.value)
    }
  }

  return code
}
