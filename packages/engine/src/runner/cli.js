#!/usr/bin/env node

/**
 * PortalSync Desktop Runner CLI
 * 
 * Command-line interface for the PortalSync desktop browser automation runner.
 * Provides diagnostics (`doctor`), cloud polling daemon (`listen`), and single workflow execution (`run`).
 * 
 * Zero external dependencies — pure Node.js CommonJS.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { CloudClient } = require('./cloud-client');
const { RunnerDaemon, checkCdpResponding } = require('./runner-daemon');

// CLI Version & Package Info
const PKG_VERSION = '1.0.0';

/**
 * Format colored output safely without external libraries
 */
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function format(tag, color, text) {
  return `${color}${colors.bold}[${tag}]${colors.reset} ${text}`;
}

const log = {
  ok: (text) => console.log(format('OK', colors.green, text)),
  fail: (text) => console.log(format('FAIL', colors.red, text)),
  warn: (text) => console.log(format('WARN', colors.yellow, text)),
  info: (text) => console.log(format('INFO', colors.cyan, text)),
  plain: (...args) => console.log(...args),
};

/**
 * Lightweight, zero-dependency command line argument parser
 * @param {string[]} argv 
 * @returns {{ command: string, positional: string[], options: Record<string, any> }}
 */
function parseCliArgs(argv) {
  const options = {};
  const positional = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--port' || arg === '-p') {
      options.port = parseInt(argv[++i], 10);
    } else if (arg.startsWith('--port=')) {
      options.port = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--cloud-url' || arg === '-u') {
      options.cloudUrl = argv[++i];
    } else if (arg.startsWith('--cloud-url=')) {
      options.cloudUrl = arg.split('=')[1];
    } else if (arg === '--token' || arg === '-t') {
      options.token = argv[++i];
    } else if (arg.startsWith('--token=')) {
      options.token = arg.split('=')[1];
    } else if (arg === '--poll-interval' || arg === '-i') {
      options.pollInterval = parseInt(argv[++i], 10);
    } else if (arg.startsWith('--poll-interval=')) {
      options.pollInterval = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--target-folder' || arg === '-d') {
      options.targetFolder = argv[++i];
    } else if (arg.startsWith('--target-folder=')) {
      options.targetFolder = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
    i++;
  }

  const command = positional[0] || '';
  const commandArgs = positional.slice(1);

  return {
    command,
    positional: commandArgs,
    options,
  };
}

/**
 * Display root CLI help
 */
function showRootHelp() {
  console.log(`
${colors.bold}${colors.cyan}PortalSync Desktop Runner CLI${colors.reset} v${PKG_VERSION}
Connected Chrome Browser Automation & Cloud Replay Bridge

${colors.bold}USAGE:${colors.reset}
  node packages/engine/src/runner/cli.js <command> [options]

${colors.bold}COMMANDS:${colors.reset}
  ${colors.bold}doctor${colors.reset}                Run diagnostic health check for Chrome CDP & Cloud API
  ${colors.bold}listen${colors.reset}                Start continuous polling daemon for pending cloud runs
  ${colors.bold}run <workflow_id>${colors.reset}     Fetch and execute a single workflow immediately

${colors.bold}GLOBAL OPTIONS:${colors.reset}
  -p, --port <number>          Chrome remote debugging port (default: 9222)
  -u, --cloud-url <url>        PortalSync Cloud API URL (default: http://localhost:3000)
  -t, --token <token>          Runner authentication token (ps_live_<org_id>)
  -d, --target-folder <path>   Directory for downloaded artifacts (default: ~/Downloads/PortalSync)
  -h, --help                   Show help information
  -v, --version                Show version information

${colors.bold}EXAMPLES:${colors.reset}
  node packages/engine/src/runner/cli.js doctor
  node packages/engine/src/runner/cli.js doctor --port 9222 --cloud-url http://localhost:3000
  node packages/engine/src/runner/cli.js listen --token ps_live_org123 --poll-interval 10
  node packages/engine/src/runner/cli.js run wf_12345 --port 9222
`);
}

/**
 * Display help for doctor command
 */
