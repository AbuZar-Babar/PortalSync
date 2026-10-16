#!/usr/bin/env node
/**
 * Cross-Platform Desktop Build Orchestrator
 * 
 * Handles multi-target builds cleanly across host operating systems:
 * - macOS Host: Builds both macOS Intel (DMG + ZIP) and Windows x64 (.exe installer + portable).
 * - Windows Host: Builds Windows x64 (.exe installer + portable), with clear guidance for macOS Intel.
 * - Linux Host: Builds Linux and Windows x64 targets.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const platform = process.platform;
const desktopRoot = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('  ReFlow Worker — Cross-Platform Build Runner');
console.log(`  Current Host OS: ${platform} (${process.arch})`);
console.log('====================================================\n');

function runElectronBuilder(args) {
  console.log(`> electron-builder ${args.join(' ')}\n`);
  const isWindows = process.platform === 'win32';
  const binName = isWindows ? 'electron-builder.cmd' : 'electron-builder';
  const binPath = path.resolve(desktopRoot, 'node_modules/.bin', binName);

  const res = spawnSync(binPath, args, {
    cwd: desktopRoot,
    stdio: 'inherit',
    shell: true,
  });

  return res.status;
}

if (platform === 'darwin') {
  console.log('Building macOS Intel x64 (.dmg, .zip) and Windows x64 (.exe)...');
  const code = runElectronBuilder(['-mw', '--x64', '--publish', 'never']);
  process.exit(code || 0);
} else if (platform === 'win32') {
  console.log('Building Windows x64 Targets (Setup Installer + Portable EXE)...');
  const winCode = runElectronBuilder(['--win', '--x64', '--publish', 'never']);

  if (winCode !== 0) {
    console.error('\n❌ Windows build failed with exit code:', winCode);
    process.exit(winCode);
  }

  console.log('\n----------------------------------------------------');
  console.log('  NOTE FOR macOS INTEL (x64) BUILD:');
  console.log('  electron-builder enforces that macOS targets (.dmg/.zip)');
  console.log('  must be packaged on a macOS environment or CI runner.');
  console.log('  ');
  console.log('  Options to produce the macOS Intel bundle:');
  console.log('  1. Run on an Intel/Apple Silicon Mac: npm run build:mac');
  console.log('  2. Trigger GitHub Actions CI: .github/workflows/build-desktop.yml');
  console.log('     (runs on GitHub "macos-13" Intel x86_64 runner)');
  console.log('  See apps/desktop/BUILD_MAC.md for full instructions.');
  console.log('----------------------------------------------------\n');
  console.log('✅ Windows build completed successfully!');
  process.exit(0);
} else {
  console.log('Building Linux and Windows targets...');
  const code = runElectronBuilder(['--linux', '--win', '--x64']);
  process.exit(code || 0);
}
