const logger = require('../utils/logger').module('AuthRoute');
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const { generateToken, authMiddleware } = require('../middleware/auth');
const {
  SALT_ROUNDS,
  PASSWORD_MIN_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} = require('../config');
const SystemSetting = require('../models/SystemSetting');
const { generateId } = require('../utils/idGenerator');
const { logAuthOperation } = require('../utils/operationLogger');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, email, phone, realName } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空',
      });
    }

    if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `用户名长度必须在${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH}个字符之间`,
      });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `密码长度不能少于${PASSWORD_MIN_LENGTH}个字符`,
      });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在',
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const userCount = await User.count();
    const isFirstUser = userCount === 0;

    const user = await User.create({
      userId: generateId({ prefix: 'USR' }),
      username,
      password: hashedPassword,
      email,
      phone,
      realName: realName || username,
      status: isFirstUser ? 'active' : 'pending',
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
          permissions: [],
        });
      }

      await UserRole.create({
        UserId: user.userId,
        RoleId: adminRole.roleId,
      });

      const token = generateToken(user);

      await logAuthOperation('register', `首位用户注册成功并分配管理员权限：${username}`, {
        targetId: user.userId,
        targetName: username,
        afterState: { userId: user.userId, username, realName: user.realName, isFirstUser: true },
        req,
        metadata: { isFirstUser: true, roleCode: 'admin' },
      });

      res.status(201).json({
        success: true,
        message: '注册成功，已为您分配管理员权限',
        data: {
          user: {
            userId: user.userId,
            username: user.username,
            email: user.email,
            realName: user.realName,
          },
          token,
          isFirstUser: true,
        },
      });
    } else {
      const defaultRole = await Role.findOne({ where: { roleCode: 'viewer' } });

      if (defaultRole) {
        await UserRole.create({
          UserId: user.userId,
          RoleId: defaultRole.roleId,
        });
      }

      await logAuthOperation('register', `用户注册成功，等待审核：${username}`, {
        targetId: user.userId,
        targetName: username,
        afterState: { userId: user.userId, username, realName: user.realName, isFirstUser: false },
        req,
        metadata: { isFirstUser: false, pendingApproval: true },
      });

      res.status(201).json({
        success: true,
        message: '注册成功，请等待管理员审核',
        data: {
          user: {
            userId: user.userId,
            username: user.username,
            email: user.email,
            realName: user.realName,
          },
          isFirstUser: false,
          pendingApproval: true,
        },
      });
    }
  } catch (error) {
    logger.error('注册错误', { error: error.message, stack: error.stack });
    await logAuthOperation('register', `用户注册失败：${req.body.username || '未知'}`, {
      targetName: req.body.username,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message,
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空',
      });
    }

    // 检查维护模式：非管理员无法登录
    const maintenanceSetting = await SystemSetting.findByPk('maintenance_mode');
    const isMaintenanceMode = maintenanceSetting
      ? JSON.parse(maintenanceSetting.settingValue)
      : false;

    if (isMaintenanceMode) {
      // 先查找用户，判断是否为管理员
      const checkUser = await User.findOne({ where: { username } });
      if (checkUser) {
        const userRole = await UserRole.findOne({
          where: { UserId: checkUser.userId },
          include: [{ model: Role }],
        });
        const isAdmin = userRole && userRole.Role && userRole.Role.roleCode === 'admin';
        if (!isAdmin) {
          await logAuthOperation('login', `维护模式拒绝登录：${username}`, {
            targetId: checkUser.userId,
            targetName: username,
            result: 'failed',
            req,
            metadata: { reason: 'maintenance_mode', roleCode: userRole?.Role?.roleCode },
          });
          return res.status(503).json({
            success: false,
            code: 'MAINTENANCE_MODE',
            message: '系统维护中，暂时无法登录，请联系管理员',
          });
        }
      }
    }

    // 从系统设置读取最大登录尝试次数
    const maxAttemptsSetting = await SystemSetting.findByPk('max_login_attempts');
    const maxLoginAttempts = maxAttemptsSetting
      ? JSON.parse(maxAttemptsSetting.settingValue)
      : 5;
    const lockTimeMs = 30 * 60 * 1000; // 锁定30分钟

    const user = await User.findOne({ where: { username } });
    if (!user) {
      await logAuthOperation('login', `登录失败（用户不存在）：${username}`, {
        targetName: username,
        result: 'failed',
        req,
        metadata: { reason: 'user_not_found' },
      });
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    if (user.status === 'locked') {
      const now = new Date();
      if (user.lockedUntil && user.lockedUntil > now) {
        const remainingMinutes = Math.ceil((user.lockedUntil - now) / 60000);
        await logAuthOperation('login', `登录失败（账户锁定中）：${username}`, {
          targetId: user.userId,
          targetName: username,
          result: 'failed',
          req,
          metadata: { reason: 'account_locked', remainingMinutes },
        });
        return res.status(403).json({
          success: false,
          message: `账户已被锁定，请在 ${remainingMinutes} 分钟后重试`,
        });
      }
      // 锁定时间已过，自动解锁
      user.status = 'active';
      user.loginCount = 0;
      user.lockedUntil = null;
      await user.save();
    }

    if (user.status === 'inactive') {
      await logAuthOperation('login', `登录失败（账户已禁用）：${username}`, {
        targetId: user.userId,
        targetName: username,
        result: 'failed',
        req,
        metadata: { reason: 'account_inactive' },
      });
      return res.status(403).json({
        success: false,
        message: '账户已禁用',
      });
    }

    if (user.status === 'pending') {
      await logAuthOperation('login', `登录失败（账户待审核）：${username}`, {
        targetId: user.userId,
        targetName: username,
        result: 'failed',
        req,
        metadata: { reason: 'account_pending' },
      });
      return res.status(403).json({
        success: false,
        code: 'PENDING_APPROVAL',
        message: '账户待审核，请联系管理员激活',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      user.loginCount = (user.loginCount || 0) + 1;
      let lockedNow = false;
      if (user.loginCount >= maxLoginAttempts) {
        user.status = 'locked';
        user.lockedUntil = new Date(Date.now() + lockTimeMs);
        lockedNow = true;
      }
      await user.save();

      const remainingAttempts = maxLoginAttempts - user.loginCount;
      let message = '用户名或密码错误';
      if (remainingAttempts > 0) {
        message += `，剩余 ${remainingAttempts} 次尝试机会`;
      } else {
        message = `账户已被锁定，请在 30 分钟后重试`;
      }

      await logAuthOperation('login', `登录失败（密码错误）：${username}`, {
        targetId: user.userId,
        targetName: username,
        result: 'failed',
        req,
        metadata: {
          reason: 'password_invalid',
          attemptCount: user.loginCount,
          remainingAttempts: Math.max(0, remainingAttempts),
          lockedNow,
        },
      });

      return res.status(401).json({
        success: false,
        message,
      });
    }

    const token = generateToken(user);

    // 查询用户角色（通过 UserRole 中间表）
    const userRoles = await UserRole.findAll({
      where: { UserId: user.userId },
      include: [{ model: Role }],
    });
    const roles = userRoles.map(ur => ur.Role || ur);

    user.lastLoginTime = new Date();
    user.lastLoginIp = req.ip || req.connection.remoteAddress;
    user.loginCount = 0;
    user.lockedUntil = null;
    await user.save();

    await logAuthOperation('login', `用户登录成功：${username}`, {
      targetId: user.userId,
      targetName: username,
      afterState: {
        userId: user.userId,
        username,
        roles: roles.map(r => r.roleCode),
        lastLoginTime: user.lastLoginTime,
      },
      req,
      metadata: { roleCodes: roles.map(r => r.roleCode) },
    });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          realName: user.realName,
          avatar: user.avatar,
          roles: roles.map(r => ({
            roleId: r.roleId,
            roleName: r.roleName,
            roleCode: r.roleCode,
          })),
        },
        token,
      },
    });
  } catch (error) {
    logger.error('登录错误', { error: error.message, stack: error.stack });
    await logAuthOperation('login', `登录异常：${req.body.username || '未知'}`, {
      targetName: req.body.username,
      result: 'failed',
      req,
      metadata: { reason: 'server_error', error: error.message },
    });
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message,
    });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    const userRoles = await UserRole.findAll({
      where: { UserId: user.userId },
      include: [{ model: Role }],
    });

    res.json({
      success: true,
      data: {
        user,
        roles: userRoles.map(ur => {
          const role = ur.Role || ur;
          return {
            roleId: role.roleId,
            roleName: role.roleName,
            roleCode: role.roleCode,
          };
        }),
      },
    });
  } catch (error) {
    logger.error('获取profile错误', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
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
        message: '用户不存在',
      });
    }

    const beforeState = {
      email: user.email,
      phone: user.phone,
      realName: user.realName,
      avatar: user.avatar,
    };

    if (email !== undefined) {
      user.email = email;
    }
    if (phone !== undefined) {
      user.phone = phone;
    }
    if (realName !== undefined) {
      user.realName = realName;
    }
    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    await logAuthOperation('update_profile', `更新个人资料：${user.username}`, {
      targetId: user.userId,
      targetName: user.username,
      beforeState,
      afterState: {
        email: user.email,
        phone: user.phone,
        realName: user.realName,
        avatar: user.avatar,
      },
      req,
    });

    res.json({
      success: true,
      message: '更新成功',
      data: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        phone: user.phone,
        realName: user.realName,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    logger.error('更新profile错误', { error: error.message, stack: error.stack });
    await logAuthOperation('update_profile', `更新个人资料失败：${req.user?.username || '未知'}`, {
      targetId: req.user?.userId,
      targetName: req.user?.username,
      result: 'failed',
      req,
      metadata: { error: error.message },
    });
    res.status(500).json({
      success: false,
      message: '更新失败',
    });
  }
});

