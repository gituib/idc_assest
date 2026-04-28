/**
 * 日志系统迁移脚本
 * 批量将 routes/ 目录中的 console 调用替换为 logger 调用
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

let totalReplacements = 0;

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 检查是否包含 console 调用
  const consoleMatches = content.match(/console\.(log|error|warn|debug)/g);
  if (!consoleMatches) {
    return;
  }

  const moduleName = file.replace('.js', '').replace(/^[a-z]/, m => m.toUpperCase()) + 'Route';

  // 添加 logger 导入（如果还没有）
  if (!content.includes("require('../utils/logger')")) {
    // 在文件开头添加 logger 导入
    content = `const logger = require('../utils/logger').module('${moduleName}');\n${content}`;
  }

  // 替换 console.error('xxx:', error) -> logger.error('xxx', { error: error.message, stack: error.stack })
  // 替换 console.error('xxx:', error.message) -> logger.error('xxx', { error: error.message })
  // 替换 console.error('xxx:', err) -> logger.error('xxx', { error: err.message, stack: err.stack })

  // 先处理带有 error 对象的 console.error
  content = content.replace(
    /console\.error\(['"`](.+?)['"`],\s*(error|err)\);?/g,
    (match, msg, varName) => {
      totalReplacements++;
      // 清理消息末尾的冒号
      const cleanMsg = msg.replace(/[:：]\s*$/, '').trim();
      return `logger.error('${cleanMsg}', { ${varName}: ${varName}.message, stack: ${varName}.stack });`;
    }
  );

  // 处理 console.error('xxx:', error.message)
  content = content.replace(
    /console\.error\(['"`](.+?)['"`],\s*(error|err)\.message\);?/g,
    (match, msg) => {
      totalReplacements++;
      const cleanMsg = msg.replace(/[:：]\s*$/, '').trim();
      return `logger.error('${cleanMsg}', { error: error.message });`;
    }
  );

  // 处理 console.error('xxx:', someVar) -> logger.error('xxx', { error: someVar })
  content = content.replace(
    /console\.error\(['"`](.+?)['"`],\s*([^);]+)\);?/g,
    (match, msg, varName) => {
      totalReplacements++;
      const cleanMsg = msg.replace(/[:：]\s*$/, '').trim();
      return `logger.error('${cleanMsg}', { error: ${varName.trim()} });`;
    }
  );

  // 处理 console.error('xxx') -> logger.error('xxx')
  content = content.replace(
    /console\.error\(['"`](.+?)['"`]\);?/g,
    (match, msg) => {
      totalReplacements++;
      return `logger.error('${msg}');`;
    }
  );

  // 处理 console.warn('xxx:', { ... }) -> logger.warn('xxx', { ... })
  content = content.replace(
    /console\.warn\(['"`](.+?)['"`],\s*\{/g,
    (match, msg) => {
      totalReplacements++;
      const cleanMsg = msg.replace(/[:：]\s*$/, '').trim();
      return `logger.warn('${cleanMsg}', {`;
    }
  );

  // 处理 console.warn('xxx') -> logger.warn('xxx')
  content = content.replace(
    /console\.warn\(['"`](.+?)['"`]\);?/g,
    (match, msg) => {
      totalReplacements++;
      return `logger.warn('${msg}');`;
    }
  );

  // 处理 console.log('xxx:', var) -> logger.info('xxx', { var })
  content = content.replace(
    /console\.log\(['"`](.+?)['"`],\s*([^);]+)\);?/g,
    (match, msg, varName) => {
      totalReplacements++;
      const cleanMsg = msg.replace(/[:：]\s*$/, '').trim();
      return `logger.info('${cleanMsg}', { data: ${varName.trim()} });`;
    }
  );

  // 处理 console.log('xxx') -> logger.info('xxx')
  content = content.replace(
    /console\.log\(['"`](.+?)['"`]\);?/g,
    (match, msg) => {
      totalReplacements++;
      return `logger.info('${msg}');`;
    }
  );

  // 处理 console.log(`xxx`) -> logger.info(`xxx`)
  content = content.replace(
    /console\.log\(`(.+?)`\);?/g,
    (match, msg) => {
      totalReplacements++;
      return `logger.info(\`${msg}\`);`;
    }
  );

  // 处理 console.error(`xxx`) -> logger.error(`xxx`)
  content = content.replace(
    /console\.error\(`(.+?)`\);?/g,
    (match, msg) => {
      totalReplacements++;
      return `logger.error(\`${msg}\`);`;
    }
  );

  fs.writeFileSync(filePath, content);
  console.log(`✓ ${file}: 替换了 ${consoleMatches.length} 处 console 调用`);
});

console.log(`\n总计替换了 ${totalReplacements} 处 console 调用`);
