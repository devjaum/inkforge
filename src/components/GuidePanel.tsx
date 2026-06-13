import { Keyboard, Hash, AtSign, Target, Zap, Eye } from 'lucide-react'

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <span className="text-violet-400">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
      <div className="flex gap-1 shrink-0">
        {keys.map(k => (
          <kbd key={k} className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-md font-mono">{k}</kbd>
        ))}
      </div>
      <span className="text-[11px] text-zinc-400">{label}</span>
    </div>
  )
}

function MdRow({ syntax, label }: { syntax: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
      <code className="text-[10px] text-violet-300 bg-violet-400/10 px-1.5 py-0.5 rounded-md font-mono shrink-0">{syntax}</code>
      <span className="text-[11px] text-zinc-400">{label}</span>
    </div>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────
export function GuidePanel() {
  return (
    <div className="flex-1 overflow-y-auto px-2 py-3">
      <Section icon={<Keyboard size={12} />} title="Atalhos">
        <Row keys={['Ctrl', 'P']}         label="Busca global (OmniSearch)" />
        <Row keys={['Ctrl', 'Shift', 'Z']} label="Modo Zen (tela cheia)" />
        <Row keys={['Esc']}               label="Sair do Modo Zen" />
        <Row keys={['F']}                 label="Modo Foco (esconde sidebar)" />
        <Row keys={['Ctrl', 'Shift', '␣']} label="Captura Rápida (global)" />
      </Section>

      <Section icon={<Hash size={12} />} title="Markdown">
        <MdRow syntax="# Título"      label="Título H1" />
        <MdRow syntax="## Título"     label="Título H2" />
        <MdRow syntax="### Título"    label="Título H3" />
        <MdRow syntax="**texto**"     label="Negrito" />
        <MdRow syntax="*texto*"       label="Itálico" />
        <MdRow syntax="`código`"      label="Código inline" />
        <MdRow syntax="---"           label="Linha divisória" />
      </Section>

      <Section icon={<AtSign size={12} />} title="Menções de Lore">
        <div className="px-2 space-y-1.5 text-[11px] text-zinc-400 leading-relaxed">
          <p>Digite <code className="text-violet-300 bg-violet-400/10 px-1 rounded">@</code> seguido do nome para abrir o autocomplete de entidades do Lore.</p>
          <p>Passe o mouse sobre uma menção <code className="text-violet-300 bg-violet-400/10 px-1 rounded">@Nome</code> no preview para ver os detalhes da entidade.</p>
          <p>Crie entidades na aba <span className="text-violet-400 font-medium">Lore</span> antes de mencioná-las.</p>
        </div>
      </Section>

      <Section icon={<Target size={12} />} title="Meta Diária">
        <div className="px-2 space-y-1.5 text-[11px] text-zinc-400 leading-relaxed">
          <p>Clique no número de palavras na barra superior para editar sua meta diária.</p>
          <p>A barra de progresso fica verde quando você atinge a meta.</p>
          <p>A contagem de palavras de hoje reinicia à meia-noite.</p>
        </div>
      </Section>

      <Section icon={<Zap size={12} />} title="Sprint de Escrita">
        <div className="px-2 space-y-1.5 text-[11px] text-zinc-400 leading-relaxed">
          <p>Clique em <span className="text-violet-400 font-medium">Sprint 15min</span> para iniciar um timer de escrita focada.</p>
          <p>O Sprint ativa o Modo Foco automaticamente para remover distrações.</p>
          <p>Ganhe XP extra por cada palavra escrita durante o sprint.</p>
        </div>
      </Section>

      <Section icon={<Eye size={12} />} title="Névoa de Guerra">
        <div className="px-2 space-y-1.5 text-[11px] text-zinc-400 leading-relaxed">
          <p>Capítulos <span className="text-zinc-300 font-medium">Planejados</span> ficam borrados e bloqueados para proteger spoilers.</p>
          <p>Clique em <span className="text-violet-400">▶</span> para promover um capítulo planejado a Rascunho e começar a escrever.</p>
          <p>Capítulos <span className="text-emerald-400 font-medium">Concluídos</span> podem ser revertidos a Rascunho com o botão <span className="text-amber-400">↺</span>.</p>
        </div>
      </Section>
    </div>
  )
}
