import { useEffect, useRef, useState } from 'react'
import { Cloud, CloudUpload, AlertCircle } from 'lucide-react'

type SyncState = { state: 'syncing' } | { state: 'done'; count: number } | { state: 'error'; message: string }

// Toast do backup automático no Google Drive. Ouve o evento disparado pela
// camada de persistência (usePersistence) e mostra um aviso discreto.
export function DriveSyncToast() {
  const [sync, setSync] = useState<SyncState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as SyncState
      setSync(detail)
      if (timer.current) clearTimeout(timer.current)
      if (detail.state !== 'syncing') {
        timer.current = setTimeout(() => setSync(null), 3500)
      }
    }
    window.addEventListener('inkforge:drive-sync', handler)
    return () => {
      window.removeEventListener('inkforge:drive-sync', handler)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  if (!sync) return null

  return (
    <div className={`fixed bottom-12 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all duration-300 pointer-events-none
      ${sync.state === 'error'
        ? 'bg-zinc-900 border-rose-700/50 text-rose-400'
        : sync.state === 'done'
          ? 'bg-zinc-900 border-emerald-700/50 text-emerald-400'
          : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}
    >
      {sync.state === 'syncing' && <><CloudUpload size={12} className="animate-pulse" /> Salvando no Drive…</>}
      {sync.state === 'done' && <><Cloud size={12} /> Salvo no Drive</>}
      {sync.state === 'error' && <><AlertCircle size={12} /> Falha no backup</>}
    </div>
  )
}
