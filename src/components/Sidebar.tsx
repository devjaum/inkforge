import { useState } from 'react'
import { Layers, BookMarked } from 'lucide-react'
import { ChapterSidebar } from './ChapterSidebar'
import { LorePanel } from './LorePanel'

type Tab = 'chapters' | 'lore'

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('chapters')

  return (
    <div className="flex flex-col h-full w-56 shrink-0 bg-zinc-950 border-r border-zinc-800">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 shrink-0">
        <button
          onClick={() => setActiveTab('chapters')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
            activeTab === 'chapters'
              ? 'text-violet-400 border-b-2 border-violet-500 bg-zinc-900/50'
              : 'text-zinc-600 hover:text-zinc-400'
          }`}
        >
          <Layers size={12} />
          Capítulos
        </button>
        <button
          onClick={() => setActiveTab('lore')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
            activeTab === 'lore'
              ? 'text-violet-400 border-b-2 border-violet-500 bg-zinc-900/50'
              : 'text-zinc-600 hover:text-zinc-400'
          }`}
        >
          <BookMarked size={12} />
          Lore
        </button>
      </div>

      {/* Panel content — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'chapters' ? (
          // ChapterSidebar already has its own aside wrapper; render inline
          <ChapterSidebar embedded />
        ) : (
          <LorePanel embedded />
        )}
      </div>
    </div>
  )
}