function showDoctorHelp() {
  console.log(`
${colors.bold}USAGE:${colors.reset}
  node packages/engine/src/runner/cli.js doctor [options]

${colors.bold}DESCRIPTION:${colors.reset}
  Diagnose desktop runner environment health, Chrome DevTools Protocol (CDP)
  port connectivity, and PortalSync Cloud API authentication status.

${colors.bold}OPTIONS:${colors.reset}
  -p, --port <number>          Chrome CDP debugging port to probe (default: 9222)
  -u, --cloud-url <url>        PortalSync Cloud API URL (default: http://localhost:3000)
  -t, --token <token>          Runner token ps_live_<org_id> to validate
  -d, --target-folder <path>   Directory to test for artifact write permissions
  -h, --help                   Show this help message

${colors.bold}EXAMPLES:${colors.reset}
  node packages/engine/src/runner/cli.js doctor
  node packages/engine/src/runner/cli.js doctor --port 9222 --token ps_live_123
`);
}

/**
 * Display help for listen command
 */
function showListenHelp() {
  console.log(`
${colors.bold}USAGE:${colors.reset}
  node packages/engine/src/runner/cli.js listen [options]

${colors.bold}DESCRIPTION:${colors.reset}
  Start the continuous runner daemon. Polls the cloud control plane for
  pending workflow execution runs every 10–15 seconds, claims runs, and
  executes them in the local Chrome browser with 90-second 2FA intervention.

${colors.bold}OPTIONS:${colors.reset}
  -p, --port <number>          Chrome CDP debugging port (default: 9222)
  -u, --cloud-url <url>        PortalSync Cloud API URL (default: http://localhost:3000)
  -t, --token <token>          Runner token ps_live_<org_id> (required for cloud polling)
  -i, --poll-interval <s>      Polling interval in seconds (default: 10, range: 10-15)
  -d, --target-folder <path>   Destination directory for invoice artifacts (default: ~/Downloads/PortalSync)
  -h, --help                   Show this help message

${colors.bold}EXAMPLES:${colors.reset}
  node packages/engine/src/runner/cli.js listen --token ps_live_acme_corp
  node packages/engine/src/runner/cli.js listen --port 9222 --poll-interval 15
`);
}

/**
 * Display help for run command
 */
function showRunHelp() {
  console.log(`
${colors.bold}USAGE:${colors.reset}
  node packages/engine/src/runner/cli.js run <workflow_id> [options]

${colors.bold}DESCRIPTION:${colors.reset}
  Fetch a specific workflow definition from the PortalSync Cloud API and
  execute it immediately in the connected Chrome browser.

${colors.bold}ARGUMENTS:${colors.reset}
  <workflow_id>                ID of the cloud workflow to execute

${colors.bold}OPTIONS:${colors.reset}
  -p, --port <number>          Chrome CDP debugging port (default: 9222)
  -u, --cloud-url <url>        PortalSync Cloud API URL (default: http://localhost:3000)
  -t, --token <token>          Runner token ps_live_<org_id>
  -d, --target-folder <path>   Destination directory for invoice artifacts (default: ~/Downloads/PortalSync)
  -h, --help                   Show this help message

${colors.bold}EXAMPLES:${colors.reset}
  node packages/engine/src/runner/cli.js run wf_invoices_01
  node packages/engine/src/runner/cli.js run wf_invoices_01 --port 9222 --token ps_live_acme
`);
}

/**
 * Execute doctor diagnostics
 * @param {Record<string, any>} options 
 */
