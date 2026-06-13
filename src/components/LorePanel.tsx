import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, BookMarked, Tag, Settings2, Layers } from 'lucide-react'
import { useAppStore, type LoreEntity, type LoreType } from '@/store/useAppStore'

// ── Tag color helpers ─────────────────────────────────────────────────────────
const TAG_COLORS = [
  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
]

function tagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + hash * 31
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// ── Type manager modal ────────────────────────────────────────────────────────
function TypeManager({ onClose }: { onClose: () => void }) {
  const { loreTypes, addLoreType, deleteLoreType, renameLoreType, loreEntities } = useAppStore()
  const [editing, setEditing]     = useState<string | null>(null)
  const [editVal, setEditVal]     = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [newLabel, setNewLabel]   = useState('')

  const startEdit = (t: LoreType) => { setEditing(t.value); setEditVal(t.label); setConfirmDel(null) }
  const commitEdit = (value: string) => {
    if (editVal.trim()) renameLoreType(value, editVal.trim())
    setEditing(null)
  }

  const countForType = (value: string) => loreEntities.filter(e => e.type === value).length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-72 max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={13} className="text-violet-400" />
            <span className="text-sm font-semibold text-zinc-100">Gerenciar Tipos</span>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X size={14} /></button>
        </div>

        {/* Type list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loreTypes.map(t => (
            <div key={t.value} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
              {editing === t.value ? (
                <>
                  <input
                    autoFocus
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(t.value); if (e.key === 'Escape') setEditing(null) }}
                    className="flex-1 bg-zinc-700 text-zinc-100 text-xs rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <button onClick={() => commitEdit(t.value)} className="text-emerald-400 hover:text-emerald-300 shrink-0"><Check size={11} /></button>
                  <button onClick={() => setEditing(null)} className="text-zinc-600 hover:text-zinc-400 shrink-0"><X size={11} /></button>
                </>
              ) : confirmDel === t.value ? (
                <>
                  <span className="flex-1 text-[10px] text-red-400 truncate">Excluir "{t.label}"? ({countForType(t.value)} entidades)</span>
                  <button onClick={() => { deleteLoreType(t.value); setConfirmDel(null) }} className="text-red-400 hover:text-red-300 shrink-0"><Check size={11} /></button>
                  <button onClick={() => setConfirmDel(null)} className="text-zinc-600 hover:text-zinc-400 shrink-0"><X size={11} /></button>
                </>
              ) : (
                <>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${t.color} shrink-0`}>{t.label}</span>
                  <span className="flex-1 text-[10px] text-zinc-600">{countForType(t.value)} entidades</span>
                  <button onClick={() => startEdit(t)} className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Renomear"><Pencil size={10} /></button>
                  <button onClick={() => { setConfirmDel(t.value); setEditing(null) }} className="text-zinc-600 hover:text-red-400 transition-colors" title="Excluir"><Trash2 size={10} /></button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new type */}
        <div className="border-t border-zinc-800 p-3 shrink-0">
          <div className="flex gap-1.5">
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { addLoreType(newLabel); setNewLabel('') } }}
              placeholder="Novo tipo... (Enter)"
              className="flex-1 bg-zinc-800 text-zinc-100 text-xs rounded-lg px-2.5 py-1.5 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500"
            />
            <button
              onClick={() => { addLoreType(newLabel); setNewLabel('') }}
              disabled={!newLabel.trim()}
              className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs rounded-lg transition-colors shrink-0"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tag manager modal ─────────────────────────────────────────────────────────