router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '旧密码和新密码都不能为空',
      });
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `新密码长度不能少于${PASSWORD_MIN_LENGTH}个字符`,
      });
    }

    const user = await User.findByPk(req.user.userId);
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      await logAuthOperation('change_password', `修改密码失败（旧密码错误）：${user.username}`, {
        targetId: user.userId,
        targetName: user.username,
        result: 'failed',
        req,
        metadata: { reason: 'old_password_invalid' },
      });
      return res.status(401).json({
        success: false,
        message: '旧密码错误',
      });
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    await logAuthOperation('change_password', `修改密码成功：${user.username}`, {
      targetId: user.userId,
      targetName: user.username,
      req,
    });

    res.json({
      success: true,
      message: '密码修改成功',
    });
  } catch (error) {
    logger.error('修改密码错误', { error: error.message, stack: error.stack });
    await logAuthOperation('change_password', `修改密码异常：${req.user?.username || '未知'}`, {
      targetId: req.user?.userId,
      targetName: req.user?.username,
      result: 'failed',
      req,
      metadata: { reason: 'server_error', error: error.message },
    });
    res.status(500).json({
      success: false,
      message: '密码修改失败',
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
        userCount,
      },
    });
  } catch (error) {
    logger.error('检查管理员错误', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: '检查失败',
    });
  }
});

