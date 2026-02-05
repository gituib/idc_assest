const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 10;

const generateId = () => {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

router.post('/register', async (req, res) => {
  try {
    const { username, password, email, phone, realName } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        message: '用户名长度必须在3-20个字符之间'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度不能少于6个字符'
      });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const userCount = await User.count();
    const isFirstUser = userCount === 0;

    const user = await User.create({
      userId: generateId(),
      username,
      password: hashedPassword,
      email,
      phone,
      realName: realName || username,
      status: isFirstUser ? 'active' : 'pending'
    });

    if (isFirstUser) {
      let adminRole = await Role.findOne({ where: { roleCode: 'admin' } });

      if (!adminRole) {
        adminRole = await Role.create({
          roleId: 'role_admin',
          roleName: '管理员',
          roleCode: 'admin',
          description: '系统管理员，拥有所有权限',
          status: 'active',
          permissions: []
        });
      }

      await UserRole.create({
        UserId: user.userId,
        RoleId: adminRole.roleId
      });

      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: '注册成功，已为您分配管理员权限',
        data: {
          user: {
            userId: user.userId,
            username: user.username,
            email: user.email,
            realName: user.realName
          },
          token,
          isFirstUser: true
        }
      });
    } else {
      const defaultRole = await Role.findOne({ where: { roleCode: 'viewer' } });

      if (defaultRole) {
        await UserRole.create({
          UserId: user.userId,
          RoleId: defaultRole.roleId
        });
      }

      res.status(201).json({
        success: true,
        message: '注册成功，请等待管理员审核',
        data: {
          user: {
            userId: user.userId,
            username: user.username,
            email: user.email,
            realName: user.realName
          },
          isFirstUser: false,
          pendingApproval: true
        }
      });
    }
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    if (user.status === 'locked') {
      return res.status(403).json({
        success: false,
        message: '账户已被锁定，请联系管理员'
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: '账户已禁用'
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        code: 'PENDING_APPROVAL',
        message: '账户待审核，请联系管理员激活'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      user.loginCount = (user.loginCount || 0) + 1;
      if (user.loginCount >= 5) {
        user.status = 'locked';
      }
      await user.save();
      
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const token = generateToken(user);

    user.lastLoginTime = new Date();
    user.lastLoginIp = req.ip || req.connection.remoteAddress;
    user.loginCount = 0;
    await user.save();

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          realName: user.realName,
          avatar: user.avatar
        },
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const roles = await Role.findAll({
      include: [{
        model: User,
        where: { userId: req.user.userId },
        attributes: []
      }]
    });

    res.json({
      success: true,
      data: {
        user,
        roles: roles.map(r => ({
          roleId: r.roleId,
          roleName: r.roleName,
          roleCode: r.roleCode
        }))
      }
    });
  } catch (error) {
    console.error('获取profile错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { email, phone, realName, avatar } = req.body;
    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (realName !== undefined) user.realName = realName;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      message: '更新成功',
      data: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        phone: user.phone,
        realName: user.realName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('更新profile错误:', error);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '旧密码和新密码都不能为空'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于6个字符'
      });
    }

    const user = await User.findByPk(req.user.userId);
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '旧密码错误'
      });
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '密码修改失败'
    });
  }
});

router.post('/check-admin', async (req, res) => {
  try {
    const userCount = await User.count();
    
    res.json({
      success: true,
      data: {
        hasAdmin: userCount > 0,
        userCount
      }
    });
  } catch (error) {
    console.error('检查管理员错误:', error);
    res.status(500).json({
      success: false,
      message: '检查失败'
    });
  }
});

router.post('/unlock', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    if (user.status !== 'locked') {
      return res.status(400).json({
        success: false,
        message: '账户未被锁定'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 解锁账户
    user.status = 'active';
    user.loginCount = 0;
    await user.save();

    res.json({
      success: true,
      message: '账户解锁成功'
    });
  } catch (error) {
    console.error('解锁账户错误:', error);
    res.status(500).json({
      success: false,
      message: '解锁失败',
      error: error.message
    });
  }
});

module.exports = router;
