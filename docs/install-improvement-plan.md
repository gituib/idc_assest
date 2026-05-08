# install.js 安装脚本改进计划

## 概述

本文档记录 `install.js` 安装脚本的改进计划，涵盖 **15 项改进**，按优先级分为高/中/低三档。

---

## 一、高优先级改进

### 1. npm 依赖安装网络问题处理

**问题描述**：
- 直接执行 `npm install`，无重试机制
- 国内访问 npmjs.org 超时/速度慢
- 网络波动导致安装中断无反馈

**改进方案**：

#### 1.1 自动检测并切换镜像源

```javascript
async function detectAndSetRegistry() {
  const registries = [
    { name: '淘宝镜像', url: 'https://registry.npmmirror.com' },
    { name: '腾讯镜像', url: 'https://mirrors.cloud.tencent.com/npm/' },
    { name: '华为镜像', url: 'https://repo.huaweicloud.com/repository/npm/' },
    { name: '官方源', url: 'https://registry.npmjs.org' },
  ];

  for (const registry of registries.slice(0, 3)) {
    const pingResult = await pingRegistry(registry.url);
    if (pingResult.success && pingResult.latency < 3000) {
      log.success(`使用 ${registry.name} (${pingResult.latency}ms)`);
      return registry.url;
    }
  }
  return null;
}

async function pingRegistry(url) {
  const start = Date.now();
  try {
    await new Promise((resolve, reject) => {
      const req = require('https').get(`${url}/-/ping`, (res) => {
        if (res.statusCode === 200) resolve();
        else reject(new Error('Not 200'));
      });
      req.on('error', reject);
      req.setTimeout(3000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
    return { success: true, latency: Date.now() - start };
  } catch {
    return { success: false, latency: Infinity };
  }
}
```

#### 1.2 重试机制与指数退避

```javascript
async function installWithRetry(cwd, name, maxRetries = 3) {
  const baseDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    log.info(`安装 ${name} 依赖 (第 ${attempt}/${maxRetries} 次)...`);
    const result = await runNpmInstall(cwd);

    if (result.success) {
      return { success: true };
    }

    const errorType = analyzeNpmError(result.error);

    if (errorType === 'NETWORK_ERROR' && attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      log.warning(`网络错误，${delay/1000} 秒后重试...`);
      await new Promise(r => setTimeout(r, delay));
      runCommand('npm cache clean --force', { cwd, silent: true });
    } else if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, baseDelay));
    }
  }
  return { success: false };
}

function analyzeNpmError(error) {
  const errorLower = (error || '').toLowerCase();
  if (errorLower.includes('econnrefused') ||
      errorLower.includes('econnreset') ||
      errorLower.includes('etimedout') ||
      errorLower.includes('network')) {
    return 'NETWORK_ERROR';
  }
  return 'UNKNOWN_ERROR';
}
```

#### 1.3 安装进度显示

```javascript
function runNpmInstall(cwd) {
  return new Promise((resolve) => {
    const spawn = require('child_process').spawn;
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    const child = spawn(npm, ['install', '--loglevel=warn'], {
      cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let lastProgress = '';

    child.stdout.on('data', (data) => {
      stdout += data;
      const progressMatch = data.toString().match(/(\d+\/\d+|\d+%)/);
      if (progressMatch) {
        const progress = progressMatch[1];
        if (progress !== lastProgress) {
          process.stdout.write(`\r  安装进度: ${progress}   `);
          lastProgress = progress;
        }
      }
    });

    child.on('close', (code) => {
      if (lastProgress) process.stdout.write('\n');
      resolve({ success: code === 0, output: stdout });
    });

    setTimeout(() => { child.kill(); resolve({ success: false, error: '安装超时' }); }, 10 * 60 * 1000);
  });
}
```

#### 1.4 安装后验证

```javascript
async function verifyDependencies(cwd, name) {
  log.subStep(`验证 ${name} 依赖完整性...`);

  const lsResult = runCommand('npm ls --depth=0 --json', { cwd, silent: true });
  if (!lsResult.success) {
    return { success: false, error: '依赖检查失败' };
  }

  try {
    const deps = JSON.parse(lsResult.output);
    if (deps.problems && deps.problems.length > 0) {
      log.warning(`发现 ${deps.problems.length} 个依赖问题`);
      return { success: false, problems: deps.problems };
    }
    return { success: true };
  } catch {
    return { success: false, error: '验证解析失败' };
  }
}
```

