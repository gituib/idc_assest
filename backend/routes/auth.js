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
            emailVerified: user.emailVerified,
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
            emailVerified: user.emailVerified,
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
          emailVerified: user.emailVerified,
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

// ========== 邮箱验证 ==========
/**
 * 发送邮箱验证码
 * POST /api/auth/send-verify-code
 * body: { email? } 不传时使用当前用户已绑定邮箱
 * 流程：
 *   1. 解析目标邮箱（优先取 body.email，回退 user.email）
 *   2. 校验邮箱格式 + 检查是否已验证
 *   3. 调用 verifyCode.generate（含冷却/每日上限）
 *   4. 调用 mailer.sendTemplate 发送验证码邮件
 */
router.post('/send-verify-code', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 解析目标邮箱
    const email = (req.body.email || user.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: '请先填写邮箱地址' });
    }

    // 简单邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: '邮箱格式无效' });
    }

    // 若邮箱与当前已验证邮箱一致，无需重复验证
    if (user.email === email && user.emailVerified) {
      return res.json({ success: true, message: '当前邮箱已验证，无需重复验证' });
    }

    // 生成验证码
    const verifyCode = require('../services/verifyCode');
    const genResult = await verifyCode.generate(email);
    if (!genResult.success) {
      if (genResult.error === 'CODE_COOLDOWN') {
        return res.status(429).json({
          success: false,
          message: `验证码已发送，请 ${genResult.retryAfter} 秒后重试`,
          retryAfter: genResult.retryAfter,
        });
      }
      if (genResult.error === 'DAILY_LIMIT_EXCEEDED') {
        return res.status(429).json({
          success: false,
          message: '今日该邮箱的验证码发送次数已达上限，请明天再试',
        });
      }
      return res.status(400).json({ success: false, message: '验证码发送失败' });
    }

    // 发送邮件
    const mailer = require('../services/mailer');
    const { loadMailConfig } = require('../config/mail');
    const config = await loadMailConfig();
    const fromName = config?.mailFromName || 'IDC资产管理系统';

    const sendResult = await mailer.sendTemplate(
      email,
      'verify-code',
      {
        email,
        code: genResult.code,
        nickname: user.realName || user.username,
        mailFromName: fromName,
      },
      '【邮箱验证】您的 IDC 资产管理系统验证码'
    );

    if (!sendResult.success) {
      if (sendResult.error === 'MAIL_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: '邮件服务未配置，请联系管理员在系统设置中配置 SMTP',
        });
      }
      logger.error('发送验证码邮件失败', { email, error: sendResult.error, detail: sendResult.detail });
      return res.status(500).json({
        success: false,
        message: sendResult.hint || `验证码邮件发送失败：${sendResult.error}`,
        error: sendResult.error,
      });
    }

    await logAuthOperation('send_verify_code', `发送邮箱验证码：${user.username} → ${email}`, {
      targetId: user.userId,
      targetName: user.username,
      afterState: { email },
      req,
      metadata: { email },
    });

    res.json({ success: true, message: `验证码已发送到 ${email}` });
  } catch (error) {
    logger.error('发送邮箱验证码异常', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '发送验证码失败' });
  }
});

/**
 * 验证邮箱
 * POST /api/auth/verify-email
 * body: { email, code }
 * 验证成功后：user.email = email; user.emailVerified = true
 */
router.post('/verify-email', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const { email: rawEmail, code } = req.body;
    const email = (rawEmail || '').trim().toLowerCase();

    if (!email || !code) {
      return res.status(400).json({ success: false, message: '邮箱和验证码不能为空' });
    }

    // 校验验证码
    const verifyCode = require('../services/verifyCode');
    const consumeResult = verifyCode.consume(email, String(code).trim());
    if (!consumeResult.success) {
      const errorMessages = {
        CODE_NOT_FOUND: '验证码不存在，请先获取验证码',
        CODE_EXPIRED: '验证码已过期或错误次数过多，请重新获取',
        CODE_INVALID: '验证码错误',
        INVALID_INPUT: '邮箱和验证码不能为空',
      };
      return res.status(400).json({
        success: false,
        message: errorMessages[consumeResult.error] || '验证失败',
      });
    }

    // 验证成功，更新用户邮箱 + 验证状态
    const beforeState = { email: user.email, emailVerified: user.emailVerified };
    user.email = email;
    user.emailVerified = true;
    await user.save();

    await logAuthOperation('verify_email', `邮箱验证成功：${user.username} → ${email}`, {
      targetId: user.userId,
      targetName: user.username,
      beforeState,
      afterState: { email, emailVerified: true },
      req,
      metadata: { email },
    });

    res.json({
      success: true,
      message: '邮箱验证成功',
      data: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    logger.error('邮箱验证异常', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '邮箱验证失败' });
  }
});

