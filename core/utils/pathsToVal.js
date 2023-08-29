export const pathsToVal = (obj, splitDotArr) => {
  const [variable, ...rest] = splitDotArr

  const next = obj[variable]

  if (typeof next === 'string') { return next }

  if (typeof next === 'object') { return pathsToVal(next, rest) }

  return null
}
