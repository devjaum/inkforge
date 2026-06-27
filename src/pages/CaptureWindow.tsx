import { useState, useRef, useEffect } from 'react'
import { Inbox, X } from 'lucide-react'

declare global {
  interface Window {
    electronAPI?: {
      readJson: (filename: string) => Promise<unknown>
      writeJson: (filename: string, data: unknown) => Promise<boolean>
      closeCapture: () => Promise<void>
      setTitleBarTheme?: (theme: 'light' | 'dark') => Promise<void>
    }
  }
}

export function CaptureWindow() {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    if (!text.trim()) return

    const item = {
      id: Date.now().toString(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }

    try {
      const existing = (await window.electronAPI?.readJson('inbox.json')) as { items: typeof item[] } | null
      const items = existing?.items ?? []
      items.push(item)
      await window.electronAPI?.writeJson('inbox.json', { items })
    } catch {
      // fallback: just close
    }

    setSaved(true)
    setTimeout(() => {
      window.electronAPI?.closeCapture()
    }, 600)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') window.electronAPI?.closeCapture()
  }

  return (
    <div className="h-screen w-screen flex items-center bg-transparent">
      <div className="w-full mx-2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Inbox size={16} className={saved ? 'text-emerald-400' : 'text-violet-400'} />
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={saved ? 'Salvo! Fechando...' : 'Capturar ideia... (Enter para salvar)'}
            disabled={saved}
            className="flex-1 bg-transparent text-zinc-100 text-sm outline-none placeholder:text-zinc-600"
          />
          <button
            onClick={() => window.electronAPI?.closeCapture()}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
