"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPdf = exportPdf;
exports.exportEpub = exportEpub;
exports.exportMobi = exportMobi;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const jszip_1 = __importDefault(require("jszip"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// ── HTML template ────────────────────────────────────────────────────────────
function loreAppendixHtml(lore) {
    if (!lore.length)
        return '';
    // Group by typeLabel
    const groups = new Map();
    for (const e of lore) {
        const key = e.typeLabel || e.type;
        if (!groups.has(key))
            groups.set(key, []);
        groups.get(key).push(e);
    }
    const sections = Array.from(groups.entries()).map(([label, entities]) => `
    <div class="lore-group">
      <h3 class="lore-type">${escapeHtml(label)}</h3>
      ${entities.map(e => `
        <div class="lore-entry">
          <div class="lore-name">${escapeHtml(e.name)}</div>
          ${e.summary ? `<div class="lore-summary">${escapeHtml(e.summary)}</div>` : ''}
          ${e.tags.length ? `<div class="lore-tags">${e.tags.map(t => `<span class="lore-tag">${escapeHtml(t)}</span>`).join(' ')}</div>` : ''}
        </div>`).join('\n')}
    </div>`).join('\n');
    return `
<div class="page-break"></div>
<h2 class="appendix-title">Apêndice — Guia do Universo</h2>
<p class="appendix-intro">Referência das entidades, locais e personagens que habitam este mundo.</p>
${sections}`;
}
function bookHtml(book) {
    const body = book.chapters.map(ch => `
    <h1 class="chapter-title">${escapeHtml(ch.title)}</h1>
    <div class="chapter-body">${ch.htmlContent}</div>
    <div class="page-break"></div>
  `).join('\n');
    const appendix = book.lore?.length ? loreAppendixHtml(book.lore) : '';
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(book.title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.8;
    color: #1a1a1a;
    background: #fff;
    padding: 2.5cm 3cm;
    max-width: 800px;
    margin: 0 auto;
  }
  h1 { font-size: 2em; margin: 0 0 0.5em; font-weight: 700; color: #111; }
  h2 { font-size: 1.5em; margin: 1.2em 0 0.4em; color: #222; }
  h3 { font-size: 1.2em; margin: 1em 0 0.3em; color: #333; }
  p  { margin-bottom: 0.8em; text-align: justify; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
  code { font-family: monospace; background: #f4f4f4; padding: 0.1em 0.3em; border-radius: 3px; }
  .chapter-title {
    font-size: 1.8em;
    margin-top: 1em;
    margin-bottom: 1.2em;
    padding-bottom: 0.3em;
    border-bottom: 2px solid #333;
  }
  .chapter-body { margin-bottom: 2em; }
  .page-break { page-break-after: always; break-after: page; height: 0; }
  /* Appendix */
  .appendix-title {
    font-size: 1.6em;
    border-bottom: 2px solid #555;
    padding-bottom: 0.3em;
    margin-bottom: 0.4em;
  }
  .appendix-intro { color: #555; font-style: italic; margin-bottom: 2em; }
  .lore-group    { margin-bottom: 2em; }
  .lore-type     {
    font-size: 1em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #444;
    border-bottom: 1px solid #ddd;
    padding-bottom: 0.2em;
    margin-bottom: 1em;
  }
  .lore-entry    { margin-bottom: 1.2em; padding-left: 1em; border-left: 3px solid #ddd; }
  .lore-name     { font-weight: 700; font-size: 1.05em; margin-bottom: 0.2em; }
  .lore-summary  { color: #333; margin-bottom: 0.3em; }
  .lore-tags     { margin-top: 0.2em; }
  .lore-tag      {
    display: inline-block;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 3px;
    font-size: 0.8em;
    padding: 0.05em 0.4em;
    margin-right: 0.3em;
    color: #555;
  }
  @media print {
    body { padding: 0; }
    .page-break { page-break-after: always; }
  }
</style>
</head>
<body>
<div class="cover">
  <h1 style="font-size:2.5em;text-align:center;border:none;margin-top:2em;">${escapeHtml(book.title)}</h1>
  ${book.author ? `<p style="text-align:center;color:#555;font-style:italic;margin-top:0.5em;">por ${escapeHtml(book.author)}</p>` : ''}
</div>
<div class="page-break"></div>
${body}
${appendix}
</body>
</html>`;
}
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// ── PDF ──────────────────────────────────────────────────────────────────────
async function exportPdf(book) {
    const { canceled, filePath } = await electron_1.dialog.showSaveDialog({
        title: 'Exportar PDF',
        defaultPath: `${book.title}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath)
        return { ok: false };
    const tmpHtml = path_1.default.join(os_1.default.tmpdir(), `inkforge-${Date.now()}.html`);
    fs_1.default.writeFileSync(tmpHtml, bookHtml(book), 'utf-8');
    const win = new electron_1.BrowserWindow({
        show: false,
        webPreferences: { javascript: false },
    });
    try {
        await win.loadFile(tmpHtml);
        const pdfData = await win.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { marginType: 'custom', top: 1, bottom: 1, left: 1.5, right: 1.5 },
        });
        fs_1.default.writeFileSync(filePath, pdfData);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
    finally {
        win.close();
        try {
            fs_1.default.unlinkSync(tmpHtml);
        }
        catch { }
    }
}
// ── EPUB ─────────────────────────────────────────────────────────────────────
async function exportEpub(book) {
    const { canceled, filePath } = await electron_1.dialog.showSaveDialog({
        title: 'Exportar EPUB',
        defaultPath: `${book.title}.epub`,
        filters: [{ name: 'EPUB', extensions: ['epub'] }],
    });
    if (canceled || !filePath)
        return { ok: false };
    try {
        const zip = new jszip_1.default();
        // mimetype must be the first entry, uncompressed
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        // META-INF/container.xml
        zip.folder('META-INF').file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
        const oebps = zip.folder('OEBPS');
        // Styles
        oebps.file('styles.css', `
body { font-family: Georgia, serif; font-size: 1em; line-height: 1.8; color: #1a1a1a; margin: 1em 2em; }
h1 { font-size: 2em; margin: 0.5em 0 1em; border-bottom: 1px solid #aaa; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; margin: 1em 0 0.5em; }
h3 { font-size: 1.2em; margin: 0.8em 0 0.3em; }
p { margin-bottom: 0.7em; text-align: justify; }
hr { border: none; border-top: 1px solid #ccc; margin: 1em 0; }
code { font-family: monospace; background: #f0f0f0; padding: 0.1em 0.3em; }
.appendix-intro { color: #555; font-style: italic; margin-bottom: 1.5em; }
.lore-group { margin-bottom: 2em; }
.lore-type { font-size: 0.9em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; margin-bottom: 1em; }
.lore-entry { margin-bottom: 1em; padding-left: 1em; border-left: 3px solid #ddd; }
.lore-name { font-weight: 700; font-size: 1.05em; margin-bottom: 0.15em; }
.lore-summary { color: #333; margin-bottom: 0.2em; }
.lore-tags { font-size: 0.8em; color: #777; }
`);
        // Chapter files
        const chapterIds = book.chapters.map((_, i) => `ch${String(i + 1).padStart(3, '0')}`);
        const chapFolder = oebps.folder('chapters');
        const xhtmlWrap = (id, title, bodyHtml) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles.css"/>
</head>
<body>${bodyHtml}</body>
</html>`;
        book.chapters.forEach((ch, i) => {
            chapFolder.file(`${chapterIds[i]}.xhtml`, xhtmlWrap(chapterIds[i], ch.title, `<h1>${escapeHtml(ch.title)}</h1>${ch.htmlContent}`));
        });
        // Lore appendix as an extra XHTML chapter
        const hasLore = book.lore && book.lore.length > 0;
        if (hasLore) {
            const groups = new Map();
            for (const e of book.lore) {
                const key = e.typeLabel || e.type;
                if (!groups.has(key))
                    groups.set(key, []);
                groups.get(key).push(e);
            }
            const loreSections = Array.from(groups.entries()).map(([label, entities]) => `
<div class="lore-group">
  <h3 class="lore-type">${escapeHtml(label)}</h3>
  ${entities.map(e => `
  <div class="lore-entry">
    <div class="lore-name">${escapeHtml(e.name)}</div>
    ${e.summary ? `<p class="lore-summary">${escapeHtml(e.summary)}</p>` : ''}
    ${e.tags.length ? `<p class="lore-tags">${e.tags.map(t => escapeHtml(t)).join(' · ')}</p>` : ''}
  </div>`).join('\n')}
</div>`).join('\n');
            chapFolder.file('appendix.xhtml', xhtmlWrap('appendix', 'Apêndice — Guia do Universo', `<h1>Apêndice — Guia do Universo</h1>
<p class="appendix-intro">Referência das entidades, locais e personagens deste mundo.</p>
${loreSections}`));
        }
        const allIds = [...chapterIds, ...(hasLore ? ['appendix'] : [])];
        const allTitles = [...book.chapters.map(c => c.title), ...(hasLore ? ['Apêndice'] : [])];
        const allFiles = [...chapterIds.map(id => `chapters/${id}.xhtml`), ...(hasLore ? ['chapters/appendix.xhtml'] : [])];
        // content.opf
        const manifestItems = allIds.map((id, i) => `<item id="${id}" href="${allFiles[i]}" media-type="application/xhtml+xml"/>`).join('\n    ');
        const spineItems = allIds.map(id => `<itemref idref="${id}"/>`).join('\n    ');
        oebps.file('content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeHtml(book.title)}</dc:title>
    <dc:creator>${escapeHtml(book.author || 'Autor Desconhecido')}</dc:creator>
    <dc:language>pt-BR</dc:language>
    <dc:identifier id="BookId">urn:uuid:${randomUUID()}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`);
        // toc.ncx
        const navPoints = allIds.map((id, i) => `
    <navPoint id="nav${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeHtml(allTitles[i])}</text></navLabel>
      <content src="${allFiles[i]}"/>
    </navPoint>`).join('');
        oebps.file('toc.ncx', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${randomUUID()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeHtml(book.title)}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`);
        const buffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 },
        });
        fs_1.default.writeFileSync(filePath, buffer);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
}
// ── MOBI ─────────────────────────────────────────────────────────────────────
async function findEbookConvert() {
    const candidates = [
        'ebook-convert',
        'C:\\Program Files\\Calibre2\\ebook-convert.exe',
        'C:\\Program Files (x86)\\Calibre2\\ebook-convert.exe',
        path_1.default.join(os_1.default.homedir(), 'AppData', 'Local', 'Programs', 'Calibre2', 'ebook-convert.exe'),
        '/usr/bin/ebook-convert',
        '/usr/local/bin/ebook-convert',
        '/Applications/calibre.app/Contents/MacOS/ebook-convert',
    ];
    for (const candidate of candidates) {
        try {
            await execAsync(`"${candidate}" --version`);
            return candidate;
        }
        catch { }
    }
    return null;
}
async function exportMobi(book) {
    const converter = await findEbookConvert();
    if (!converter) {
        return {
            ok: false,
            needsCalibre: true,
            error: 'Calibre não encontrado. Instale o Calibre (calibre-ebook.com) para exportar MOBI.',
        };
    }
    const { canceled, filePath } = await electron_1.dialog.showSaveDialog({
        title: 'Exportar MOBI',
        defaultPath: `${book.title}.mobi`,
        filters: [{ name: 'MOBI', extensions: ['mobi'] }],
    });
    if (canceled || !filePath)
        return { ok: false };
    const tmpDir = path_1.default.join(os_1.default.tmpdir(), `inkforge-${Date.now()}`);
    const tmpEpub = `${tmpDir}.epub`;
    const tmpMobi = `${tmpDir}.mobi`;
    try {
        // Generate EPUB to temp file first
        const zip = new jszip_1.default();
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        zip.folder('META-INF').file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
        const oebps = zip.folder('OEBPS');
        const chapF = oebps.folder('chapters');
        const ids = book.chapters.map((_, i) => `ch${String(i + 1).padStart(3, '0')}`);
        book.chapters.forEach((ch, i) => {
            chapF.file(`${ids[i]}.xhtml`, `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"/>
<title>${escapeHtml(ch.title)}</title></head>
<body><h1>${escapeHtml(ch.title)}</h1>${ch.htmlContent}</body></html>`);
        });
        oebps.file('content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeHtml(book.title)}</dc:title>
    <dc:creator>${escapeHtml(book.author || '')}</dc:creator>
    <dc:language>pt-BR</dc:language>
    <dc:identifier id="uid">inkforge-${Date.now()}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${ids.map(id => `<item id="${id}" href="chapters/${id}.xhtml" media-type="application/xhtml+xml"/>`).join('\n    ')}
  </manifest>
  <spine toc="ncx">${ids.map(id => `<itemref idref="${id}"/>`).join('')}</spine>
</package>`);
        oebps.file('toc.ncx', `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="inkforge-${Date.now()}"/></head>
  <docTitle><text>${escapeHtml(book.title)}</text></docTitle>
  <navMap>${book.chapters.map((ch, i) => `
    <navPoint id="nav${i}" playOrder="${i + 1}">
      <navLabel><text>${escapeHtml(ch.title)}</text></navLabel>
      <content src="chapters/${ids[i]}.xhtml"/>
    </navPoint>`).join('')}
  </navMap>
</ncx>`);
        const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        fs_1.default.writeFileSync(tmpEpub, buf);
        await execAsync(`"${converter}" "${tmpEpub}" "${tmpMobi}"`);
        const mobiData = fs_1.default.readFileSync(tmpMobi);
        fs_1.default.writeFileSync(filePath, mobiData);
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: String(e) };
    }
    finally {
        try {
            fs_1.default.unlinkSync(tmpEpub);
        }
        catch { }
        try {
            fs_1.default.unlinkSync(tmpMobi);
        }
        catch { }
    }
}
function randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
