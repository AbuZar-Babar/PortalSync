const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.portalsync');
    this.configFile = path.join(this.configDir, 'config.json');
    this.defaultTargetFolder = path.join(os.homedir(), 'Downloads', 'PortalSync');
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.configDir)) {
      try {
        fs.mkdirSync(this.configDir, { recursive: true });
      } catch (err) {
        console.error('Failed to create .portalsync directory:', err);
      }
    }
  }

  getDefaults() {
    return {
      runnerToken: '',
      cloudUrl: 'http://localhost:3000',
      browserMode: 'visible', // 'visible' | 'headless'
      targetFolder: this.defaultTargetFolder,
      autoStartRunner: false,
      minimizeToTray: true,
      lastConnected: null,
      organizationName: null,
    };
  }

  get() {
    this._ensureDir();
    if (!fs.existsSync(this.configFile)) {
      const defaults = this.getDefaults();
      this.save(defaults);
      return defaults;
    }

    try {
      const raw = fs.readFileSync(this.configFile, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...this.getDefaults(), ...parsed };
    } catch (err) {
      console.warn('Failed to parse config file, returning defaults:', err);
      return this.getDefaults();
    }
  }

  save(newConfig) {
    this._ensureDir();
    try {
      const current = this.get();
      const updated = { ...current, ...newConfig };
      fs.writeFileSync(this.configFile, JSON.stringify(updated, null, 2), 'utf8');
      return updated;
    } catch (err) {
      console.error('Failed to save config:', err);
      throw err;
    }
  }
}

module.exports = new ConfigManager();
