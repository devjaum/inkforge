import { useEffect, useRef, useState } from 'react'
import { Timer, Zap, BookOpen, Inbox, Focus, Maximize2, BellOff, Bell, Target, Search, FolderDown, BookDown, RefreshCw } from 'lucide-react'
import { Progress } from './ui/progress'
import { useAppStore } from '@/store/useAppStore'
import { ExportImportModal } from './ExportImport'
import { ExportBook } from './ExportBook'
import { CHECK_UPDATES_EVENT } from './UpdateNotifier'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

interface TopBarProps {
  onOpenSearch: () => void
}

export function TopBar({ onOpenSearch }: TopBarProps) {
  const {
    isFocusMode, isZenMode, isSprintActive, sprintSeconds,
    level, xpProgress, activeWordCount, todayWordCount, dailyGoalWords, showLevelUp, silentMode,
    startSprint, stopSprint, tickSprint, toggleFocusMode, toggleZenMode,
    setSilentMode, setDailyGoal, hideLevelUp,
  } = useAppStore()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showGoalInput, setShowGoalInput]   = useState(false)
  const [goalInput, setGoalInput]           = useState(String(dailyGoalWords))
  const [showExportImport, setShowExportImport] = useState(false)
  const [showExportBook,   setShowExportBook]   = useState(false)

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
      const t = setTimeout(hideLevelUp, 3000)
      return () => clearTimeout(t)
    }
  }, [showLevelUp, hideLevelUp])

  const goalPercent = Math.min((todayWordCount / dailyGoalWords) * 100, 100)
  const goalReached = todayWordCount >= dailyGoalWords

  return (
    <>
    <header
      className="drag-region h-12 flex items-center border-b border-zinc-800 bg-zinc-950 shrink-0"
      style={{ paddingLeft: '1rem', paddingRight: '146px' }}
    >
      {/* Logo */}
      <div className="no-drag flex items-center gap-2 mr-3">
        <BookOpen size={16} className="text-violet-400" />
        <span className="text-sm font-bold text-zinc-100 tracking-tight">InkForge</span>
      </div>

      {/* Sprint */}
      <button
        onClick={() => isSprintActive ? stopSprint() : startSprint()}
        className={`no-drag flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all mr-1.5 ${
          isSprintActive ? 'bg-red-600 text-white sprint-active' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        }`}
      >
        <Timer size={13} />
        {isSprintActive ? formatTime(sprintSeconds) : 'Sprint 15min'}
      </button>

      {/* Focus */}
      <button
        onClick={toggleFocusMode}
        className={`no-drag flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-1.5 ${
          isFocusMode ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        }`}
        title="Modo Foco — oculta sidebar (F)"
      >
        <Focus size={13} />
        Foco
      </button>

      {/* Zen */}
      <button
        onClick={toggleZenMode}
        className={`no-drag flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
          isZenMode ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700'
        }`}
        title="Zen Mode — tela limpa (Ctrl+Shift+Z)"
      >
        <Maximize2 size={13} />
      </button>

      <div className="flex-1" />

      {/* Search */}
      <button
        onClick={onOpenSearch}
        className="no-drag flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all mr-1"
        title="Busca global (Ctrl+P)"
      >
        <Search size={13} />
        <span className="hidden sm:inline text-[10px]">Ctrl+P</span>
      </button>

      {/* Daily goal */}
      <div className="no-drag flex items-center gap-1.5 mr-3 relative">
        <button
          onClick={() => setShowGoalInput(v => !v)}
          className={`flex items-center gap-1 text-xs transition-colors ${
            goalReached ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Meta diária"
        >
          <Target size={12} />
          <span className="tabular-nums">{todayWordCount}/{dailyGoalWords}</span>
        </button>
        <div className="w-16">
          <Progress value={goalPercent} className={`h-1 ${goalReached ? '[&>div]:bg-emerald-500' : ''}`} />
        </div>
        {showGoalInput && (
          <div className="absolute top-full right-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl w-44">
            <p className="text-[10px] text-zinc-500 mb-1.5">Meta diária (palavras)</p>
            <div className="flex gap-1">
              <input
                autoFocus
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                className="flex-1 bg-zinc-700 text-zinc-100 text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500"
                onKeyDown={e => {
                  if (e.key === 'Enter') { setDailyGoal(Math.max(1, parseInt(goalInput) || 500)); setShowGoalInput(false) }
                  if (e.key === 'Escape') setShowGoalInput(false)
                }}
              />
              <button
                onClick={() => { setDailyGoal(Math.max(1, parseInt(goalInput) || 500)); setShowGoalInput(false) }}
                className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg transition-colors"
              >OK</button>
            </div>
          </div>
        )}
      </div>

      {/* Word count */}
      <div className="no-drag text-zinc-500 text-xs mr-3 tabular-nums">
        {activeWordCount.toLocaleString()} palavras
      </div>

      {/* XP bar */}
      <div className="no-drag flex items-center gap-1.5 mr-2">
        <Zap size={13} className={`${showLevelUp ? 'text-yellow-300 level-up' : 'text-yellow-500'}`} />
        <span className={`text-xs font-semibold tabular-nums ${showLevelUp ? 'text-yellow-300 level-up' : 'text-zinc-300'}`}>
          Nv {level}
        </span>
        <div className="w-20">
          <Progress value={xpProgress} className="h-1.5" />
        </div>
        <span className="text-[10px] text-zinc-600 w-7 tabular-nums">{Math.round(xpProgress)}%</span>
      </div>

      {/* Export book (PDF / EPUB / MOBI) */}
      <button
        onClick={() => setShowExportBook(true)}
        className="no-drag p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
        title="Exportar livro (PDF / EPUB / MOBI)"
      >
        <BookDown size={13} />
      </button>

      {/* Export / Import backup */}
      <button
        onClick={() => setShowExportImport(true)}
        className="no-drag p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
        title="Exportar / Importar backup JSON"
      >
        <FolderDown size={13} />
      </button>

      {/* Check for updates */}
      <button
        onClick={() => window.dispatchEvent(new Event(CHECK_UPDATES_EVENT))}
        className="no-drag p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
        title="Verificar atualizações"
      >
        <RefreshCw size={13} />
      </button>

      {/* Silent mode */}
      <button
        onClick={() => setSilentMode(!silentMode)}
        className={`no-drag p-1.5 rounded-lg transition-colors ${silentMode ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        title={silentMode ? 'Notificações silenciadas' : 'Silenciar notificações'}
      >
        {silentMode ? <BellOff size={13} /> : <Bell size={13} />}
      </button>

      {/* Inbox */}
      <div className="no-drag p-1.5 text-zinc-700" title="Ctrl+Shift+Space — Captura rápida">
        <Inbox size={13} />
      </div>
    </header>

    {showExportImport && <ExportImportModal onClose={() => setShowExportImport(false)} />}
    {showExportBook   && <ExportBook onClose={() => setShowExportBook(false)} />}
  </>
  )
}
