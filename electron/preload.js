"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const allowedFiles = ['lore.json', 'progress.json', 'inbox.json', 'chapters.json', 'content.json'];
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
    exportPdf: (book) => electron_1.ipcRenderer.invoke('export-pdf', book),
    exportEpub: (book) => electron_1.ipcRenderer.invoke('export-epub', book),
    exportMobi: (book) => electron_1.ipcRenderer.invoke('export-mobi', book),
});
