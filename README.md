# InkForge

Editor de escrita criativa para autores — capítulos, *lore*, metas, gamificação e exportação de livros (PDF / EPUB / MOBI). Aplicativo desktop feito com **Electron + React + TypeScript**.

---

## Funcionalidades

- **Editor com Markdown leve** — `**negrito**`, `*itálico*`, títulos, travessão (`Ctrl+Shift+-`) e modo Editar/Visualizar.
- **Lore com @menções** — digite `@Nome` para referenciar personagens, locais, itens e facções, com cartão de detalhes ao passar o mouse.
- **Capítulos** — organização, status (planejado / rascunho / concluído), reordenação e contagem de palavras.
- **Histórico de versões** — snapshots automáticos por capítulo (ao escrever, trocar de capítulo e ao salvar) com *diff* colorido estilo GitHub e restauração.
- **Animação de digitação** — opcional: nenhuma, brilho, cursor pulsante ou *typewriter* (linha centralizada).
- **Foco e Zen** — modos para escrever sem distrações.
- **Sprint de escrita**, **meta diária** e **gamificação** (XP / níveis).
- **Captura rápida** — janela global via `Ctrl+Shift+Space`.
- **Busca** — no capítulo (`Ctrl+F`) e global (`Ctrl+Shift+F` / `Ctrl+P`).
- **Exportação** — livro completo em **PDF**, **EPUB** e **MOBI**, além de backup/importação em JSON.
- **Atualizador in-app** — verifica novas versões via GitHub Releases.

##  Atalhos

| Atalho | Ação |
| --- | --- |
| `Ctrl+P` / `Ctrl+K` | Busca/omnibar |
| `Ctrl+F` | Buscar no capítulo |
| `Ctrl+Shift+F` | Busca global |
| `Ctrl+Shift+Z` | Modo Zen |
| `F` | Modo Foco (fora de um campo de texto) |
| `Ctrl+Shift+-` | Inserir travessão (—) |
| `Ctrl+Shift+Space` | Captura rápida (global) |
| `Ctrl+S` | Salvar tudo (cria checkpoint no histórico) |

##  Stack

- [Electron](https://www.electronjs.org/) + [Electron Forge](https://www.electronforge.io/) (empacotamento / instalador Squirrel)
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) + [Tailwind CSS 4](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand) (estado), [Radix UI](https://www.radix-ui.com/), [lucide-react](https://lucide.dev/)

---

##  Desenvolvimento

> [!IMPORTANT]
> **Use Node.js 22 LTS.** O Node 24 possui uma regressão que faz a biblioteca de descompactação (`extract-zip`) **travar** ao empacotar o Electron — o `npm run make` fica preso em *"Copying files"* indefinidamente. Com o Node 22 LTS o build funciona normalmente.
> ```powershell
> winget install OpenJS.NodeJS.LTS   # ou baixe a versão "LTS" em https://nodejs.org
> node --version                      # deve ser v22.x
> ```

```bash
npm install      # instalar dependências
npm run dev      # rodar em desenvolvimento (Vite + Electron com hot reload)
```

##  Build / Instalador

```bash
npm run package  # gera o app empacotado em out/
npm run make     # gera o instalador (Windows: out/make/squirrel.windows/x64/InkForge-Setup.exe)
```

O `make` também executa `tsc` + `vite build` (front-end) e `tsc -p tsconfig.electron.json` (processo principal do Electron) automaticamente.

##  Atualizações automáticas

No **app instalado**, a atualização é **baixada e instalada pelo próprio app**: o `autoUpdater` do Electron usa o serviço gratuito [update.electronjs.org](https://github.com/electron/update.electronjs.org). Quando há versão nova, ela baixa em segundo plano e o app mostra **"Reiniciar e instalar"**. Em desenvolvimento (`npm run dev`), o auto-update não roda — apenas a checagem pela API do GitHub, com download manual no navegador. Lógica em [`electron-src/updater.ts`](electron-src/updater.ts).

Para que funcione:

1. O repositório precisa estar **público** (a API do GitHub e o update.electronjs.org não enxergam repositórios privados sem token).
2. Publique uma **release** com tag acima da versão do `package.json` anexando **todos** os artefatos do Squirrel (o `update.electronjs.org` precisa do `RELEASES` e do `.nupkg`, não só do `Setup.exe`):

```bash
gh release create v1.5.0 \
  "out/make/squirrel.windows/x64/InkForge-Setup.exe" \
  "out/make/squirrel.windows/x64/RELEASES" \
  "out/make/squirrel.windows/x64/InkForge-1.5.0-full.nupkg" \
  --title "v1.5.0" --notes "Notas da versão..."
```

Antes da primeira release, "Verificar atualização" simplesmente informa que você está na versão mais recente.

---

##  Estrutura

```
electron-src/   processo principal do Electron (main, preload, export, updater) — TypeScript
electron/       saída compilada do processo principal (JS)
src/            aplicação React (componentes, store Zustand, hooks)
build/          ícones do app/instalador
forge.config.js configuração do Electron Forge
```

Os dados do usuário (capítulos, lore, histórico, progresso) ficam em arquivos JSON na pasta de dados do app (`userData/inkforge-data`).

##  Licença

Projeto pessoal. Todos os direitos reservados ao autor, salvo indicação em contrário.
