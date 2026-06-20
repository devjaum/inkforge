import { app, BrowserWindow, ipcMain, shell, autoUpdater } from 'electron'

// ── In-app updater ────────────────────────────────────────────────────────────
// No app instalado (Squirrel), usa o autoUpdater nativo do Electron via
// update.electronjs.org: baixa e instala a atualização dentro do próprio app,
// bastando reiniciar. Em desenvolvimento (não empacotado), faz apenas a checagem
// pela API do GitHub e oferece o download no navegador como fallback.

const REPO = 'devjaum/inkforge'
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`

export type UpdateStatus =
  | { state: 'checking' }
  | { state: 'downloading'; version: string; notes: string }
  | { state: 'ready'; version: string; notes: string }
  | { state: 'not-available'; version: string }
  | { state: 'manual'; version: string; notes: string; url: string; downloadUrl?: string }
  | { state: 'error'; message: string }

let getWindow: () => BrowserWindow | null = () => null
let lastStatus: UpdateStatus | null = null
let latestInfo: { version: string; notes: string; url: string; downloadUrl?: string } | null = null

function send(status: UpdateStatus) {
  lastStatus = status
  const win = getWindow()
  if (win && !win.isDestroyed()) win.webContents.send('update-status', status)
}

function parseSemver(v: string): number[] {
  return v.replace(/^v/i, '').split(/[.\-+]/).map(n => parseInt(n, 10) || 0)
}
function isNewer(remote: string, current: string): boolean {
  const r = parseSemver(remote)
  const c = parseSemver(current)
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const a = r[i] ?? 0
    const b = c[i] ?? 0
    if (a > b) return true
    if (a < b) return false
  }
  return false
}

// Busca a última release no GitHub (notas/versão/link). Retorna null em 404
// (repo sem releases / privado) ou erro de rede.
async function fetchLatest(): Promise<typeof latestInfo> {
  try {
    const res = await fetch(LATEST_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'InkForge-Updater' },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`)
    const data = await res.json() as {
      tag_name: string; name: string; body: string; html_url: string
      assets: { name: string; browser_download_url: string }[]
    }
    const remote = data.tag_name || data.name || ''
    if (!remote) return null
    const setup =
      data.assets.find(a => /setup.*\.exe$/i.test(a.name)) ??
      data.assets.find(a => /\.exe$/i.test(a.name))
    return {
      version: remote.replace(/^v/i, ''),
      notes: data.body ?? '',
      url: data.html_url,
      downloadUrl: setup?.browser_download_url,
    }
  } catch {
    return null
  }
}

// O autoUpdater nativo só funciona no app empacotado/instalado (Squirrel no
// Windows, ZIP assinado no macOS). Em dev ele lança erro, então detectamos antes.
function canAutoUpdate(): boolean {
  return app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin')
}

let autoUpdaterWired = false
function setupAutoUpdater() {
  if (autoUpdaterWired) return
  const feedUrl = `https://update.electronjs.org/${REPO}/${process.platform}/${app.getVersion()}`
  try {
    autoUpdater.setFeedURL({ url: feedUrl })
  } catch (e) {
    send({ state: 'error', message: e instanceof Error ? e.message : String(e) })
    return
  }

  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }))
  autoUpdater.on('update-not-available', () => send({ state: 'not-available', version: app.getVersion() }))
  autoUpdater.on('update-available', async () => {
    latestInfo = await fetchLatest()
    send({ state: 'downloading', version: latestInfo?.version ?? '', notes: latestInfo?.notes ?? '' })
  })
  autoUpdater.on('update-downloaded', (_e, releaseNotes, releaseName) => {
    const version = latestInfo?.version || (releaseName || '').replace(/^v/i, '')
    send({ state: 'ready', version, notes: latestInfo?.notes || releaseNotes || '' })
  })
  autoUpdater.on('error', (err) => {
    send({ state: 'error', message: err == null ? 'erro desconhecido' : (err.message || String(err)) })
  })
  autoUpdaterWired = true
}

export async function checkForUpdates(): Promise<void> {
  if (canAutoUpdate()) {
    try {
      setupAutoUpdater()
      send({ state: 'checking' })
      autoUpdater.checkForUpdates()
      return
    } catch (e) {
      send({ state: 'error', message: e instanceof Error ? e.message : String(e) })
      return
    }
  }

  // Fallback (desenvolvimento ou plataforma sem autoUpdater): checagem por API.
  send({ state: 'checking' })
  const info = await fetchLatest()
  if (!info || !isNewer(info.version, app.getVersion())) {
    send({ state: 'not-available', version: app.getVersion() })
    return
  }
  latestInfo = info
  send({ state: 'manual', ...info })
}

export function initUpdater(getWin: () => BrowserWindow | null): void {
  getWindow = getWin

  ipcMain.handle('check-for-updates', () => checkForUpdates())
  ipcMain.handle('get-update-status', () => lastStatus)
  ipcMain.handle('get-app-version', () => app.getVersion())
  ipcMain.handle('download-update', (_e, url: string) => shell.openExternal(url))
  ipcMain.handle('install-update', () => {
    if (canAutoUpdate()) autoUpdater.quitAndInstall()
  })

  // Checagem automática e silenciosa logo após o início.
  setTimeout(() => { void checkForUpdates() }, 5000)
}
