const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 确保背景设置文件存在
const SETTINGS_FILE = path.join(__dirname, '../backgroundSettings.json');
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
    type: 'gradient',
    image: '',
    size: 'contain'
  }, null, 2));
}

// 上传图片接口
router.post('/upload', (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const file = req.files.file;
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // 保存文件到服务器
    file.mv(filePath, (err) => {
      if (err) {
        console.error('文件保存失败:', err);
        return res.status(500).json({ error: '文件保存失败' });
      }

      // 返回文件路径
      const fileUrl = `/uploads/${fileName}`;
      res.json({ path: fileUrl });
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// 获取背景设置
router.get('/settings', (req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    res.json(settings);
  } catch (error) {
    console.error('读取背景设置失败:', error);
    res.status(500).json({ error: '读取背景设置失败' });
  }
});

// 保存背景设置
router.post('/settings', (req, res) => {
  try {
    const settings = req.body;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('保存背景设置失败:', error);
    res.status(500).json({ error: '保存背景设置失败' });
  }
});

module.exports = router;