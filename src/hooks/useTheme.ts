import { useState, useEffect } from 'react'

export interface ThemeDef {
  id: string
  label: string
  dark: boolean
  /** [bg, accent] usados como amostra (swatch) no seletor */
  swatch: [string, string]
  /** cores dos controles da janela (min/max/fechar) — casam com a barra superior */
  titlebar: { color: string; symbolColor: string }
}

export const THEMES: ThemeDef[] = [
  { id: 'dark-zinc',   label: 'Escuro · Zinc',  dark: true,  swatch: ['#18181b', '#a78bfa'], titlebar: { color: '#09090b', symbolColor: '#a1a1aa' } },
  { id: 'dark-sepia',  label: 'Escuro · Âmbar', dark: true,  swatch: ['#1c1510', '#f59e0b'], titlebar: { color: '#17110c', symbolColor: '#b3a189' } },
  { id: 'light-paper', label: 'Claro · Papel',  dark: false, swatch: ['#fafafa', '#7c3aed'], titlebar: { color: '#fafafa', symbolColor: '#52525b' } },
  { id: 'light-sepia', label: 'Claro · Sépia',  dark: false, swatch: ['#f4ecd8', '#b45309'], titlebar: { color: '#f4ecd8', symbolColor: '#6e5a40' } },
]

const DEFAULT_THEME = 'dark-zinc'

function resolveInitial(): string {
  const saved = localStorage.getItem('inkforge-theme')
  if (saved === 'dark') return 'dark-zinc'   // migra valores antigos
  if (saved === 'light') return 'light-paper'
  return THEMES.some(t => t.id === saved) ? (saved as string) : DEFAULT_THEME
}

export function useTheme() {
  const [theme, setTheme] = useState<string>(resolveInitial)

  useEffect(() => {
    const def = THEMES.find(t => t.id === theme) ?? THEMES[0]
    const root = document.documentElement
    root.dataset.theme = def.id
    root.classList.toggle('dark', def.dark)
    root.classList.toggle('light', !def.dark)
    localStorage.setItem('inkforge-theme', def.id)
    // Sincroniza os controles da janela do Electron com a paleta do tema.
    window.electronAPI?.setTitleBarTheme?.(def.titlebar)
  }, [theme])

  const current = THEMES.find(t => t.id === theme) ?? THEMES[0]
  return { theme, setTheme, themes: THEMES, isDark: current.dark }
}
