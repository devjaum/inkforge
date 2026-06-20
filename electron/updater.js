"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkForUpdates = checkForUpdates;
exports.initUpdater = initUpdater;
const electron_1 = require("electron");
// ── In-app updater ────────────────────────────────────────────────────────────
// No app instalado (Squirrel), usa o autoUpdater nativo do Electron via
// update.electronjs.org: baixa e instala a atualização dentro do próprio app,
// bastando reiniciar. Em desenvolvimento (não empacotado), faz apenas a checagem
// pela API do GitHub e oferece o download no navegador como fallback.
const REPO = 'devjaum/inkforge';
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;
let getWindow = () => null;
let lastStatus = null;
let latestInfo = null;
function send(status) {
    lastStatus = status;
    const win = getWindow();
    if (win && !win.isDestroyed())
        win.webContents.send('update-status', status);
}
function parseSemver(v) {
    return v.replace(/^v/i, '').split(/[.\-+]/).map(n => parseInt(n, 10) || 0);
}
function isNewer(remote, current) {
    const r = parseSemver(remote);
    const c = parseSemver(current);
    for (let i = 0; i < Math.max(r.length, c.length); i++) {
        const a = r[i] ?? 0;
        const b = c[i] ?? 0;
        if (a > b)
            return true;
        if (a < b)
            return false;
    }
    return false;
}
// Busca a última release no GitHub (notas/versão/link). Retorna null em 404
// (repo sem releases / privado) ou erro de rede.
async function fetchLatest() {
    try {
        const res = await fetch(LATEST_API, {
            headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'InkForge-Updater' },
        });
        if (res.status === 404)
            return null;
        if (!res.ok)
            throw new Error(`GitHub respondeu ${res.status}`);
        const data = await res.json();
        const remote = data.tag_name || data.name || '';
        if (!remote)
            return null;
        const setup = data.assets.find(a => /setup.*\.exe$/i.test(a.name)) ??
            data.assets.find(a => /\.exe$/i.test(a.name));
        return {
            version: remote.replace(/^v/i, ''),
            notes: data.body ?? '',
            url: data.html_url,
            downloadUrl: setup?.browser_download_url,
        };
    }
    catch {
        return null;
    }
}
// O autoUpdater nativo só funciona no app empacotado/instalado (Squirrel no
// Windows, ZIP assinado no macOS). Em dev ele lança erro, então detectamos antes.
function canAutoUpdate() {
    return electron_1.app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin');
}
let autoUpdaterWired = false;
function setupAutoUpdater() {
    if (autoUpdaterWired)
        return;
    const feedUrl = `https://update.electronjs.org/${REPO}/${process.platform}/${electron_1.app.getVersion()}`;
    try {
        electron_1.autoUpdater.setFeedURL({ url: feedUrl });
    }
    catch (e) {
        send({ state: 'error', message: e instanceof Error ? e.message : String(e) });
        return;
    }
    electron_1.autoUpdater.on('checking-for-update', () => send({ state: 'checking' }));
    electron_1.autoUpdater.on('update-not-available', () => send({ state: 'not-available', version: electron_1.app.getVersion() }));
    electron_1.autoUpdater.on('update-available', async () => {
        latestInfo = await fetchLatest();
        send({ state: 'downloading', version: latestInfo?.version ?? '', notes: latestInfo?.notes ?? '' });
    });
    electron_1.autoUpdater.on('update-downloaded', (_e, releaseNotes, releaseName) => {
        const version = latestInfo?.version || (releaseName || '').replace(/^v/i, '');
        send({ state: 'ready', version, notes: latestInfo?.notes || releaseNotes || '' });
    });
    electron_1.autoUpdater.on('error', (err) => {
        const msg = err == null ? '' : (err.message || String(err));
        // Feed ausente / sem RELEASES (ex.: release publicada sem os artefatos do
        // Squirrel) não é um erro acionável para o usuário — tratamos como "sem
        // atualização" em vez de exibir o stack trace do Squirrel.
        if (/empty or corrupted|not found|404|no such|can ?not find|no published|no releases/i.test(msg)) {
            send({ state: 'not-available', version: electron_1.app.getVersion() });
            return;
        }
        send({ state: 'error', message: msg || 'erro desconhecido' });
    });
    autoUpdaterWired = true;
}
async function checkForUpdates() {
    if (canAutoUpdate()) {
        try {
            setupAutoUpdater();
            send({ state: 'checking' });
            electron_1.autoUpdater.checkForUpdates();
            return;
        }
        catch (e) {
            send({ state: 'error', message: e instanceof Error ? e.message : String(e) });
            return;
        }
    }
    // Fallback (desenvolvimento ou plataforma sem autoUpdater): checagem por API.
    send({ state: 'checking' });
    const info = await fetchLatest();
    if (!info || !isNewer(info.version, electron_1.app.getVersion())) {
        send({ state: 'not-available', version: electron_1.app.getVersion() });
        return;
    }
    latestInfo = info;
    send({ state: 'manual', ...info });
}
function initUpdater(getWin) {
    getWindow = getWin;
    electron_1.ipcMain.handle('check-for-updates', () => checkForUpdates());
    electron_1.ipcMain.handle('get-update-status', () => lastStatus);
    electron_1.ipcMain.handle('get-app-version', () => electron_1.app.getVersion());
    electron_1.ipcMain.handle('download-update', (_e, url) => electron_1.shell.openExternal(url));
    electron_1.ipcMain.handle('install-update', () => {
        if (canAutoUpdate())
            electron_1.autoUpdater.quitAndInstall();
    });
    // Checagem automática e silenciosa logo após o início.
    setTimeout(() => { void checkForUpdates(); }, 5000);
}
