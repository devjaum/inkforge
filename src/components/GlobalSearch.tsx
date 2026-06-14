import { useEffect, useRef, useState } from 'react'
import { Search, X, FileText } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface Match {
  chapterId: string
  chapterTitle: string
  excerpt: string
  matchStart: number
}

function buildMatches(
  query: string,
  chapters: { id: string; title: string }[],
  contents: Record<string, string>,
): Match[] {
  if (query.length < 2) return []
  const q   = query.toLowerCase()
  const re  = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  const out: Match[] = []

  for (const ch of chapters) {
    const text = contents[ch.id] ?? ''
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const start  = Math.max(0, m.index - 60)
      const end    = Math.min(text.length, m.index + q.length + 60)
      const prefix = start > 0 ? '…' : ''
      const suffix = end < text.length ? '…' : ''
      out.push({
        chapterId:    ch.id,
        chapterTitle: ch.title,
        excerpt:      prefix + text.slice(start, end) + suffix,
        matchStart:   m.index,
      })
      if (out.filter(r => r.chapterId === ch.id).length >= 3) break
    }
  }
  return out.slice(0, 40)
}

function highlightExcerpt(excerpt: string, query: string) {
  const parts = excerpt.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-amber-400/40 text-amber-200 rounded-sm px-0.5 not-italic">{p}</mark>
      : <span key={i}>{p}</span>
  )
}

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const { chapters, chapterContents, setActiveChapter } = useAppStore()
  const [query, setQuery]   = useState('')
  const inputRef            = useRef<HTMLInputElement>(null)
  const matches             = buildMatches(query, chapters, chapterContents)

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 30) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  const handleSelect = (chapterId: string) => {
    setActiveChapter(chapterId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[560px] max-h-[60vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-800 shrink-0">
          <Search size={14} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar em todos os capítulos..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          {query && (
            <span className="text-[10px] text-zinc-600">{matches.length} resultado{matches.length !== 1 ? 's' : ''}</span>
          )}
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400"><X size={13} /></button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto">
          {query.length < 2 ? (
            <p className="text-[11px] text-zinc-600 text-center py-8">Digite pelo menos 2 caracteres para buscar.</p>
          ) : matches.length === 0 ? (
            <p className="text-[11px] text-zinc-600 text-center py-8">Nenhum resultado para "<span className="text-zinc-400">{query}</span>".</p>
          ) : (
            <div className="p-2 space-y-0.5">
              {matches.map((m, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(m.chapterId)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText size={10} className="text-violet-400 shrink-0" />
                    <span className="text-[10px] font-medium text-violet-400 truncate">{m.chapterTitle}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-mono line-clamp-2">
                    {highlightExcerpt(m.excerpt, query)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
