/**
 * Lightweight Zero-Dependency Test Harness
 * Compatible with Node.js 20+ and Node.js 25+
 */

const assert = require('node:assert');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

class TestHarness {
  constructor(name = 'Test Suite') {
    this.name = name;
    this.suites = [];
    this.globalBeforeAllFns = [];
    this.globalAfterAllFns = [];
    this.globalBeforeEachFns = [];
    this.globalAfterEachFns = [];
    this.currentSuite = null;
    this.totalTests = 0;
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.errors = [];
    this.startTime = 0;
  }

  describe(suiteName, fn) {
    const suite = {
      name: suiteName,
      fn,
      tests: [],
      beforeAllFns: [],
      afterAllFns: [],
      beforeEachFns: [],
      afterEachFns: [],
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  it(testName, fn, options = {}) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {});
    }
    this.currentSuite.tests.push({
      name: testName,
      fn,
      skip: options.skip || false,
    });
  }

  beforeAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeAllFns.push(fn);
    } else {
      this.globalBeforeAllFns.push(fn);
    }
  }

  afterAll(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterAllFns.push(fn);
    } else {
      this.globalAfterAllFns.push(fn);
    }
  }

  beforeEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.beforeEachFns.push(fn);
    } else {
      this.globalBeforeEachFns.push(fn);
    }
  }

  afterEach(fn) {
    if (this.currentSuite) {
      this.currentSuite.afterEachFns.push(fn);
    } else {
      this.globalAfterEachFns.push(fn);
    }
  }

  async run() {
    this.startTime = Date.now();
    console.log(`\n${COLORS.bold}${COLORS.cyan}=== Running: ${this.name} ===${COLORS.reset}\n`);

    for (const globalBefore of this.globalBeforeAllFns) {
      await globalBefore();
    }

    for (const suite of this.suites) {
      console.log(`${COLORS.bold}${suite.name}${COLORS.reset}`);
      for (const beforeAllFn of suite.beforeAllFns) {
        await beforeAllFn();
      }

      for (const test of suite.tests) {
        this.totalTests++;
        if (test.skip) {
          this.skipped++;
          console.log(`  ${COLORS.yellow}○ [SKIP]${COLORS.reset} ${test.name}`);
          continue;
        }

        for (const gBeforeEach of this.globalBeforeEachFns) {
          await gBeforeEach();
        }
        for (const beforeEachFn of suite.beforeEachFns) {
          await beforeEachFn();
        }

        const t0 = Date.now();
        try {
          await test.fn();
          const duration = Date.now() - t0;
          this.passed++;
          console.log(`  ${COLORS.green}✓${COLORS.reset} ${test.name} ${COLORS.dim}(${duration}ms)${COLORS.reset}`);
        } catch (err) {
          const duration = Date.now() - t0;
          this.failed++;
          this.errors.push({ suite: suite.name, test: test.name, error: err });
          console.log(`  ${COLORS.red}✗${COLORS.reset} ${test.name} ${COLORS.dim}(${duration}ms)${COLORS.reset}`);
          console.log(`    ${COLORS.red}${err.message || err}${COLORS.reset}`);
          if (process.env.VERBOSE && err.stack) {
            console.log(`    ${COLORS.dim}${err.stack}${COLORS.reset}`);
          }
        }

        for (const afterEachFn of suite.afterEachFns) {
          await afterEachFn();
        }
        for (const gAfterEach of this.globalAfterEachFns) {
          await gAfterEach();
        }
      }

      for (const afterAllFn of suite.afterAllFns) {
        await afterAllFn();
      }
      console.log('');
    }

    for (const globalAfter of this.globalAfterAllFns) {
      await globalAfter();
    }

    const totalDuration = Date.now() - this.startTime;
    console.log(`${COLORS.bold}Summary for ${this.name}:${COLORS.reset}`);
    console.log(`  Total:   ${this.totalTests}`);
    console.log(`  Passed:  ${COLORS.green}${this.passed}${COLORS.reset}`);
    console.log(`  Failed:  ${this.failed > 0 ? COLORS.red : COLORS.reset}${this.failed}${COLORS.reset}`);
    console.log(`  Skipped: ${this.skipped > 0 ? COLORS.yellow : COLORS.reset}${this.skipped}${COLORS.reset}`);
    console.log(`  Time:    ${totalDuration}ms\n`);

    return {
      name: this.name,
      total: this.totalTests,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      duration: totalDuration,
      errors: this.errors,
    };
  }
}

// Assertions wrapped cleanly
const Assert = {
  ok: (condition, msg) => assert.ok(condition, msg),
  equal: (actual, expected, msg) => assert.strictEqual(actual, expected, msg),
  notEqual: (actual, unexpected, msg) => assert.notStrictEqual(actual, unexpected, msg),
  deepEqual: (actual, expected, msg) => assert.deepStrictEqual(actual, expected, msg),
  includes: (container, item, msg) => {
    if (typeof container === 'string') {
      assert.ok(container.includes(item), msg || `Expected string to include "${item}"`);
    } else if (Array.isArray(container)) {
      assert.ok(container.includes(item), msg || `Expected array to include ${JSON.stringify(item)}`);
    } else {
      throw new Error(`assert.includes expects string or array, got ${typeof container}`);
    }
  },
  match: (actual, regex, msg) => assert.match(actual, regex, msg),
  throws: (fn, expected, msg) => assert.throws(fn, expected, msg),
  rejects: async (asyncFn, expected, msg) => assert.rejects(asyncFn, expected, msg),
};

module.exports = {
  TestHarness,
  Assert,
};
