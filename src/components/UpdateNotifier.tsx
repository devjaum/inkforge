import { useEffect, useRef, useState } from 'react'
import { Download, X, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

export type UpdateStatus =
  | { state: 'checking' }
  | { state: 'available'; version: string; notes: string; url: string; downloadUrl?: string }
  | { state: 'not-available'; version: string }
  | { state: 'error'; message: string }

// Other components fire this to request a manual check (e.g. a TopBar button).
export const CHECK_UPDATES_EVENT = 'inkforge:check-updates'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = () => (window as any).electronAPI

export function UpdateNotifier() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const manualRef = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string, ms = 3500) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }

  useEffect(() => {
    const electronAPI = api()
    if (!electronAPI?.onUpdateStatus) return

    const unsubscribe = electronAPI.onUpdateStatus((s: UpdateStatus) => {
      setStatus(s)
      if (s.state === 'available') {
        setDismissed(false)
      } else if (manualRef.current) {
        // Manual check → give transient feedback for non-actionable states.
        if (s.state === 'checking') showToast('Verificando atualizações…', 8000)
        if (s.state === 'not-available') { showToast(`Você está na versão mais recente (v${s.version}).`); manualRef.current = false }
        if (s.state === 'error') { showToast(`Falha ao verificar: ${s.message}`); manualRef.current = false }
      }
      if (s.state === 'available') manualRef.current = false
    })

    // Surface any status already computed before this component mounted.
    electronAPI.getUpdateStatus?.().then((s: UpdateStatus | null) => { if (s) setStatus(s) })

    const onManual = () => { manualRef.current = true; electronAPI.checkForUpdates?.() }
    window.addEventListener(CHECK_UPDATES_EVENT, onManual)

    return () => {
      unsubscribe?.()
      window.removeEventListener(CHECK_UPDATES_EVENT, onManual)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const handleDownload = () => {
    if (status?.state !== 'available') return
    api()?.downloadUpdate?.(status.downloadUrl || status.url)
  }

  const showCard = status?.state === 'available' && !dismissed

  return (
    <>
      {/* Persistent "update available" card */}
      {showCard && status.state === 'available' && (
        <div className="fixed bottom-4 right-4 z-[80] w-80 bg-zinc-900 border border-violet-500/40 rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_.2s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-3 bg-violet-600/10 border-b border-zinc-800">
            <Sparkles size={15} className="text-violet-400" />
            <span className="text-sm font-semibold text-zinc-100">Atualização disponível</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-600 text-white">v{status.version}</span>
            <div className="flex-1" />
            <button onClick={() => setDismissed(true)} className="text-zinc-500 hover:text-zinc-300"><X size={14} /></button>
          </div>
          {status.notes && (
            <div className="px-4 py-2 max-h-28 overflow-y-auto text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed border-b border-zinc-800/60">
              {status.notes.slice(0, 400)}{status.notes.length > 400 ? '…' : ''}
            </div>
          )}
          <div className="flex gap-2 p-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-xl transition-colors"
            >
              <Download size={13} /> Baixar atualização
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Depois
            </button>
          </div>
        </div>
      )}

      {/* Transient toast for manual checks */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[79] flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 shadow-xl text-xs text-zinc-200 animate-[fadeIn_.2s_ease-out]">
          {status?.state === 'checking' && <RefreshCw size={13} className="text-violet-400 animate-spin" />}
          {status?.state === 'not-available' && <CheckCircle2 size={13} className="text-emerald-400" />}
          {status?.state === 'error' && <AlertCircle size={13} className="text-rose-400" />}
          {toast}
        </div>
      )}
    </>
  )
}
