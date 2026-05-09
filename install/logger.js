const { INSTALL_STEPS } = require('./constants');

let currentStepIndex = 0;
let logFileStream = null;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => {
    const idx = INSTALL_STEPS.indexOf(msg);
    if (idx >= 0) {
      currentStepIndex = idx;
    }
    const progress = currentStepIndex < INSTALL_STEPS.length
      ? `${colors.gray}[${currentStepIndex + 1}/${INSTALL_STEPS.length}]${colors.reset} `
      : '';
    console.log(`\n${progress}${colors.bright}${colors.cyan}▶ ${msg}${colors.reset}`);
  },
  divider: () => console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`),
  subStep: (msg) => console.log(`  ${colors.gray}└${colors.reset} ${msg}`)
};

function initLogFile(LOG_DIR) {
  const fs = require('fs');
  const path = require('path');
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const logFileName = `install_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
  const logFilePath = path.join(LOG_DIR, logFileName);
  logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' });

  const originalConsoleLog = console.log;
  console.log = (...args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
      typeof arg === 'string' ? arg.replace(/\x1b\[[0-9;]*m/g, '') : String(arg)
    ).join(' ');
    logFileStream.write(`[${timestamp}] ${message}\n`);
    originalConsoleLog.apply(console, args);
  };
}

function closeLogFile() {
  if (logFileStream) {
    logFileStream.end();
  }
}

module.exports = {
  colors,
  log,
  initLogFile,
  closeLogFile,
};
