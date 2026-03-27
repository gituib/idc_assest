/**
 * 远端备份上传工具模块
 * 支持 FTP、SFTP、WebDAV、SMB 等协议
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 协议类型枚举
const PROTOCOL_TYPES = {
  FTP: 'ftp',
  SFTP: 'sftp',
  WEBDAV: 'webdav',
  SMB: 'smb',
};

// 协议显示名称映射
const PROTOCOL_LABELS = {
  [PROTOCOL_TYPES.FTP]: 'FTP',
  [PROTOCOL_TYPES.SFTP]: 'SFTP (SSH 文件传输)',
  [PROTOCOL_TYPES.WEBDAV]: 'WebDAV',
  [PROTOCOL_TYPES.SMB]: 'SMB/CIFS 网络共享',
};

/**
 * FTP 上传实现
 */
async function uploadViaFTP(config, localFilePath, remotePath) {
  const { Client } = require('basic-ftp');

  const client = new Client();

  try {
    await client.access({
      host: config.host,
      port: config.port || 21,
      user: config.username,
      password: config.password,
      secure: config.secure || false,
      secureOptions: {
        rejectUnauthorized: config.rejectUnauthorized !== false,
      },
    });

    await client.cd(config.rootPath || '/');

    const dirPath = path.dirname(remotePath);
    if (dirPath !== '.') {
      await ensureRemoteDir(client, dirPath, 'ftp');
    }

    await client.uploadFrom(localFilePath, path.basename(remotePath));

    return {
      success: true,
      message: `FTP 上传成功：${remotePath}`,
    };
  } catch (error) {
    throw new Error(`FTP 上传失败：${error.message}`);
  } finally {
    client.close();
  }
}

/**
 * SFTP 上传实现
 */
async function uploadViaSFTP(config, localFilePath, remotePath) {
  const Client = require('ssh2-sftp-client');
  const client = new Client();

  try {
    await client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey ? fs.readFileSync(config.privateKey) : undefined,
      passphrase: config.passphrase,
      readyTimeout: config.timeout || 10000,
    });

    const dirPath = path.dirname(remotePath);
    if (dirPath !== '.') {
      await ensureRemoteDir(client, dirPath, 'sftp');
    }

    await client.put(fs.createReadStream(localFilePath), remotePath);

    return {
      success: true,
      message: `SFTP 上传成功：${remotePath}`,
    };
  } catch (error) {
    throw new Error(`SFTP 上传失败：${error.message}`);
  } finally {
    await client.end();
  }
}

/**
 * WebDAV 上传实现
 */
async function uploadViaWebDAV(config, localFilePath, remotePath) {
  const { createClient } = require('webdav');

  const client = createClient(config.url, {
    username: config.username,
    password: config.password,
    authType: config.authType || 'password',
    headers: {
      'User-Agent': 'IDC-Backup-Client/1.0',
    },
  });

  try {
    const dirPath = path.dirname(remotePath);
    if (dirPath !== '/') {
      await ensureRemoteDir(client, dirPath, 'webdav');
    }

    const fileContent = fs.readFileSync(localFilePath);
    await client.putFileContents(remotePath, fileContent, {
      overwrite: true,
    });

    return {
      success: true,
      message: `WebDAV 上传成功：${remotePath}`,
    };
  } catch (error) {
    throw new Error(`WebDAV 上传失败：${error.message}`);
  }
}

/**
 * SMB/CIFS 网络共享上传实现
 */
async function uploadViaSMB(config, localFilePath, remotePath) {
  const smb = require('smb2');

  const client = new smb({
    share: `\\\\${config.host}\\${config.share}`,
    domain: config.domain || '',
    username: config.username,
    password: config.password,
  });

  try {
    const dirPath = path.dirname(remotePath);
    if (dirPath !== '.') {
      await ensureRemoteDir(client, dirPath, 'smb');
    }

    await client.writeFile(remotePath, fs.readFileSync(localFilePath));

    return {
      success: true,
      message: `SMB 上传成功：${remotePath}`,
    };
  } catch (error) {
    throw new Error(`SMB 上传失败：${error.message}`);
  }
}

