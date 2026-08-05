/** 數字 → 英文字母 → 其餘（注音） */
function nameGroup(name: string): number {
  const first = name.trim().charAt(0)
  if (!first) return 3
  if (/\d/u.test(first)) return 0
  if (/[A-Za-z]/u.test(first)) return 1
  return 2
}

const zhuyinCollator = (() => {
  try {
    return new Intl.Collator('zh-Hant-TW-u-co-zhuyin', {
      numeric: true,
      sensitivity: 'base',
    })
  } catch {
    return new Intl.Collator('zh-Hant-TW', {
      numeric: true,
      sensitivity: 'base',
    })
  }
})()

export function compareByDigitLetterZhuyin(a: string, b: string): number {
  const groupDiff = nameGroup(a) - nameGroup(b)
  if (groupDiff !== 0) return groupDiff
  return zhuyinCollator.compare(a.trim(), b.trim())
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => compareByDigitLetterZhuyin(left.name, right.name))
}

/** 依名稱插入到目前順序中的正確位置（不重排既有項目）。 */
export function insertByName<T extends { name: string }>(items: T[], item: T): T[] {
  const next = [...items]
  const index = next.findIndex(
    (existing) => compareByDigitLetterZhuyin(item.name, existing.name) < 0,
  )
  if (index === -1) next.push(item)
  else next.splice(index, 0, item)
  return next
}
