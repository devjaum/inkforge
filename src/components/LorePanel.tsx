import { useState } from 'react'
import { MapPin, User, Package, Shield, Plus, Pencil, Trash2, Check, X, BookMarked } from 'lucide-react'
import { useAppStore, type LoreEntity } from '@/store/useAppStore'

const TYPES: { value: LoreEntity['type']; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'character', label: 'Personagem', icon: <User size={13} />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  { value: 'location',  label: 'Local',       icon: <MapPin size={13} />, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  { value: 'item',      label: 'Item',        icon: <Package size={13} />, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  { value: 'faction',   label: 'Facção',      icon: <Shield size={13} />, color: 'text-rose-400 bg-rose-400/10 border-rose-400/30' },
]

function typeInfo(type: LoreEntity['type']) {
  return TYPES.find(t => t.value === type) ?? TYPES[0]
}

// ── Inline form for create / edit ──────────────────────────────────────────
interface EntityFormProps {
  initial?: LoreEntity
  onSave: (data: Omit<LoreEntity, 'id'>) => void
  onCancel: () => void
}

function EntityForm({ initial, onSave, onCancel }: EntityFormProps) {
  const [name, setName]       = useState(initial?.name ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [type, setType]       = useState<LoreEntity['type']>(initial?.type ?? 'character')

  const valid = name.trim().length > 0

  const submit = () => {
    if (!valid) return
    onSave({ name: name.trim(), summary: summary.trim(), type })
  }

  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 space-y-2.5">
      {/* Name */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Nome *</label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
          placeholder="Ex: Rei Arthur"
          className="w-full bg-zinc-700 text-zinc-100 text-sm rounded-lg px-3 py-1.5 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Type */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Tipo</label>
        <div className="grid grid-cols-2 gap-1">
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                type === t.value
                  ? t.color + ' border-current'
                  : 'border-zinc-700 text-zinc-500 hover:bg-zinc-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Descrição</label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={3}
          placeholder="Breve descrição exibida no hover..."
          className="w-full bg-zinc-700 text-zinc-100 text-xs rounded-lg px-3 py-2 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500 resize-none leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!valid}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Check size={12} />
          {initial ? 'Salvar' : 'Criar entidade'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center justify-center px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-400 rounded-lg transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Single entity card ──────────────────────────────────────────────────────
function EntityCard({ entity }: { entity: LoreEntity }) {
  const { updateLoreEntity, deleteLoreEntity } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const info = typeInfo(entity.type)

  if (editing) {
    return (
      <EntityForm
        initial={entity}
        onSave={(data) => { updateLoreEntity(entity.id, data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="group bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/50 rounded-xl p-3 transition-all">
      {/* Header */}
      <div className="flex items-start gap-2 mb-1.5">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium ${info.color} shrink-0 mt-0.5`}>
          {info.icon}
          {info.label}
        </span>
        <span className="text-sm font-semibold text-zinc-100 flex-1 leading-tight">{entity.name}</span>
        {/* Actions — visible on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded-md hover:bg-zinc-600 text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Editar"
          >
            <Pencil size={11} />
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={() => deleteLoreEntity(entity.id)}
                className="p-1 rounded-md bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors"
                title="Confirmar exclusão"
              >
                <Check size={11} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1 rounded-md hover:bg-zinc-600 text-zinc-500 transition-colors"
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded-md hover:bg-zinc-600 text-zinc-500 hover:text-red-400 transition-colors"
              title="Excluir"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {entity.summary ? (
        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3 ml-0.5">{entity.summary}</p>
      ) : (
        <p className="text-xs text-zinc-700 italic ml-0.5">Sem descrição.</p>
      )}

      {/* Usage hint */}
      <div className="mt-2 flex items-center gap-1">
        <code className="text-[10px] text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-md">@{entity.name}</code>
        <span className="text-[10px] text-zinc-700">— use no editor</span>
      </div>
    </div>
  )
}

// ── Main panel ──────────────────────────────────────────────────────────────
export function LorePanel({ embedded = false }: { embedded?: boolean }) {
  const { loreEntities, addLoreEntity } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<LoreEntity['type'] | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = loreEntities.filter(e => {
    const matchesType = filter === 'all' || e.type === filter
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
                          e.summary.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSearch
  })

  const counts = {
    character: loreEntities.filter(e => e.type === 'character').length,
    location:  loreEntities.filter(e => e.type === 'location').length,
    item:      loreEntities.filter(e => e.type === 'item').length,
    faction:   loreEntities.filter(e => e.type === 'faction').length,
  }

  const cls = embedded
    ? 'flex flex-col h-full w-full'
    : 'sidebar-transition w-56 shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full'

  return (
    <aside className={cls}>
      {/* Header */}
      <div className={`px-3 pb-2 shrink-0 ${embedded ? 'pt-3' : 'pt-4'}`}>
        <div className="flex items-center justify-between mb-3">
          {!embedded && (
            <div className="flex items-center gap-1.5">
              <BookMarked size={13} className="text-violet-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Lore</span>
            </div>
          )}
          <button
            onClick={() => setShowForm(v => !v)}
            className={`transition-colors ${showForm ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'}`}
            title="Nova entidade"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full bg-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Type filter tabs */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${filter === 'all' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            Todos ({loreEntities.length})
          </button>
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                filter === t.value
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {t.label} ({counts[t.value]})
            </button>
          ))}
        </div>
      </div>

      {/* New entity form */}
      {showForm && (
        <div className="px-3 pb-2 shrink-0">
          <EntityForm
            onSave={(data) => { addLoreEntity(data); setShowForm(false) }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Entity list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <BookMarked size={24} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-600">
              {loreEntities.length === 0
                ? 'Nenhuma entidade criada ainda.'
                : 'Nenhum resultado para o filtro.'}
            </p>
            {loreEntities.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2"
              >
                Criar primeira entidade
              </button>
            )}
          </div>
        ) : (
          filtered.map(entity => (
            <EntityCard key={entity.id} entity={entity} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-3 py-2 shrink-0">
        <div className="text-[10px] text-zinc-600">
          {loreEntities.length} {loreEntities.length === 1 ? 'entidade' : 'entidades'} · use @ para vincular
        </div>
      </div>
    </aside>
  )
}
