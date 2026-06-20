import { useMemo, useState } from 'react'
import { X, History, RotateCcw, Trash2, Plus, Minus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { diffLines, diffStats } from '@/utils/diff'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d} d`
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const { activeChapterId, chapters, chapterContents, chapterHistory, restoreSnapshot, deleteSnapshot } = useAppStore()

  const chapter = chapters.find(c => c.id === activeChapterId)
  const currentContent = (activeChapterId ? chapterContents[activeChapterId] : '') ?? ''
  // Newest first for display.
  const snapshots = useMemo(
    () => [...(activeChapterId ? chapterHistory[activeChapterId] ?? [] : [])].reverse(),
    [activeChapterId, chapterHistory],
  )

  const [selectedId, setSelectedId] = useState<string | null>(snapshots[0]?.id ?? null)
  const selected = snapshots.find(s => s.id === selectedId) ?? null

  const diff = useMemo(
    () => selected ? diffLines(selected.content, currentContent) : [],
    [selected, currentContent],
  )
  const stats = useMemo(() => diffStats(diff), [diff])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-[min(960px,92vw)] h-[min(640px,88vh)] flex flex-col overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 shrink-0">
          <History size={15} className="text-violet-400" />
          <span className="text-sm font-semibold text-zinc-100">Histórico</span>
          {chapter && <span className="text-xs text-zinc-500 truncate">— {chapter.title}</span>}
          <div className="flex-1" />
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"><X size={16} /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Snapshot list */}
          <div className="w-60 shrink-0 border-r border-zinc-800 overflow-y-auto">
            {snapshots.length === 0 ? (
              <div className="p-4 text-xs text-zinc-600 leading-relaxed">
                Nenhuma versão salva ainda. O histórico é registrado automaticamente
                enquanto você escreve, ao trocar de capítulo e ao salvar (Ctrl+S).
              </div>
            ) : (
              snapshots.map(snap => {
                const isSel = snap.id === selectedId
                return (
                  <button
                    key={snap.id}
                    onClick={() => setSelectedId(snap.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-zinc-800/60 transition-colors ${
                      isSel ? 'bg-violet-600/15 border-l-2 border-l-violet-500' : 'hover:bg-zinc-800/50 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-200">{relativeTime(snap.timestamp)}</span>
                      <span className="text-[10px] text-zinc-600 tabular-nums">{snap.wordCount}p</span>
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{formatStamp(snap.timestamp)}</div>
                    {snap.label && (
                      <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-violet-300">{snap.label}</span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Diff view */}
          <div className="flex-1 min-w-0 flex flex-col">
            {selected ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 shrink-0">
                  <span className="text-[10px] text-zinc-500">
                    Comparando <span className="text-zinc-300">{formatStamp(selected.timestamp)}</span> → <span className="text-zinc-300">versão atual</span>
                  </span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-0.5 text-emerald-400"><Plus size={10} />{stats.added}</span>
                    <span className="flex items-center gap-0.5 text-rose-400"><Minus size={10} />{stats.removed}</span>
                  </div>
                  <div className="flex-1" />
                  <button
                    onClick={() => { restoreSnapshot(activeChapterId!, selected.id); onClose() }}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                  >
                    <RotateCcw size={11} /> Restaurar esta versão
                  </button>
                  <button
                    onClick={() => {
                      deleteSnapshot(activeChapterId!, selected.id)
                      setSelectedId(snapshots.find(s => s.id !== selected.id)?.id ?? null)
                    }}
                    title="Excluir versão"
                    className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-xs leading-relaxed py-2">
                  {diff.length === 0 || (stats.added === 0 && stats.removed === 0) ? (
                    <div className="px-4 py-6 text-zinc-600 text-center text-[11px]">
                      Nenhuma diferença em relação à versão atual.
                    </div>
                  ) : (
                    diff.map((line, i) => {
                      const bg = line.op === 'added' ? 'bg-emerald-500/10' : line.op === 'removed' ? 'bg-rose-500/10' : ''
                      const text = line.op === 'added' ? 'text-emerald-300' : line.op === 'removed' ? 'text-rose-300' : 'text-zinc-400'
                      const sign = line.op === 'added' ? '+' : line.op === 'removed' ? '−' : ' '
                      const signColor = line.op === 'added' ? 'text-emerald-500' : line.op === 'removed' ? 'text-rose-500' : 'text-zinc-700'
                      return (
                        <div key={i} className={`flex ${bg}`}>
                          <span className={`w-6 shrink-0 text-right pr-1.5 select-none ${signColor}`}>{sign}</span>
                          <span className={`whitespace-pre-wrap break-words pr-4 ${text}`}>{line.text || ' '}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
                Selecione uma versão para ver as alterações.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
