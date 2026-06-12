import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function LevelUpToast() {
  const { showLevelUp, level, hideLevelUp } = useAppStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (showLevelUp) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        hideLevelUp()
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [showLevelUp, hideLevelUp])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-violet-600 to-amber-500 text-white px-5 py-3 rounded-2xl shadow-2xl animate-bounce">
      <Star size={20} className="text-yellow-200" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Nível Aumentado!</div>
        <div className="text-lg font-bold">Nível {level}</div>
      </div>
    </div>
  )
}
