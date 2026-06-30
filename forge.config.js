const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { execSync } = require('child_process');
const path = require('path');

// Assinatura de código (Windows) — opcional. Só assina quando WINDOWS_CERT_FILE
// estiver definido; caso contrário, o build sai normalmente sem assinatura.
// Use com um certificado confiável (Azure Trusted Signing / EV / SignPath) para
// remover o aviso do SmartScreen / Controle inteligente de aplicativos.
const windowsSign = process.env.WINDOWS_CERT_FILE
  ? {
      certificateFile: process.env.WINDOWS_CERT_FILE,
      certificatePassword: process.env.WINDOWS_CERT_PASSWORD,
      timestampServer: process.env.WINDOWS_TIMESTAMP_SERVER || 'http://timestamp.digicert.com',
    }
  : undefined;

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'InkForge',
    executableName: 'inkforge',
    icon: path.join(__dirname, 'build', 'icon'),
    // O binário do Electron já está em cache e íntegro. A verificação de checksum
    // baixa o SHASUMS256.txt do GitHub a cada build e, em redes lentas/bloqueadas,
    // trava o passo "Copying files" indefinidamente. Como usamos o cache local,
    // desligamos essa verificação remota.
    download: {
      unsafelyDisableChecksums: true,
    },
    ...(windowsSign ? { windowsSign } : {}),
    ignore: [
      /^\/electron-src/,
      /^\/src/,
      /^\/public/,
      /^\/out/,
      /^\/\.claude/,
      /^\/\.git/,
      /^\/\.vscode/,
      /^\/node_modules\/.cache/,
      /^\/a\.json$/,
      /^\/\.gitignore$/,
      /^\/README\.md$/,
      /^\/eslint\.config\.js$/,
      /tsconfig.*\.json$/,
      /vite\.config\.ts$/,
      /forge\.config\.js$/,
    ],
  },
  rebuildConfig: {},
  hooks: {
    generateAssets: async () => {
      console.log('Building Vite frontend...');
      execSync('npm run build', { stdio: 'inherit', cwd: path.resolve(__dirname) });
      console.log('Compiling Electron main process...');
      execSync('npm run build:electron', { stdio: 'inherit', cwd: path.resolve(__dirname) });
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'InkForge',
        setupExe: 'InkForge-Setup.exe',
        authors: 'InkForge',
        description: 'InkForge — editor para escritores criativos',
        setupIcon: path.join(__dirname, 'build', 'icon.ico'),
        iconUrl: `file:///${path.join(__dirname, 'build', 'icon.ico').replace(/\\/g, '/')}`,
        ...(windowsSign ? { windowsSign } : {}),
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
