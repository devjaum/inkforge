import { useState } from 'react'
import { Layers, BookMarked, HelpCircle } from 'lucide-react'
import { ChapterSidebar } from './ChapterSidebar'
import { LorePanel } from './LorePanel'
import { GuidePanel } from './GuidePanel'

type Tab = 'chapters' | 'lore' | 'guide'

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('chapters')

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'chapters', icon: <Layers size={12} />,     label: 'Capítulos' },
    { id: 'lore',     icon: <BookMarked size={12} />, label: 'Lore' },
    { id: 'guide',    icon: <HelpCircle size={12} />, label: 'Guia' },
  ]

  return (
    <div className="flex flex-col h-full w-56 shrink-0 bg-zinc-950 border-r border-zinc-800">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-violet-400 border-b-2 border-violet-500 bg-zinc-900/50'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'chapters' && <ChapterSidebar embedded />}
        {activeTab === 'lore'     && <LorePanel embedded />}
        {activeTab === 'guide'    && <GuidePanel />}
      </div>
    </div>
  )
}