function TagManager({ onClose }: { onClose: () => void }) {
  const { loreEntities, renameTagGlobally, deleteTagGlobally } = useAppStore()
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue]   = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const allTags = [...new Set(loreEntities.flatMap(e => e.tags))].sort()

  const startEdit = (tag: string) => { setEditingTag(tag); setEditValue(tag) }
  const commitEdit = (tag: string) => {
    if (editValue.trim() && editValue.trim() !== tag) renameTagGlobally(tag, editValue.trim())
    setEditingTag(null)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-72 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Tag size={13} className="text-violet-400" />
            <span className="text-sm font-semibold text-zinc-100">Gerenciar Tags</span>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {allTags.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">Nenhuma tag criada. Adicione tags às entidades.</p>
          )}
          {allTags.map(tag => (
            <div key={tag} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
              {editingTag === tag ? (
                <>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(tag); if (e.key === 'Escape') setEditingTag(null) }}
                    className="flex-1 bg-zinc-700 text-zinc-100 text-xs rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <button onClick={() => commitEdit(tag)} className="text-emerald-400 hover:text-emerald-300"><Check size={11} /></button>
                  <button onClick={() => setEditingTag(null)} className="text-zinc-600 hover:text-zinc-400"><X size={11} /></button>
                </>
              ) : confirmDelete === tag ? (
                <>
                  <span className="flex-1 text-[10px] text-red-400">Excluir "{tag}"?</span>
                  <button onClick={() => { deleteTagGlobally(tag); setConfirmDelete(null) }} className="text-red-400 hover:text-red-300"><Check size={11} /></button>
                  <button onClick={() => setConfirmDelete(null)} className="text-zinc-600 hover:text-zinc-400"><X size={11} /></button>
                </>
              ) : (
                <>
                  <span className={`flex-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${tagColor(tag)}`}>
                    <Tag size={8} />{tag}
                  </span>
                  <span className="text-[10px] text-zinc-600 shrink-0">
                    {loreEntities.filter(e => e.tags.includes(tag)).length}x
                  </span>
                  <button onClick={() => startEdit(tag)} className="text-zinc-600 hover:text-zinc-300 transition-colors"><Pencil size={10} /></button>
                  <button onClick={() => setConfirmDelete(tag)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={10} /></button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-800 px-3 py-2.5 shrink-0">
          <p className="text-[10px] text-zinc-600">Crie tags ao adicionar entidades no formulário.</p>
        </div>
      </div>
    </div>
  )
}

// ── Tag input ─────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const t = input.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {tags.map(t => (
          <span key={t} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] ${tagColor(t)}`}>
            {t}
            <button onClick={() => onChange(tags.filter(x => x !== t))} className="opacity-60 hover:opacity-100"><X size={8} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Nova tag... (Enter)"
          className="flex-1 bg-zinc-700 text-zinc-100 text-[10px] rounded-md px-2 py-1 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500"
        />
        <button onClick={add} className="px-2 py-1 bg-zinc-600 hover:bg-zinc-500 text-zinc-300 rounded-md transition-colors text-[10px]">+</button>
      </div>
    </div>
  )
}

// ── Entity form ───────────────────────────────────────────────────────────────
interface EntityFormProps {
  initial?: LoreEntity
  onSave: (data: Omit<LoreEntity, 'id'>) => void
  onCancel: () => void
}

function EntityForm({ initial, onSave, onCancel }: EntityFormProps) {
  const { loreTypes } = useAppStore()
  const defaultType = loreTypes[0]?.value ?? ''
  const [name,    setName]    = useState(initial?.name ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [type,    setType]    = useState(initial?.type ?? defaultType)
  const [tags,    setTags]    = useState<string[]>(initial?.tags ?? [])
  const valid = name.trim().length > 0

  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 space-y-2.5">
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Nome *</label>
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { if (valid) onSave({ name: name.trim(), summary, type, tags }) } if (e.key === 'Escape') onCancel() }}
          placeholder="Ex: Rei Arthur"
          className="w-full bg-zinc-700 text-zinc-100 text-sm rounded-lg px-3 py-1.5 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Tipo</label>
        <div className="grid grid-cols-2 gap-1">
          {loreTypes.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all truncate ${type === t.value ? t.color + ' border-current' : 'border-zinc-700 text-zinc-500 hover:bg-zinc-700'}`}
            >
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Descrição</label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3}
          placeholder="Breve descrição exibida no hover..."
          className="w-full bg-zinc-700 text-zinc-100 text-xs rounded-lg px-3 py-2 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500 resize-none leading-relaxed"
        />
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
          <Tag size={9} className="inline mr-1" />Tags
        </label>
        <TagInput tags={tags} onChange={setTags} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { if (valid) onSave({ name: name.trim(), summary, type, tags }) }} disabled={!valid}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Check size={12} />{initial ? 'Salvar' : 'Criar entidade'}
        </button>
        <button onClick={onCancel} className="flex items-center justify-center px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded-lg">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Entity card ───────────────────────────────────────────────────────────────
