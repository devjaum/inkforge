"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Handle squirrel events on Windows (installer lifecycle)
if (require('electron-squirrel-startup'))
    electron_1.app.quit();
const isDev = process.env.NODE_ENV === 'development';
// ── Data layer ──────────────────────────────────────────────────────────────
const userDataPath = electron_1.app.getPath('userData');
const dataDir = path_1.default.join(userDataPath, 'inkforge-data');
function ensureDataDir() {
    if (!fs_1.default.existsSync(dataDir))
        fs_1.default.mkdirSync(dataDir, { recursive: true });
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
    fs_1.default.writeFileSync(path_1.default.join(dataDir, filename), JSON.stringify(data, null, 2), 'utf-8');
}
// ── Quick Capture window ────────────────────────────────────────────────────
let captureWindow = null;
function createCaptureWindow() {
    if (captureWindow && !captureWindow.isDestroyed()) {
        captureWindow.focus();
        return;
    }
    captureWindow = new electron_1.BrowserWindow({
        width: 520, height: 64,
        frame: false, transparent: true,
        alwaysOnTop: true, skipTaskbar: true, resizable: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true, nodeIntegration: false,
        },
    });
    const url = isDev
        ? 'http://localhost:5173/#/capture'
        : `file://${path_1.default.join(__dirname, '../dist/index.html')}#/capture`;
    captureWindow.loadURL(url);
    captureWindow.on('blur', () => captureWindow?.close());
    captureWindow.on('closed', () => { captureWindow = null; });
}
// ── Main window ─────────────────────────────────────────────────────────────
let mainWindow = null;
function createMainWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280, height: 800,
        minWidth: 800, minHeight: 600,
        titleBarStyle: 'hidden',
        titleBarOverlay: { color: '#09090b', symbolColor: '#a1a1aa', height: 48 },
        icon: path_1.default.join(__dirname, '..', 'build', 'icon.ico'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true, nodeIntegration: false,
        },
        backgroundColor: '#09090b',
    });
    const url = isDev
        ? 'http://localhost:5173'
        : `file://${path_1.default.join(__dirname, '../dist/index.html')}`;
    mainWindow.loadURL(url);
    if (isDev)
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    // Minimize to tray instead of closing
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow?.hide();
        }
    });
    mainWindow.on('closed', () => { mainWindow = null; });
}
// ── System Tray ──────────────────────────────────────────────────────────────
let tray = null;
function createTray() {
    // Use a simple blank icon (16x16 transparent PNG) — in production use a real icon
    const icon = electron_1.nativeImage.createEmpty();
    tray = new electron_1.Tray(icon);
    tray.setToolTip('InkForge');
    const contextMenu = electron_1.Menu.buildFromTemplate([
        { label: 'Abrir InkForge', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
        { label: 'Captura Rápida', click: createCaptureWindow },
        { type: 'separator' },
        { label: 'Sair', click: () => { isQuitting = true; electron_1.app.quit(); } },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}
// ── IPC Handlers ─────────────────────────────────────────────────────────────
electron_1.ipcMain.handle('read-json', (_e, filename) => readJson(filename));
electron_1.ipcMain.handle('write-json', (_e, filename, data) => { writeJson(filename, data); return true; });
electron_1.ipcMain.handle('close-capture', () => captureWindow?.close());
electron_1.ipcMain.handle('open-external', (_e, url) => electron_1.shell.openExternal(url));
electron_1.ipcMain.handle('show-window', () => { mainWindow?.show(); mainWindow?.focus(); });
// ── App lifecycle ─────────────────────────────────────────────────────────────
let isQuitting = false;
electron_1.app.whenReady().then(() => {
    createMainWindow();
    createTray();
    // Global shortcut: Quick Capture
    electron_1.globalShortcut.register('CommandOrControl+Shift+Space', createCaptureWindow);
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createMainWindow();
        else
            mainWindow?.show();
    });
});
electron_1.app.on('window-all-closed', () => {
    // On macOS keep running; on Windows/Linux quit only when explicitly requested
    if (process.platform !== 'darwin') {
        // Don't quit — we have a tray
    }
});
electron_1.app.on('before-quit', () => { isQuitting = true; });
electron_1.app.on('will-quit', () => electron_1.globalShortcut.unregisterAll());
