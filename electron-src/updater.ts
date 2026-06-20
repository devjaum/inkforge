import { app, BrowserWindow, ipcMain, shell } from 'electron'

// ── In-app updater (GitHub Releases) ──────────────────────────────────────────
// Checks the repo's latest GitHub release, compares it to the running version and
// notifies the renderer. No code signing or extra dependencies required — when a
// newer version exists the user is offered the Setup.exe download.

const REPO = 'devjaum/inkforge'
const FEED = `https://api.github.com/repos/${REPO}/releases/latest`

export type UpdateStatus =
  | { state: 'checking' }
  | { state: 'available'; version: string; notes: string; url: string; downloadUrl?: string }
  | { state: 'not-available'; version: string }
  | { state: 'error'; message: string }

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

let lastStatus: UpdateStatus | null = null

function send(win: BrowserWindow | null, status: UpdateStatus) {
  lastStatus = status
  if (win && !win.isDestroyed()) win.webContents.send('update-status', status)
}

export async function checkForUpdates(win: BrowserWindow | null): Promise<UpdateStatus> {
  try {
    send(win, { state: 'checking' })
    const res = await fetch(FEED, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'InkForge-Updater' },
    })
    if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`)
    const data = await res.json() as {
      tag_name: string
      name: string
      body: string
      html_url: string
      assets: { name: string; browser_download_url: string }[]
    }

    const current = app.getVersion()
    const remote = data.tag_name || data.name || ''

    if (remote && isNewer(remote, current)) {
      const setup =
        data.assets.find(a => /setup.*\.exe$/i.test(a.name)) ??
        data.assets.find(a => /\.exe$/i.test(a.name))
      const status: UpdateStatus = {
        state: 'available',
        version: remote.replace(/^v/i, ''),
        notes: data.body ?? '',
        url: data.html_url,
        downloadUrl: setup?.browser_download_url,
      }
      send(win, status)
      return status
    }

    const status: UpdateStatus = { state: 'not-available', version: current }
    send(win, status)
    return status
  } catch (e) {
    const status: UpdateStatus = { state: 'error', message: e instanceof Error ? e.message : String(e) }
    send(win, status)
    return status
  }
}

export function initUpdater(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('check-for-updates', () => checkForUpdates(getWin()))
  ipcMain.handle('get-update-status', () => lastStatus)
  ipcMain.handle('get-app-version', () => app.getVersion())
  ipcMain.handle('download-update', (_e, url: string) => shell.openExternal(url))

  // Silent automatic check shortly after launch.
  setTimeout(() => { void checkForUpdates(getWin()) }, 5000)
}
