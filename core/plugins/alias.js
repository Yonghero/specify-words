/**
 * 别名映射
 * @param {object} mapping
 * @returns {string}
 */
export function alias(mapping) {
  return function ({ source }) {
    if (!source) return source

    Object.entries(mapping)
      .forEach(([oldKey, newKey]) => {
        source = source.replaceAll(oldKey, newKey)
      })

    return source
  }
}
