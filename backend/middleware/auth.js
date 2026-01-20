const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'idc-management-secret-key-2024';
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
