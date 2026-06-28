"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const allowedFiles = ['lore.json', 'progress.json', 'inbox.json', 'chapters.json', 'content.json', 'history.json'];
function validateFilename(filename) {
    if (!allowedFiles.includes(filename)) {
        throw new Error(`Access denied: ${filename} is not an allowed data file.`);
    }
}
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    readJson: (filename) => {
        validateFilename(filename);
        return electron_1.ipcRenderer.invoke('read-json', filename);
    },
    writeJson: (filename, data) => {
        validateFilename(filename);
        return electron_1.ipcRenderer.invoke('write-json', filename, data);
    },
    closeCapture: () => electron_1.ipcRenderer.invoke('close-capture'),
    setTitleBarTheme: (theme) => electron_1.ipcRenderer.invoke('set-titlebar-theme', theme),
    exportPdf: (book) => electron_1.ipcRenderer.invoke('export-pdf', book),
    exportEpub: (book) => electron_1.ipcRenderer.invoke('export-epub', book),
    exportMobi: (book) => electron_1.ipcRenderer.invoke('export-mobi', book),
    // ── Updater ──────────────────────────────────────────────────────────────
    checkForUpdates: () => electron_1.ipcRenderer.invoke('check-for-updates'),
    getUpdateStatus: () => electron_1.ipcRenderer.invoke('get-update-status'),
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    downloadUpdate: (url) => electron_1.ipcRenderer.invoke('download-update', url),
    installUpdate: () => electron_1.ipcRenderer.invoke('install-update'),
    onUpdateStatus: (cb) => {
        const listener = (_e, status) => cb(status);
        electron_1.ipcRenderer.on('update-status', listener);
        return () => electron_1.ipcRenderer.removeListener('update-status', listener);
    },
    // ── Google Drive ───────────────────────────────────────────────────────────
    gdriveStatus: () => electron_1.ipcRenderer.invoke('gdrive-status'),
    gdriveSetCredentials: (creds) => electron_1.ipcRenderer.invoke('gdrive-set-credentials', creds),
    gdriveConnect: () => electron_1.ipcRenderer.invoke('gdrive-connect'),
    gdriveDisconnect: () => electron_1.ipcRenderer.invoke('gdrive-disconnect'),
    gdriveBackup: () => electron_1.ipcRenderer.invoke('gdrive-backup'),
    gdriveRestore: () => electron_1.ipcRenderer.invoke('gdrive-restore'),
});
