import { useRef, useState, useCallback, useEffect } from 'react'
import { X, AlignLeft, AlignJustify, Minus, Settings2, Search, ChevronUp, ChevronDown, History, Keyboard } from 'lucide-react'
import { useAppStore, type LoreEntity, type TypingAnimation } from '@/store/useAppStore'
import { HistoryPanel } from './HistoryPanel'

// ── Markdown parser ──────────────────────────────────────────────────────────
function renderMarkdownLine(
  line: string, entities: LoreEntity[], lineKey: number,
  searchQuery?: string,
): React.ReactNode {
  const wrap = (children: React.ReactNode) => {
    if (line.startsWith('### ')) return <h3 key={lineKey} className="text-lg font-bold text-zinc-100 mt-4 mb-1">{children}</h3>
    if (line.startsWith('## '))  return <h2 key={lineKey} className="text-xl font-bold text-zinc-100 mt-5 mb-1">{children}</h2>
    if (line.startsWith('# '))   return <h1 key={lineKey} className="text-2xl font-bold text-zinc-100 mt-6 mb-2">{children}</h1>
    return <p key={lineKey} className="leading-[inherit] text-zinc-200">{children}</p>
  }
  if (line === '---' || line === '***') return <hr key={lineKey} className="border-zinc-700 my-4" />
  if (line === '') return <div key={lineKey} className="h-4" />
  const trimmed = line.startsWith('# ') ? line.slice(2)
    : line.startsWith('## ') ? line.slice(3)
    : line.startsWith('### ') ? line.slice(4)
    : line
  return wrap(inlineRender(trimmed, entities, lineKey, searchQuery))
}

function inlineRender(
  text: string, entities: LoreEntity[], lineKey: number,
  searchQuery?: string,
): React.ReactNode[] {
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length)
  const entityMap = new Map(entities.map(e => [e.name, e]))
  const lorePattern = sorted.length > 0
    ? sorted.map(e => '@' + e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    : null

  const base = '(\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|`[^`]+`'
  const parts = lorePattern ? base + '|' + lorePattern + ')' : base + ')'
  const tokens = text.split(new RegExp(parts, 'g'))
  const nodes: React.ReactNode[] = []

  tokens.forEach((tok, i) => {
    if (!tok) return
    const key = `${lineKey}-${i}`
    if (tok.startsWith('**') && tok.endsWith('**')) {
      nodes.push(<strong key={key} className="font-bold text-zinc-100">{highlightSearch(tok.slice(2, -2), searchQuery, key)}</strong>)
    } else if (tok.startsWith('*') && tok.endsWith('*')) {
      nodes.push(<em key={key} className="italic text-zinc-300">{highlightSearch(tok.slice(1, -1), searchQuery, key)}</em>)
    } else if (tok.startsWith('`') && tok.endsWith('`')) {
      nodes.push(<code key={key} className="font-mono text-xs bg-zinc-800 text-violet-300 px-1.5 py-0.5 rounded">{tok.slice(1, -1)}</code>)
    } else if (tok.startsWith('@')) {
      const name = tok.slice(1)
      const entity = entityMap.get(name)
      if (entity) nodes.push(<LoreChip key={key} entity={entity} />)
      else nodes.push(tok)
    } else {
      nodes.push(...highlightSearch(tok, searchQuery, key))
    }
  })

  return nodes
}

function highlightSearch(text: string, query: string | undefined, baseKey: string): React.ReactNode[] {
  if (!query || query.length < 2) return [text]
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={`${baseKey}-h${i}`} className="bg-amber-400/40 text-amber-200 rounded-sm px-0.5">{p}</mark>
      : p
  )
}

