// ── Simple line-based diff (LCS) — GitHub-style added/removed lines ───────────

export type DiffOp = 'equal' | 'added' | 'removed'

export interface DiffLine {
  op: DiffOp
  text: string
  /** 1-based line number in the old text (undefined for added lines) */
  oldNumber?: number
  /** 1-based line number in the new text (undefined for removed lines) */
  newNumber?: number
}

/**
 * Computes a line-level diff between two texts using the longest-common-subsequence
 * algorithm. Returns an ordered list of lines tagged as equal / added / removed.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const n = a.length
  const m = b.length

  // LCS length table
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  let oldNum = 1
  let newNum = 1
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ op: 'equal', text: a[i], oldNumber: oldNum++, newNumber: newNum++ })
      i++; j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      result.push({ op: 'removed', text: a[i], oldNumber: oldNum++ })
      i++
    } else {
      result.push({ op: 'added', text: b[j], newNumber: newNum++ })
      j++
    }
  }
  while (i < n) result.push({ op: 'removed', text: a[i++], oldNumber: oldNum++ })
  while (j < m) result.push({ op: 'added', text: b[j++], newNumber: newNum++ })

  return result
}

/** Summary counts for a diff. */
export function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const l of lines) {
    if (l.op === 'added') added++
    else if (l.op === 'removed') removed++
  }
  return { added, removed }
}
