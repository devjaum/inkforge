import { create } from 'zustand'

export interface Chapter {
  id: string
  title: string
  status: 'drafted' | 'planned'
  wordCount: number
}

export interface LoreEntity {
  id: string
  name: string
  summary: string
  type: 'location' | 'character' | 'item' | 'faction'
}

export interface InboxItem {
  id: string
  text: string
  createdAt: string
}

const XP_PER_WORD = 2
const XP_PER_LEVEL = 500

function computeLevel(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

function computeProgress(xp: number) {
  const levelXp = xp % XP_PER_LEVEL
  return (levelXp / XP_PER_LEVEL) * 100
}

interface AppState {
  // Focus / Sprint
  isFocusMode: boolean
  isSprintActive: boolean
  sprintSeconds: number
  sprintDuration: number

  // Gamification
  xp: number
  level: number
  xpProgress: number
  totalWordCount: number
  showLevelUp: boolean

  // Per-chapter content: chapterId -> text
  chapterContents: Record<string, string>

  // Chapters
  chapters: Chapter[]
  activeChapterId: string | null

  // Lore
  loreEntities: LoreEntity[]

  // Inbox
  inboxItems: InboxItem[]

  // Derived: active chapter word count
  activeWordCount: number

  // Actions
  toggleFocusMode: () => void
  startSprint: () => void
  stopSprint: () => void
  tickSprint: () => void

  addXp: (amount: number) => void
  setActiveChapterContent: (content: string) => void

  setActiveChapter: (id: string) => void
  addChapter: (title: string, status: 'drafted' | 'planned') => void

  addLoreEntity: (entity: Omit<LoreEntity, 'id'>) => void
  updateLoreEntity: (id: string, updates: Partial<Omit<LoreEntity, 'id'>>) => void
  deleteLoreEntity: (id: string) => void

  addInboxItem: (text: string) => void
  hideLevelUp: () => void
}

const MOCK_CHAPTERS: Chapter[] = [
  { id: '1', title: 'Prólogo: O Chamado', status: 'drafted', wordCount: 1240 },
  { id: '2', title: 'A Taverna do Corvo', status: 'drafted', wordCount: 2100 },
  { id: '3', title: 'Encontro com Merlin', status: 'drafted', wordCount: 980 },
  { id: '4', title: 'A Floresta Proibida', status: 'planned', wordCount: 0 },
  { id: '5', title: 'O Castelo de Sombras', status: 'planned', wordCount: 0 },
  { id: '6', title: 'Batalha Final', status: 'planned', wordCount: 0 },
]

const INITIAL_CONTENTS: Record<string, string> = {
  '1': 'Era uma manhã fria quando o mensageiro chegou à aldeia...',
  '2': 'Era uma noite tempestuosa quando @Rei Arthur convocou seus cavaleiros para a @Taverna...\n\nA chuva batia nas janelas enquanto @Merlin preparava seus mapas antigos. O velho mago segurava a @Excalibur com cuidado enquanto traçava os planos da campanha.',
  '3': 'O encontro com @Merlin mudou tudo. Ele sabia de coisas que nenhum mortal deveria saber...',
}

const MOCK_LORE: LoreEntity[] = [
  {
    id: 'taverna',
    name: 'Taverna',
    summary: 'A Taverna do Corvo Preto, ponto de encontro de aventureiros em Camelot. Fundada em 432 d.C., serve o famoso hidromel de ervas do boticário local.',
    type: 'location',
  },
  {
    id: 'arthur',
    name: 'Rei Arthur',
    summary: 'O Rei Artur Pendragon, soberano de Camelot. Portador da lendária Excalibur, conhecido por sua justiça e coragem em batalha.',
    type: 'character',
  },
  {
    id: 'merlin',
    name: 'Merlin',
    summary: 'O arquimago de Camelot, conselheiro do Rei Arthur. Diz-se que vive o tempo ao contrário, ficando mais jovem a cada ano.',
    type: 'character',
  },
  {
    id: 'excalibur',
    name: 'Excalibur',
    summary: 'A espada sagrada retirada da pedra pelo Rei Arthur. Tem a lâmina que nunca enferruja e o cabo de ouro puro com runas élficas.',
    type: 'item',
  },
]

function countWords(text: string) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export const useAppStore = create<AppState>((set, get) => ({
  isFocusMode: false,
  isSprintActive: false,
  sprintSeconds: 15 * 60,
  sprintDuration: 15 * 60,

  xp: 120,
  level: 1,
  xpProgress: 24,
  totalWordCount: 0,
  showLevelUp: false,

  chapterContents: INITIAL_CONTENTS,
  chapters: MOCK_CHAPTERS,
  activeChapterId: '2',
  activeWordCount: countWords(INITIAL_CONTENTS['2']),

  loreEntities: MOCK_LORE,
  inboxItems: [],

  toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
  startSprint: () => set({ isSprintActive: true, sprintSeconds: 15 * 60 }),
  stopSprint: () => set({ isSprintActive: false, sprintSeconds: 15 * 60, isFocusMode: false }),

  tickSprint: () => {
    const { sprintSeconds, stopSprint } = get()
    if (sprintSeconds <= 1) {
      stopSprint()
    } else {
      set((s) => ({ sprintSeconds: s.sprintSeconds - 1 }))
    }
  },

  addXp: (amount: number) => {
    const { xp } = get()
    const newXp = xp + amount
    const leveledUp = computeLevel(newXp) > computeLevel(xp)
    set({
      xp: newXp,
      level: computeLevel(newXp),
      xpProgress: computeProgress(newXp),
      showLevelUp: leveledUp,
    })
  },

  setActiveChapterContent: (content: string) => {
    const { activeChapterId, chapterContents, chapters, activeWordCount, addXp } = get()
    if (!activeChapterId) return

    const newWordCount = countWords(content)
    const diff = newWordCount - activeWordCount
    if (diff > 0) addXp(diff * XP_PER_WORD)

    const updatedContents = { ...chapterContents, [activeChapterId]: content }
    const updatedChapters = chapters.map(c =>
      c.id === activeChapterId ? { ...c, wordCount: newWordCount } : c
    )

    set({
      chapterContents: updatedContents,
      chapters: updatedChapters,
      activeWordCount: newWordCount,
      totalWordCount: Object.values(updatedContents).reduce((sum, t) => sum + countWords(t), 0),
    })
  },

  setActiveChapter: (id: string) => {
    const { chapterContents } = get()
    set({
      activeChapterId: id,
      activeWordCount: countWords(chapterContents[id] ?? ''),
    })
  },

  addChapter: (title: string, status: 'drafted' | 'planned') => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title,
      status,
      wordCount: 0,
    }
    set((s) => ({
      chapters: [...s.chapters, newChapter],
      chapterContents: { ...s.chapterContents, [newChapter.id]: '' },
      activeChapterId: status === 'drafted' ? newChapter.id : s.activeChapterId,
      activeWordCount: status === 'drafted' ? 0 : s.activeWordCount,
    }))
  },

  addLoreEntity: (entity) => {
    const newEntity: LoreEntity = { ...entity, id: Date.now().toString() }
    set((s) => ({ loreEntities: [...s.loreEntities, newEntity] }))
  },

  updateLoreEntity: (id, updates) => {
    set((s) => ({
      loreEntities: s.loreEntities.map(e => e.id === id ? { ...e, ...updates } : e),
    }))
  },

  deleteLoreEntity: (id) => {
    set((s) => ({ loreEntities: s.loreEntities.filter(e => e.id !== id) }))
  },

  addInboxItem: (text: string) => {
    const item: InboxItem = {
      id: Date.now().toString(),
      text,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ inboxItems: [...s.inboxItems, item] }))
  },

  hideLevelUp: () => set({ showLevelUp: false }),
}))
