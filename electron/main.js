"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const isDev = process.env.NODE_ENV === 'development';
// Data directory setup
const userDataPath = electron_1.app.getPath('userData');
const dataDir = path_1.default.join(userDataPath, 'inkforge-data');
function ensureDataDir() {
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
}
function readJson(filename) {
    ensureDataDir();
    const filePath = path_1.default.join(dataDir, filename);
    if (!fs_1.default.existsSync(filePath))
        return null;
    try {
        return JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
    }
    catch {
        return null;
    }
}
function writeJson(filename, data) {
    ensureDataDir();
    const filePath = path_1.default.join(dataDir, filename);
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
// Quick Capture window
let captureWindow = null;
function createCaptureWindow() {
    if (captureWindow && !captureWindow.isDestroyed()) {
        captureWindow.focus();
        return;
    }
    captureWindow = new electron_1.BrowserWindow({
        width: 500,
        height: 80,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    const captureUrl = isDev
        ? 'http://localhost:5173/#/capture'
        : `file://${path_1.default.join(__dirname, '../dist/index.html')}#/capture`;
    captureWindow.loadURL(captureUrl);
    captureWindow.on('blur', () => {
        captureWindow?.close();
    });
    captureWindow.on('closed', () => {
        captureWindow = null;
    });
}
// Main window
let mainWindow = null;
function createMainWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        backgroundColor: '#0f0f0f',
    });
    const mainUrl = isDev
        ? 'http://localhost:5173'
        : `file://${path_1.default.join(__dirname, '../dist/index.html')}`;
    mainWindow.loadURL(mainUrl);
    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// IPC Handlers
electron_1.ipcMain.handle('read-json', (_event, filename) => {
    return readJson(filename);
});
electron_1.ipcMain.handle('write-json', (_event, filename, data) => {
    writeJson(filename, data);
    return true;
});
electron_1.ipcMain.handle('close-capture', () => {
    captureWindow?.close();
});
electron_1.ipcMain.handle('open-external', (_event, url) => {
    electron_1.shell.openExternal(url);
});
// App lifecycle
electron_1.app.whenReady().then(() => {
    createMainWindow();
    electron_1.globalShortcut.register('CommandOrControl+Shift+Space', () => {
        createCaptureWindow();
    });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    electron_1.globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