// ========== 修改密码（已登录，旧密码校验） ==========
/**
 * 修改密码（已登录）
 * POST /api/auth/change-password
 * body: { oldPassword, newPassword }
 * 流程：校验旧密码 → 校验新密码长度 → 更新密码
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '旧密码和新密码不能为空' });
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `新密码长度不能少于${PASSWORD_MIN_LENGTH}个字符`,
      });
    }

    // 校验旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '旧密码错误' });
    }

    // 新密码不能与旧密码相同
    if (oldPassword === newPassword) {
      return res.status(400).json({ success: false, message: '新密码不能与旧密码相同' });
    }

    // 更新密码
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    await logAuthOperation('change_password', `修改密码成功（已登录）：${user.username}`, {
      targetId: user.userId,
      targetName: user.username,
      req,
      metadata: { channel: 'logged-in' },
    });

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    logger.error('修改密码异常', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '修改密码失败' });
  }
});

// ========== 找回密码（未登录） ==========
/**
 * 发送找回密码验证码
 * POST /api/auth/forgot-password/send-code
 * body: { account } —— account 可为邮箱地址或用户名（兼容旧字段 email）
 * 安全：
 *   1. 不泄露账户/邮箱是否存在（统一返回"如果账户已注册并验证邮箱，验证码已发送"）
 *   2. 账户不存在或邮箱未验证时，静默跳过发送但仍返回成功
 *   3. 不泄露账户绑定的邮箱地址（即使账户存在，响应中也不含邮箱）
 */
router.post('/forgot-password/send-code', async (req, res) => {
  try {
    // 兼容旧字段 email，新字段 account 优先
    const rawAccount = (req.body.account || req.body.email || '').trim();
    if (!rawAccount) {
      return res.status(400).json({ success: false, message: '请输入账户名或邮箱' });
    }

    // 统一返回的防枚举提示
    const antiEnumerationMsg = '如果该账户已注册并验证邮箱，验证码已发送至账户绑定邮箱';

    // 识别输入类型：邮箱 or 用户名
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(rawAccount.toLowerCase());
    const lookupValue = isEmail ? rawAccount.toLowerCase() : rawAccount;
    const lookupField = isEmail ? 'email' : 'username';

    // 按识别结果查找用户
    const user = await User.findOne({ where: { [lookupField]: lookupValue } });

    // 安全考虑：账户不存在或邮箱未验证时，仍返回成功（避免枚举攻击）
    if (!user || !user.emailVerified) {
      await logAuthOperation('forgot_password_send_code', `找回密码请求（账户未匹配或邮箱未验证）`, {
        targetName: rawAccount,
        req,
        metadata: {
          account: rawAccount,
          reason: user ? 'email_not_verified' : 'user_not_found',
        },
      });
      return res.json({ success: true, message: antiEnumerationMsg });
    }

    const email = user.email.trim().toLowerCase();

    // 生成验证码（scene=forgot-password）
    const verifyCode = require('../services/verifyCode');
    const genResult = await verifyCode.generate(email, verifyCode.SCENES.FORGOT_PASSWORD);
    if (!genResult.success) {
      if (genResult.error === 'CODE_COOLDOWN') {
        // 冷却期也返回成功提示，避免泄露账户存在性
        return res.json({ success: true, message: antiEnumerationMsg });
      }
      if (genResult.error === 'DAILY_LIMIT_EXCEEDED') {
        return res.status(429).json({
          success: false,
          message: '今日该账户的验证码发送次数已达上限，请明天再试',
        });
      }
      return res.status(400).json({ success: false, message: '验证码发送失败' });
    }

    // 发送邮件
    const mailer = require('../services/mailer');
    const { loadMailConfig } = require('../config/mail');
    const config = await loadMailConfig();
    const fromName = config?.mailFromName || 'IDC资产管理系统';

    const sendResult = await mailer.sendTemplate(
      email,
      'verify-code',
      {
        email,
        code: genResult.code,
        nickname: user.realName || user.username,
        mailFromName: fromName,
      },
      '【找回密码】您的 IDC 资产管理系统验证码'
    );

    if (!sendResult.success) {
      if (sendResult.error === 'MAIL_NOT_CONFIGURED') {
        // 防枚举：邮件服务未配置时也返回成功提示
        logger.error('找回密码邮件服务未配置', { email });
        return res.json({ success: true, message: antiEnumerationMsg });
      }
      logger.error('发送找回密码验证码失败', { email, error: sendResult.error, detail: sendResult.detail });
      return res.status(500).json({
        success: false,
        message: sendResult.hint || `验证码邮件发送失败：${sendResult.error}`,
        error: sendResult.error,
      });
    }

    await logAuthOperation('forgot_password_send_code', `找回密码验证码发送成功：${user.username}`, {
      targetId: user.userId,
      targetName: user.username,
      afterState: { email },
      req,
      metadata: { account: rawAccount, scene: 'forgot-password' },
    });

    res.json({ success: true, message: antiEnumerationMsg });
  } catch (error) {
    logger.error('发送找回密码验证码异常', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '发送验证码失败' });
  }
});

