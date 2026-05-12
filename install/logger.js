const { INSTALL_STEPS } = require('./constants');

let currentStepIndex = 0;
let logFileStream = null;
const NO_COLOR = process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true';
const IS_TTY = process.stdout.isTTY !== undefined && process.stdout.isTTY !== null;
const FORCE_COLOR = process.env.FORCE_COLOR !== undefined;
const USE_COLOR = !NO_COLOR && (IS_TTY || FORCE_COLOR);
const ESC = USE_COLOR ? '\x1b' : '';

const colors = {
  reset: `${ESC}[0m`,
  bright: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  green: `${ESC}[32m`,
  yellow: `${ESC}[33m`,
  red: `${ESC}[31m`,
  cyan: `${ESC}[36m`,
  gray: `${ESC}[90m`,
  magenta: `${ESC}[35m`,
  blue: `${ESC}[34m`,
  bgCyan: `${ESC}[46m`,
  bgBlue: `${ESC}[44m`,
  white: `${ESC}[37m`,
};

const ICONS = {
  info: 'ℹ',
  success: '✔',
  warning: '⚠',
  error: '✖',
  arrow: '▶',
  bullet: '●',
  pointer: '❯',
  check: '✓',
  cross: '✗',
  dash: '─',
  doubleDash: '═',
  corner: '└',
  pipe: '│',
  diamond: '◆',
  star: '★',
};

function padCenter(text, width) {
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
  const len = stripped.length;
  const pad = Math.max(0, width - len);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return ' '.repeat(left) + text + ' '.repeat(right);
}

function progressBar(current, total, width = 20) {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const bar = `${colors.cyan}${'━'.repeat(filled)}${colors.dim}${'╌'.repeat(empty)}${colors.reset}`;
  return bar;
}

const log = {
  info: (msg) => console.log(`  ${colors.cyan}${ICONS.info}${colors.reset}  ${msg}`),
  success: (msg) => console.log(`  ${colors.green}${ICONS.success}${colors.reset}  ${msg}`),
  warning: (msg) => console.log(`  ${colors.yellow}${ICONS.warning}${colors.reset}  ${msg}`),
  error: (msg) => console.log(`  ${colors.red}${ICONS.error}${colors.reset}  ${msg}`),

  step: (msg, stepIndex) => {
    if (stepIndex !== undefined) {
      currentStepIndex = stepIndex;
    } else {
      const idx = INSTALL_STEPS.findIndex(step => msg.includes(step) || step.includes(msg));
      if (idx >= 0) {
        currentStepIndex = idx;
      }
    }
    const current = currentStepIndex + 1;
    const total = INSTALL_STEPS.length;
    const bar = progressBar(current, total, 15);
    const progress = `${colors.dim}[${current}/${total}]${colors.reset} ${bar}`;
    console.log('');
    console.log(`${progress}`);
    console.log(`  ${colors.bright}${colors.cyan}${ICONS.arrow}${colors.reset} ${colors.bright}${msg}${colors.reset}`);
  },

  divider: () => console.log(`  ${colors.dim}${ICONS.dash.repeat(56)}${colors.reset}`),
  thickDivider: () => console.log(`  ${colors.dim}${ICONS.doubleDash.repeat(56)}${colors.reset}`),

  subStep: (msg) => console.log(`  ${colors.dim}${ICONS.corner}${colors.reset} ${msg}`),

  keyValue: (key, value) => {
    const keyStr = `${colors.dim}${key}${colors.reset}`;
    const valueStr = `${colors.cyan}${value}${colors.reset}`;
    console.log(`  ${ICONS.pipe}  ${keyStr}  ${valueStr}`);
  },

  banner: (title, subtitle, version) => {
    const width = 58;
    const top = `${colors.bright}${colors.cyan}${ICONS.doubleDash.repeat(width + 2)}${colors.reset}`;
    const bottom = top;
    const titleLine = padCenter(`${colors.bright}${colors.white}${title}${colors.reset}`, width);
    const subtitleLine = padCenter(`${colors.dim}${subtitle}${colors.reset}`, width);
    const versionLine = version ? padCenter(`${colors.cyan}v${version}${colors.reset}`, width) : '';

    console.log('');
    console.log(`  ${colors.cyan}╔${top.substring(2)}╗${colors.reset}`);
    console.log(`  ${colors.cyan}║${titleLine}║${colors.reset}`);
    if (subtitle) {
      console.log(`  ${colors.cyan}║${subtitleLine}║${colors.reset}`);
    }
    if (version) {
      console.log(`  ${colors.cyan}║${versionLine}║${colors.reset}`);
    }
    console.log(`  ${colors.cyan}╚${bottom.substring(2)}╝${colors.reset}`);
    console.log('');
  },

  section: (title) => {
    console.log('');
    console.log(`  ${colors.bright}${colors.magenta}${ICONS.diamond}${colors.reset} ${colors.bright}${title}${colors.reset}`);
    log.divider();
  },

  tableRow: (items, widths) => {
    const parts = items.map((item, i) => {
      const stripped = item.replace(/\x1b\[[0-9;]*m/g, '');
      const pad = Math.max(0, (widths[i] || 20) - stripped.length);
      return item + ' '.repeat(pad);
    });
    console.log(`  ${ICONS.pipe}  ${parts.join('  ')}`);
  },
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
  ICONS,
  log,
  padCenter,
  initLogFile,
  closeLogFile,
};
