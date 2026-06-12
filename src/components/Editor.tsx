import { useRef, useState, useCallback } from 'react'
import { MapPin, User, Package, Shield } from 'lucide-react'
import { useAppStore, type LoreEntity } from '@/store/useAppStore'

const typeIcon: Record<LoreEntity['type'], React.ReactNode> = {
  location: <MapPin size={12} />,
  character: <User size={12} />,
  item: <Package size={12} />,
  faction: <Shield size={12} />,
}

const typeColor: Record<LoreEntity['type'], string> = {
  location: 'text-emerald-400',
  character: 'text-blue-400',
  item: 'text-amber-400',
  faction: 'text-rose-400',
}

function LoreChip({ entity }: { entity: LoreEntity }) {
  const [open, setOpen] = useState(false)

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="lore-entity">@{entity.name}</span>
      {open && (
        <span
          className="absolute z-50 bottom-full left-0 mb-2 w-72 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl block"
          style={{ pointerEvents: 'none' }}
        >
          <span className="flex items-center gap-2 mb-2">
            <span className={typeColor[entity.type]}>{typeIcon[entity.type]}</span>
            <span className="font-semibold text-zinc-100 text-sm">{entity.name}</span>
            <span className="text-[10px] text-zinc-500 capitalize ml-auto">{entity.type}</span>
          </span>
          <span className="text-xs text-zinc-400 leading-relaxed block">{entity.summary}</span>
        </span>
      )}
    </span>
  )
}

interface LorePopupProps {
  query: string
  entities: LoreEntity[]
  position: { top: number; left: number }
  onSelect: (entity: LoreEntity) => void
  onClose: () => void
}

function LorePopup({ query, entities, position, onSelect, onClose }: LorePopupProps) {
  const filtered = entities.filter(e =>
    e.name.toLowerCase().startsWith(query.toLowerCase())
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  if (filtered.length === 0) return null

  return (
    <div
      className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 min-w-48"
      style={{ top: position.top, left: position.left }}
      onKeyDown={handleKeyDown}
    >
      <div className="px-2 py-1 text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800 mb-1">
        Entidades do Lore
      </div>
      {filtered.map((entity) => (
        <button
          key={entity.id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(entity) }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-left"
        >
          <span className={typeColor[entity.type]}>{typeIcon[entity.type]}</span>
          <span className="text-sm text-zinc-200">{entity.name}</span>
          <span className="text-[10px] text-zinc-500 ml-auto capitalize">{entity.type}</span>
        </button>
      ))}
    </div>
  )
}

function RichTextRenderer({ content, entities }: { content: string; entities: LoreEntity[] }) {
  if (entities.length === 0) return <>{content}</>

  const sortedEntities = [...entities].sort((a, b) => b.name.length - a.name.length)
  const entityMap = new Map(entities.map(e => [e.name, e]))
  const escaped = sortedEntities.map(e => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`@(${escaped.join('|')})(?=\\W|$)`, 'g')

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) nodes.push(content.slice(lastIndex, match.index))
    const entity = entityMap.get(match[1])
    if (entity) {
      nodes.push(<LoreChip key={match.index} entity={entity} />)
    } else {
      nodes.push(`@${match[1]}`)
    }
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < content.length) nodes.push(content.slice(lastIndex))
  return <>{nodes}</>
}

export function Editor() {
  const {
    activeChapterId, chapterContents, loreEntities,
    setActiveChapterContent, chapters,
  } = useAppStore()

  const content = (activeChapterId ? chapterContents[activeChapterId] : '') ?? ''
  const activeChapter = chapters.find(c => c.id === activeChapterId)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [popup, setPopup] = useState<{
    query: string
    position: { top: number; left: number }
    atIndex: number
  } | null>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setActiveChapterContent(value)

    const cursor = e.target.selectionStart ?? 0
    const textUpToCursor = value.slice(0, cursor)
    const atMatch = textUpToCursor.match(/@(\w*)$/)

    if (atMatch) {
      const atIndex = cursor - atMatch[0].length
      const query = atMatch[1]
      const ta = textareaRef.current
      if (ta) {
        const rect = ta.getBoundingClientRect()
        const lineHeight = 32
        const lines = textUpToCursor.split('\n')
        const row = lines.length - 1
        const col = lines[lines.length - 1].length
        setPopup({
          query,
          position: {
            top: rect.top + row * lineHeight + lineHeight + 4,
            left: Math.min(rect.left + col * 8.4, rect.right - 220),
          },
          atIndex,
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
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <span className="text-xs font-medium text-zinc-300 mr-2 truncate max-w-48">
          {activeChapter?.title ?? ''}
        </span>
        <div className="h-3 w-px bg-zinc-700" />
        <button
          onClick={() => setShowPreview(false)}
          className={`text-xs px-2 py-1 rounded ${!showPreview ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Editar
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className={`text-xs px-2 py-1 rounded ${showPreview ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Visualizar
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-zinc-600">Digite @ para vincular entidades</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {showPreview ? (
          <div className="h-full overflow-y-auto px-8 py-8">
            {content.trim() === '' ? (
              <p className="text-zinc-600 text-sm italic">Nenhum conteúdo ainda. Clique em "Editar" para começar.</p>
            ) : (
              <div className="max-w-3xl mx-auto text-zinc-200 text-base leading-8 whitespace-pre-wrap font-serif">
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
            className="w-full h-full resize-none bg-transparent text-zinc-200 text-base leading-8 font-serif px-8 py-8 focus:outline-none"
            placeholder="Comece a escrever... Digite @ para vincular entidades do lore."
          />
        )}
      </div>

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
