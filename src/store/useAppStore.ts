import { create } from 'zustand'

export type ChapterStatus = 'drafted' | 'planned' | 'completed'

export interface Chapter {
  id: string
  title: string
  status: ChapterStatus
  wordCount: number
  order: number
}

export interface LoreType {
  value: string   // slug, e.g. "character"
  label: string   // display name, e.g. "Personagem"
  color: string   // tailwind classes
}

export interface LoreEntity {
  id: string
  name: string
  summary: string
  type: string    // matches LoreType.value
  tags: string[]
}

export interface InboxItem {
  id: string
  text: string
  createdAt: string
}

export interface ChapterSnapshot {
  id: string
  timestamp: string   // ISO
  content: string
  wordCount: number
  label?: string      // optional manual label, e.g. "Manual"
}

export type TypingAnimation = 'none' | 'typewriter' | 'glow' | 'caret'

// Snapshot throttling: skip if last snapshot is recent and change is small.
const SNAPSHOT_MIN_INTERVAL = 2 * 60 * 1000 // 2 minutes
const SNAPSHOT_MIN_WORD_DELTA = 25
const SNAPSHOT_MAX_PER_CHAPTER = 60

const XP_PER_WORD = 2
const XP_PER_LEVEL = 500

function computeLevel(xp: number) { return Math.floor(xp / XP_PER_LEVEL) + 1 }
function computeProgress(xp: number) { return (xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100 }
function countWords(text: string) { return text.trim() === '' ? 0 : text.trim().split(/\s+/).length }

interface AppState {
  // Modes
  isFocusMode: boolean
  isZenMode: boolean
  silentMode: boolean

  renameChapter: (id: string, newTitle: string) => void;

  // Sprint
  isSprintActive: boolean
  sprintSeconds: number

  // Gamification
  xp: number
  level: number
  xpProgress: number
  showLevelUp: boolean

  // Word tracking
  activeWordCount: number
  totalWordCount: number
  todayWordCount: number
  dailyGoalWords: number

  // Editor
  chapterContents: Record<string, string>

  // History (snapshots per chapter, newest last)
  chapterHistory: Record<string, ChapterSnapshot[]>

  // Typing animation
  typingAnimation: TypingAnimation
  setTypingAnimation: (v: TypingAnimation) => void

  // Chapters
  chapters: Chapter[]
  activeChapterId: string | null

  // Lore
  loreEntities: LoreEntity[]
  loreTypes: LoreType[]

  // Inbox
  inboxItems: InboxItem[]

  // Editor appearance
  editorMaxWidth: number       // px, 0 = unlimited
  editorFontSize: number       // px
  editorLineHeight: number     // multiplier
  editorTextAlign: 'left' | 'justify'
  setEditorAppearance: (s: Partial<Pick<AppState, 'editorMaxWidth' | 'editorFontSize' | 'editorLineHeight' | 'editorTextAlign'>>) => void

  // Typewriter mode
  typewriterMode: boolean
  typewriterFocusRatio: number   // 0.25 | 0.5 | 0.75
  setTypewriterMode: (v: boolean) => void
  setTypewriterFocusRatio: (v: number) => void

  // Save status
  saveStatus: 'idle' | 'saving' | 'saved'
  setSaveStatus: (s: 'idle' | 'saving' | 'saved') => void

  // Hydration
  hydrate: (data: {
    chapters?: Chapter[]
    chapterContents?: Record<string, string>
    chapterHistory?: Record<string, ChapterSnapshot[]>
    loreEntities?: LoreEntity[]
    loreTypes?: LoreType[]
    dailyGoalWords?: number
    todayWordCount?: number
    activeChapterId?: string | null
    editorMaxWidth?: number
    editorFontSize?: number
    editorLineHeight?: number
    editorTextAlign?: 'left' | 'justify'
    typingAnimation?: TypingAnimation
    typewriterMode?: boolean
    typewriterFocusRatio?: number
  }) => void

  // Actions — modes
  toggleFocusMode: () => void
  toggleZenMode: () => void
  setSilentMode: (v: boolean) => void
  setDailyGoal: (n: number) => void

  // Actions — sprint
  startSprint: () => void
  stopSprint: () => void
  tickSprint: () => void

  // Actions — gamification
  addXp: (amount: number) => void
  hideLevelUp: () => void

  // Actions — editor
  setActiveChapterContent: (content: string) => void

  // Actions — chapters
  setActiveChapter: (id: string) => void
  addChapter: (title: string, status: ChapterStatus) => void
  markChapterCompleted: (id: string) => void
  revertChapter: (id: string) => void
  startChapter: (id: string) => void
  reorderChapters: (fromIndex: number, toIndex: number) => void
  deleteChapter: (id: string) => void

  // Actions — lore
  addLoreEntity: (entity: Omit<LoreEntity, 'id'>) => void
  updateLoreEntity: (id: string, updates: Partial<Omit<LoreEntity, 'id'>>) => void
  deleteLoreEntity: (id: string) => void
  renameTagGlobally: (oldTag: string, newTag: string) => void
  deleteTagGlobally: (tag: string) => void
  addLoreType: (label: string) => void
  deleteLoreType: (value: string) => void
  renameLoreType: (value: string, newLabel: string) => void

  // Actions — inbox
  addInboxItem: (text: string) => void

  // Actions — history
  recordSnapshot: (chapterId?: string, label?: string) => void
  restoreSnapshot: (chapterId: string, snapshotId: string) => void
  deleteSnapshot: (chapterId: string, snapshotId: string) => void
}

const MOCK_CHAPTERS: Chapter[] = [
  { id: '1', title: 'Prólogo: O Chamado',  status: 'completed', wordCount: 1240, order: 0 },
  { id: '2', title: 'A Taverna do Corvo',  status: 'drafted',   wordCount: 2100, order: 1 },
  { id: '3', title: 'Encontro com Merlin', status: 'drafted',   wordCount: 980,  order: 2 },
  { id: '4', title: 'A Floresta Proibida', status: 'planned',   wordCount: 0,    order: 3 },
  { id: '5', title: 'O Castelo de Sombras',status: 'planned',   wordCount: 0,    order: 4 },
  { id: '6', title: 'Batalha Final',       status: 'planned',   wordCount: 0,    order: 5 },
]

const INITIAL_CONTENTS: Record<string, string> = {
  '1': 'Era uma manhã fria quando o mensageiro chegou à aldeia...',
  '2': 'Era uma noite tempestuosa quando @Rei Arthur convocou seus cavaleiros para a @Taverna...\n\nA chuva batia nas janelas enquanto @Merlin preparava seus mapas antigos. O velho mago segurava a @Excalibur com cuidado enquanto traçava os planos da campanha.',
  '3': 'O encontro com @Merlin mudou tudo. Ele sabia de coisas que nenhum mortal deveria saber...',
}

const TYPE_COLORS = [
  'text-blue-400 bg-blue-400/10 border-blue-400/30',
  'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'text-amber-400 bg-amber-400/10 border-amber-400/30',
  'text-rose-400 bg-rose-400/10 border-rose-400/30',
  'text-violet-400 bg-violet-400/10 border-violet-400/30',
  'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  'text-orange-400 bg-orange-400/10 border-orange-400/30',
  'text-pink-400 bg-pink-400/10 border-pink-400/30',
]

const DEFAULT_LORE_TYPES: LoreType[] = [
  { value: 'character', label: 'Personagem', color: TYPE_COLORS[0] },
  { value: 'location',  label: 'Local',      color: TYPE_COLORS[1] },
  { value: 'item',      label: 'Item',        color: TYPE_COLORS[2] },
  { value: 'faction',   label: 'Facção',      color: TYPE_COLORS[3] },
]

const MOCK_LORE: LoreEntity[] = [
  { id: 'taverna',  name: 'Taverna',    summary: 'A Taverna do Corvo Preto, ponto de encontro de aventureiros em Camelot. Fundada em 432 d.C.', type: 'location',  tags: ['Camelot', 'NPC'] },
  { id: 'arthur',   name: 'Rei Arthur', summary: 'O Rei Artur Pendragon, soberano de Camelot. Portador da lendária Excalibur.',                  type: 'character', tags: ['Realeza', 'Protagonista'] },
  { id: 'merlin',   name: 'Merlin',     summary: 'O arquimago de Camelot, conselheiro do Rei Arthur. Vive o tempo ao contrário.',                  type: 'character', tags: ['Magia', 'NPC'] },
  { id: 'excalibur',name: 'Excalibur',  summary: 'A espada sagrada retirada da pedra pelo Rei Arthur. Lâmina que nunca enferruja.',               type: 'item',      tags: ['Artefato', 'Lendário'] },
]

export const useAppStore = create<AppState>((set, get) => ({
  isFocusMode: false,
  isZenMode: false,
  silentMode: false,

  renameChapter: (id, newTitle) => set((state) => ({
    chapters: state.chapters.map((chapter) =>
      chapter.id === id ? { ...chapter, title: newTitle } : chapter
    ),
  })),

  isSprintActive: false,
  sprintSeconds: 15 * 60,

  xp: 120,
  level: 1,
  xpProgress: 24,
  showLevelUp: false,

  activeWordCount: countWords(INITIAL_CONTENTS['2']),
  totalWordCount: 0,
  todayWordCount: 0,
  dailyGoalWords: 500,

  chapterContents: INITIAL_CONTENTS,
  chapterHistory: {},
  typingAnimation: 'none',
  setTypingAnimation: (v) => set({ typingAnimation: v }),
  chapters: MOCK_CHAPTERS,
  activeChapterId: '2',

  loreEntities: MOCK_LORE,
  loreTypes: DEFAULT_LORE_TYPES,
  inboxItems: [],

  editorMaxWidth: 800,
  editorFontSize: 16,
  editorLineHeight: 2,
  editorTextAlign: 'left',
  setEditorAppearance: (s) => set(s),

  typewriterMode: false,
  typewriterFocusRatio: 0.5,
  setTypewriterMode: (v) => set({ typewriterMode: v }),
  setTypewriterFocusRatio: (v) => set({ typewriterFocusRatio: v }),

  saveStatus: 'idle',
  setSaveStatus: (s) => set({ saveStatus: s }),

  hydrate: (data) => {
    const { chapterContents } = get()
    const contents = data.chapterContents ?? chapterContents
    const chapters = data.chapters ?? get().chapters
    const activeId  = data.activeChapterId !== undefined
      ? data.activeChapterId
      : chapters[0]?.id ?? null
    set({
      ...(data.chapters        ? { chapters: data.chapters } : {}),
      ...(data.chapterContents ? { chapterContents: data.chapterContents } : {}),
      ...(data.chapterHistory  ? { chapterHistory: data.chapterHistory } : {}),
      ...(data.typingAnimation ? { typingAnimation: data.typingAnimation } : {}),
      ...(data.loreEntities    ? { loreEntities: data.loreEntities } : {}),
      ...(data.loreTypes       ? { loreTypes: data.loreTypes } : {}),
      ...(data.dailyGoalWords  ? { dailyGoalWords: data.dailyGoalWords } : {}),
      ...(data.todayWordCount  ? { todayWordCount: data.todayWordCount } : {}),
      ...(data.editorMaxWidth  !== undefined ? { editorMaxWidth: data.editorMaxWidth } : {}),
      ...(data.editorFontSize  !== undefined ? { editorFontSize: data.editorFontSize } : {}),
      ...(data.editorLineHeight !== undefined ? { editorLineHeight: data.editorLineHeight } : {}),
      ...(data.editorTextAlign ? { editorTextAlign: data.editorTextAlign } : {}),
      ...(data.typewriterMode  !== undefined ? { typewriterMode: data.typewriterMode } : {}),
      ...(data.typewriterFocusRatio !== undefined ? { typewriterFocusRatio: data.typewriterFocusRatio } : {}),
      activeChapterId: activeId,
      activeWordCount: activeId ? countWords(contents[activeId] ?? '') : 0,
      totalWordCount: Object.values(contents).reduce((s, t) => s + countWords(t), 0),
    })
  },

  // ── Modes ──────────────────────────────────────────────────────────────
  toggleFocusMode: () => set(s => ({ isFocusMode: !s.isFocusMode, isZenMode: false })),
  toggleZenMode: () => set(s => ({ isZenMode: !s.isZenMode, isFocusMode: false })),
  setSilentMode: (v) => set({ silentMode: v }),
  setDailyGoal: (n) => set({ dailyGoalWords: n }),

  // ── Sprint ──────────────────────────────────────────────────────────────
  startSprint: () => set({ isSprintActive: true, sprintSeconds: 15 * 60, isFocusMode: true }),
  stopSprint: () => set({ isSprintActive: false, sprintSeconds: 15 * 60, isFocusMode: false }),
  tickSprint: () => {
    const { sprintSeconds, stopSprint } = get()
    if (sprintSeconds <= 1) stopSprint()
    else set(s => ({ sprintSeconds: s.sprintSeconds - 1 }))
  },

  // ── Gamification ────────────────────────────────────────────────────────
  addXp: (amount) => {
    const { xp, silentMode } = get()
    const newXp = xp + amount
    const leveledUp = computeLevel(newXp) > computeLevel(xp)
    set({
      xp: newXp,
      level: computeLevel(newXp),
      xpProgress: computeProgress(newXp),
      showLevelUp: leveledUp && !silentMode,
    })
  },
  hideLevelUp: () => set({ showLevelUp: false }),

  // ── Editor ──────────────────────────────────────────────────────────────
  setActiveChapterContent: (content) => {
    const { activeChapterId, chapterContents, chapters, activeWordCount, addXp, todayWordCount } = get()
    if (!activeChapterId) return
    const newWordCount = countWords(content)
    const diff = newWordCount - activeWordCount
    if (diff > 0) {
      addXp(diff * XP_PER_WORD)
      set(s => ({ todayWordCount: s.todayWordCount + diff }))
    }
    const updatedContents = { ...chapterContents, [activeChapterId]: content }
    const updatedChapters = chapters.map(c =>
      c.id === activeChapterId ? { ...c, wordCount: newWordCount } : c
    )
    set({
      chapterContents: updatedContents,
      chapters: updatedChapters,
      activeWordCount: newWordCount,
      totalWordCount: Object.values(updatedContents).reduce((s, t) => s + countWords(t), 0),
    })
  },

  // ── Chapters ────────────────────────────────────────────────────────────
  setActiveChapter: (id) => {
    const { chapterContents, activeChapterId, recordSnapshot } = get()
    // Snapshot the chapter we're leaving (throttled internally) so switching
    // chapters becomes a natural history checkpoint.
    if (activeChapterId && activeChapterId !== id) recordSnapshot(activeChapterId)
    set({ activeChapterId: id, activeWordCount: countWords(chapterContents[id] ?? '') })
  },

  addChapter: (title, status) => {
    const { chapters } = get()
    const newChapter: Chapter = {
      id: Date.now().toString(), title, status, wordCount: 0,
      order: chapters.length,
    }
    set(s => ({
      chapters: [...s.chapters, newChapter],
      chapterContents: { ...s.chapterContents, [newChapter.id]: '' },
      ...(status === 'drafted' ? { activeChapterId: newChapter.id, activeWordCount: 0 } : {}),
    }))
  },

  markChapterCompleted: (id) => {
    set(s => ({
      chapters: s.chapters.map(c => c.id === id ? { ...c, status: 'completed' } : c),
    }))
  },

  startChapter: (id) => {
    const { chapterContents } = get()
    set(s => ({
      chapters: s.chapters.map(c => c.id === id ? { ...c, status: 'drafted' } : c),
      activeChapterId: id,
      activeWordCount: countWords(chapterContents[id] ?? ''),
    }))
  },

  reorderChapters: (fromIndex, toIndex) => {
    const { chapters } = get()
    const sorted = [...chapters].sort((a, b) => a.order - b.order)
    const [moved] = sorted.splice(fromIndex, 1)
    sorted.splice(toIndex, 0, moved)
    const reordered = sorted.map((c, i) => ({ ...c, order: i }))
    set({ chapters: reordered })
  },

  deleteChapter: (id) => {
    set(s => {
      const remaining = s.chapters.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i }))
      const newContents = { ...s.chapterContents }
      delete newContents[id]
      return {
        chapters: remaining,
        chapterContents: newContents,
        activeChapterId: s.activeChapterId === id ? (remaining[0]?.id ?? null) : s.activeChapterId,
      }
    })
  },

  // ── Lore ────────────────────────────────────────────────────────────────
  addLoreEntity: (entity) => {
    const newEntity: LoreEntity = { ...entity, id: Date.now().toString(), tags: entity.tags ?? [] }
    set(s => ({ loreEntities: [...s.loreEntities, newEntity] }))
  },
  updateLoreEntity: (id, updates) => {
    set(s => ({ loreEntities: s.loreEntities.map(e => e.id === id ? { ...e, ...updates } : e) }))
  },
  deleteLoreEntity: (id) => {
    set(s => ({ loreEntities: s.loreEntities.filter(e => e.id !== id) }))
  },
  renameTagGlobally: (oldTag, newTag) => {
    const tag = newTag.trim()
    if (!tag || tag === oldTag) return
    set(s => ({
      loreEntities: s.loreEntities.map(e => ({
        ...e,
        tags: e.tags.map(t => t === oldTag ? tag : t),
      })),
    }))
  },
  deleteTagGlobally: (tag) => {
    set(s => ({
      loreEntities: s.loreEntities.map(e => ({
        ...e,
        tags: e.tags.filter(t => t !== tag),
      })),
    }))
  },

  addLoreType: (label) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const value = trimmed.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    set(s => {
      if (s.loreTypes.some(t => t.value === value || t.label.toLowerCase() === trimmed.toLowerCase())) return s
      const color = TYPE_COLORS[s.loreTypes.length % TYPE_COLORS.length]
      return { loreTypes: [...s.loreTypes, { value, label: trimmed, color }] }
    })
  },

  deleteLoreType: (value) => {
    set(s => ({
      loreTypes: s.loreTypes.filter(t => t.value !== value),
    }))
  },

  renameLoreType: (value, newLabel) => {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    set(s => ({
      loreTypes: s.loreTypes.map(t => t.value === value ? { ...t, label: trimmed } : t),
    }))
  },

  // ── Inbox ───────────────────────────────────────────────────────────────
  addInboxItem: (text) => {
    const item: InboxItem = { id: Date.now().toString(), text, createdAt: new Date().toISOString() }
    set(s => ({ inboxItems: [...s.inboxItems, item] }))
  },

  // ── History ───────────────────────────────────────────────────────────────
  recordSnapshot: (chapterId, label) => {
    const { activeChapterId, chapterContents, chapterHistory } = get()
    const id = chapterId ?? activeChapterId
    if (!id) return
    const content = chapterContents[id] ?? ''
    const history = chapterHistory[id] ?? []
    const last = history[history.length - 1]
    const manual = !!label

    // For automatic snapshots, skip when nothing meaningful changed.
    if (!manual && last) {
      if (last.content === content) return
      const wordDelta = Math.abs(countWords(content) - last.wordCount)
      const elapsed = Date.now() - new Date(last.timestamp).getTime()
      if (elapsed < SNAPSHOT_MIN_INTERVAL && wordDelta < SNAPSHOT_MIN_WORD_DELTA) return
    }
    // Avoid storing an identical snapshot back-to-back even for manual saves.
    if (last && last.content === content && !manual) return

    const snapshot: ChapterSnapshot = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      content,
      wordCount: countWords(content),
      ...(label ? { label } : {}),
    }
    const updated = [...history, snapshot].slice(-SNAPSHOT_MAX_PER_CHAPTER)
    set({ chapterHistory: { ...chapterHistory, [id]: updated } })
  },

  restoreSnapshot: (chapterId, snapshotId) => {
    const { chapterHistory, chapterContents, chapters, activeChapterId } = get()
    const history = chapterHistory[chapterId] ?? []
    const snap = history.find(s => s.id === snapshotId)
    if (!snap) return
    // Snapshot the current state first so a restore is itself undoable.
    const current = chapterContents[chapterId] ?? ''
    const last = history[history.length - 1]
    const withCurrent = (last && last.content === current)
      ? history
      : [...history, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          content: current,
          wordCount: countWords(current),
          label: 'Antes de restaurar',
        }].slice(-SNAPSHOT_MAX_PER_CHAPTER)

    const newContents = { ...chapterContents, [chapterId]: snap.content }
    set({
      chapterHistory: { ...chapterHistory, [chapterId]: withCurrent },
      chapterContents: newContents,
      chapters: chapters.map(c => c.id === chapterId ? { ...c, wordCount: snap.wordCount } : c),
      ...(chapterId === activeChapterId ? { activeWordCount: snap.wordCount } : {}),
      totalWordCount: Object.values(newContents).reduce((s, t) => s + countWords(t), 0),
    })
  },

  deleteSnapshot: (chapterId, snapshotId) => {
    set(s => ({
      chapterHistory: {
        ...s.chapterHistory,
        [chapterId]: (s.chapterHistory[chapterId] ?? []).filter(snap => snap.id !== snapshotId),
      },
    }))
  },

  // ── Chapter status ──────────────────────────────────────────────────────
  revertChapter: (id) => {
    set(s => ({
      chapters: s.chapters.map(c => c.id === id ? { ...c, status: 'drafted' } : c),
    }))
  },
}))
