import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

const SAVE_DEBOUNCE = 1500

async function readJson(file: string): Promise<unknown> {
  try { return await window.electronAPI?.readJson(file) ?? null } catch { return null }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  try { await window.electronAPI?.writeJson(file, data) } catch { /* browser preview */ }
}

export function usePersistence() {
  const {
    chapters, chapterContents, loreEntities, loreTypes,
    dailyGoalWords, todayWordCount,
    editorMaxWidth, editorFontSize, editorLineHeight, editorTextAlign,
    hydrate, setSaveStatus,
  } = useAppStore()

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const latestRef = useRef({
    chapters, chapterContents, loreEntities, loreTypes,
    dailyGoalWords, todayWordCount,
    editorMaxWidth, editorFontSize, editorLineHeight, editorTextAlign,
  })
  latestRef.current = {
    chapters, chapterContents, loreEntities, loreTypes,
    dailyGoalWords, todayWordCount,
    editorMaxWidth, editorFontSize, editorLineHeight, editorTextAlign,
  }

  // ── Load on mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [contentRaw, chaptersRaw, loreRaw, progressRaw] = await Promise.all([
        readJson('content.json'),
        readJson('chapters.json'),
        readJson('lore.json'),
        readJson('progress.json'),
      ])

      const content  = contentRaw  as { chapterContents?: Record<string, string> } | null
      const chaps    = chaptersRaw as { chapters?: unknown[] } | null
      const lore     = loreRaw     as { loreEntities?: unknown[]; loreTypes?: unknown[] } | null
      const progress = progressRaw as {
        dailyGoalWords?: number; todayWordCount?: number; activeChapterId?: string
        editorMaxWidth?: number; editorFontSize?: number; editorLineHeight?: number; editorTextAlign?: 'left' | 'justify'
      } | null

      if (!content && !chaps && !lore && !progress) return

      hydrate({
        chapterContents:  content?.chapterContents,
        chapters:         Array.isArray(chaps?.chapters) ? (chaps!.chapters as Parameters<typeof hydrate>[0]['chapters']) : undefined,
        loreEntities:     Array.isArray(lore?.loreEntities) ? (lore!.loreEntities as Parameters<typeof hydrate>[0]['loreEntities']) : undefined,
        loreTypes:        Array.isArray(lore?.loreTypes) ? (lore!.loreTypes as Parameters<typeof hydrate>[0]['loreTypes']) : undefined,
        dailyGoalWords:   progress?.dailyGoalWords,
        todayWordCount:   progress?.todayWordCount,
        activeChapterId:  progress?.activeChapterId,
        editorMaxWidth:   progress?.editorMaxWidth,
        editorFontSize:   progress?.editorFontSize,
        editorLineHeight: progress?.editorLineHeight,
        editorTextAlign:  progress?.editorTextAlign,
      })
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Debounced save ───────────────────────────────────────────────────────────
  function schedule(key: string, fn: () => Promise<void>) {
    if (timers.current[key]) clearTimeout(timers.current[key])
    setSaveStatus('saving')
    timers.current[key] = setTimeout(async () => {
      await fn()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, SAVE_DEBOUNCE)
  }

  useEffect(() => {
    schedule('content', () => writeJson('content.json', { chapterContents, savedAt: new Date().toISOString() }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterContents])

  useEffect(() => {
    schedule('chapters', () => writeJson('chapters.json', { chapters }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters])

  useEffect(() => {
    schedule('lore', () => writeJson('lore.json', { loreEntities, loreTypes }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loreEntities, loreTypes])

  useEffect(() => {
    schedule('progress', () => writeJson('progress.json', {
      dailyGoalWords, todayWordCount,
      editorMaxWidth, editorFontSize, editorLineHeight, editorTextAlign,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyGoalWords, todayWordCount, editorMaxWidth, editorFontSize, editorLineHeight, editorTextAlign])

  // ── Ctrl+S — save all immediately ───────────────────────────────────────────
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 's') return
      e.preventDefault()
      Object.values(timers.current).forEach(clearTimeout)
      timers.current = {}
      setSaveStatus('saving')
      const d = latestRef.current
      await Promise.all([
        writeJson('content.json',  { chapterContents: d.chapterContents, savedAt: new Date().toISOString() }),
        writeJson('chapters.json', { chapters: d.chapters }),
        writeJson('lore.json',     { loreEntities: d.loreEntities, loreTypes: d.loreTypes }),
        writeJson('progress.json', {
          dailyGoalWords: d.dailyGoalWords, todayWordCount: d.todayWordCount,
          editorMaxWidth: d.editorMaxWidth, editorFontSize: d.editorFontSize,
          editorLineHeight: d.editorLineHeight, editorTextAlign: d.editorTextAlign,
        }),
      ])
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSaveStatus])
}
