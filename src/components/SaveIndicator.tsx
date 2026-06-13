import { Check, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function SaveIndicator() {
  const saveStatus = useAppStore(s => s.saveStatus)

  if (saveStatus === 'idle') return null

  return (
    <div className={`fixed bottom-3 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all duration-300 pointer-events-none
      ${saveStatus === 'saving'
        ? 'bg-zinc-900 border-zinc-700 text-zinc-400'
        : 'bg-zinc-900 border-emerald-700/50 text-emerald-400'
      }`}
    >
      {saveStatus === 'saving' ? (
        <><Loader2 size={11} className="animate-spin" />Salvando...</>
      ) : (
        <><Check size={11} />Salvo</>
      )}
    </div>
  )
}
