import { useState, useRef } from 'react'
import { Lock, FileText, CheckCircle2, PlusCircle, Check, X, Play, GripVertical, RotateCcw, Pencil, Trash2 } from 'lucide-react'
import { useAppStore, type Chapter, type ChapterStatus } from '@/store/useAppStore'

// ── Status helpers ──────────────────────────────────────────────────────────
function statusIcon(status: ChapterStatus) {
  if (status === 'completed') return <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
  if (status === 'planned')   return <Lock size={12} className="text-zinc-600 shrink-0" />
  return <FileText size={12} className="shrink-0" />
}

// ── New chapter form ────────────────────────────────────────────────────────
interface NewChapterFormProps {
  onConfirm: (title: string, status: ChapterStatus) => void
  onCancel: () => void
}

function NewChapterForm({ onConfirm, onCancel }: NewChapterFormProps) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<ChapterStatus>('drafted')

  const submit = () => {
    const t = title.trim()
    if (t) onConfirm(t, status)
    else onCancel()
  }

  return (
    <div className="mx-2 mb-2 bg-zinc-800 rounded-xl p-3 space-y-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
        placeholder="Nome do capítulo..."
        className="w-full bg-zinc-700 text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500"
      />
      <div className="flex gap-1">
        {(['drafted', 'planned'] as ChapterStatus[]).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`flex-1 text-[10px] py-1 rounded-md transition-colors capitalize ${
              status === s ? 'bg-violet-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
            }`}
          >
            {s === 'drafted' ? 'Rascunho' : 'Planejado'}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <button onClick={submit} className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors">
          <Check size={10} /> Criar
        </button>
        <button onClick={onCancel} className="flex items-center justify-center px-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded-lg transition-colors">
          <X size={10} />
        </button>
      </div>
    </div>
  )
}

// ── Chapter item with drag, context actions ─────────────────────────────────
interface ChapterItemProps {
  chapter: Chapter
  isActive: boolean
  index: number
  onActivate: () => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: () => void
}

