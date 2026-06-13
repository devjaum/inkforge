import { useRef, useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { useAppStore, type LoreEntity } from '@/store/useAppStore'

// ── Markdown parser ─────────────────────────────────────────────────────────
// Processes one line and returns a React element
function renderMarkdownLine(line: string, entities: LoreEntity[], lineKey: number): React.ReactNode {
  if (line.startsWith('### ')) return <h3 key={lineKey} className="text-lg font-bold text-zinc-100 mt-4 mb-1">{inlineRender(line.slice(4), entities, lineKey)}</h3>
  if (line.startsWith('## '))  return <h2 key={lineKey} className="text-xl font-bold text-zinc-100 mt-5 mb-1">{inlineRender(line.slice(3), entities, lineKey)}</h2>
  if (line.startsWith('# '))   return <h1 key={lineKey} className="text-2xl font-bold text-zinc-100 mt-6 mb-2">{inlineRender(line.slice(2), entities, lineKey)}</h1>
  if (line === '---' || line === '***') return <hr key={lineKey} className="border-zinc-700 my-4" />
  if (line === '') return <div key={lineKey} className="h-4" />
  return <p key={lineKey} className="leading-8 text-zinc-200">{inlineRender(line, entities, lineKey)}</p>
}

// Inline markdown: **bold**, *italic*, `code`, lore @entities
function inlineRender(text: string, entities: LoreEntity[], lineKey: number): React.ReactNode[] {
  // Build lore pattern
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length)
  const entityMap = new Map(entities.map(e => [e.name, e]))
  const lorePattern = sorted.length > 0
    ? sorted.map(e => '@' + e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    : null

  // Combined inline pattern: bold, italic, code, lore
  const base = '(\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|`[^`]+`'
  const parts = lorePattern ? base + '|' + lorePattern + ')' : base + ')'
  const tokens = text.split(new RegExp(parts, 'g'))
  const nodes: React.ReactNode[] = []

  tokens.forEach((tok, i) => {
    if (!tok) return
    const key = `${lineKey}-${i}`
    if (tok.startsWith('**') && tok.endsWith('**')) {
      nodes.push(<strong key={key} className="font-bold text-zinc-100">{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith('*') && tok.endsWith('*')) {
      nodes.push(<em key={key} className="italic text-zinc-300">{tok.slice(1, -1)}</em>)
    } else if (tok.startsWith('`') && tok.endsWith('`')) {
      nodes.push(<code key={key} className="font-mono text-xs bg-zinc-800 text-violet-300 px-1.5 py-0.5 rounded">{tok.slice(1, -1)}</code>)
    } else if (tok.startsWith('@')) {
      const name = tok.slice(1)
      const entity = entityMap.get(name)
      if (entity) nodes.push(<LoreChip key={key} entity={entity} />)
      else nodes.push(tok)
    } else {
      nodes.push(tok)
    }
  })

  return nodes
}

// ── Lore hover chip ─────────────────────────────────────────────────────────
function LoreChip({ entity }: { entity: LoreEntity }) {
  const { loreTypes } = useAppStore()
  const [open, setOpen] = useState(false)
  const typeInfo = loreTypes.find(t => t.value === entity.type)
  const typeLabel = typeInfo?.label ?? entity.type
  // Extract just the text-* class from the color string for the label color
  const textClass = typeInfo?.color.split(' ').find(c => c.startsWith('text-')) ?? 'text-zinc-400'

  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className="lore-entity">@{entity.name}</span>
      {open && (
        <span className="absolute z-50 bottom-full left-0 mb-2 w-72 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl block" style={{ pointerEvents: 'none' }}>
          <span className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-medium ${textClass}`}>{typeLabel}</span>
            <span className="font-semibold text-zinc-100 text-sm">{entity.name}</span>
          </span>
          <span className="text-xs text-zinc-400 leading-relaxed block">{entity.summary}</span>
          {entity.tags.length > 0 && (
            <span className="flex gap-1 flex-wrap mt-2">
              {entity.tags.map(t => <span key={t} className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md">{t}</span>)}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

// ── Autocomplete popup ──────────────────────────────────────────────────────
interface LorePopupProps {
  query: string
  entities: LoreEntity[]
  position: { top: number; left: number }
  onSelect: (entity: LoreEntity) => void
  onClose: () => void
}

function LorePopup({ query, entities, position, onSelect, onClose }: LorePopupProps) {
  const { loreTypes } = useAppStore()
  const filtered = entities.filter(e => e.name.toLowerCase().startsWith(query.toLowerCase()))
  if (filtered.length === 0) return null
  return (
    <div className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 min-w-52" style={{ top: position.top, left: position.left }}>
      <div className="px-2 py-1 text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800 mb-1">Lore — escolha uma entidade</div>
      {filtered.map(entity => {
        const typeInfo = loreTypes.find(t => t.value === entity.type)
        const textClass = typeInfo?.color.split(' ').find(c => c.startsWith('text-')) ?? 'text-zinc-400'
        return (
          <button
            key={entity.id}
            onMouseDown={e => { e.preventDefault(); onSelect(entity) }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-left"
          >
            <span className={`text-[10px] font-medium ${textClass}`}>{typeInfo?.label ?? entity.type}</span>
            <span className="text-sm text-zinc-200">{entity.name}</span>
          </button>
        )
      })}
      <button onClick={onClose} className="absolute top-1 right-1 p-1 text-zinc-600 hover:text-zinc-400"><X size={10} /></button>
    </div>
  )
}

// ── Rich text renderer ──────────────────────────────────────────────────────
function RichTextRenderer({ content, entities }: { content: string; entities: LoreEntity[] }) {
  const lines = content.split('\n')
  return <>{lines.map((line, i) => renderMarkdownLine(line, entities, i))}</>
}


// ── Zen mode overlay ────────────────────────────────────────────────────────
function ZenBar({ onExit }: { onExit: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900/80 backdrop-blur border border-zinc-700 rounded-2xl px-4 py-2 shadow-xl opacity-0 hover:opacity-100 transition-opacity duration-300">
      <span className="text-xs text-zinc-400">Zen Mode</span>
      <button onClick={onExit} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
        <X size={11} /> Sair (ESC)
      </button>
    </div>
  )
}

// ── Main editor ─────────────────────────────────────────────────────────────
export function Editor() {
  const {
    activeChapterId, chapterContents, loreEntities, chapters,
    isZenMode, toggleZenMode, setActiveChapterContent,
  } = useAppStore()

  const content = (activeChapterId ? chapterContents[activeChapterId] : '') ?? ''
  const activeChapter = chapters.find(c => c.id === activeChapterId)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [popup, setPopup] = useState<{ query: string; position: { top: number; left: number }; atIndex: number } | null>(null)

  // Zen mode: ESC to exit
  useEffect(() => {
    if (!isZenMode) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') toggleZenMode() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isZenMode, toggleZenMode])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setActiveChapterContent(value)
    const cursor = e.target.selectionStart ?? 0
    const upTo = value.slice(0, cursor)
    const atMatch = upTo.match(/@(\w*)$/)
    if (atMatch) {
      const ta = textareaRef.current
      if (ta) {
        const rect = ta.getBoundingClientRect()
        const lines = upTo.split('\n')
        const row = lines.length - 1
        const col = lines[lines.length - 1].length
        setPopup({
          query: atMatch[1],
          atIndex: cursor - atMatch[0].length,
          position: {
            top: rect.top + row * 32 + 36,
            left: Math.min(rect.left + col * 8.4, rect.right - 220),
          },
        })
      }
    } else {
      setPopup(null)
    }
  }, [setActiveChapterContent])

  const handleEntitySelect = useCallback((entity: LoreEntity) => {
    if (!popup) return
    const before = content.slice(0, popup.atIndex)
    const after = content.slice(popup.atIndex + 1 + popup.query.length)
    setActiveChapterContent(`${before}@${entity.name}${after}`)
    setPopup(null)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [popup, content, setActiveChapterContent])

  if (!activeChapterId) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        Selecione um capítulo para começar a escrever.
      </div>
    )
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 relative ${isZenMode ? 'bg-zinc-950' : ''}`}>
      {/* Toolbar — hidden in zen mode */}
      {!isZenMode && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950 shrink-0">
          <span className="text-xs font-medium text-zinc-300 truncate max-w-48">{activeChapter?.title}</span>
          <div className="h-3 w-px bg-zinc-700" />
          <button onClick={() => setShowPreview(false)} className={`text-xs px-2 py-1 rounded ${!showPreview ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>Editar</button>
          <button onClick={() => setShowPreview(true)}  className={`text-xs px-2 py-1 rounded ${showPreview  ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>Visualizar</button>
          <div className="flex-1" />
          <span className="text-[10px] text-zinc-700">**negrito** *itálico* `code` @ lore</span>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 min-h-0 overflow-hidden ${isZenMode ? 'flex items-start justify-center pt-16' : ''}`}>
        {showPreview ? (
          <div className={`h-full overflow-y-auto py-10 ${isZenMode ? 'w-full max-w-2xl' : 'px-8'}`}>
            {content.trim() === '' ? (
              <p className="text-zinc-600 text-sm italic px-4">Nenhum conteúdo. Clique em "Editar" para escrever.</p>
            ) : (
              <div className={`text-base font-serif ${isZenMode ? 'px-4' : 'max-w-3xl mx-auto'}`}>
                <RichTextRenderer content={content} entities={loreEntities} />
              </div>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            spellCheck={false}
            className={`resize-none bg-transparent text-zinc-200 text-base leading-8 font-serif focus:outline-none ${
              isZenMode
                ? 'w-full max-w-2xl h-full py-10 px-4'
                : 'w-full h-full px-8 py-8'
            }`}
            placeholder="Comece a escrever... Use @Nome para vincular lore, **texto** para negrito."
          />
        )}
      </div>

      {/* Zen mode exit hint */}
      {isZenMode && <ZenBar onExit={toggleZenMode} />}

      {/* Lore autocomplete popup */}
      {popup && (
        <LorePopup
          query={popup.query}
          entities={loreEntities}
          position={popup.position}
          onSelect={handleEntitySelect}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
