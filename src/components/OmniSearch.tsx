import { useState, useEffect, useRef } from 'react'
import { Search, FileText, BookMarked, X, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface OmniSearchProps {
  open: boolean
  onClose: () => void
}

export function OmniSearch({ open, onClose }: OmniSearchProps) {
  const { chapters, loreEntities, chapterContents, setActiveChapter } = useAppStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const q = query.toLowerCase().trim()

  const chapterResults = chapters
    .filter(c => c.title.toLowerCase().includes(q) || (chapterContents[c.id] ?? '').toLowerCase().includes(q))
    .slice(0, 6)

  const loreResults = loreEntities
    .filter(e => e.name.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q)))
    .slice(0, 4)

  const allResults: { type: 'chapter' | 'lore'; id: string; label: string; sub: string }[] = [
    ...chapterResults.map(c => ({
      type: 'chapter' as const,
      id: c.id,
      label: c.title,
      sub: c.status === 'completed' ? 'Concluído' : c.status === 'planned' ? 'Planejado' : `${c.wordCount} palavras`,
    })),
    ...loreResults.map(e => ({
      type: 'lore' as const,
      id: e.id,
      label: e.name,
      sub: e.type,
    })),
  ]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter') {
      const r = allResults[selected]
      if (r?.type === 'chapter') { setActiveChapter(r.id); onClose() }
      if (r?.type === 'lore') onClose()
    }
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24" onClick={onClose}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar capítulos, lore, tags..."
            className="flex-1 bg-transparent text-zinc-100 text-sm outline-none placeholder:text-zinc-600"
          />
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {allResults.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-600 text-sm">
              {q ? 'Nenhum resultado encontrado.' : 'Digite para buscar...'}
            </div>
          )}

          {chapterResults.length > 0 && (
            <div className="mb-1">
              <div className="px-4 py-1 text-[10px] text-zinc-600 uppercase tracking-wider">Capítulos</div>
              {chapterResults.map((c, i) => {
                const idx = i
                const isSelected = idx === selected
                return (
                  <button
                    key={c.id}
                    onClick={() => { setActiveChapter(c.id); onClose() }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-violet-600/20 text-violet-300' : 'hover:bg-zinc-800 text-zinc-300'}`}
                  >
                    <FileText size={14} className="text-zinc-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.title}</div>
                      <div className="text-[10px] text-zinc-500">{chapterResults[i] && allResults[idx]?.sub}</div>
                    </div>
                    {isSelected && <ChevronRight size={12} className="text-zinc-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}

          {loreResults.length > 0 && (
            <div>
              <div className="px-4 py-1 text-[10px] text-zinc-600 uppercase tracking-wider">Lore</div>
              {loreResults.map((e, i) => {
                const idx = chapterResults.length + i
                const isSelected = idx === selected
                return (
                  <button
                    key={e.id}
                    onClick={onClose}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? 'bg-violet-600/20 text-violet-300' : 'hover:bg-zinc-800 text-zinc-300'}`}
                  >
                    <BookMarked size={14} className="text-zinc-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{e.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-zinc-500 capitalize">{e.type}</span>
                        {e.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] bg-zinc-800 text-zinc-500 px-1 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                    <code className="text-[10px] text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded shrink-0">@{e.name}</code>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-4 text-[10px] text-zinc-600">
          <span>↑↓ navegar</span>
          <span>Enter abrir</span>
          <span>Esc fechar</span>
        </div>
      </div>
    </div>
  )
}