function ChapterItem({ chapter, isActive, index, onActivate, onDragStart, onDragOver, onDrop }: ChapterItemProps) {
  const { markChapterCompleted, startChapter, revertChapter, renameChapter, deleteChapter } = useAppStore()
  const isPlanned   = chapter.status === 'planned'
  const isCompleted = chapter.status === 'completed'
  const [hovered, setHovered]         = useState(false)
  const [renaming, setRenaming]       = useState(false)
  const [renameVal, setRenameVal]     = useState('')
  const [confirmDel, setConfirmDel]   = useState(false)
  const dragRef = useRef(false)

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRenameVal(chapter.title)
    setRenaming(true)
    setConfirmDel(false)
  }

  const commitRename = () => {
    const t = renameVal.trim()
    if (t && t !== chapter.title) renameChapter(chapter.id, t)
    setRenaming(false)
  }

  // Inline rename mode — replaces the whole row
  if (renaming) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800">
        <input
          autoFocus
          value={renameVal}
          onChange={e => setRenameVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
          className="flex-1 bg-zinc-700 text-zinc-100 text-xs rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500 min-w-0"
        />
        <button onClick={commitRename} className="text-emerald-400 hover:text-emerald-300 shrink-0"><Check size={11} /></button>
        <button onClick={() => setRenaming(false)} className="text-zinc-600 hover:text-zinc-400 shrink-0"><X size={11} /></button>
      </div>
    )
  }

  // Delete confirmation mode
  if (confirmDel) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-900/20 border border-red-800/40">
        <span className="flex-1 text-[10px] text-red-400 truncate">Excluir "{chapter.title}"?</span>
        <button onClick={() => deleteChapter(chapter.id)} className="text-red-400 hover:text-red-300 shrink-0"><Check size={11} /></button>
        <button onClick={() => setConfirmDel(false)} className="text-zinc-600 hover:text-zinc-400 shrink-0"><X size={11} /></button>
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={() => { dragRef.current = true; onDragStart(index) }}
      onDragOver={e => { e.preventDefault(); onDragOver(index) }}
      onDrop={e => { e.preventDefault(); onDrop() }}
      onDragEnd={() => { dragRef.current = false }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false) }}
      className={`group flex items-center gap-1 rounded-lg transition-all cursor-pointer
        ${isActive ? 'bg-violet-600/20' : 'hover:bg-zinc-800'}
        ${isPlanned ? 'opacity-50' : ''}
        ${isCompleted ? 'opacity-80' : ''}
      `}
    >
      {/* Drag handle */}
      <span className={`pl-1 text-zinc-700 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'} cursor-grab shrink-0`}>
        <GripVertical size={11} />
      </span>

      {/* Main button */}
      <button onClick={onActivate} className="flex-1 text-left px-1 py-2.5 min-w-0">
        <div className="flex items-center gap-2">
          {statusIcon(chapter.status)}
          <span className={`text-xs font-medium leading-tight flex-1 truncate ${
            isActive ? 'text-violet-300' : isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-300'
          } ${isPlanned ? 'blur-[1.5px] select-none' : ''}`}>
            {chapter.title}
          </span>
        </div>
        {!isPlanned && chapter.wordCount > 0 && (
          <div className="mt-0.5 ml-5 text-[10px] text-zinc-600">{chapter.wordCount.toLocaleString()} palavras</div>
        )}
      </button>

      {/* Action buttons on hover */}
      {hovered && (
        <div className="flex items-center gap-0.5 pr-1 shrink-0">
          {/* Rename */}
          <button onClick={startRename} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="Renomear">
            <Pencil size={10} />
          </button>

          {/* Status actions */}
          {!isCompleted && !isPlanned && (
            <button onClick={e => { e.stopPropagation(); markChapterCompleted(chapter.id) }}
              className="p-1 text-zinc-600 hover:text-emerald-400 transition-colors" title="Concluir">
              <CheckCircle2 size={11} />
            </button>
          )}
          {isCompleted && (
            <button onClick={e => { e.stopPropagation(); revertChapter(chapter.id) }}
              className="p-1 text-zinc-600 hover:text-amber-400 transition-colors" title="Desconcluir">
              <RotateCcw size={10} />
            </button>
          )}
          {isPlanned && (
            <button onClick={e => { e.stopPropagation(); startChapter(chapter.id) }}
              className="p-1 text-zinc-600 hover:text-violet-400 transition-colors" title="Iniciar">
              <Play size={10} />
            </button>
          )}

          {/* Delete */}
          <button onClick={e => { e.stopPropagation(); setConfirmDel(true) }}
            className="p-1 text-zinc-600 hover:text-red-400 transition-colors" title="Excluir">
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main sidebar ────────────────────────────────────────────────────────────
export function ChapterSidebar({ embedded = false }: { embedded?: boolean }) {
  const { chapters, activeChapterId, setActiveChapter, addChapter, reorderChapters } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const dragFromRef = useRef<number | null>(null)
  const dragOverRef = useRef<number | null>(null)

  const sorted = [...chapters].sort((a, b) => a.order - b.order)
  const drafted   = sorted.filter(c => c.status === 'drafted')
  const planned   = sorted.filter(c => c.status === 'planned')
  const completed = sorted.filter(c => c.status === 'completed')

  const handleDrop = () => {
    if (dragFromRef.current !== null && dragOverRef.current !== null && dragFromRef.current !== dragOverRef.current) {
      reorderChapters(dragFromRef.current, dragOverRef.current)
    }
    dragFromRef.current = null
    dragOverRef.current = null
  }

  const cls = embedded
    ? 'flex flex-col h-full w-full'
    : 'sidebar-transition w-56 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full'

  const renderGroup = (label: string, list: Chapter[], icon?: React.ReactNode) => (
    list.length > 0 && (
      <div className="mb-2">
        <div className="px-3 py-1 flex items-center gap-1">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</span>
          {icon}
          <span className="text-[10px] text-zinc-700 ml-auto">({list.length})</span>
        </div>
        {list.map((ch, i) => (
          <ChapterItem
            key={ch.id}
            chapter={ch}
            isActive={ch.id === activeChapterId}
            index={sorted.indexOf(ch)}
            onActivate={() => setActiveChapter(ch.id)}
            onDragStart={idx => { dragFromRef.current = idx }}
            onDragOver={idx => { dragOverRef.current = idx }}
            onDrop={handleDrop}
          />
        ))}
      </div>
    )
  )

  return (
    <aside className={cls}>
      {/* Header */}
      <div className={`px-3 pb-2 ${embedded ? 'pt-3' : 'pt-4'}`}>
        <div className="flex items-center justify-between">
          {!embedded && <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Capítulos</span>}
          <button
            onClick={() => setShowForm(v => !v)}
            className={`ml-auto transition-colors ${showForm ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'}`}
            title="Novo capítulo"
          >
            <PlusCircle size={14} />
          </button>
        </div>
      </div>

      {showForm && (
        <NewChapterForm
          onConfirm={(t, s) => { addChapter(t, s); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {/* Rascunhos */}
        {renderGroup('Rascunhados', drafted)}

        {/* Planejados — fog of war */}
        {planned.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 flex items-center gap-1">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Planejados</span>
              <Lock size={9} className="text-zinc-700" />
              <span className="text-[10px] text-zinc-700 ml-auto">({planned.length})</span>
            </div>
            {planned.map((ch) => (
              <ChapterItem
                key={ch.id}
                chapter={ch}
                isActive={ch.id === activeChapterId}
                index={sorted.indexOf(ch)}
                onActivate={() => {}}
                onDragStart={idx => { dragFromRef.current = idx }}
                onDragOver={idx => { dragOverRef.current = idx }}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}

        {/* Concluídos */}
        {renderGroup('Concluídos', completed, <CheckCircle2 size={9} className="text-emerald-600" />)}

        {chapters.length === 0 && (
          <p className="text-[10px] text-zinc-700 px-3 py-2">Nenhum capítulo ainda.</p>
        )}
      </div>

      <div className="border-t border-zinc-800 px-3 py-2 shrink-0">
        <div className="text-[10px] text-zinc-600">
          {drafted.length} rascunhos · {completed.length} concluídos · {planned.length} planejados
        </div>
      </div>
    </aside>
  )
}
