import isPlainObject from './isPlainObject'
import isArray from './isArray'

export default function isEqual (a, b) {
  if (a === b) return true
  if (!a || !b) return false
  if (!a.constructor || !b.constructor) return false
  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false
    }
    return true
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const akeys = Object.keys(a).sort()
    const bkeys = Object.keys(b).sort()
    if (!isEqual(akeys, bkeys)) return false
    for (let i = 0; i < akeys.length; i++) {
      const key = akeys[i]
      if (!isEqual(a[key], b[key])) return false
    }
    return true
  }
  // at last try loose equality check
  return a == b // eslint-disable-line
}
