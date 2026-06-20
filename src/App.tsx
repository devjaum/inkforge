import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { LevelUpToast } from './components/LevelUpToast'
import { OmniSearch } from './components/OmniSearch'
import { GlobalSearch } from './components/GlobalSearch'
import { SaveIndicator } from './components/SaveIndicator'
import { UpdateNotifier } from './components/UpdateNotifier'
import { CaptureWindow } from './pages/CaptureWindow'
import { usePersistence } from './hooks/usePersistence'
import './index.css'

function isCapturePage() {
  return window.location.hash === '#/capture'
}

export default function App() {
  const { isFocusMode, isZenMode, toggleFocusMode, toggleZenMode } = useAppStore()
  const [omniOpen, setOmniOpen]         = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)

  usePersistence()

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+P / Ctrl+K — omnibar
      if (ctrl && (e.key === 'p' || e.key === 'k')) {
        e.preventDefault()
        setOmniOpen(v => !v)
      }
      // Ctrl+Shift+F — global search
      if (ctrl && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setGlobalSearchOpen(v => !v)
      }
      // Ctrl+Shift+Z — zen mode
      if (ctrl && e.shiftKey && e.key === 'Z') {
        e.preventDefault()
        toggleZenMode()
      }
      // F — focus mode (only when not typing)
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        toggleFocusMode()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleFocusMode, toggleZenMode])

  if (isCapturePage()) return <CaptureWindow />

  // Zen mode: full-screen editor only
  if (isZenMode) {
    return (
      <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
        <Editor />
        <LevelUpToast />
        <SaveIndicator />
        <UpdateNotifier />
        <OmniSearch open={omniOpen} onClose={() => setOmniOpen(false)} />
      <GlobalSearch open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <TopBar onOpenSearch={() => setOmniOpen(true)} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className={`sidebar-transition overflow-hidden shrink-0 ${isFocusMode ? 'w-0 opacity-0 pointer-events-none' : 'w-56 opacity-100'}`}>
          <Sidebar />
        </div>

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Editor />
        </main>
      </div>

      <LevelUpToast />
      <SaveIndicator />
      <UpdateNotifier />
      <OmniSearch open={omniOpen} onClose={() => setOmniOpen(false)} />
      <GlobalSearch open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
    </div>
  )
}
