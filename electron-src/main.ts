import { app, BrowserWindow, ipcMain, globalShortcut, shell, Tray, Menu, nativeImage } from 'electron'
import { exportPdf, exportEpub, exportMobi, type BookData } from './export'
import { initUpdater } from './updater'
import { initGoogleDrive } from './googleDrive'
import path from 'path'
import fs from 'fs'

// Handle squirrel events on Windows (installer lifecycle)
if (require('electron-squirrel-startup')) app.quit()

const isDev = process.env.NODE_ENV === 'development'

// ── Data layer ──────────────────────────────────────────────────────────────
const userDataPath = app.getPath('userData')
const dataDir = path.join(userDataPath, 'inkforge-data')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
}

function readJson(filename: string): unknown {
  ensureDataDir()
  const filePath = path.join(dataDir, filename)
  if (!fs.existsSync(filePath)) return null
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { return null }
}

function writeJson(filename: string, data: unknown): void {
  ensureDataDir()
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2), 'utf-8')
}

// ── Quick Capture window ────────────────────────────────────────────────────
let captureWindow: BrowserWindow | null = null

function createCaptureWindow() {
  if (captureWindow && !captureWindow.isDestroyed()) { captureWindow.focus(); return }

  captureWindow = new BrowserWindow({
    width: 520, height: 64,
    frame: false, transparent: true,
    alwaysOnTop: true, skipTaskbar: true, resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  })

  const url = isDev
    ? 'http://localhost:5173/#/capture'
    : `file://${path.join(__dirname, '../dist/index.html')}#/capture`

  captureWindow.loadURL(url)
  captureWindow.on('blur', () => captureWindow?.close())
  captureWindow.on('closed', () => { captureWindow = null })
}

// ── Main window ─────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null

// Title bar overlay (min/max/close buttons) colors per theme.
const TITLEBAR_THEME = {
  dark:  { color: '#09090b', symbolColor: '#a1a1aa' },
  light: { color: '#fafafa', symbolColor: '#52525b' },
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 800, minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...TITLEBAR_THEME.dark, height: 48 },
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
    backgroundColor: '#09090b',
  })

  const url = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`

  mainWindow.loadURL(url)
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' })

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── System Tray ──────────────────────────────────────────────────────────────
let tray: Tray | null = null

function createTray() {
  // Use a simple blank icon (16x16 transparent PNG) — in production use a real icon
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'icon.ico'))
  
  tray = new Tray(icon)
  tray.setToolTip('InkForge')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir InkForge', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { label: 'Captura Rápida',  click: createCaptureWindow },
    { type: 'separator' },
    { label: 'Sair',            click: () => { isQuitting = true; app.quit() } },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('read-json',     (_e, filename: string) => readJson(filename))
ipcMain.handle('write-json',    (_e, filename: string, data: unknown) => { writeJson(filename, data); return true })
ipcMain.handle('close-capture', () => captureWindow?.close())
ipcMain.handle('open-external', (_e, url: string) => shell.openExternal(url))
ipcMain.handle('show-window',   () => { mainWindow?.show(); mainWindow?.focus() })
ipcMain.handle('set-titlebar-theme', (_e, overlay: { color: string; symbolColor: string }) => {
  if (!overlay?.color || !overlay?.symbolColor) return
  mainWindow?.setTitleBarOverlay({ color: overlay.color, symbolColor: overlay.symbolColor, height: 48 })
})
ipcMain.handle('export-pdf',    (_e, book: BookData) => exportPdf(book))
ipcMain.handle('export-epub',   (_e, book: BookData) => exportEpub(book))
ipcMain.handle('export-mobi',   (_e, book: BookData) => exportMobi(book))

// ── App lifecycle ─────────────────────────────────────────────────────────────
let isQuitting = false

app.whenReady().then(() => {
  createMainWindow()
  createTray()

  // In-app updater (checks GitHub Releases)
  initUpdater(() => mainWindow)

  // Google Drive sync (manual backup/restore)
  initGoogleDrive(() => mainWindow)

  // Global shortcut: Quick Capture
  globalShortcut.register('CommandOrControl+Shift+Space', createCaptureWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    else mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  // On macOS keep running; on Windows/Linux quit only when explicitly requested
  if (process.platform !== 'darwin') {
    // Don't quit — we have a tray
  }
})

app.on('before-quit', () => { isQuitting = true })

app.on('will-quit', () => globalShortcut.unregisterAll())
