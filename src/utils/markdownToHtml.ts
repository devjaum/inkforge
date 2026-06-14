/**
 * Converts the app's markdown dialect to HTML for book export.
 * Handles: headings, bold, italic, code, hr, paragraphs, @mentions (stripped).
 */
export function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line
    if (line.trim() === '') { i++; continue }

    // Headings
    const h3 = line.match(/^###\s+(.+)/)
    if (h3) { out.push(`<h3>${inlineHtml(h3[1])}</h3>`); i++; continue }
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) { out.push(`<h2>${inlineHtml(h2[1])}</h2>`); i++; continue }
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) { out.push(`<h2>${inlineHtml(h1[1])}</h2>`); i++; continue }

    // HR
    if (/^---+$/.test(line.trim())) { out.push('<hr/>'); i++; continue }

    // Paragraph — collect consecutive non-special lines
    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^#{1,3}\s/) && !/^---+$/.test(lines[i].trim())) {
      para.push(inlineHtml(lines[i]))
      i++
    }
    if (para.length) out.push(`<p>${para.join('<br/>')}</p>`)
  }

  return out.join('\n')
}

function inlineHtml(text: string): string {
  return text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold+italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // @mentions → just the name (strip @)
    .replace(/@(\w+)/g, '$1')
}
