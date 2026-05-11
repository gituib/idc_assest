const readline = require('readline');
const { colors, ICONS, log } = require('./logger');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('close', () => {
  process.exit(0);
});

rl.on('error', (err) => {
  log.error(`输入错误: ${err.message}`);
  process.exit(1);
});

function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    const defaultHint = defaultValue ? `${colors.dim}(${defaultValue})${colors.reset}` : '';
    const prompt = `  ${colors.cyan}${ICONS.pointer}${colors.reset} ${colors.bright}${question}${colors.reset} ${defaultHint}${colors.dim}:${colors.reset} `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function askPassword(question) {
  const prompt = `  ${colors.cyan}${ICONS.pointer}${colors.reset} ${colors.bright}${question}${colors.reset} ${colors.dim}:${colors.reset} `;
  process.stdout.write(prompt);

  return new Promise((resolve) => {
    let password = '';
    const stdin = process.stdin;
    const stdout = process.stdout;

    const cleanup = () => {
      if (stdin.isTTY) {
        try {
          stdin.setRawMode(false);
        } catch {}
      }
      stdin.removeListener('data', onData);
    };

    const onData = (data) => {
      const char = data.toString();
      const code = char.charCodeAt(0);

      if (code === 10 || code === 13) {
        cleanup();
        stdout.write('\n');
        resolve(password);
      } else if (code === 3) {
        cleanup();
        stdout.write('\n');
        log.warning('已取消');
        process.exit(0);
      } else if (code === 127 || code === 8) {
        if (password.length > 0) {
          password = password.slice(0, -1);
          stdout.write('\b \b');
        }
      } else if (code >= 32) {
        password += char;
        stdout.write('*');
      }
    };

    if (stdin.isTTY) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on('data', onData);
    } else {
      rl.question('', (answer) => {
        resolve(answer.trim());
      });
    }
  });
}

async function select(question, options, defaultIndex = 1) {
  console.log('');
  console.log(`  ${colors.bright}${question}${colors.reset}`);
  log.divider();

  options.forEach((opt, idx) => {
    const isDefault = idx + 1 === defaultIndex;
    const marker = isDefault
      ? `${colors.cyan}${ICONS.pointer}${colors.reset}`
      : ` `;
    const label = isDefault
      ? `${colors.bright}${opt.label}${colors.reset}`
      : `${colors.dim}${opt.label}${colors.reset}`;
    const num = isDefault
      ? `${colors.cyan}${idx + 1}${colors.reset}`
      : `${colors.dim}${idx + 1}${colors.reset}`;
    console.log(`  ${marker} ${num}. ${label}`);
  });

  const answer = await ask('请选择', String(defaultIndex));
  const index = parseInt(answer) - 1;

  return options[index]?.value || options[0].value;
}

function closeReadline() {
  rl.close();
}

module.exports = {
  ask,
  askPassword,
  select,
  closeReadline,
};
