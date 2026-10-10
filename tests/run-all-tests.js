#!/usr/bin/env node

/**
 * PortalSync Standalone E2E Multi-Tier Test Runner
 * 
 * Executes all test suites across Tiers 1-4, calculates comprehensive metrics,
 * prints structured test reports, and exits with code 0 on pass or code 1 on fail.
 * 
 * Zero external dependencies — pure Node.js CommonJS.
 */

'use strict';

const path = require('node:path');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const TEST_TIERS = [
  {
    tier: 1,
    name: 'Tier 1: Feature Coverage (R1 Cloud API, R2 Dashboard, R3 Desktop Runner, Localhost Bridge, Recording Flow, Portal Storage)',
    suites: [
      { name: 'R1 Cloud API', file: './tier1-features/test-r1-cloud-api.js' },
      { name: 'R2 Dashboard Contracts', file: './tier1-features/test-r2-dashboard.js' },
      { name: 'R3 Desktop Runner', file: './tier1-features/test-r3-desktop-runner.js' },
      { name: 'R1 Localhost Bridge', file: './tier1-features/test-r1-localhost-bridge.js' },
      { name: 'R2 Dashboard Recording Flow', file: './tier1-features/test-r2-recording-flow.js' },
      { name: 'R3 Portal Storage & Deduplication', file: './tier1-features/test-r3-portal-storage-dedup.js' },
      { name: 'R4 Visual Editor & Hybrid Storage', file: './tier1-features/test-r4-visual-editor-storage.js' },
    ],
  },
  {
    tier: 2,
    name: 'Tier 2: Boundary & Corner Cases (Tokens, Transitions, Bodies, Hashes, 90s HITL)',
    suites: [
      { name: 'Token Errors & Auth', file: './tier2-boundaries/test-token-errors.js' },
      { name: 'Status Transitions', file: './tier2-boundaries/test-status-transitions.js' },
      { name: 'Empty & Malformed Bodies', file: './tier2-boundaries/test-empty-bodies.js' },
      { name: 'File Hash Uniqueness', file: './tier2-boundaries/test-file-hash-uniqueness.js' },
      { name: '90s HITL Timeout Edges', file: './tier2-boundaries/test-timeout-90s-edge.js' },
    ],
  },
  {
    tier: 3,
    name: 'Tier 3: Cross-Feature Interactions (Pairwise State Synchronization)',
    suites: [
      { name: 'Cross-Feature Lifecycle', file: './tier3-interactions/test-cross-feature-lifecycle.js' },
    ],
  },
  {
    tier: 4,
    name: 'Tier 4: Real-World Scenarios (End-to-End Enterprise Invoice Extraction)',
    suites: [
      { name: 'Real-World Invoice Lifecycle', file: './tier4-realworld/test-invoice-capture-scenario.js' },
    ],
  },
];

