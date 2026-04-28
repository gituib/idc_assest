const logger = require('../utils/logger').module('BackgroundRoute');
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// 所有背景设置路由需要认证
router.use(authMiddleware);

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const SETTINGS_FILE = path.join(__dirname, '../backgroundSettings.json');
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(
      {
        type: 'gradient',
        image: '',
        size: 'contain',
      },
      null,
      2
    )
  );
}

router.get('/', (req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('读取背景设置失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '读取背景设置失败' });
  }
});

router.put('/', (req, res) => {
  try {
    const settings = req.body;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('保存背景设置失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '保存背景设置失败' });
  }
});

router.post('/upload', (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const file = req.files.file;

    // 安全检查：拒绝路径遍历字符
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return res.status(400).json({ error: '文件名包含非法字符' });
    }

    // 白名单校验文件扩展名，只允许图片格式
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const ext = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: '只允许上传图片文件（jpg/png/gif/webp/svg/bmp）' });
    }

    // 使用随机文件名，仅保留安全扩展名
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    // 二次校验：确保路径在 uploads 目录内
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir + path.sep)) {
      return res.status(400).json({ error: '文件路径不合法' });
    }

    file.mv(filePath, err => {
      if (err) {
        logger.error('文件保存失败', { err: err.message, stack: err.stack });
        return res.status(500).json({ error: '文件保存失败' });
      }

      const fileUrl = `/uploads/${safeName}`;
      res.json({ path: fileUrl });
    });
  } catch (error) {
    logger.error('上传错误', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '上传失败' });
  }
});

router.get('/settings', (req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    res.json(settings);
  } catch (error) {
    logger.error('读取背景设置失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '读取背景设置失败' });
  }
});

router.post('/settings', (req, res) => {
  try {
    const settings = req.body;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    res.json({ success: true });
  } catch (error) {
    logger.error('保存背景设置失败', { error: error.message, stack: error.stack });
    res.status(500).json({ error: '保存背景设置失败' });
  }
});

module.exports = router;
