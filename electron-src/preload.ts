import { contextBridge, ipcRenderer } from 'electron'

const allowedFiles = ['lore.json', 'progress.json', 'inbox.json', 'chapters.json', 'content.json', 'history.json']

function validateFilename(filename: string): void {
  if (!allowedFiles.includes(filename)) {
    throw new Error(`Access denied: ${filename} is not an allowed data file.`)
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  readJson: (filename: string) => {
    validateFilename(filename)
    return ipcRenderer.invoke('read-json', filename)
  },

  writeJson: (filename: string, data: unknown) => {
    validateFilename(filename)
    return ipcRenderer.invoke('write-json', filename, data)
  },

  closeCapture:  () => ipcRenderer.invoke('close-capture'),
  exportPdf:     (book: unknown) => ipcRenderer.invoke('export-pdf',  book),
  exportEpub:    (book: unknown) => ipcRenderer.invoke('export-epub', book),
  exportMobi:    (book: unknown) => ipcRenderer.invoke('export-mobi', book),

  // ── Updater ──────────────────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  getAppVersion:   () => ipcRenderer.invoke('get-app-version'),
  downloadUpdate:  (url: string) => ipcRenderer.invoke('download-update', url),
  onUpdateStatus:  (cb: (status: unknown) => void) => {
    const listener = (_e: unknown, status: unknown) => cb(status)
    ipcRenderer.on('update-status', listener)
    return () => ipcRenderer.removeListener('update-status', listener)
  },
})