async function runAllTests() {
  const globalStartTime = Date.now();

  console.log(`\n${COLORS.bold}${COLORS.cyan}================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.white}       PortalSync E2E Test Suite Runner (Tiers 1 - 4)          ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}================================================================${COLORS.reset}\n`);

  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  let grandSkipped = 0;
  const tierResults = [];
  const allErrors = [];

  for (const tierDef of TEST_TIERS) {
    const tierStart = Date.now();
    let tierTotal = 0;
    let tierPassed = 0;
    let tierFailed = 0;
    let tierSkipped = 0;

    console.log(`\n${COLORS.bold}${COLORS.blue}>>> [TIER ${tierDef.tier}] ${tierDef.name}${COLORS.reset}`);
    console.log(`${COLORS.dim}${'─'.repeat(70)}${COLORS.reset}`);

    for (const suiteDef of tierDef.suites) {
      try {
        const suitePath = path.resolve(__dirname, suiteDef.file);
        const { harness } = require(suitePath);
        if (!harness || typeof harness.run !== 'function') {
          throw new Error(`Module ${suiteDef.file} does not export a valid TestHarness instance`);
        }

        const result = await harness.run();
        tierTotal += result.total;
        tierPassed += result.passed;
        tierFailed += result.failed;
        tierSkipped += result.skipped;

        if (result.errors && result.errors.length > 0) {
          allErrors.push(...result.errors);
        }
      } catch (err) {
        tierFailed++;
        tierTotal++;
        allErrors.push({ suite: suiteDef.name, test: 'Suite Load', error: err });
        console.error(`${COLORS.red}Failed to execute suite ${suiteDef.name}: ${err.message}${COLORS.reset}`);
      }
    }

    const tierDuration = Date.now() - tierStart;
    tierResults.push({
      tier: tierDef.tier,
      name: tierDef.name,
      total: tierTotal,
      passed: tierPassed,
      failed: tierFailed,
      skipped: tierSkipped,
      duration: tierDuration,
    });

    grandTotal += tierTotal;
    grandPassed += tierPassed;
    grandFailed += tierFailed;
    grandSkipped += tierSkipped;
  }

  const grandDuration = Date.now() - globalStartTime;

  // Print Summary Table
  console.log(`\n${COLORS.bold}${COLORS.cyan}================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.white}                    FINAL TEST SUITE SUMMARY                    ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}================================================================${COLORS.reset}\n`);

  console.log(`${COLORS.bold}${'Tier'.padEnd(8)} | ${'Category'.padEnd(38)} | ${'Total'.padStart(6)} | ${'Pass'.padStart(6)} | ${'Fail'.padStart(6)} | ${'Time'.padStart(8)}${COLORS.reset}`);
  console.log(`${'─'.repeat(8)}─┼─${'─'.repeat(38)}─┼─${'─'.repeat(6)}─┼─${'─'.repeat(6)}─┼─${'─'.repeat(6)}─┼─${'─'.repeat(8)}`);

  for (const tr of tierResults) {
    const tierLabel = `Tier ${tr.tier}`.padEnd(8);
    const catLabel = (tr.name.split(':')[1] || tr.name).trim().substring(0, 38).padEnd(38);
    const tot = String(tr.total).padStart(6);
    const pass = `${COLORS.green}${String(tr.passed).padStart(6)}${COLORS.reset}`;
    const fail = tr.failed > 0
      ? `${COLORS.red}${String(tr.failed).padStart(6)}${COLORS.reset}`
      : `${String(tr.failed).padStart(6)}`;
    const time = `${tr.duration}ms`.padStart(8);

    console.log(`${tierLabel} | ${catLabel} | ${tot} | ${pass} | ${fail} | ${time}`);
  }

  console.log(`${'─'.repeat(8)}─┴─${'─'.repeat(38)}─┴─${'─'.repeat(6)}─┴─${'─'.repeat(6)}─┴─${'─'.repeat(6)}─┴─${'─'.repeat(8)}`);
  console.log(`${COLORS.bold}TOTALS   | All 4 Tiers                              | ${String(grandTotal).padStart(6)} | ${COLORS.green}${String(grandPassed).padStart(6)}${COLORS.reset}${COLORS.bold} | ${grandFailed > 0 ? COLORS.red : ''}${String(grandFailed).padStart(6)}${COLORS.reset}${COLORS.bold} | ${grandDuration}ms${COLORS.reset}\n`);

  // Print failure details if any
  if (allErrors.length > 0) {
    console.log(`${COLORS.bold}${COLORS.red}FAILED TESTS (${allErrors.length}):${COLORS.reset}`);
    for (const [idx, errItem] of allErrors.entries()) {
      console.log(`\n  ${idx + 1}. [${errItem.suite}] ${errItem.test}`);
      console.log(`     ${COLORS.red}${errItem.error.message || errItem.error}${COLORS.reset}`);
    }
    console.log('');
  }

  // Final Gate Decision
  if (grandFailed === 0) {
    console.log(`${COLORS.green}${COLORS.bold}>>> SUCCESS: ALL ${grandTotal} TESTS PASSED! Multi-Tier Quality Gates SATISFIED. <<<${COLORS.reset}\n`);
    process.exitCode = 0;
  } else {
    console.log(`${COLORS.red}${COLORS.bold}>>> FAILURE: ${grandFailed} TEST(S) FAILED. Quality Gate NOT satisfied. <<<${COLORS.reset}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runAllTests().catch((err) => {
    console.error(`Fatal Runner Error: ${err.message}`, err);
    process.exitCode = 1;
  });
}

module.exports = { runAllTests };
