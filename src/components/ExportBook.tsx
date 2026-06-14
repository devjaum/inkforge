import { useState } from 'react'
import { X, FileText, BookOpen, Smartphone, Loader2, CheckCircle2, AlertCircle, ExternalLink, Check } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { markdownToHtml } from '@/utils/markdownToHtml'

type Format = 'pdf' | 'epub' | 'mobi'
type Status = 'idle' | 'loading' | 'ok' | 'error'

const FORMATS = [
  { id: 'pdf'  as Format, label: 'PDF',  icon: <FileText size={16} />, desc: 'Impressão e leitura no PC' },
  { id: 'epub' as Format, label: 'EPUB', icon: <BookOpen size={16} />, desc: 'Kobo, Apple Books, etc.' },
  { id: 'mobi' as Format, label: 'MOBI', icon: <Smartphone size={16} />, desc: 'Kindle (requer Calibre)' },
]

export function ExportBook({ onClose }: { onClose: () => void }) {
  const { chapters, chapterContents, loreEntities, loreTypes } = useAppStore()

  const available = chapters.filter(c => c.status !== 'planned')

  const [author,        setAuthor]        = useState('')
  const [selected,      setSelected]      = useState<Format>('epub')
  const [includeLore,   setIncludeLore]   = useState(true)
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(() => new Set(available.map(c => c.id)))
  const [status,        setStatus]        = useState<Status>('idle')
  const [message,       setMessage]       = useState('')
  const [needsCalibre,  setNeedsCalibre]  = useState(false)

  const bookTitle = available[0]?.title || 'Meu Livro'

  const toggleChapter = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelectedIds(prev =>
      prev.size === available.length ? new Set() : new Set(available.map(c => c.id))
    )

  const handleExport = async () => {
    if (!window.electronAPI) {
      setStatus('error'); setMessage('Exportação disponível apenas no app desktop.'); return
    }
    if (selectedIds.size === 0) {
      setStatus('error'); setMessage('Selecione pelo menos um capítulo.'); return
    }

    setStatus('loading'); setMessage(''); setNeedsCalibre(false)

    const chaptersToExport = available
      .filter(c => selectedIds.has(c.id))
      .map(c => ({ id: c.id, title: c.title, htmlContent: markdownToHtml(chapterContents[c.id] ?? '') }))

    const loreData = includeLore
      ? loreEntities.map(e => ({
          name: e.name,
          type: e.type,
          typeLabel: loreTypes.find(t => t.value === e.type)?.label ?? e.type,
          summary: e.summary,
          tags: e.tags,
        }))
      : []

    const bookData = { title: bookTitle, author, chapters: chaptersToExport, lore: loreData }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = window.electronAPI as any
    type R = { ok: boolean; error?: string; needsCalibre?: boolean }
    const result: R =
      selected === 'pdf'  ? await api.exportPdf(bookData)  :
      selected === 'epub' ? await api.exportEpub(bookData) :
                            await api.exportMobi(bookData)

    if (result.ok) {
      setStatus('ok'); setMessage(`${selected.toUpperCase()} exportado com sucesso!`)
    } else if (!result.error) {
      setStatus('idle') // user cancelled dialog
    } else {
      setStatus('error'); setMessage(result.error)
      if (result.needsCalibre) setNeedsCalibre(true)
    }
  }

  const allChecked  = selectedIds.size === available.length
  const someChecked = selectedIds.size > 0 && !allChecked

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[420px] max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <span className="text-sm font-semibold text-zinc-100">Exportar Livro</span>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400"><X size={14} /></button>
        </div>

        <div className="overflow-y-auto px-5 pb-5 space-y-4">

          {/* Author */}
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Nome do autor (opcional)</label>
            <input
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="ex: João Silva"
              className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-zinc-600"
            />
          </div>

          {/* Chapter selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-zinc-500">Capítulos</label>
              <button
                onClick={toggleAll}
                className="text-[10px] text-zinc-500 hover:text-violet-400 transition-colors"
              >
                {allChecked ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
            </div>
            <div className="bg-zinc-800/60 rounded-xl border border-zinc-700/60 divide-y divide-zinc-700/40 max-h-44 overflow-y-auto">
              {available.length === 0 && (
                <p className="text-[11px] text-zinc-600 text-center py-4">Nenhum capítulo disponível.</p>
              )}
              {available.map(ch => {
                const checked = selectedIds.has(ch.id)
                return (
                  <button
                    key={ch.id}
                    onClick={() => toggleChapter(ch.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-700/40 transition-colors text-left"
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors ${checked ? 'bg-violet-600 border-violet-600' : 'border-zinc-600'}`}>
                      {checked && <Check size={9} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-xs truncate ${checked ? 'text-zinc-200' : 'text-zinc-500'}`}>{ch.title}</span>
                  </button>
                )
              })}
            </div>
            {someChecked && (
              <p className="text-[10px] text-zinc-600 mt-1">{selectedIds.size} de {available.length} selecionados</p>
            )}
          </div>

          {/* Include lore */}
          <button
            onClick={() => setIncludeLore(v => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-xl hover:bg-zinc-700/40 transition-colors text-left"
          >
            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors ${includeLore ? 'bg-violet-600 border-violet-600' : 'border-zinc-600'}`}>
              {includeLore && <Check size={9} className="text-white" strokeWidth={3} />}
            </div>
            <div>
              <p className="text-xs text-zinc-200 font-medium">Incluir Apêndice de Lore</p>
              <p className="text-[10px] text-zinc-500">
                {loreEntities.length} entidade{loreEntities.length !== 1 ? 's' : ''} no final do livro
              </p>
            </div>
          </button>

          {/* Format */}
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1.5">Formato</label>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelected(f.id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                    selected === f.id
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {f.icon}
                  <span className="text-[11px] font-semibold">{f.label}</span>
                  <span className="text-[9px] text-center leading-tight opacity-70 px-1">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          {status === 'ok' && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
              <CheckCircle2 size={13} /> {message}
            </div>
          )}
          {status === 'error' && (
            <div className="text-red-400 text-xs space-y-1">
              <div className="flex items-start gap-1.5">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>{message}</span>
              </div>
              {needsCalibre && (
                <button
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => (window.electronAPI as any)?.openExternal?.('https://calibre-ebook.com/download')}
                  className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors ml-4"
                >
                  <ExternalLink size={11} /> Baixar Calibre
                </button>
              )}
            </div>
          )}

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={status === 'loading' || selectedIds.size === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
          >
            {status === 'loading'
              ? <><Loader2 size={14} className="animate-spin" /> Exportando...</>
              : <>Exportar {selected.toUpperCase()}{includeLore && loreEntities.length > 0 ? ' + Apêndice' : ''}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
