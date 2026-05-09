const { log } = require('./logger');
const { runCommand } = require('./utils');

const rollbackSteps = [];

function addRollbackStep(fn) {
  rollbackSteps.push(fn);
}

async function rollback() {
  if (rollbackSteps.length === 0) {
    log.info('无需回滚');
    return;
  }

  log.step('回滚');
  log.warning('安装失败，正在清理已安装的内容...');

  const totalSteps = rollbackSteps.length;
  let completedSteps = 0;

  for (const step of rollbackSteps.reverse()) {
    try {
      await step();
      completedSteps++;
    } catch {
    }
  }

  const fs = require('fs');
  const path = require('path');
  const configFiles = [
    path.join(__dirname, '..', 'backend', '.env'),
    path.join(__dirname, '..', 'ecosystem.config.js'),
    path.join(__dirname, '..', 'deploy', 'nginx-idc.conf'),
  ];

  for (const file of configFiles) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch {
    }
  }

  try {
    runCommand('pm2 save', { silent: true });
  } catch {
  }

  log.info(`已回滚 ${completedSteps}/${totalSteps} 个步骤`);
  log.info('如需重新安装，请再次运行: node install.js');
}

module.exports = {
  rollbackSteps,
  addRollbackStep,
  rollback,
};
