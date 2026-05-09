const readline = require('readline');
const { log } = require('./logger');

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
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function askPassword(question) {
  return new Promise((resolve) => {
    const prompt = `${question}: `;
    process.stdout.write(prompt);

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
        stdout.write('\n已取消\n');
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
  const { colors } = require('./logger');
  console.log(`\n${question}`);
  options.forEach((opt, idx) => {
    console.log(`  ${colors.cyan}${idx + 1}.${colors.reset} ${opt.label}`);
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
