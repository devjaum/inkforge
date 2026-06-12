import { useState, useRef, useEffect } from 'react'
import { Lock, FileText, PlusCircle, Check, X } from 'lucide-react'
import { useAppStore, type Chapter } from '@/store/useAppStore'

function ChapterItem({ chapter, isActive, onClick }: {
  chapter: Chapter
  isActive: boolean
  onClick: () => void
}) {
  const isPlanned = chapter.status === 'planned'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${
        isActive
          ? 'bg-violet-600/20 text-violet-300'
          : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
      } ${isPlanned ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        {isPlanned ? (
          <Lock size={12} className="text-zinc-600 shrink-0" />
        ) : (
          <FileText size={12} className="shrink-0" />
        )}
        <span
          className={`text-xs font-medium leading-tight flex-1 truncate ${
            isPlanned ? 'blur-[1.5px] select-none' : ''
          }`}
        >
          {chapter.title}
        </span>
      </div>
      {!isPlanned && chapter.wordCount > 0 && (
        <div className="mt-1 ml-5 text-[10px] text-zinc-600">
          {chapter.wordCount.toLocaleString()} palavras
        </div>
      )}
    </button>
  )
}

interface NewChapterFormProps {
  onConfirm: (title: string, status: 'drafted' | 'planned') => void
  onCancel: () => void
}

function NewChapterForm({ onConfirm, onCancel }: NewChapterFormProps) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<'drafted' | 'planned'>('drafted')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = title.trim()
    if (trimmed) onConfirm(trimmed, status)
    else onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="mx-2 mb-2 bg-zinc-800 rounded-lg p-2 space-y-2">
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nome do capítulo..."
        className="w-full bg-zinc-700 text-zinc-100 text-xs rounded-md px-2 py-1.5 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-violet-500"
      />
      <div className="flex items-center gap-1">
        <button
          onClick={() => setStatus('drafted')}
          className={`flex-1 text-[10px] py-1 rounded-md transition-colors ${
            status === 'drafted'
              ? 'bg-violet-600 text-white'
              : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
          }`}
        >
          Rascunho
        </button>
        <button
          onClick={() => setStatus('planned')}
          className={`flex-1 text-[10px] py-1 rounded-md transition-colors ${
            status === 'planned'
              ? 'bg-zinc-500 text-white'
              : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
          }`}
        >
          Planejado
        </button>
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleSubmit}
          className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors"
        >
          <Check size={10} /> Criar
        </button>
        <button
          onClick={onCancel}
          className="flex items-center justify-center px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded-md transition-colors"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  )
}

export function ChapterSidebar({ embedded = false }: { embedded?: boolean }) {
  const { chapters, activeChapterId, setActiveChapter, addChapter } = useAppStore()
  const [showForm, setShowForm] = useState(false)

  const drafted = chapters.filter(c => c.status === 'drafted')
  const planned = chapters.filter(c => c.status === 'planned')

  const handleConfirm = (title: string, status: 'drafted' | 'planned') => {
    addChapter(title, status)
    setShowForm(false)
  }

  const cls = embedded
    ? 'flex flex-col h-full w-full'
    : 'sidebar-transition w-56 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full'

  return (
    <aside className={cls}>
      {/* Header — hide when embedded (tab bar is the header) */}
      <div className={`px-3 pb-2 ${embedded ? 'pt-3' : 'pt-4'}`}>
        <div className="flex items-center justify-between">
          {!embedded && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Capítulos
            </span>
          )}
          <button
            onClick={() => setShowForm(v => !v)}
            className={`transition-colors ${showForm ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'}`}
            title="Novo capítulo"
          >
            <PlusCircle size={14} />
          </button>
        </div>
      </div>

      {/* New chapter inline form */}
      {showForm && (
        <NewChapterForm
          onConfirm={handleConfirm}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {/* Drafted */}
        <div className="mb-3">
          <div className="px-2 mb-1">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Rascunhados</span>
          </div>
          {drafted.map((ch) => (
            <ChapterItem
              key={ch.id}
              chapter={ch}
              isActive={ch.id === activeChapterId}
              onClick={() => setActiveChapter(ch.id)}
            />
          ))}
          {drafted.length === 0 && (
            <p className="text-[10px] text-zinc-700 px-3 py-2">Nenhum capítulo ainda.</p>
          )}
        </div>

        {/* Planned - Fog of War */}
        <div>
          <div className="px-2 mb-1 flex items-center gap-1">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Planejados</span>
            <Lock size={9} className="text-zinc-700" />
          </div>
          {planned.map((ch) => (
            <ChapterItem
              key={ch.id}
              chapter={ch}
              isActive={ch.id === activeChapterId}
              onClick={() => setActiveChapter(ch.id)}
            />
          ))}
          {planned.length === 0 && (
            <p className="text-[10px] text-zinc-700 px-3 py-2">Nenhum planejado.</p>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="border-t border-zinc-800 px-3 py-2">
        <div className="text-[10px] text-zinc-600">
          {drafted.length} {drafted.length === 1 ? 'escrito' : 'escritos'} · {planned.length} {planned.length === 1 ? 'planejado' : 'planejados'}
        </div>
      </div>
    </aside>
  )
}