// ── Lore hover chip ──────────────────────────────────────────────────────────
function LoreChip({ entity }: { entity: LoreEntity }) {
  const { loreTypes } = useAppStore()
  const [open, setOpen] = useState(false)
  const typeInfo  = loreTypes.find(t => t.value === entity.type)
  const typeLabel = typeInfo?.label ?? entity.type
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

// ── @mention popup — always renders ABOVE the cursor ─────────────────────────
interface LorePopupProps {
  query: string
  entities: LoreEntity[]
  anchor: { top: number; left: number; isAbove?: boolean } // <-- Adicionado isAbove
  onSelect: (entity: LoreEntity) => void
  onClose: () => void
}

function LorePopup({ query, entities, anchor, onSelect, onClose }: LorePopupProps) {
  const { loreTypes } = useAppStore()
  const filtered = entities.filter(e => e.name.toLowerCase().startsWith(query.toLowerCase()))
  if (filtered.length === 0) return null
  return (
    <div
      className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 min-w-52"
      style={{
        top: anchor.top,
        left: anchor.left,
        transform: anchor.isAbove ? 'translateY(-100%)' : 'none'
      }}
    >
      <div className="px-2 py-1 text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800 mb-1">Lore — escolha uma entidade</div>
      <div className="max-h-52 overflow-y-auto">
        {filtered.map(entity => {
          const typeInfo  = loreTypes.find(t => t.value === entity.type)
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
      </div>
      <button onClick={onClose} className="absolute top-1 right-1 p-1 text-zinc-600 hover:text-zinc-400"><X size={10} /></button>
    </div>
  )
}

// ── Rich text renderer ───────────────────────────────────────────────────────
function RichTextRenderer({ content, entities, searchQuery }: { content: string; entities: LoreEntity[]; searchQuery?: string }) {
  const lines = content.split('\n')
  return <>{lines.map((line, i) => renderMarkdownLine(line, entities, i, searchQuery))}</>
}

// ── In-editor search bar ─────────────────────────────────────────────────────
interface InEditorSearchProps {
  content: string
  textareaRef: React.RefObject<HTMLTextAreaElement>
  scrollRef: React.RefObject<HTMLDivElement>
  isPreview: boolean
  onSearchChange: (q: string) => void
  onClose: () => void
}

function InEditorSearch({ content, textareaRef, scrollRef, isPreview, onSearchChange, onClose }: InEditorSearchProps) {
  const [query, setQuery] = useState('')
  const [idx, setIdx]     = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30) }, [])

  // Compute all match positions
  const matches = useCallback(() => {
    if (query.length < 1) return []
    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const result: number[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) result.push(m.index)
    return result
  }, [content, query])()

  const total = matches.length

  useEffect(() => { setIdx(0) }, [query])
  useEffect(() => { onSearchChange(query) }, [query, onSearchChange])

  const goTo = useCallback((i: number) => {
    if (total === 0) return
    const next = (i + total) % total
    setIdx(next)
    const pos = matches[next]
    if (!isPreview && textareaRef.current) {
      const ta = textareaRef.current
      ta.focus()
      ta.setSelectionRange(pos, pos + query.length)
      // scroll the textarea to the selection
      const lines = content.slice(0, pos).split('\n')
      const lineH = parseInt(getComputedStyle(ta).lineHeight) || 24
      ta.scrollTop = Math.max(0, (lines.length - 3) * lineH)
    } else if (isPreview && scrollRef.current) {
      // Find the highlighted mark elements and scroll to the nth one
      const marks = scrollRef.current.querySelectorAll('mark')
      if (marks[next]) marks[next].scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [matches, total, query, content, isPreview, textareaRef, scrollRef])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); goTo(e.shiftKey ? idx - 1 : idx + 1) }
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return (
    <div className="absolute top-0 right-2 z-40 flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-b-xl px-3 py-2 shadow-xl">
      <Search size={12} className="text-zinc-500 shrink-0" />
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Buscar no capítulo..."
        className="bg-transparent text-zinc-100 text-xs outline-none placeholder:text-zinc-600 w-44"
      />
      <span className="text-[10px] text-zinc-600 shrink-0 w-14 text-right">
        {total > 0 ? `${idx + 1}/${total}` : query ? '0 result.' : ''}
      </span>
      <div className="flex gap-0.5">
        <button onClick={() => goTo(idx - 1)} disabled={total === 0} className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-30"><ChevronUp size={13} /></button>
        <button onClick={() => goTo(idx + 1)} disabled={total === 0} className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-30"><ChevronDown size={13} /></button>
      </div>
      <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 ml-1"><X size={12} /></button>
    </div>
  )
}

// ── Zen mode overlay ─────────────────────────────────────────────────────────
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

// ── Page settings panel ───────────────────────────────────────────────────────
const WIDTH_PRESETS = [
  { label: 'Estreito', value: 600 },
  { label: 'Médio',    value: 800 },
  { label: 'Largo',    value: 1100 },
  { label: 'Cheio',    value: 1600 },
  { label: 'Livre',    value: 0 },
]
const FONT_SIZES   = [13, 15, 16, 18, 20, 24]
const LINE_HEIGHTS = [
  { label: '1.5×', value: 1.5 },
  { label: '1.8×', value: 1.8 },
  { label: '2×',   value: 2 },
  { label: '2.5×', value: 2.5 },
]

const TYPING_ANIMATIONS: { label: string; value: TypingAnimation }[] = [
  { label: 'Nenhuma',    value: 'none' },
  { label: 'Brilho',     value: 'glow' },
  { label: 'Cursor',     value: 'caret' },
  { label: 'Typewriter', value: 'typewriter' },
]

const FOCUS_POSITIONS = [
  { label: 'Topo',   value: 0.25 },
  { label: 'Centro', value: 0.5  },
  { label: 'Abaixo', value: 0.75 },
]

function PageSettingsPanel({ onClose }: { onClose: () => void }) {
  const {
    editorMaxWidth, editorFontSize, editorLineHeight, editorTextAlign, setEditorAppearance,
    typingAnimation, setTypingAnimation,
    typewriterMode, typewriterFocusRatio, setTypewriterMode, setTypewriterFocusRatio,
  } = useAppStore()
  return (
    <div className="absolute top-full right-2 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 w-64 max-w-[calc(100vw-1rem)]" onClick={e => e.stopPropagation()}>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Aparência da Página</div>
      <div className="mb-3">
        <div className="text-[10px] text-zinc-600 mb-1.5">Largura</div>
        <div className="grid grid-cols-5 gap-1">
          {WIDTH_PRESETS.map(p => (
            <button key={p.value} onClick={() => setEditorAppearance({ editorMaxWidth: p.value })}
              className={`text-[10px] py-1 rounded-md transition-colors ${editorMaxWidth === p.value ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <div className="text-[10px] text-zinc-600 mb-1.5">Tamanho da fonte</div>
        <div className="flex gap-1 flex-wrap">
          {FONT_SIZES.map(s => (
            <button key={s} onClick={() => setEditorAppearance({ editorFontSize: s })}
              className={`text-[10px] px-2 py-1 rounded-md transition-colors ${editorFontSize === s ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {s}px
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <div className="text-[10px] text-zinc-600 mb-1.5">Espaçamento</div>
        <div className="flex gap-1">
          {LINE_HEIGHTS.map(l => (
            <button key={l.value} onClick={() => setEditorAppearance({ editorLineHeight: l.value })}
              className={`flex-1 text-[10px] py-1 rounded-md transition-colors ${editorLineHeight === l.value ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] text-zinc-600 mb-1.5">Alinhamento</div>
        <div className="flex gap-1">
          <button onClick={() => setEditorAppearance({ editorTextAlign: 'left' })}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] transition-colors ${editorTextAlign === 'left' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <AlignLeft size={11} /> Esquerda
          </button>
          <button onClick={() => setEditorAppearance({ editorTextAlign: 'justify' })}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] transition-colors ${editorTextAlign === 'justify' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <AlignJustify size={11} /> Justificar
          </button>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-[10px] text-zinc-600 mb-1.5">Animação de digitação</div>
        <div className="grid grid-cols-2 gap-1">
          {TYPING_ANIMATIONS.map(a => (
            <button key={a.value} onClick={() => setTypingAnimation(a.value)}
              className={`text-[10px] py-1 rounded-md transition-colors ${typingAnimation === a.value ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      {/* Typewriter mode */}
      <div className="mt-3 border-t border-zinc-800 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <Keyboard size={11} className="text-violet-400" />
            Modo Máquina de Escrever
          </div>
          <button
            onClick={() => setTypewriterMode(!typewriterMode)}
            className={`relative w-8 h-4 rounded-full transition-colors ${typewriterMode ? 'bg-violet-600' : 'bg-zinc-700'}`}
          >
            <span className={`absolute left-0 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${typewriterMode ? 'translate-x-3' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {typewriterMode && (
          <div>
            <div className="text-[10px] text-zinc-600 mb-1.5">Posição do cursor</div>
            <div className="flex gap-1">
              {FOCUS_POSITIONS.map(p => (
                <button key={p.value} onClick={() => setTypewriterFocusRatio(p.value)}
                  className={`flex-1 text-[10px] py-1 rounded-md transition-colors ${typewriterFocusRatio === p.value ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={onClose} className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-400"><X size={12} /></button>
    </div>
  )
}

// ── Main editor ──────────────────────────────────────────────────────────────
export function Editor() {
  const {
    activeChapterId, chapterContents, loreEntities, chapters,
    isZenMode, toggleZenMode, setActiveChapterContent,
    editorMaxWidth, editorFontSize, editorLineHeight, editorTextAlign, setEditorAppearance,
    typingAnimation,
    typewriterMode, typewriterFocusRatio,
  } = useAppStore()

  const content       = (activeChapterId ? chapterContents[activeChapterId] : '') ?? ''
  const activeChapter = chapters.find(c => c.id === activeChapterId)

  const textareaRef = useRef<HTMLTextAreaElement>(null!)
  const scrollRef   = useRef<HTMLDivElement>(null!)
  const toolbarRef  = useRef<HTMLDivElement>(null!)

  const [showPreview,  setShowPreview]  = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch,   setShowSearch]   = useState(false)
  const [showHistory,  setShowHistory]  = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [isTyping,     setIsTyping]     = useState(false)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [popup, setPopup] = useState<{
    query: string
    anchor: { top: number; left: number; isAbove: boolean }
    atIndex: number
  } | null>(null)

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return
    const h = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) setShowSettings(false)
    }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [showSettings])

  // Zen ESC
  useEffect(() => {
    if (!isZenMode) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') toggleZenMode() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isZenMode, toggleZenMode])

  // Ctrl+F / Ctrl+Shift+F  (global search handled in App.tsx via OmniSearch)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
        e.preventDefault()
        setShowSearch(v => !v)
        if (showSearch) setSearchQuery('')
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [showSearch])

  // Insert at cursor
  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current
    if (!ta) { setActiveChapterContent(content + text); return }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    setActiveChapterContent(content.slice(0, start) + text + content.slice(end))
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + text.length; ta.focus() }, 0)
  }, [content, setActiveChapterContent])

  // Ctrl+Shift+- → travessão
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '-') {
        e.preventDefault()
        insertAtCursor('— ')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [insertAtCursor])

  // Typing-animation feedback (glow flash) + typewriter scroll centering
  const pingTyping = useCallback((ta: HTMLTextAreaElement, cursor: number) => {
    if (typingAnimation === 'glow') {
      setIsTyping(true)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setIsTyping(false), 500)
    }

    if (typewriterMode) {
      const container = scrollRef.current
      if (!container) return
      const { top: cursorLocalTop } = getCursorXY(ta, cursor)
      const lineH = editorFontSize * editorLineHeight
      const containerRect = container.getBoundingClientRect()
      const taRect = ta.getBoundingClientRect()
      // Pixel position of the cursor top relative to the viewport
      const cursorVPTop = taRect.top + cursorLocalTop - ta.scrollTop
      // Where we want the center of the cursor line to sit on screen
      const targetVPTop = containerRect.top + containerRect.height * typewriterFocusRatio - lineH / 2
      const delta = cursorVPTop - targetVPTop
      container.scrollTo({ top: Math.max(0, container.scrollTop + delta), behavior: 'smooth' })
    }
  }, [typingAnimation, typewriterMode, typewriterFocusRatio, editorFontSize, editorLineHeight])

  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current) }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value  = e.target.value
    setActiveChapterContent(value)
    const cursor = e.target.selectionStart ?? 0
    pingTyping(e.target, cursor)
    const upTo   = value.slice(0, cursor)
    const atMatch = upTo.match(/@(\w*)$/)

    if (atMatch) {
      const ta = e.target
      const rect = ta.getBoundingClientRect()
      
      // Usa a função espelho para pegar a posição real, considerando as quebras de linha (wrap)
      const { top: caretTop, left: caretLeft } = getCursorXY(ta, cursor)
      
      // Posição Y na tela = Topo do Textarea - Scroll do Textarea + Posição do Cursor no Textarea
      const cursorTop = rect.top - ta.scrollTop + caretTop
      
      const lineH = editorFontSize * editorLineHeight
      const POPUP_H = 220 
      const isAbove = cursorTop > POPUP_H + 8

      setPopup({
        query: atMatch[1],
        atIndex: cursor - atMatch[0].length,
        anchor: {
          // Usa a flag isAbove que criamos na resposta anterior
          top: isAbove ? cursorTop - 4 : cursorTop + lineH + 4,
          // Posição X real na tela
          left: rect.left - ta.scrollLeft + caretLeft,
          isAbove: isAbove, 
        },
      })
    } else {
      setPopup(null)
    }
  }, [setActiveChapterContent, editorFontSize, editorLineHeight, pingTyping])

  const handleEntitySelect = useCallback((entity: LoreEntity) => {
    if (!popup) return
    const before = content.slice(0, popup.atIndex)
    const after  = content.slice(popup.atIndex + 1 + popup.query.length)
    setActiveChapterContent(`${before}@${entity.name}${after}`)
    setPopup(null)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [popup, content, setActiveChapterContent])

  const maxW      = editorMaxWidth > 0 ? `${editorMaxWidth}px` : 'none'
  const fontStyle = { fontSize: editorFontSize, lineHeight: editorLineHeight, textAlign: editorTextAlign } as React.CSSProperties

  const closeSearch = useCallback(() => { setShowSearch(false); setSearchQuery('') }, [])

  if (!activeChapterId) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        Selecione um capítulo para começar a escrever.
      </div>
    )
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 relative ${isZenMode ? 'bg-zinc-950' : ''}`}>
      {/* Toolbar */}
      {!isZenMode && (
        <div ref={toolbarRef} className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950 shrink-0 relative">
          <span className="text-xs font-medium text-zinc-300 truncate max-w-36">{activeChapter?.title}</span>
          <div className="h-3 w-px bg-zinc-700" />

          <button onClick={() => setShowPreview(false)} className={`text-xs px-2 py-1 rounded ${!showPreview ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>Editar</button>
          <button onClick={() => setShowPreview(true)}  className={`text-xs px-2 py-1 rounded ${showPreview  ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>Visualizar</button>

          <div className="h-3 w-px bg-zinc-700" />

          <button
            onClick={() => { setShowPreview(false); setTimeout(() => insertAtCursor('— '), 10) }}
            title="Inserir travessão (Ctrl+Shift+-)"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Minus size={11} />
            <span className="hidden sm:inline">— Travessão</span>
          </button>

          {/* In-chapter search */}
          <button
            onClick={() => setShowSearch(v => !v)}
            title="Buscar no capítulo (Ctrl+F)"
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${showSearch ? 'text-violet-400 bg-violet-400/10' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}`}
          >
            <Search size={11} />
          </button>

          {/* History */}
          <button
            onClick={() => setShowHistory(true)}
            title="Histórico de versões"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <History size={11} />
            <span className="hidden sm:inline">Histórico</span>
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <button onClick={() => setEditorAppearance({ editorFontSize: Math.max(13, editorFontSize - 1) })}
              className="text-zinc-600 hover:text-zinc-300 text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-800">−</button>
            <span className="text-[10px] text-zinc-600 w-8 text-center">{editorFontSize}px</span>
            <button onClick={() => setEditorAppearance({ editorFontSize: Math.min(32, editorFontSize + 1) })}
              className="text-zinc-600 hover:text-zinc-300 text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-800">+</button>
          </div>

          <button onClick={() => setEditorAppearance({ editorTextAlign: editorTextAlign === 'left' ? 'justify' : 'left' })}
            className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Alternar alinhamento">
            {editorTextAlign === 'justify' ? <AlignJustify size={13} /> : <AlignLeft size={13} />}
          </button>

          <button onClick={() => setShowSettings(v => !v)}
            className={`transition-colors ${showSettings ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-300'}`}
            title="Configurações de página">
            <Settings2 size={13} />
          </button>

          {showSettings && <PageSettingsPanel onClose={() => setShowSettings(false)} />}
        </div>
      )}

      {/* Content area */}
      <div className={`flex-1 min-h-0 overflow-hidden relative ${isZenMode ? 'flex items-start justify-center pt-16' : ''}`}>
        {/* In-editor search bar */}
        {showSearch && !isZenMode && (
          <InEditorSearch
            content={content}
            textareaRef={textareaRef}
            scrollRef={scrollRef}
            isPreview={showPreview}
            onSearchChange={setSearchQuery}
            onClose={closeSearch}
          />
        )}

        {showPreview ? (
          <div ref={scrollRef} className="h-full overflow-y-auto py-10 px-8">
            {content.trim() === '' ? (
              <p className="text-zinc-600 text-sm italic">Nenhum conteúdo. Clique em "Editar" para escrever.</p>
            ) : (
              <div className="mx-auto font-serif" style={{ maxWidth: maxW, ...fontStyle }}>
                <RichTextRenderer content={content} entities={loreEntities} searchQuery={searchQuery || undefined} />
              </div>
            )}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto px-8"
            style={typewriterMode ? {
              // Padding superior modesto: o conteúdo já escrito permanece visível
              // a partir do topo. Padding inferior grande: permite que a linha
              // atual suba até o ponto de foco, fixando o cursor no centro.
              paddingTop:    '2rem',
              paddingBottom: `calc(${(1 - typewriterFocusRatio) * 100}vh)`,
            } : { paddingTop: '2rem', paddingBottom: '2rem' }}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              spellCheck={false}
              className={`resize-none bg-transparent text-zinc-200 font-serif focus:outline-none w-full min-h-full block mx-auto
                ${typingAnimation === 'caret' ? 'anim-caret' : ''}
                ${typingAnimation === 'glow' ? `anim-glow ${isTyping ? 'is-typing' : ''}` : ''}
                ${typingAnimation === 'typewriter' ? 'anim-caret' : ''}`}
              style={{ maxWidth: maxW, ...fontStyle }}
              placeholder="Comece a escrever... Use @Nome para lore, **negrito**, *itálico*, — para travessão."
            />
          </div>
        )}
      </div>

      {isZenMode && <ZenBar onExit={toggleZenMode} />}

      {popup && (
        <LorePopup
          query={popup.query}
          entities={loreEntities}
          anchor={popup.anchor}
          onSelect={handleEntitySelect}
          onClose={() => setPopup(null)}
        />
      )}

      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
    </div>
  )
}

// ── Textarea Cursor Position Helper ──────────────────────────────────────────
function getCursorXY(input: HTMLTextAreaElement, selectionPoint: number) {
  const div = document.createElement('div')
  const copyStyle = getComputedStyle(input)
  
  // Copia todo o estilo da fonte, padding, etc., para o div invisível
  for (const prop of Array.from(copyStyle)) {
    div.style.setProperty(prop, copyStyle.getPropertyValue(prop))
  }
  
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  // O segredo está aqui: o div precisa ter a mesma largura exata para quebrar a linha igual
  div.style.width = input.clientWidth + 'px'
  
  // Coloca o texto até o cursor
  div.textContent = input.value.substring(0, selectionPoint)
  
  // Coloca um span onde o cursor estaria
  const span = document.createElement('span')
  span.textContent = input.value.substring(selectionPoint) || '.'
  div.appendChild(span)
  
  document.body.appendChild(div)
  
  // Pega a posição (X, Y) do span
  const top = span.offsetTop
  const left = span.offsetLeft
  
  // Limpa o DOM
  document.body.removeChild(div)
  
  return { top, left }
}