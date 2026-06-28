import { app, ipcMain, shell, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import http from 'http'
import crypto from 'crypto'

// ── Google Drive sync (manual) ────────────────────────────────────────────────
// OAuth2 PKCE (fluxo "Desktop app", redirect em loopback) + REST do Drive, sem
// dependências externas. Sincroniza os arquivos de dados do InkForge numa pasta
// "InkForge" visível no Drive do usuário (escopo mínimo drive.file).

const userDataPath = app.getPath('userData')
const dataDir = path.join(userDataPath, 'inkforge-data')
const credsPath = path.join(userDataPath, 'google-credentials.json')
const tokenPath = path.join(userDataPath, 'google-token.json')

const FOLDER_NAME = 'InkForge'
const DATA_FILES = ['content.json', 'chapters.json', 'lore.json', 'history.json', 'progress.json']
const SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email'

interface Creds { clientId: string; clientSecret: string }
interface Token { refresh_token: string; access_token?: string; expiry?: number; email?: string }

function readJsonFile<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) as T } catch { return null }
}
function writeJsonFile(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

function loadCreds(): Creds | null {
  const fromEnv = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : null
  return fromEnv ?? readJsonFile<Creds>(credsPath)
}
function loadToken(): Token | null { return readJsonFile<Token>(tokenPath) }
function saveToken(t: Token): void { writeJsonFile(tokenPath, t) }

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── OAuth ──────────────────────────────────────────────────────────────────────
function runOAuth(creds: Creds): Promise<Token> {
  return new Promise((resolve, reject) => {
    const verifier = base64url(crypto.randomBytes(32))
    const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
    const state = base64url(crypto.randomBytes(16))

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '', 'http://127.0.0.1')
        if (!url.searchParams.has('code') && !url.searchParams.has('error')) {
          res.writeHead(404); res.end(); return
        }
        const respond = (msg: string) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`<html><body style="font-family:sans-serif;background:#09090b;color:#f4f4f5;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h2>InkForge</h2><p>${msg}</p><p style="color:#a1a1aa">Você já pode fechar esta aba.</p></div></body></html>`)
        }
        if (url.searchParams.get('state') !== state) { respond('Falha de validação (state).'); server.close(); reject(new Error('state mismatch')); return }
        if (url.searchParams.has('error')) { respond('Autorização cancelada.'); server.close(); reject(new Error(url.searchParams.get('error') || 'oauth error')); return }

        const code = url.searchParams.get('code') as string
        const redirectUri = `http://127.0.0.1:${(server.address() as { port: number }).port}`
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            code,
            code_verifier: verifier,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        })
        if (!tokenRes.ok) { respond('Falha ao obter token.'); server.close(); reject(new Error(`token ${tokenRes.status}`)); return }
        const data = await tokenRes.json() as { access_token: string; refresh_token: string; expires_in: number }
        const token: Token = {
          refresh_token: data.refresh_token,
          access_token: data.access_token,
          expiry: Date.now() + (data.expires_in - 60) * 1000,
        }
        token.email = await fetchEmail(token.access_token!).catch(() => undefined)
        saveToken(token)
        respond('Conta conectada com sucesso!')
        server.close()
        resolve(token)
      } catch (e) {
        try { res.writeHead(500); res.end() } catch { /* noop */ }
        server.close()
        reject(e)
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: creds.clientId,
        redirect_uri: `http://127.0.0.1:${port}`,
        response_type: 'code',
        scope: SCOPE,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'consent',
        state,
      }).toString()
      shell.openExternal(authUrl)
    })

    setTimeout(() => { try { server.close() } catch { /* noop */ } reject(new Error('timeout')) }, 5 * 60 * 1000)
  })
}

async function fetchEmail(accessToken: string): Promise<string | undefined> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return undefined
  const data = await res.json() as { email?: string }
  return data.email
}