**实施位置**：`install.js` 第 1782-1804 行 `installDependencies()` 函数

---

### 2. 健康检查跨平台兼容性

**问题描述**：
```javascript
// 当前代码（Windows 无 curl）
execSync('curl -s -o /dev/null -w "%{http_code}" ...');
```

**改进方案**：

```javascript
async function healthCheck() {
  const http = require('http');

  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${config.backendPort}/health`, (res) => {
      resolve({ success: res.statusCode === 200, statusCode: res.statusCode });
    });
    req.on('error', () => resolve({ success: false }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ success: false }); });
  });
}
```

**实施位置**：`install.js` 第 2039-2073 行 `healthCheck()` 函数

---

### 3. MySQL 密码安全传递

**问题描述**：
```javascript
// 当前代码 - 密码暴露在命令行
execSync(`mysql -u root -p'${rootPassword}' -e "${sql}"`);
```

**改进方案**：

```javascript
async function createMySQLDatabase(rootPassword) {
  const createDbSql = 'CREATE DATABASE IF NOT EXISTS idc_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;';

  try {
    execSync(`mysql -u root -e "${createDbSql}"`, {
      env: { ...process.env, MYSQL_PWD: rootPassword },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    log.success('数据库创建成功');
  } catch (error) {
    // 错误处理...
  }
}
```

**实施位置**：`install.js` 第 1052-1086 行 `createMySQLDatabase()` 函数

---

### 4. 错误处理完善

**问题描述**：
- 错误后继续执行，导致级联失败
- 无重试选项

**改进方案**：

```javascript
async function initDatabase() {
  const initScript = path.join(__dirname, 'backend', 'scripts', 'init-database.js');

  if (!fs.existsSync(initScript)) {
    log.warning('未找到数据库初始化脚本，跳过');
    return;
  }

  log.info('正在初始化数据库...');
  const result = runCommand('node scripts/init-database.js', {
    cwd: path.join(__dirname, 'backend')
  });

  if (!result.success) {
    const retry = await ask('数据库初始化失败，是否重试? (Y/n)', 'Y');
    if (retry.toLowerCase() === 'y') {
      return await initDatabase();
    }
    throw new Error('Database initialization failed');
  }

  log.success('数据库初始化完成');
}
```

**实施位置**：`install.js` 第 1811-1833 行 `initDatabase()` 函数

---

### 5. 回滚机制

**问题描述**：
- 安装失败后无清理
- 残留半成品状态

**改进方案**：

```javascript
const rollbackSteps = [];

async function installDependencies() {
  try {
    log.step('安装后端依赖...');
    await installBackend();
    rollbackSteps.push(() => runCommand('rmdir /s /q node_modules', { cwd: backendDir, shell: true }));

    log.step('安装前端依赖...');
    await installFrontend();
    rollbackSteps.push(() => runCommand('rmdir /s /q node_modules', { cwd: frontendDir, shell: true }));

  } catch (error) {
    await rollback();
    throw error;
  }
}

async function rollback() {
  log.warning('安装失败，正在回滚...');
  for (const step of rollbackSteps.reverse()) {
    try { await step(); } catch {}
  }
}
```

**实施位置**：新增 `rollbackSteps` 数组和 `rollback()` 函数，在 `main()` 中调用

---

### 6. SQLite 编译依赖替换

**已完成 ✅**

| 文件 | 修改内容 |
|------|---------|
| `backend/package.json` | `sqlite3` → `better-sqlite3` |
| `backend/db.js` | 添加 `dialectModule` 配置 |

---

## 二、中优先级改进

### 7. 日志管理优化

**问题描述**：
- 每次安装生成新日志，无清理
- Windows 文件名不兼容冒号

**改进方案**：

```javascript
function initLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  // 清理 7 天前的旧日志
  const oldLogs = fs.readdirSync(LOG_DIR)
    .filter(f => f.startsWith('install_'))
    .filter(f => {
      const stat = fs.statSync(path.join(LOG_DIR, f));
      return Date.now() - stat.mtimeMs > 7 * 24 * 60 * 60 * 1000;
    });
  oldLogs.forEach(f => fs.unlinkSync(path.join(LOG_DIR, f)));

  // 使用安全的时间格式
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logFileName = `install_${timestamp}.log`;

  logFileStream = fs.createWriteStream(path.join(LOG_DIR, logFileName), { flags: 'a' });

  // 重写 console.log 同时输出到文件和终端
  const originalLog = console.log;
  console.log = (...args) => {
    const message = args.map(arg => String(arg)).join(' ');
    logFileStream.write(`[${new Date().toISOString()}] ${message}\n`);
    originalLog.apply(console, args);
  };
}
```

**实施位置**：`install.js` 第 100-123 行 `initLogFile()` 函数

---

### 8. 配置持久化与恢复

**问题描述**：
- 每次安装需重新配置

**改进方案**：

```javascript
const CONFIG_FILE = path.join(__dirname, '.install-config.json');

async function loadSavedConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return false;

  const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  const useSaved = await ask('检测到上次配置，是否使用? (Y/n)', 'Y');

  if (useSaved.toLowerCase() === 'y') {
    Object.assign(config, saved);
    return true;
  }
  return false;
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  log.subStep('配置已保存');
}

