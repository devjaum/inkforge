import { useEffect, useRef } from 'react'
import { Timer, Zap, BookOpen, Inbox, Focus } from 'lucide-react'
import { Progress } from './ui/progress'
import { useAppStore } from '@/store/useAppStore'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function TopBar() {
  const {
    isFocusMode, isSprintActive, sprintSeconds,
    level, xpProgress, activeWordCount, showLevelUp,
    startSprint, stopSprint, tickSprint, toggleFocusMode, hideLevelUp,
  } = useAppStore()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isSprintActive) {
      intervalRef.current = setInterval(tickSprint, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isSprintActive, tickSprint])

  useEffect(() => {
    if (showLevelUp) {
      const t = setTimeout(hideLevelUp, 2000)
      return () => clearTimeout(t)
    }
  }, [showLevelUp, hideLevelUp])

  return (
    <header
      className="drag-region h-12 flex items-center border-b border-zinc-800 bg-zinc-950 shrink-0"
      // pl-4 normal left padding; pr leaves space for Windows title-bar controls (~138px wide)
      style={{ paddingLeft: '1rem', paddingRight: '146px' }}
    >
      {/* App icon — left anchor */}
      <div className="no-drag flex items-center gap-2 mr-4">
        <BookOpen size={18} className="text-violet-400" />
        <span className="text-sm font-bold text-zinc-100 tracking-tight">InkForge</span>
      </div>

      {/* Sprint button — prominent, near the left */}
      <button
        onClick={() => isSprintActive ? stopSprint() : startSprint()}
        className={`no-drag flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all mr-2 ${
          isSprintActive
            ? 'bg-red-600 text-white sprint-active'
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        }`}
      >
        <Timer size={13} />
        {isSprintActive ? formatTime(sprintSeconds) : 'Sprint 15min'}
      </button>

      {/* Focus toggle */}
      <button
        onClick={toggleFocusMode}
        className={`no-drag flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          isFocusMode
            ? 'bg-violet-600 text-white'
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        }`}
      >
        <Focus size={13} />
        Foco
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Word count */}
      <div className="no-drag flex items-center gap-1.5 text-zinc-500 text-xs mr-4">
        <span className="tabular-nums">{activeWordCount.toLocaleString()} palavras</span>
      </div>

      {/* XP / Level */}
      <div className="no-drag flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Zap size={14} className={`text-yellow-400 ${showLevelUp ? 'level-up' : ''}`} />
          <span className={`text-xs font-semibold text-zinc-100 tabular-nums ${showLevelUp ? 'level-up text-yellow-400' : ''}`}>
            Nv {level}
          </span>
        </div>
        <div className="w-24">
          <Progress value={xpProgress} className="h-1.5" />
        </div>
        <span className="text-xs text-zinc-500 tabular-nums w-8 text-right">{Math.round(xpProgress)}%</span>
      </div>

      {/* Quick inbox hint */}
      <div
        className="no-drag flex items-center gap-1 text-zinc-600 text-xs ml-3"
        title="Ctrl+Shift+Space — Captura rápida"
      >
        <Inbox size={13} />
      </div>
    </header>
  )
}