async function getAccessToken(): Promise<string> {
  const creds = loadCreds()
  const token = loadToken()
  if (!creds) throw new Error('Credenciais do Google não configuradas.')
  if (!token?.refresh_token) throw new Error('Conta do Google não conectada.')
  if (token.access_token && token.expiry && Date.now() < token.expiry) return token.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Falha ao renovar token (${res.status}).`)
  const data = await res.json() as { access_token: string; expires_in: number }
  const updated: Token = {
    ...token,
    access_token: data.access_token,
    expiry: Date.now() + (data.expires_in - 60) * 1000,
  }
  saveToken(updated)
  return data.access_token
}

// ── Drive REST ──────────────────────────────────────────────────────────────────
async function driveJson<T>(url: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken()
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text().catch(() => '')}`)
  return await res.json() as T
}

async function ensureFolder(): Promise<string> {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const found = await driveJson<{ files: { id: string }[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`,
  )
  if (found.files.length > 0) return found.files[0].id
  const created = await driveJson<{ id: string }>('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  return created.id
}

async function findFileInFolder(folderId: string, name: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${name}' and '${folderId}' in parents and trashed=false`)
  const found = await driveJson<{ files: { id: string }[] }>(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`,
  )
  return found.files[0]?.id ?? null
}

async function uploadFile(folderId: string, name: string, content: string): Promise<void> {
  const accessToken = await getAccessToken()
  const existingId = await findFileInFolder(folderId, name)

  if (existingId) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: content,
    })
    if (!res.ok) throw new Error(`upload(update) ${name}: ${res.status}`)
    return
  }

  const boundary = '----inkforge' + Date.now()
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name, parents: [folderId] }) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    content +
    `\r\n--${boundary}--`
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  if (!res.ok) throw new Error(`upload(create) ${name}: ${res.status}`)
}

async function downloadFile(fileId: string): Promise<string> {
  const accessToken = await getAccessToken()
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`download ${fileId}: ${res.status}`)
  return await res.text()
}

// ── Ações expostas ──────────────────────────────────────────────────────────────
async function backup(): Promise<{ uploaded: string[] }> {
  const folderId = await ensureFolder()
  const uploaded: string[] = []
  for (const name of DATA_FILES) {
    const local = path.join(dataDir, name)
    if (!fs.existsSync(local)) continue
    await uploadFile(folderId, name, fs.readFileSync(local, 'utf-8'))
    uploaded.push(name)
  }
  return { uploaded }
}

async function restore(): Promise<{ restored: string[] }> {
  const folderId = await ensureFolder()
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  const restored: string[] = []
  for (const name of DATA_FILES) {
    const id = await findFileInFolder(folderId, name)
    if (!id) continue
    const content = await downloadFile(id)
    fs.writeFileSync(path.join(dataDir, name), content, 'utf-8')
    restored.push(name)
  }
  return { restored }
}

interface AuthStatus { hasCredentials: boolean; connected: boolean; email?: string }
function status(): AuthStatus {
  const creds = loadCreds()
  const token = loadToken()
  return { hasCredentials: !!creds, connected: !!token?.refresh_token, email: token?.email }
}

export function initGoogleDrive(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('gdrive-status', () => status())

  ipcMain.handle('gdrive-set-credentials', (_e, creds: Creds) => {
    if (!creds?.clientId || !creds?.clientSecret) throw new Error('Client ID e Client Secret são obrigatórios.')
    writeJsonFile(credsPath, { clientId: creds.clientId.trim(), clientSecret: creds.clientSecret.trim() })
    return status()
  })

  ipcMain.handle('gdrive-connect', async () => {
    const creds = loadCreds()
    if (!creds) throw new Error('Configure o Client ID/Secret primeiro.')
    await runOAuth(creds)
    getWin()?.focus()
    return status()
  })

  ipcMain.handle('gdrive-disconnect', () => {
    try { if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath) } catch { /* noop */ }
    return status()
  })

  ipcMain.handle('gdrive-backup', () => backup())
  ipcMain.handle('gdrive-restore', () => restore())
}
