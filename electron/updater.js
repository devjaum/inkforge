"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkForUpdates = checkForUpdates;
exports.initUpdater = initUpdater;
const electron_1 = require("electron");
// ── In-app updater (GitHub Releases) ──────────────────────────────────────────
// Checks the repo's latest GitHub release, compares it to the running version and
// notifies the renderer. No code signing or extra dependencies required — when a
// newer version exists the user is offered the Setup.exe download.
const REPO = 'devjaum/inkforge';
const FEED = `https://api.github.com/repos/${REPO}/releases/latest`;
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
let lastStatus = null;
function send(win, status) {
    lastStatus = status;
    if (win && !win.isDestroyed())
        win.webContents.send('update-status', status);
}
async function checkForUpdates(win) {
    try {
        send(win, { state: 'checking' });
        const res = await fetch(FEED, {
            headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'InkForge-Updater' },
        });
        if (!res.ok)
            throw new Error(`GitHub respondeu ${res.status}`);
        const data = await res.json();
        const current = electron_1.app.getVersion();
        const remote = data.tag_name || data.name || '';
        if (remote && isNewer(remote, current)) {
            const setup = data.assets.find(a => /setup.*\.exe$/i.test(a.name)) ??
                data.assets.find(a => /\.exe$/i.test(a.name));
            const status = {
                state: 'available',
                version: remote.replace(/^v/i, ''),
                notes: data.body ?? '',
                url: data.html_url,
                downloadUrl: setup?.browser_download_url,
            };
            send(win, status);
            return status;
        }
        const status = { state: 'not-available', version: current };
        send(win, status);
        return status;
    }
    catch (e) {
        const status = { state: 'error', message: e instanceof Error ? e.message : String(e) };
        send(win, status);
        return status;
    }
}
function initUpdater(getWin) {
    electron_1.ipcMain.handle('check-for-updates', () => checkForUpdates(getWin()));
    electron_1.ipcMain.handle('get-update-status', () => lastStatus);
    electron_1.ipcMain.handle('get-app-version', () => electron_1.app.getVersion());
    electron_1.ipcMain.handle('download-update', (_e, url) => electron_1.shell.openExternal(url));
    // Silent automatic check shortly after launch.
    setTimeout(() => { void checkForUpdates(getWin()); }, 5000);
}
