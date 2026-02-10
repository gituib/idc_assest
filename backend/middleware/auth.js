const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

/**
 * 获取 JWT Secret
 * - 生产环境：强制从环境变量读取，未设置则抛出错误
 * - 开发环境：未设置时自动生成临时密钥（重启后失效）
 */
function getJwtSecret() {
  const envSecret = process.env.JWT_SECRET;

  // 生产环境强制校验
  if (process.env.NODE_ENV === 'production') {
    if (!envSecret) {
      throw new Error(
        '[致命错误] 生产环境未设置 JWT_SECRET 环境变量！\n' +
        '请在服务器环境变量中设置强密钥（至少32位随机字符）。\n' +
        '生成命令（PowerShell）：-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })'
      );
    }
    if (envSecret.length < 32) {
      throw new Error('[致命错误] 生产环境 JWT_SECRET 长度必须至少32位！当前长度：' + envSecret.length);
    }
    return envSecret;
  }

  // 开发环境：使用环境变量或临时密钥
  if (!envSecret) {
    const tempSecret = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  [开发模式] JWT_SECRET 未设置，使用临时密钥（重启后所有 Token 失效）');
    return tempSecret;
  }

  return envSecret;
}

const JWT_SECRET = getJwtSecret();
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '24h';

const getBrowserInfo = (userAgent) => {
  let device = 'Desktop';
  let browser = 'Unknown';
  let os = 'Unknown';

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
    device = 'Mobile';
    if (/iPad/i.test(userAgent)) device = 'Tablet';
  }

  if (/Firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/Chrome/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/Edge/i.test(userAgent)) {
    browser = 'Edge';
  } else if (/MSIE|Trident/i.test(userAgent)) {
    browser = 'IE';
  }

  if (/Windows/i.test(userAgent)) {
    os = 'Windows';
  } else if (/Mac OS/i.test(userAgent)) {
    os = 'macOS';
  } else if (/Linux/i.test(userAgent)) {
    os = 'Linux';
  } else if (/Android/i.test(userAgent)) {
    os = 'Android';
  } else if (/iOS|iPhone|iPad|iPod/i.test(userAgent)) {
    os = 'iOS';
  }

  return { device, browser, os };
};

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      roleId: user.roleId
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: '令牌无效或已过期'
      });
    }

    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.status === 'locked') {
      return res.status(403).json({
        success: false,
        message: '账户已被锁定'
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: '账户已禁用'
      });
    }

    req.user = decoded;
    req.userModel = user;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '认证失败'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded) {
        const user = await User.findByPk(decoded.userId);
        if (user && user.status === 'active') {
          req.user = decoded;
          req.userModel = user;
        }
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  optionalAuth,
  JWT_SECRET,
  TOKEN_EXPIRY
};
