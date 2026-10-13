const path = require('path');
const fs = require('fs');
const Module = require('module');
let app = null;
try {
  const electron = require('electron');
  app = electron.app || (electron.remote && electron.remote.app) || null;
} catch {}

/**
 * Configure Node module search paths so that engine modules loaded from
 * extraResources (outside app.asar) can resolve bundled runtime dependencies
 * such as puppeteer-core and dotenv.
 */
function setupModuleResolutionPaths() {
  const candidatePaths = [];

  if (app && app.isPackaged) {
    candidatePaths.push(
      path.join(process.resourcesPath, 'app.asar', 'node_modules'),
      path.join(process.resourcesPath, 'app', 'node_modules'),
      path.join(process.resourcesPath, 'node_modules')
    );
  }

  // Also include desktop app and monorepo root node_modules for local development
  candidatePaths.push(
    path.resolve(__dirname, '../../node_modules'),
    path.resolve(__dirname, '../../../../node_modules')
  );

  const validPaths = candidatePaths.filter((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (validPaths.length > 0) {
    process.env.NODE_PATH = [...validPaths, process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter);
    if (typeof Module._initPaths === 'function') {
      Module._initPaths();
    }
    for (const p of validPaths) {
      if (Array.isArray(Module.globalPaths) && !Module.globalPaths.includes(p)) {
        Module.globalPaths.push(p);
      }
    }
  }
}

setupModuleResolutionPaths();

/**
 * Resolves the path to packages/engine dynamically
 * Works in development (monorepo paths) and production packaged .exe / .dmg (resourcesPath)
 */
function getEnginePath() {
  // 1. Packaged Electron application resource directory
  if (app && app.isPackaged) {
    const resourceEngine = path.join(process.resourcesPath, 'engine');
    if (fs.existsSync(resourceEngine)) return resourceEngine;
  }

  // 2. Sibling engine folder inside desktop app directory (if bundled)
  const localEngine = path.resolve(__dirname, '../../engine');
  if (fs.existsSync(localEngine)) return localEngine;

  // 3. Monorepo development directory
  const devEngine = path.resolve(__dirname, '../../../../packages/engine');
  if (fs.existsSync(devEngine)) return devEngine;

  throw new Error(`Could not resolve ReFlow engine path. Checked: ${path.resolve(__dirname, '../../../../packages/engine')}`);
}

function requireEngine(subpath) {
  const engineRoot = getEnginePath();
  return require(path.join(engineRoot, subpath));
}

module.exports = {
  getEnginePath,
  requireEngine,
  setupModuleResolutionPaths,
};