async function runDoctor(options) {
  const port = options.port || 9222;
  const cloudUrl = options.cloudUrl || process.env.PORTALSYNC_CLOUD_URL || 'http://localhost:3000';
  const token = options.token || process.env.PORTALSYNC_RUNNER_TOKEN || '';
  const targetFolder = options.targetFolder || path.join(os.homedir(), 'Downloads', 'PortalSync');

  console.log(`\n${colors.bold}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} PortalSync Desktop Runner Doctor${colors.reset}`);
  console.log(`${colors.bold}========================================${colors.reset}\n`);

  let allChecksPassed = true;

  // 1. Runtime Environment Check
  console.log(`${colors.bold}1. Node.js Runtime Environment:${colors.reset}`);
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion >= 18) {
    log.ok(`Node.js version: ${nodeVersion} (Platform: ${process.platform} ${process.arch})`);
  } else {
    log.warn(`Node.js version is ${nodeVersion}. Version >= 18 recommended.`);
  }

  const hasFetch = typeof globalThis.fetch === 'function';
  if (hasFetch) {
    log.ok('Native fetch API is available');
  } else {
    log.fail('Native fetch API is missing');
    allChecksPassed = false;
  }

  // 2. Chrome CDP Connectivity Check
  console.log(`\n${colors.bold}2. Chrome DevTools Protocol (CDP) on Port ${port}:${colors.reset}`);
  const cdpCheck = await checkCdpResponding(port);
  if (cdpCheck.responding) {
    const browserName = cdpCheck.data?.Browser || 'Chrome';
    const wsUrl = cdpCheck.data?.webSocketDebuggerUrl || 'active';
    log.ok(`Chrome CDP is responding on 127.0.0.1:${port}`);
    log.info(`Browser: ${browserName}`);
    log.info(`Debugger WebSocket: ${wsUrl}`);
  } else {
    log.warn(`Chrome CDP is NOT responding on port ${port} (${cdpCheck.error || 'Connection refused'})`);
    console.log(`   ${colors.dim}To enable Chrome remote debugging, start Chrome with:${colors.reset}`);
    if (process.platform === 'win32') {
      console.log(`   ${colors.yellow}chrome.exe --remote-debugging-port=${port} --user-data-dir="%USERPROFILE%\\.workflow-capture\\chrome-profile"${colors.reset}`);
    } else {
      console.log(`   ${colors.yellow}google-chrome --remote-debugging-port=${port}${colors.reset}`);
    }
    allChecksPassed = false;
  }

  // 3. PortalSync Cloud API Connectivity Check
  console.log(`\n${colors.bold}3. PortalSync Cloud Control Plane (${cloudUrl}):${colors.reset}`);
  const client = new CloudClient({
    baseUrl: cloudUrl,
    token: token,
    timeoutMs: 5000,
  });

  if (!token) {
    log.info(`No runner token provided. (Specify via --token or PORTALSYNC_RUNNER_TOKEN)`);
  } else {
    log.info(`Using Runner Token: ${token.substring(0, 10)}... (length: ${token.length})`);
  }

  try {
    const health = await client.checkHealth();
    if (health.ok) {
      log.ok(`Cloud API connected successfully at ${cloudUrl}`);
      log.ok(`Runner token validated; pending runs queue accessible`);
    } else if (health.status === 401 || health.status === 403) {
      log.fail(`Cloud API responded with ${health.status} Unauthorized.`);
      log.warn(`Runner token was rejected. Ensure token format is ps_live_<org_id>.`);
      allChecksPassed = false;
    } else {
      log.warn(`Cloud API reachable but returned status ${health.status}: ${health.error || 'Unknown'}`);
    }
  } catch (err) {
    log.warn(`Could not connect to Cloud API at ${cloudUrl}: ${err.message}`);
    log.info(`If apps/web dev server is running on a different port, use --cloud-url http://localhost:<port>`);
    allChecksPassed = false;
  }

  // 4. Artifact Storage Directory Check
  console.log(`\n${colors.bold}4. Local Artifact Storage Directory:${colors.reset}`);
  try {
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    const testFile = path.join(targetFolder, `.test_write_${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    log.ok(`Directory is writable: ${targetFolder}`);
  } catch (err) {
    log.fail(`Failed to write to artifact storage folder ${targetFolder}: ${err.message}`);
    allChecksPassed = false;
  }

  // 5. Automation Runtime Modules Check (Non-blocking lazy check)
  console.log(`\n${colors.bold}5. Automation Engine Modules:${colors.reset}`);
  let puppeteerAvailable = false;
  try {
    require.resolve('puppeteer-core');
    puppeteerAvailable = true;
    log.ok('puppeteer-core is installed and available');
  } catch {
    log.info('puppeteer-core is not installed in current packages/engine/node_modules (lazy loading active)');
  }

  // Summary
  console.log(`\n${colors.bold}========================================${colors.reset}`);
  if (allChecksPassed) {
    console.log(`${colors.green}${colors.bold}Doctor Result: All core checks PASSED!${colors.reset}`);
    console.log(`The desktop runner is ready to execute cloud automation workflows.\n`);
  } else {
    console.log(`${colors.yellow}${colors.bold}Doctor Result: Some checks need attention.${colors.reset}`);
    console.log(`Review the warnings above to ensure full operational readiness.\n`);
  }
}

/**
 * Execute listen command (daemon polling loop)
 * @param {Record<string, any>} options 
 */
async function runListen(options) {
  const port = options.port || 9222;
  const cloudUrl = options.cloudUrl || process.env.PORTALSYNC_CLOUD_URL || 'http://localhost:3000';
  const token = options.token || process.env.PORTALSYNC_RUNNER_TOKEN || '';
  const pollIntervalSeconds = options.pollInterval || 10;
  const targetFolder = options.targetFolder || path.join(os.homedir(), 'Downloads', 'PortalSync');

  if (!token) {
    log.warn('No runner token provided. Set --token or PORTALSYNC_RUNNER_TOKEN to claim organization runs.');
  }

  const daemon = new RunnerDaemon({
    cdpPort: port,
    pollIntervalMs: pollIntervalSeconds * 1000,
    targetFolder,
    cloudClient: {
      baseUrl: cloudUrl,
      token: token,
    },
  });

  // Graceful shutdown handlers
  const cleanup = async () => {
    console.log('\nShutting down runner daemon...');
    await daemon.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  await daemon.start();
}

/**
 * Execute run command (single workflow)
 * @param {string} workflowId 
 * @param {Record<string, any>} options 
 */
async function runWorkflow(workflowId, options) {
  if (!workflowId) {
    console.error(`${colors.red}Error: workflow_id argument is required for 'run' command${colors.reset}`);
    showRunHelp();
    process.exit(1);
  }

  const port = options.port || 9222;
  const cloudUrl = options.cloudUrl || process.env.PORTALSYNC_CLOUD_URL || 'http://localhost:3000';
  const token = options.token || process.env.PORTALSYNC_RUNNER_TOKEN || '';
  const targetFolder = options.targetFolder || path.join(os.homedir(), 'Downloads', 'PortalSync');

  const daemon = new RunnerDaemon({
    cdpPort: port,
    targetFolder,
    cloudClient: {
      baseUrl: cloudUrl,
      token: token,
    },
  });

  log.info(`Executing workflow '${workflowId}' via Cloud API at ${cloudUrl}...`);
  try {
    const result = await daemon.executeWorkflow(workflowId, options);
    log.ok(`Workflow ${workflowId} completed successfully!`);
  } catch (err) {
    log.fail(`Workflow ${workflowId} failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Main CLI entrypoint
 */
async function main() {
  const argv = process.argv.slice(2);
  const parsed = parseCliArgs(argv);

  // Version flag
  if (parsed.options.version) {
    console.log(`PortalSync Desktop Runner v${PKG_VERSION}`);
    process.exit(0);
  }

  // Help handling
  if (parsed.options.help) {
    switch (parsed.command) {
      case 'doctor':
        showDoctorHelp();
        break;
      case 'listen':
        showListenHelp();
        break;
      case 'run':
        showRunHelp();
        break;
      default:
        showRootHelp();
        break;
    }
    process.exit(0);
  }

  // Command routing
  switch (parsed.command) {
    case 'doctor':
      await runDoctor(parsed.options);
      break;

    case 'listen':
      await runListen(parsed.options);
      break;

    case 'run':
      await runWorkflow(parsed.positional[0], parsed.options);
      break;

    default:
      if (!parsed.command) {
        showRootHelp();
      } else {
        console.error(`${colors.red}Unknown command: '${parsed.command}'${colors.reset}\n`);
        showRootHelp();
        process.exit(1);
      }
      break;
  }
}

// Execute when called from CLI
if (require.main === module) {
  main().catch((err) => {
    console.error(`${colors.red}Fatal CLI Error: ${err.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  parseCliArgs,
  runDoctor,
  runListen,
  runWorkflow,
};