function EntityCard({ entity }: { entity: LoreEntity }) {
  const { updateLoreEntity, deleteLoreEntity, loreTypes } = useAppStore()
  const [editing, setEditing]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const typeInfo = loreTypes.find(t => t.value === entity.type)
  const typeColor = typeInfo?.color ?? 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30'
  const typeLabel = typeInfo?.label ?? entity.type

  if (editing) {
    return (
      <EntityForm
        initial={entity}
        onSave={data => { updateLoreEntity(entity.id, data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="group bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/50 rounded-xl p-3 transition-all">
      <div className="flex items-start gap-2 mb-1.5">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${typeColor} shrink-0 mt-0.5`}>
          {typeLabel}
        </span>
        <span className="text-sm font-semibold text-zinc-100 flex-1 leading-tight">{entity.name}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setEditing(true)} className="p-1 rounded-md hover:bg-zinc-600 text-zinc-500 hover:text-zinc-200 transition-colors" title="Editar"><Pencil size={11} /></button>
          {confirmDelete ? (
            <>
              <button onClick={() => deleteLoreEntity(entity.id)} className="p-1 rounded-md bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors"><Check size={11} /></button>
              <button onClick={() => setConfirmDelete(false)} className="p-1 rounded-md hover:bg-zinc-600 text-zinc-500 transition-colors"><X size={11} /></button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1 rounded-md hover:bg-zinc-600 text-zinc-500 hover:text-red-400 transition-colors" title="Excluir"><Trash2 size={11} /></button>
          )}
        </div>
      </div>

      {entity.summary
        ? <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3 mb-2">{entity.summary}</p>
        : <p className="text-xs text-zinc-700 italic mb-2">Sem descrição.</p>
      }

      {entity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {entity.tags.map(t => (
            <span key={t} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] ${tagColor(t)}`}>
              {t}
            </span>
          ))}
        </div>
      )}

      <code className="text-[10px] text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-md">@{entity.name}</code>
      <span className="text-[10px] text-zinc-700 ml-1.5">— use no editor</span>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function LorePanel({ embedded = false }: { embedded?: boolean }) {
  const { loreEntities, loreTypes, addLoreEntity } = useAppStore()
  const [showForm, setShowForm]           = useState(false)
  const [showTagManager, setShowTagManager] = useState(false)
  const [showTypeManager, setShowTypeManager] = useState(false)
  const [filter, setFilter]               = useState<string>('all')
  const [tagFilter, setTagFilter]         = useState<string | null>(null)
  const [search, setSearch]               = useState('')

  const allTags = [...new Set(loreEntities.flatMap(e => e.tags))].sort()

  const filtered = loreEntities.filter(e => {
    const matchType   = filter === 'all' || e.type === filter
    const matchTag    = !tagFilter || e.tags.includes(tagFilter)
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
                        e.summary.toLowerCase().includes(search.toLowerCase()) ||
                        e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    return matchType && matchTag && matchSearch
  })

  const cls = embedded
    ? 'flex flex-col h-full w-full'
    : 'sidebar-transition w-56 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full'

  return (
    <aside className={cls}>
      <div className={`px-3 pb-2 shrink-0 ${embedded ? 'pt-3' : 'pt-4'}`}>
        <div className="flex items-center justify-between mb-2">
          {!embedded && (
            <div className="flex items-center gap-1.5">
              <BookMarked size={13} className="text-violet-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Lore</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setShowTypeManager(true)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Gerenciar tipos"
            >
              <Layers size={13} />
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className={`transition-colors ${showForm ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'}`}
              title="Nova entidade"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
          className="w-full bg-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500 mb-2"
        />

        {/* Type filter */}
        <div className="flex gap-1 flex-wrap mb-1">
          <button onClick={() => setFilter('all')} className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${filter === 'all' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}>
            Todos ({loreEntities.length})
          </button>
          {loreTypes.map(t => (
            <button key={t.value} onClick={() => setFilter(f => f === t.value ? 'all' : t.value)}
              className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${filter === t.value ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {t.label} ({loreEntities.filter(e => e.type === t.value).length})
            </button>
          ))}
        </div>

        {/* Tag filter pills + manage button */}
        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap items-center">
            {allTags.map(t => (
              <button key={t} onClick={() => setTagFilter(f => f === t ? null : t)}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[10px] transition-all ${
                  tagFilter === t ? tagColor(t) : 'border-zinc-700 text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <Tag size={8} />{t}
              </button>
            ))}
            <button
              onClick={() => setShowTagManager(true)}
              className="ml-auto text-zinc-700 hover:text-zinc-400 transition-colors shrink-0"
              title="Gerenciar tags"
            >
              <Settings2 size={11} />
            </button>
          </div>
        )}
      </div>

      {showTypeManager && <TypeManager onClose={() => setShowTypeManager(false)} />}
      {showTagManager  && <TagManager  onClose={() => setShowTagManager(false)} />}

      {showForm && (
        <div className="px-3 pb-2 shrink-0">
          <EntityForm
            onSave={data => { addLoreEntity(data); setShowForm(false) }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <BookMarked size={24} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-600">{loreEntities.length === 0 ? 'Nenhuma entidade ainda.' : 'Sem resultados.'}</p>
            {loreEntities.length === 0 && (
              <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2">Criar primeira entidade</button>
            )}
          </div>
        ) : (
          filtered.map(entity => <EntityCard key={entity.id} entity={entity} />)
        )}
      </div>

      <div className="border-t border-zinc-800 px-3 py-2 shrink-0">
        <div className="text-[10px] text-zinc-600">{loreEntities.length} entidades · use @ para vincular</div>
      </div>
    </aside>
  )
}
