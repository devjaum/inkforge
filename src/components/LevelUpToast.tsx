import { useEffect, useRef, useState } from 'react'
import { Star, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function LevelUpToast() {
  const { showLevelUp, level, hideLevelUp } = useAppStore()
  const [visible, setVisible] = useState(false)
  const [fading, setFading]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = () => {
    if (fadeRef.current)  clearTimeout(fadeRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)
    setFading(true)
    fadeRef.current = setTimeout(() => {
      setVisible(false)
      setFading(false)
      hideLevelUp()
    }, 400)
  }

  useEffect(() => {
    if (!showLevelUp) return
    if (timerRef.current) clearTimeout(timerRef.current)
    if (fadeRef.current)  clearTimeout(fadeRef.current)
    setFading(false)
    setVisible(true)
    timerRef.current = setTimeout(dismiss, 3500)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (fadeRef.current)  clearTimeout(fadeRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLevelUp])

  if (!visible) return null

  return (
    <div
      onClick={dismiss}
      className={`fixed bottom-14 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-violet-600 to-amber-500 text-white px-5 py-3 rounded-2xl shadow-2xl cursor-pointer select-none transition-all duration-400 ${fading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
    >
      <Star size={20} className="text-yellow-200 shrink-0" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Nível Aumentado!</div>
        <div className="text-lg font-bold">Nível {level}</div>
      </div>
      <button onClick={dismiss} className="ml-1 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}