// 在 confirmConfiguration() 成功后调用 saveConfig()
```

**实施位置**：新增 `CONFIG_FILE` 常量、`loadSavedConfig()` 和 `saveConfig()` 函数

---

### 9. 进度显示优化

**问题描述**：
- 只有文字输出，无进度条

**改进方案**：

```javascript
const steps = [
  { name: '环境检测', fn: checkEnvironment },
  { name: '数据库配置', fn: configureDatabase },
  { name: '服务配置', fn: configureServices },
  { name: '安装依赖', fn: installDependencies },
  { name: '初始化数据库', fn: initDatabase },
  { name: '构建前端', fn: buildFrontend },
  { name: '启动服务', fn: startServices },
];

async function runWithProgress() {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const progress = `[${i + 1}/${steps.length}]`;
    log.step(`${progress} ${step.name}`);

    const startTime = Date.now();
    await step.fn();
    log.subStep(`耗时 ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  }
}
```

**实施位置**：新增 `steps` 数组和 `runWithProgress()` 函数

---

### 10. Nginx 版本动态获取

**问题描述**：
```javascript
// 固定版本
const nginxUrl = 'https://nginx.org/download/nginx-1.24.0.zip';
```

**改进方案**：

```javascript
async function getLatestNginxVersion() {
  const https = require('https');
  return new Promise((resolve) => {
    https.get('https://nginx.org/en/download.html', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/nginx-(\d+\.\d+\.\d+)\.zip/);
        resolve(match ? match[1] : '1.24.0');
      });
    }).on('error', () => resolve('1.24.0'));
  });
}

async function autoInstallNginx() {
  const version = await getLatestNginxVersion();
  const nginxUrl = `https://nginx.org/download/nginx-${version}.zip`;
  // 后续下载逻辑...
}
```

**实施位置**：`install.js` 第 1430-1483 行 `autoInstallNginx()` 函数

---

### 11. PM2 serve 本地化

**问题描述**：
```javascript
// 全局安装
runCommand('npm install -g serve');
```

**改进方案**：

```javascript
// 方案1：使用 npx（推荐）
const frontendResult = runCommand(
  `npx serve -s dist -l ${config.frontendPort}`,
  { cwd: path.join(__dirname, 'frontend') }
);

// 方案2：本地安装
runCommand('npm install serve', { cwd: path.join(__dirname, 'frontend') });
```

**实施位置**：`install.js` 第 1889-1903 行 `startServices()` 函数

---

## 三、低优先级改进

### 12. 代码模块化重构

**问题描述**：
- 2100+ 行单文件，难以维护

**改进方案**：

```
scripts/
├── install.js              # 入口
├── lib/
│   ├── logger.js           # 日志模块
│   ├── prompt.js           # 交互输入模块
│   ├── executor.js         # 命令执行模块
│   ├── database.js          # 数据库配置模块
│   ├── nginx.js            # Nginx 配置模块
│   ├── pm2.js              # PM2 配置模块
│   └── health-check.js      # 健康检查模块
└── templates/
    ├── env.template        # .env 模板
    ├── pm2.template.js     # PM2 配置模板
    └── nginx.template      # Nginx 配置模板
```

---

### 13. 卸载脚本

**改进方案**：

```javascript
// uninstall.js
async function uninstall() {
  log.step('停止服务');
  runCommand('pm2 stop idc-backend idc-frontend');
  runCommand('pm2 delete idc-backend idc-frontend');

  log.step('清理文件');
  ['node_modules', 'dist', 'logs'].forEach(dir => {
    const cmd = process.platform === 'win32'
      ? `rmdir /s /q ${dir}`
      : `rm -rf ${dir}`;
    runCommand(cmd, { cwd: backendDir });
    runCommand(cmd, { cwd: frontendDir });
  });

  log.step('清理配置');
  ['.env', '.install-config.json'].forEach(file => {
    const path = `${backendDir}/${file}`;
    if (fs.existsSync(path)) fs.unlinkSync(path);
  });

  log.success('卸载完成');
}
```

---

### 14. 配置验证

**改进方案**：

```javascript
async function validateConfig() {
  const errors = [];

  // 端口冲突检查
  const usedPorts = await checkUsedPorts([config.backendPort, config.frontendPort]);
  if (usedPorts.length > 0) {
    errors.push(`端口已被占用: ${usedPorts.join(', ')}`);
  }

  // 磁盘空间检查
  const freeSpace = await checkDiskSpace(__dirname);
  if (freeSpace < 500 * 1024 * 1024) {
    errors.push('磁盘空间不足 500MB');
  }

  // 权限检查
  if (config.frontendPort < 1024 && !isRootUser()) {
    errors.push(`端口 ${config.frontendPort} 需要 root 权限`);
  }

  return errors;
}
```

---

### 15. 配置导入导出

**改进方案**：

```javascript
// 导入配置
// node install.js --import=config.json

async function importConfig(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const loaded = JSON.parse(content);
  Object.assign(config, loaded);
  log.success(`配置已导入: ${filePath}`);
}

// 导出配置（在 saveConfig 时可选择）
// node install.js --export=config.json
```

---

## 四、实施优先级

| 优先级 | 编号 | 改进项 | 复杂度 | 状态 |
|--------|------|--------|--------|------|
| 🔴高 | 1 | npm 安装网络处理 | 中 | 待实施 |
| 🔴高 | 2 | 健康检查跨平台 | 低 | 待实施 |
| 🔴高 | 3 | MySQL 密码安全 | 低 | 待实施 |
| 🔴高 | 4 | 错误处理完善 | 中 | 待实施 |
| 🔴高 | 5 | 回滚机制 | 高 | 待实施 |
| 🔴高 | 6 | SQLite 替换 | 中 | ✅ 已完成 |
| 🟡中 | 7 | 日志管理 | 低 | 待实施 |
| 🟡中 | 8 | 配置持久化 | 中 | 待实施 |
| 🟡中 | 9 | 进度显示 | 低 | 待实施 |
| 🟡中 | 10 | Nginx 版本动态 | 低 | 待实施 |
| 🟡中 | 11 | PM2 serve 本地化 | 低 | 待实施 |
| 🟢低 | 12 | 代码模块化 | 高 | 待实施 |
| 🟢低 | 13 | 卸载脚本 | 中 | 待实施 |
| 🟢低 | 14 | 配置验证 | 中 | 待实施 |
| 🟢低 | 15 | 配置导入导出 | 低 | 待实施 |

---

## 五、建议实施顺序

### 第一阶段（快速见效）

1. **Nginx 版本动态** (10) - 改动小，立即生效
2. **日志管理优化** (7) - 改动小，提升调试体验
3. **PM2 serve 本地化** (11) - 改动小，避免全局污染

### 第二阶段（核心增强）

4. **npm 安装网络处理** (1) - 提升安装成功率
5. **健康检查跨平台** (2) - Windows 兼容性
6. **MySQL 密码安全** (3) - 安全性

### 第三阶段（健壮性）

7. **错误处理完善** (4) - 提升容错能力
8. **回滚机制** (5) - 失败恢复
9. **配置持久化** (8) - 复用配置
10. **进度显示** (9) - 用户体验

### 第四阶段（长期）

11. **代码模块化** (12) - 提升可维护性
12. **卸载脚本** (13) - 功能完整性
13. **配置验证** (14) - 提前发现问题
14. **配置导入导出** (15) - 扩展性

---

## 六、测试清单

每项改进实施后需验证：

- [ ] Windows 环境
- [ ] Linux 环境（Ubuntu/Debian）
- [ ] Linux 环境（CentOS/RHEL）
- [ ] macOS 环境
- [ ] 非交互模式 (`-y`)
- [ ] 配置恢复功能
- [ ] 日志文件生成
- [ ] 回滚功能（模拟失败）
