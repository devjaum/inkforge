import { useEffect, useRef, useState } from 'react'
import { Download, X, RefreshCw, CheckCircle2, AlertCircle, Sparkles, RotateCw } from 'lucide-react'

export type UpdateStatus =
  | { state: 'checking' }
  | { state: 'downloading'; version: string; notes: string }
  | { state: 'ready'; version: string; notes: string }
  | { state: 'not-available'; version: string }
  | { state: 'manual'; version: string; notes: string; url: string; downloadUrl?: string }
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
      // Estados acionáveis abrem o card; reabre caso tenha sido fechado antes.
      if (s.state === 'downloading' || s.state === 'ready' || s.state === 'manual') {
        setDismissed(false)
        manualRef.current = false
      } else if (manualRef.current) {
        // Checagem manual → feedback transitório para estados sem ação.
        if (s.state === 'checking') showToast('Verificando atualizações…', 8000)
        if (s.state === 'not-available') { showToast(`Você está na versão mais recente (v${s.version}).`); manualRef.current = false }
        if (s.state === 'error') { showToast(`Falha ao verificar: ${s.message}`); manualRef.current = false }
      }
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

  const s = status
  const showCard = !dismissed && (s?.state === 'downloading' || s?.state === 'ready' || s?.state === 'manual')
  const notes = (s?.state === 'downloading' || s?.state === 'ready' || s?.state === 'manual') ? s.notes : ''
  const version = (s?.state === 'downloading' || s?.state === 'ready' || s?.state === 'manual') ? s.version : ''

  return (
    <>
      {showCard && s && (
        <div className="fixed bottom-4 right-4 z-[80] w-80 bg-zinc-900 border border-violet-500/40 rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_.2s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-3 bg-violet-600/10 border-b border-zinc-800">
            {s.state === 'downloading'
              ? <RefreshCw size={15} className="text-violet-400 animate-spin" />
              : <Sparkles size={15} className="text-violet-400" />}
            <span className="text-sm font-semibold text-zinc-100">
              {s.state === 'downloading' ? 'Baixando atualização' : s.state === 'ready' ? 'Atualização pronta' : 'Atualização disponível'}
            </span>
            {version && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-600 text-white">v{version}</span>}
            <div className="flex-1" />
            {s.state !== 'downloading' && (
              <button onClick={() => setDismissed(true)} className="text-zinc-500 hover:text-zinc-300"><X size={14} /></button>
            )}
          </div>

          {notes && (
            <div className="px-4 py-2 max-h-28 overflow-y-auto text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed border-b border-zinc-800/60">
              {notes.slice(0, 400)}{notes.length > 400 ? '…' : ''}
            </div>
          )}

          {/* Downloading: progresso indeterminado, sem ação */}
          {s.state === 'downloading' && (
            <div className="p-3">
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-violet-500 rounded-full animate-[indeterminate_1.2s_ease-in-out_infinite]" />
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">Baixando em segundo plano. Você pode continuar escrevendo.</p>
            </div>
          )}

          {/* Ready: reiniciar e instalar dentro do app */}
          {s.state === 'ready' && (
            <div className="flex gap-2 p-3">
              <button
                onClick={() => api()?.installUpdate?.()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-xl transition-colors"
              >
                <RotateCw size={13} /> Reiniciar e instalar
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Depois
              </button>
            </div>
          )}

          {/* Manual (dev/fallback): abre o download no navegador */}
          {s.state === 'manual' && (
            <div className="flex gap-2 p-3">
              <button
                onClick={() => api()?.downloadUpdate?.(s.downloadUrl || s.url)}
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
          )}
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
