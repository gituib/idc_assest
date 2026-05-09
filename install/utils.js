const { execSync } = require('child_process');
const crypto = require('crypto');

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd(),
      shell: true
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe', shell: true });
    return true;
  } catch {
    return false;
  }
}

function generateSecretKey(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  runCommand,
  commandExists,
  generateSecretKey,
};
