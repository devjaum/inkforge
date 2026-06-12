import { app, BrowserWindow, ipcMain, globalShortcut, shell } from 'electron'
import path from 'path'
import fs from 'fs'

const isDev = process.env.NODE_ENV === 'development'

// Data directory setup
const userDataPath = app.getPath('userData')
const dataDir = path.join(userDataPath, 'inkforge-data')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function readJson(filename: string): unknown {
  ensureDataDir()
  const filePath = path.join(dataDir, filename)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

function writeJson(filename: string, data: unknown): void {
  ensureDataDir()
  const filePath = path.join(dataDir, filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// Quick Capture window
let captureWindow: BrowserWindow | null = null

function createCaptureWindow() {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.focus()
    return
  }

  captureWindow = new BrowserWindow({
    width: 500,
    height: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const captureUrl = isDev
    ? 'http://localhost:5173/#/capture'
    : `file://${path.join(__dirname, '../dist/index.html')}#/capture`

  captureWindow.loadURL(captureUrl)

  captureWindow.on('blur', () => {
    captureWindow?.close()
  })

  captureWindow.on('closed', () => {
    captureWindow = null
  })
}

// Main window
let mainWindow: BrowserWindow | null = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#a1a1aa',
      height: 48,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0f0f0f',
  })

  const mainUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`

  mainWindow.loadURL(mainUrl)

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC Handlers
ipcMain.handle('read-json', (_event, filename: string) => {
  return readJson(filename)
})

ipcMain.handle('write-json', (_event, filename: string, data: unknown) => {
  writeJson(filename, data)
  return true
})

ipcMain.handle('close-capture', () => {
  captureWindow?.close()
})

ipcMain.handle('open-external', (_event, url: string) => {
  shell.openExternal(url)
})

// App lifecycle
app.whenReady().then(() => {
  createMainWindow()

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    createCaptureWindow()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
