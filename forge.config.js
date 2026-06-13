const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { execSync } = require('child_process');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'InkForge',
    executableName: 'inkforge',
    icon: path.join(__dirname, 'build', 'icon'),
    ignore: [
      /^\/electron-src/,
      /^\/src/,
      /^\/public/,
      /^\/\.claude/,
      /^\/\.git/,
      /^\/node_modules\/.cache/,
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
