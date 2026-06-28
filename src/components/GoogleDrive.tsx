import { useEffect, useState } from 'react'
import { X, Cloud, CloudUpload, CloudDownload, Check, AlertCircle, LogOut, Loader2, ExternalLink } from 'lucide-react'

interface AuthStatus { hasCredentials: boolean; connected: boolean; email?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = () => (window as any).electronAPI

export function GoogleDriveModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [showCredForm, setShowCredForm] = useState(false)

  const refresh = async () => {
    const s = await api()?.gdriveStatus?.()
    if (s) { setStatus(s); setShowCredForm(!s.hasCredentials) }
  }
  useEffect(() => { refresh() }, [])

  const notAvailable = !api()?.gdriveStatus
  const run = async (key: string, fn: () => Promise<unknown>, okText: string) => {
    setBusy(key); setMsg(null)
    try { await fn(); setMsg({ kind: 'ok', text: okText }); await refresh() }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) }) }
    finally { setBusy(null) }
  }

  const saveCreds = () => run('creds', async () => {
    await api().gdriveSetCredentials({ clientId, clientSecret })
    setShowCredForm(false)
  }, 'Credenciais salvas.')

  const connect = () => run('connect', () => api().gdriveConnect(), 'Conta conectada!')
  const disconnect = () => run('disconnect', () => api().gdriveDisconnect(), 'Conta desconectada.')
  const backup = () => run('backup', async () => {
    const r = await api().gdriveBackup()
    setMsg({ kind: 'ok', text: `Enviado ao Drive (${r.uploaded.length} arquivo(s)).` })
  }, '')
  const restore = () => run('restore', async () => {
    const r = await api().gdriveRestore()
    if (r.restored.length === 0) { setMsg({ kind: 'err', text: 'Nenhum backup encontrado no Drive.' }); return }
    // Recarrega para que a aplicação leia os dados restaurados do disco.
    setTimeout(() => window.location.reload(), 600)
    setMsg({ kind: 'ok', text: `Restaurado (${r.restored.length} arquivo(s)). Recarregando…` })
  }, '')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-96 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Cloud size={16} className="text-violet-400" />
          <span className="text-sm font-semibold text-zinc-100">Google Drive</span>
          <div className="flex-1" />
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400"><X size={14} /></button>
        </div>

        {notAvailable ? (
          <p className="text-[11px] text-amber-400">A sincronização com o Drive só funciona no aplicativo instalado (não no navegador).</p>
        ) : !status ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 size={13} className="animate-spin" /> Carregando…</div>
        ) : (
          <>
            {/* Sem credenciais ou editando */}
            {showCredForm ? (
              <div className="space-y-2">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Cole as credenciais do seu <b>OAuth Client (Desktop app)</b> criado no Google Cloud Console.
                  <button onClick={() => api()?.downloadUpdate?.('https://console.cloud.google.com/apis/credentials')}
                    className="inline-flex items-center gap-0.5 text-violet-400 hover:underline ml-1">
                    Abrir Console <ExternalLink size={9} />
                  </button>
                </p>
                <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Client ID"
                  className="w-full bg-zinc-800 text-zinc-100 text-xs rounded-lg px-2.5 py-2 outline-none focus:ring-1 focus:ring-violet-500" />
                <input value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="Client Secret" type="password"
                  className="w-full bg-zinc-800 text-zinc-100 text-xs rounded-lg px-2.5 py-2 outline-none focus:ring-1 focus:ring-violet-500" />
                <button onClick={saveCreds} disabled={busy === 'creds' || !clientId || !clientSecret}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
                  {busy === 'creds' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salvar credenciais
                </button>
                {status.hasCredentials && (
                  <button onClick={() => setShowCredForm(false)} className="w-full text-[11px] text-zinc-500 hover:text-zinc-300">Cancelar</button>
                )}
              </div>
            ) : !status.connected ? (
              <div className="space-y-3">
                <p className="text-[11px] text-zinc-500">Credenciais configuradas. Conecte sua conta para sincronizar.</p>
                <button onClick={connect} disabled={busy === 'connect'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
                  {busy === 'connect' ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />} Conectar conta Google
                </button>
                <button onClick={() => setShowCredForm(true)} className="w-full text-[11px] text-zinc-500 hover:text-zinc-300">Trocar credenciais</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-800/60 rounded-lg px-3 py-2">
                  <Check size={13} className="text-emerald-400" />
                  <span className="truncate">Conectado{status.email ? ` — ${status.email}` : ''}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={backup} disabled={!!busy}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-medium rounded-xl transition-colors">
                    {busy === 'backup' ? <Loader2 size={13} className="animate-spin" /> : <CloudUpload size={14} />} Salvar no Drive
                  </button>
                  <button onClick={restore} disabled={!!busy}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-100 text-xs font-medium rounded-xl transition-colors">
                    {busy === 'restore' ? <Loader2 size={13} className="animate-spin" /> : <CloudDownload size={14} />} Carregar do Drive
                  </button>
                </div>
                <p className="text-[10px] text-amber-400/80">Carregar do Drive substitui os dados locais atuais.</p>
                <button onClick={disconnect} disabled={!!busy}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300">
                  <LogOut size={11} /> Desconectar
                </button>
              </div>
            )}

            {msg && (
              <div className={`mt-3 flex items-center gap-1.5 text-xs ${msg.kind === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {msg.kind === 'ok' ? <Check size={12} /> : <AlertCircle size={12} />} {msg.text}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