/**
 * 确保远程目录存在
 */
async function ensureRemoteDir(client, dirPath, protocol) {
  try {
    if (protocol === 'ftp') {
      const dirs = dirPath.split('/').filter(d => d);
      for (const dir of dirs) {
        try {
          await client.cd(dir);
        } catch {
          await client.mkdir(dir);
          await client.cd(dir);
        }
      }
    } else if (protocol === 'sftp') {
      await client.mkdir(dirPath, true);
    } else if (protocol === 'webdav') {
      const parts = dirPath.split('/').filter(p => p);
      let currentPath = '';
      for (const part of parts) {
        currentPath += '/' + part;
        try {
          await client.createDirectory(currentPath);
        } catch (error) {
          if (!error.status || error.status !== 405) {
            throw error;
          }
        }
      }
    } else if (protocol === 'smb') {
      const parts = dirPath.split(path.sep).filter(p => p);
      let currentPath = '';
      for (const part of parts) {
        currentPath += part + path.sep;
        try {
          await client.exists(currentPath);
        } catch {
          await client.mkdir(currentPath);
        }
      }
    }
  } catch (error) {
    console.warn(`创建远程目录失败 [${protocol}]:`, error.message);
  }
}

/**
 * 主上传函数 - 根据配置选择对应协议
 */
async function uploadToRemote(config, localFilePath, remotePath) {
  console.log(`开始上传到远端 [${config.protocol}]: ${remotePath}`);

  const startTime = Date.now();

  let result;

  switch (config.protocol) {
    case PROTOCOL_TYPES.FTP:
      result = await uploadViaFTP(config, localFilePath, remotePath);
      break;
    case PROTOCOL_TYPES.SFTP:
      result = await uploadViaSFTP(config, localFilePath, remotePath);
      break;
    case PROTOCOL_TYPES.WEBDAV:
      result = await uploadViaWebDAV(config, localFilePath, remotePath);
      break;
    case PROTOCOL_TYPES.SMB:
      result = await uploadViaSMB(config, localFilePath, remotePath);
      break;
    default:
      throw new Error(`不支持的协议类型：${config.protocol}`);
  }

  const duration = Date.now() - startTime;
  const fileSize = fs.statSync(localFilePath).size;

  console.log(
    `远端上传完成 [${config.protocol}] - 耗时：${duration}ms, 文件大小：${(fileSize / 1024).toFixed(2)}KB`
  );

  return {
    ...result,
    protocol: config.protocol,
    protocolLabel: PROTOCOL_LABELS[config.protocol],
    duration,
    fileSize,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * 测试远端连接
 */
async function testRemoteConnection(config) {
  console.log(`测试远端连接 [${config.protocol}]...`);

  try {
    const testContent = `IDC Backup Connection Test - ${new Date().toISOString()}`;
    const testFile = path.join(require('os').tmpdir(), `backup-test-${Date.now()}.txt`);
    fs.writeFileSync(testFile, testContent);

    const testRemotePath = `test/backup-connection-test-${Date.now()}.txt`;

    const result = await uploadToRemote(config, testFile, testRemotePath);

    try {
      fs.unlinkSync(testFile);
    } catch (e) {
      console.warn('删除测试文件失败:', e.message);
    }

    return {
      success: true,
      message: '连接测试成功',
      details: result,
    };
  } catch (error) {
    return {
      success: false,
      message: `连接测试失败：${error.message}`,
      error: error.message,
    };
  }
}

module.exports = {
  PROTOCOL_TYPES,
  PROTOCOL_LABELS,
  uploadToRemote,
  testRemoteConnection,
  uploadViaFTP,
  uploadViaSFTP,
  uploadViaWebDAV,
  uploadViaSMB,
};
