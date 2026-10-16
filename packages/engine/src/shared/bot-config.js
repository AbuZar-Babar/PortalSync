/**
 * ReFlow — Bot Configuration & Humanization Presets
 * 
 * Pure in-memory configuration defining mouse movement dynamics,
 * typing cadence, action delays, and anti-captcha evasion presets.
 */

'use strict';

const PRESETS = {
  ultra_stealth: {
    id: 'ultra_stealth',
    name: 'Ultra Stealth (Anti-Captcha & Fingerprint Guard)',
    description: 'Maximum anti-bot evasion. Complex Bezier mouse trajectories, randomized dwell times, human typo hesitation, and complete navigator mask.',
    timing: {
      minActionDelayMs: 450,
      maxActionDelayMs: 1200,
      clickJitterMs: 250,
      preActionDelayMs: 200
    },
    mouse: {
      enabled: true,
      curveType: 'bezier_cubic',
      speed: 'human',
      wobble: 4,
      overshoot: true,
      hoverBeforeClickMs: 280,
      steps: 32
    },
    typing: {
      minTypingDelayMs: 70,
      maxTypingDelayMs: 210,
      punctuationPauseMs: 350,
      variance: 'gaussian'
    },
    resolution: {
      timeoutMs: 10000,
      pollIntervalMs: 150
    },
    stealth: {
      maskWebdriver: true,
      emulatePlugins: true,
      emulateChromeRuntime: true,
      randomizeScroll: true,
      spoofUserAgent: false
    }
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced Automation (Recommended)',
    description: 'Natural human-like timing and smooth mouse curves with balanced execution throughput.',
    timing: {
      minActionDelayMs: 250,
      maxActionDelayMs: 650,
      clickJitterMs: 120,
      preActionDelayMs: 100
    },
    mouse: {
      enabled: true,
      curveType: 'bezier_cubic',
      speed: 'medium',
      wobble: 2,
      overshoot: true,
      hoverBeforeClickMs: 140,
      steps: 22
    },
    typing: {
      minTypingDelayMs: 40,
      maxTypingDelayMs: 120,
      punctuationPauseMs: 180,
      variance: 'uniform'
    },
    resolution: {
      timeoutMs: 5000,
      pollIntervalMs: 100
    },
    stealth: {
      maskWebdriver: true,
      emulatePlugins: true,
      emulateChromeRuntime: true,
      randomizeScroll: false,
      spoofUserAgent: false
    }
  },
  fast: {
    id: 'fast',
    name: 'Fast Track (Dev & Test Bench)',
    description: 'High-speed playback for local development and rapid regression tests without humanization delays.',
    timing: {
      minActionDelayMs: 50,
      maxActionDelayMs: 150,
      clickJitterMs: 20,
      preActionDelayMs: 20
    },
    mouse: {
      enabled: false,
      curveType: 'linear',
      speed: 'fast',
      wobble: 0,
      overshoot: false,
      hoverBeforeClickMs: 0,
      steps: 5
    },
    typing: {
      minTypingDelayMs: 10,
      maxTypingDelayMs: 30,
      punctuationPauseMs: 0,
      variance: 'none'
    },
    resolution: {
      timeoutMs: 3000,
      pollIntervalMs: 50
    },
    stealth: {
      maskWebdriver: false,
      emulatePlugins: false,
      emulateChromeRuntime: false,
      randomizeScroll: false,
      spoofUserAgent: false
    }
  },
  erp: {
    id: 'erp',
    name: 'Enterprise ERP (Patient Polling & Async Grids)',
    description: 'Extended resolution timeouts (15s) and generous pacing delays (2s - 4.5s) for heavy enterprise ERP portals, Sencha ExtJS, and DevExpress data grids.',
    timing: {
      minActionDelayMs: 2000,
      maxActionDelayMs: 4500,
      clickJitterMs: 200,
      preActionDelayMs: 800
    },
    mouse: {
      enabled: true,
      curveType: 'bezier_cubic',
      speed: 'medium',
      wobble: 2,
      overshoot: true,
      hoverBeforeClickMs: 180,
      steps: 22
    },
    typing: {
      minTypingDelayMs: 30,
      maxTypingDelayMs: 100,
      punctuationPauseMs: 150,
      variance: 'uniform'
    },
    resolution: {
      timeoutMs: 15000,
      pollIntervalMs: 150
    },
    stealth: {
      maskWebdriver: true,
      emulatePlugins: true,
      emulateChromeRuntime: true,
      randomizeScroll: false,
      spoofUserAgent: false
    }
  }
};

const DEFAULT_CONFIG = {
  id: 'global_bot_config',
  preset: 'balanced',
  ...PRESETS.balanced
};

/**
 * Get active bot configuration without database dependencies.
 * @param {string} [presetKey='balanced']
 * @returns {object}
 */
function getActiveBotConfig(presetKey = 'balanced') {
  const key = (typeof presetKey === 'string' && PRESETS[presetKey]) ? presetKey : 'balanced';
  return {
    ...DEFAULT_CONFIG,
    ...(PRESETS[key] || PRESETS.balanced),
    preset: key
  };
}

module.exports = {
  PRESETS,
  DEFAULT_CONFIG,
  getActiveBotConfig
};
