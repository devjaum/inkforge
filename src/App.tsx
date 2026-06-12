import { useAppStore } from './store/useAppStore'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { LevelUpToast } from './components/LevelUpToast'
import { CaptureWindow } from './pages/CaptureWindow'
import './index.css'

function isCapturePage() {
  return window.location.hash === '#/capture'
}

export default function App() {
  const { isFocusMode } = useAppStore()

  if (isCapturePage()) {
    return <CaptureWindow />
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <TopBar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar (Capítulos + Lore) — hidden in focus mode */}
        <div
          className={`sidebar-transition overflow-hidden shrink-0 ${
            isFocusMode ? 'w-0 opacity-0 pointer-events-none' : 'w-56 opacity-100'
          }`}
        >
          <Sidebar />
        </div>

        {/* Main editor */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Editor />
        </main>
      </div>

      <LevelUpToast />
    </div>
  )
}
