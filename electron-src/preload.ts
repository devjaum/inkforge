import { contextBridge, ipcRenderer } from 'electron'

const allowedFiles = ['lore.json', 'progress.json', 'inbox.json', 'chapters.json', 'content.json']

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

  closeCapture: () => ipcRenderer.invoke('close-capture'),
})