/**
 * 找回密码重置（未登录）
 * POST /api/auth/forgot-password/reset
 * body: { account, code, newPassword } —— account 可为邮箱或用户名（兼容旧字段 email）
 * 流程：校验验证码（scene=forgot-password） → 更新密码 → 自动激活被锁定的账户
 */
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { code, newPassword } = req.body;
    // 兼容旧字段 email，新字段 account 优先
    const rawAccount = (req.body.account || req.body.email || '').trim();

    if (!rawAccount || !code || !newPassword) {
      return res.status(400).json({ success: false, message: '账户、验证码和新密码不能为空' });
    }
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `新密码长度不能少于${PASSWORD_MIN_LENGTH}个字符`,
      });
    }

    // 识别输入类型：邮箱 or 用户名
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(rawAccount.toLowerCase());
    const lookupValue = isEmail ? rawAccount.toLowerCase() : rawAccount;
    const lookupField = isEmail ? 'email' : 'username';

    const user = await User.findOne({ where: { [lookupField]: lookupValue } });
    if (!user) {
      // 不泄露账户是否存在
      return res.status(400).json({
        success: false,
        message: '验证码错误或已失效',
      });
    }

    // 校验验证码（scene=forgot-password）
    const verifyCode = require('../services/verifyCode');
    const consumeResult = verifyCode.consume(
      user.email,
      String(code).trim(),
      verifyCode.SCENES.FORGOT_PASSWORD
    );
    if (!consumeResult.success) {
      const errorMessages = {
        CODE_NOT_FOUND: '验证码不存在，请先获取验证码',
        CODE_EXPIRED: '验证码已过期或错误次数过多，请重新获取',
        CODE_INVALID: '验证码错误',
        INVALID_INPUT: '验证码不能为空',
      };
      return res.status(400).json({
        success: false,
        message: errorMessages[consumeResult.error] || '验证失败',
      });
    }

    // 验证通过，更新密码 + 重置登录失败计数（解锁账户）
    const beforeState = {
      password: '***',
      status: user.status,
      loginCount: user.loginCount,
      lockedUntil: user.lockedUntil,
    };
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    // 找回密码重置后，自动解锁账户（如果被密码错误锁定）
    if (user.status === 'locked') {
      user.status = 'active';
      user.lockedUntil = null;
    }
    user.loginCount = 0;
    await user.save();

    await logAuthOperation('forgot_password_reset', `找回密码成功：${user.username}`, {
      targetId: user.userId,
      targetName: user.username,
      beforeState,
      afterState: { status: user.status, loginCount: 0 },
      req,
      metadata: { scene: 'forgot-password', channel: 'anonymous' },
    });

    res.json({
      success: true,
      message: '密码已重置，请使用新密码登录',
    });
  } catch (error) {
    logger.error('找回密码重置异常', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: '密码重置失败' });
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
