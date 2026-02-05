/**
 * 前端服务管理器
 * 用于在系统设置中修改端口后自动重启前端服务
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../frontend/.frontend-port');
const PID_FILE = path.join(__dirname, '../frontend/.frontend-pid');

// 检查端口是否被占用
const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false); // 端口被占用
    });
    server.once('listening', () => {
      server.close();
      resolve(true); // 端口可用
    });
    server.listen(port);
  });
};

// 获取当前配置的端口
const getConfiguredPort = () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const port = parseInt(fs.readFileSync(CONFIG_FILE, 'utf-8').trim(), 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
    }
  } catch (e) {
    console.warn('读取端口配置失败:', e.message);
  }
  return 3000; // 默认端口
};

// 保存PID到文件
const savePid = (pid) => {
  try {
    fs.writeFileSync(PID_FILE, pid.toString(), 'utf-8');
  } catch (e) {
    console.error('保存PID失败:', e.message);
  }
};

// 读取PID文件
const getSavedPid = () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
      return isNaN(pid) ? null : pid;
    }
  } catch (e) {
    console.warn('读取PID文件失败:', e.message);
  }
  return null;
};

// 清除PID文件
const clearPid = () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch (e) {
    console.warn('清除PID文件失败:', e.message);
  }
};

// 检查进程是否存在
const isProcessRunning = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
};

// 停止前端服务
const stopFrontend = async () => {
  return new Promise((resolve) => {
    const pid = getSavedPid();

    if (pid && isProcessRunning(pid)) {
      console.log(`正在停止前端服务 (PID: ${pid})...`);

      // Windows 使用 taskkill
      const killCmd = process.platform === 'win32'
        ? `taskkill /PID ${pid} /T /F`
        : `kill -9 ${pid}`;

      exec(killCmd, (error) => {
        if (error) {
          console.warn('停止服务警告:', error.message);
        } else {
          console.log('前端服务已停止');
        }
        clearPid();
        resolve();
      });
    } else {
      console.log('没有找到运行中的前端服务');
      clearPid();
      resolve();
    }
  });
};

// 启动前端服务
const startFrontend = async () => {
  const port = getConfiguredPort();

  // 检查端口是否可用
  const isAvailable = await checkPort(port);
  if (!isAvailable) {
    throw new Error(`端口 ${port} 已被占用，请更换端口或关闭占用该端口的程序`);
  }

  console.log(`正在启动前端服务，端口: ${port}...`);

  const frontendDir = path.join(__dirname, '../frontend');

  // 使用 exec 启动服务（Windows 兼容）
  const isWindows = process.platform === 'win32';
  const cmd = isWindows
    ? `set FRONTEND_PORT=${port} && npm run dev`
    : `FRONTEND_PORT=${port} npm run dev`;

  const child = exec(cmd, {
    cwd: frontendDir,
    windowsHide: true // Windows 隐藏窗口
  });

  // 保存PID
  savePid(child.pid);
  console.log(`前端服务已启动 (PID: ${child.pid})，端口: ${port}`);

  return { pid: child.pid, port };
};

// 重启前端服务
const restartFrontend = async () => {
  console.log('正在重启前端服务...');
  await stopFrontend();

  // 等待1秒确保端口释放
  await new Promise(resolve => setTimeout(resolve, 1000));

  const result = await startFrontend();
  console.log(`前端服务重启完成，访问地址: http://localhost:${result.port}`);
  return result;
};

// 获取前端服务状态
const getStatus = async () => {
  const pid = getSavedPid();
  const port = getConfiguredPort();
  const isRunning = pid ? isProcessRunning(pid) : false;

  // 检查端口实际占用情况
  const portAvailable = await checkPort(port);

  return {
    pid,
    port,
    isRunning,
    portInUse: !portAvailable && !isRunning, // 端口被占用但服务未运行
    url: `http://localhost:${port}`
  };
};

// 命令行接口
const main = async () => {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'start':
        await startFrontend();
        break;
      case 'stop':
        await stopFrontend();
        break;
      case 'restart':
        await restartFrontend();
        break;
      case 'status':
        const status = await getStatus();
        console.log('前端服务状态:');
        console.log(`  PID: ${status.pid || '无'}`);
        console.log(`  端口: ${status.port}`);
        console.log(`  运行中: ${status.isRunning ? '是' : '否'}`);
        console.log(`  访问地址: ${status.url}`);
        if (status.portInUse) {
          console.log('  警告: 端口被其他程序占用');
        }
        break;
      default:
        console.log('用法: node frontend-manager.js [start|stop|restart|status]');
        console.log('');
        console.log('命令:');
        console.log('  start   - 启动前端服务');
        console.log('  stop    - 停止前端服务');
        console.log('  restart - 重启前端服务');
        console.log('  status  - 查看服务状态');
        process.exit(1);
    }
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
};

// 如果是直接运行此脚本
if (require.main === module) {
  main();
}

// 导出模块供其他文件使用
module.exports = {
  startFrontend,
  stopFrontend,
  restartFrontend,
  getStatus,
  getConfiguredPort
};
