import { useRef, useState } from 'react'
import { Download, Upload, X, Check, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function ExportImportModal({ onClose }: { onClose: () => void }) {
  const store = useAppStore()
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const bundle = {
      version: 1,
      exportedAt: new Date().toISOString(),
      chapters:        store.chapters,
      chapterContents: store.chapterContents,
      chapterHistory:  store.chapterHistory,
      loreEntities:    store.loreEntities,
      loreTypes:       store.loreTypes,
      dailyGoalWords:  store.dailyGoalWords,
      typingAnimation: store.typingAnimation,
      editorMaxWidth:  store.editorMaxWidth,
      editorFontSize:  store.editorFontSize,
      editorLineHeight: store.editorLineHeight,
      editorTextAlign: store.editorTextAlign,
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `inkforge-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (typeof data !== 'object' || !data.chapters) throw new Error('Formato inválido')
        store.hydrate({
          chapters:         data.chapters,
          chapterContents:  data.chapterContents,
          chapterHistory:   data.chapterHistory,
          loreEntities:     data.loreEntities,
          loreTypes:        data.loreTypes,
          dailyGoalWords:   data.dailyGoalWords,
          typingAnimation:  data.typingAnimation,
          editorMaxWidth:   data.editorMaxWidth,
          editorFontSize:   data.editorFontSize,
          editorLineHeight: data.editorLineHeight,
          editorTextAlign:  data.editorTextAlign,
        })
        setImportStatus('ok')
        setTimeout(onClose, 1200)
      } catch {
        setImportStatus('error')
      }
    }
    reader.readAsText(file)
    // reset so same file can be selected again
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-80 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-zinc-100">Exportar / Importar</span>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400"><X size={14} /></button>
        </div>

        {/* Export */}
        <div className="mb-3">
          <p className="text-[11px] text-zinc-500 mb-2">Exporta todos os capítulos, lore e configurações num único arquivo <code className="text-violet-400">.json</code>.</p>
          <button onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors">
            <Download size={14} /> Exportar backup
          </button>
        </div>

        <div className="border-t border-zinc-800 my-3" />

        {/* Import */}
        <div>
          <p className="text-[11px] text-zinc-500 mb-2">Importa um arquivo de backup anterior. <span className="text-amber-400">Substitui todos os dados atuais.</span></p>
          <button onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium rounded-xl transition-colors">
            <Upload size={14} /> Importar backup
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

          {importStatus === 'ok' && (
            <div className="mt-2 flex items-center gap-1.5 text-emerald-400 text-xs">
              <Check size={12} /> Importado com sucesso!
            </div>
          )}
          {importStatus === 'error' && (
            <div className="mt-2 flex items-center gap-1.5 text-red-400 text-xs">
              <AlertCircle size={12} /> Arquivo inválido ou corrompido.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