router.post('/unlock', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空',
      });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      await logAuthOperation('unlock', `解锁失败（用户不存在）：${username}`, {
        targetName: username,
        result: 'failed',
        req,
        metadata: { reason: 'user_not_found' },
      });
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    if (user.status !== 'locked') {
      await logAuthOperation('unlock', `解锁失败（账户未锁定）：${username}`, {
        targetId: user.userId,
        targetName: username,
        result: 'failed',
        req,
        metadata: { reason: 'account_not_locked', currentStatus: user.status },
      });
      return res.status(400).json({
        success: false,
        message: '账户未被锁定',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await logAuthOperation('unlock', `解锁失败（密码错误）：${username}`, {
        targetId: user.userId,
        targetName: username,
        result: 'failed',
        req,
        metadata: { reason: 'password_invalid' },
      });
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    // 解锁账户
    user.status = 'active';
    user.loginCount = 0;
    await user.save();

    await logAuthOperation('unlock', `账户解锁成功：${username}`, {
      targetId: user.userId,
      targetName: username,
      beforeState: { status: 'locked' },
      afterState: { status: 'active' },
      req,
    });

    res.json({
      success: true,
      message: '账户解锁成功',
    });
  } catch (error) {
    logger.error('解锁账户错误', { error: error.message, stack: error.stack });
    await logAuthOperation('unlock', `解锁异常：${req.body.username || '未知'}`, {
      targetName: req.body.username,
      result: 'failed',
      req,
      metadata: { reason: 'server_error', error: error.message },
    });
    res.status(500).json({
      success: false,
      message: '解锁失败',
      error: error.message,
    });
  }
});

module.exports = router;
