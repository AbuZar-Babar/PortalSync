/**
 * Human-in-the-Loop (HITL) 2FA / OTP Authentication Challenge Detector
 * 
 * Detects two-factor authentication, one-time passwords, SMS codes, authenticator apps,
 * and security challenge prompts in the live browser page.
 * Provides a 90-second countdown intervention window allowing humans to authenticate.
 * 
 * Zero external dependencies — pure DOM evaluation logic.
 */

'use strict';

/**
 * Common DOM selectors for 2FA / OTP inputs and challenge frames
 */
const TWO_FACTOR_SELECTORS = [
  'input[autocomplete="one-time-code"]',
  'input[name*="otp" i]',
  'input[id*="otp" i]',
  'input[name*="2fa" i]',
  'input[id*="2fa" i]',
  'input[name*="mfa" i]',
  'input[id*="mfa" i]',
  'input[name*="verification" i]',
  'input[id*="verification" i]',
  'input[name*="security_code" i]',
  'input[id*="security_code" i]',
  'input[name*="auth_code" i]',
  'input[id*="auth_code" i]',
  'iframe#duo_iframe',
  'iframe[src*="duosecurity.com"]',
  '[data-se="okta-verify"]',
  '.okta-form-title',
  '.mfa-challenge-container',
  '#mfa-prompt',
  '#two-factor-challenge',
];

/**
 * Text keywords strongly signaling a 2FA challenge on the page
 */
const TWO_FACTOR_TEXT_PATTERNS = [
  /two-factor authentication/i,
  /two-step verification/i,
  /enter verification code/i,
  /enter the verification code/i,
  /enter the 6-digit code/i,
  /one-time password/i,
  /one-time passcode/i,
  /authenticator app/i,
  /security code sent to/i,
  /we sent a code to/i,
  /check your phone for a code/i,
  /approve the sign-in request/i,
  /push notification sent/i,
  /verify your identity/i,
];

/**
 * Evaluate if the current browser page is presenting a 2FA challenge
 * @param {any} page - Puppeteer Page or compatible mock
 * @returns {Promise<{ detected: boolean, reason?: string, details?: any }>}
 */
async function detect2FAChallenge(page) {
  if (!page || typeof page.evaluate !== 'function') {
    return { detected: false, reason: 'No page available' };
  }

  try {
    const result = await page.evaluate((selectors, patternsSource) => {
      const url = window.location.href.toLowerCase();

      // Check URL clues
      const is2faUrl = url.includes('/2fa') ||
        url.includes('/mfa') ||
        url.includes('/two-factor') ||
        url.includes('/two-step') ||
        url.includes('/challenge') ||
        url.includes('/otp');

      // Check specific selector matches
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            // Confirm element is visible or attached
            const isVisible = el.offsetParent !== null ||
              (el.getBoundingClientRect && el.getBoundingClientRect().width > 0) ||
              el.tagName === 'IFRAME';
            if (isVisible) {
              return {
                detected: true,
                reason: `Matched 2FA element selector: ${sel}`,
                selector: sel,
                url,
              };
            }
          }
        } catch {}
      }

      // Check 6-digit or numeric code inputs
      const numericInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="tel"], input[type="number"], input:not([type])'));
      for (const input of numericInputs) {
        const maxLen = parseInt(input.getAttribute('maxlength') || '0', 10);
        const inputMode = (input.getAttribute('inputmode') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const pattern = input.getAttribute('pattern') || '';

        const isSixDigit = maxLen === 6 || maxLen === 8;
        const isNumericMode = inputMode === 'numeric' || pattern.includes('[0-9]');
        const placeholderCode = placeholder.includes('code') || placeholder.includes('otp');

        if ((isSixDigit && (isNumericMode || placeholderCode)) || (placeholderCode && isNumericMode)) {
          if (input.offsetParent !== null) {
            return {
              detected: true,
              reason: `Matched 2FA numeric code input (len=${maxLen}, mode=${inputMode})`,
              selector: 'numeric-code-input',
              url,
            };
          }
        }
      }

      // Check page text patterns
      const bodyText = document.body ? document.body.innerText : '';
      if (bodyText) {
        for (const patternStr of patternsSource) {
          const regex = new RegExp(patternStr, 'i');
          if (regex.test(bodyText)) {
            // Ensure this is not just a help link on a normal login form
            // Require presence of at least one input field on the page
            const hasInput = document.querySelector('input') !== null;
            if (hasInput || is2faUrl) {
              return {
                detected: true,
                reason: `Matched 2FA text challenge: "${patternStr}"`,
                pattern: patternStr,
                url,
              };
            }
          }
        }
      }

      if (is2faUrl) {
        return {
          detected: true,
          reason: `Detected 2FA endpoint in current URL: ${url}`,
          url,
        };
      }

      return { detected: false };
    }, TWO_FACTOR_SELECTORS, TWO_FACTOR_TEXT_PATTERNS.map(p => p.source));

    return result || { detected: false };
  } catch (err) {
    // If navigation happened during evaluation or page closed, handle safely
    return { detected: false, error: err.message };
  }
}

/**
 * Poll page for up to 90 seconds (HITL window) waiting for the human to satisfy 2FA.
 * 
 * @param {any} page - Puppeteer page
 * @param {Object} [options]
 * @param {number} [options.timeoutMs] - Maximum intervention duration (default: 90000 ms = 90s)
 * @param {number} [options.pollIntervalMs] - Polling interval (default: 1000 ms)
 * @param {Function} [options.onTick] - Called each second with remaining seconds: (remainingSec) => void
 * @param {Function} [options.checkAuth] - Custom predicate to check if authenticated
 * @returns {Promise<{ resolved: boolean, timedOut: boolean, elapsedMs: number }>}
 */
async function waitFor2FAResolution(page, options = {}, maybePollMs) {
  let timeoutMs = 90000;
  let pollIntervalMs = 1000;
  let onTick = null;
  let checkAuth = null;

  if (typeof options === 'number') {
    timeoutMs = options;
    if (typeof maybePollMs === 'number') {
      pollIntervalMs = maybePollMs;
    }
  } else if (options && typeof options === 'object') {
    timeoutMs = options.timeoutMs ?? 90000;
    pollIntervalMs = options.pollIntervalMs ?? 1000;
    onTick = typeof options.onTick === 'function' ? options.onTick : null;
    checkAuth = typeof options.checkAuth === 'function' ? options.checkAuth : null;
  }

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const elapsed = Date.now() - startTime;
    const remainingMs = Math.max(0, timeoutMs - elapsed);
    const remainingSec = Math.ceil(remainingMs / 1000);

    if (onTick) {
      try {
        onTick(remainingSec);
      } catch {}
    }

    // Wait poll interval
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

    // Check if user authenticated
    if (checkAuth) {
      try {
        const isAuth = await checkAuth(page);
        if (isAuth) {
          return {
            resolved: true,
            timedOut: false,
            elapsedMs: Date.now() - startTime,
          };
        }
      } catch {}
    }

    // Check if 2FA challenge is no longer present
    const challenge = await detect2FAChallenge(page);
    if (!challenge.detected) {
      return {
        resolved: true,
        timedOut: false,
        elapsedMs: Date.now() - startTime,
      };
    }
  }

  return {
    resolved: false,
    timedOut: true,
    elapsedMs: Date.now() - startTime,
  };
}

module.exports = {
  detect2FAChallenge,
  waitFor2FAResolution,
  TWO_FACTOR_SELECTORS,
  TWO_FACTOR_TEXT_PATTERNS,
};
