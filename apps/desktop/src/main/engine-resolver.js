const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Resolves the path to packages/engine dynamically
 * Works in development (monorepo paths) and production packaged .exe (resourcesPath)
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

  throw new Error(`Could not resolve FlowMind engine path. Checked: ${path.resolve(__dirname, '../../../../packages/engine')}`);
}

function requireEngine(subpath) {
  const engineRoot = getEnginePath();
  return require(path.join(engineRoot, subpath));
}

module.exports = {
  getEnginePath,
  requireEngine,
};
