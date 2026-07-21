/**
 * auth.js 密码修改 / 找回密码接口集成测试
 * 覆盖：
 *   - POST /api/auth/change-password（已登录，旧密码校验）
 *   - POST /api/auth/forgot-password/send-code（未登录）
 *   - POST /api/auth/forgot-password/reset（未登录）
 *
 * 测试策略：
 *   - 真实使用 User 模型 + authMiddleware
 *   - mock mailer.sendTemplate（避免真实发信）
 *   - mock operationLogger（避免写库）
 *   - 真实使用 verifyCode 服务（验证 scene 隔离逻辑）
 *   - 从 mailer 调用参数中提取验证码，用于后续 reset 接口
 */
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../db');
const User = require('../models/User');
const { SALT_ROUNDS, PASSWORD_MIN_LENGTH } = require('../config');

// mock mailer
const mockSendTemplate = jest.fn();
jest.mock('../services/mailer', () => ({
  sendTemplate: (...args) => mockSendTemplate(...args),
}));

// mock operationLogger
jest.mock('../utils/operationLogger', () => ({
  logAuthOperation: jest.fn().mockResolvedValue(null),
  logOperation: jest.fn().mockResolvedValue(null),
}));

const authRouter = require('../routes/auth');
const verifyCode = require('../services/verifyCode');

const JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';

/** 生成测试用 JWT token */
function makeToken(userId, username) {
  return jwt.sign({ userId, username, roleId: 'ROLE_USER' }, JWT_SECRET, { expiresIn: '1h' });
}

/** 构造最小化 Express app，仅挂载 auth 路由 */
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('修改密码与找回密码接口', () => {
  let app;
  let verifiedUser;       // 已验证邮箱的用户
  let unverifiedUser;     // 未验证邮箱的用户
  let verifiedToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // 已验证邮箱用户（旧密码 OldPassword123）
    const hashedPwd = await bcrypt.hash('OldPassword123', SALT_ROUNDS);
    verifiedUser = await User.create({
      userId: 'USR_VERIFIED_001',
      username: 'verified_user',
      password: hashedPwd,
      email: 'verified@example.com',
      emailVerified: true,
      status: 'active',
    });

    // 未验证邮箱用户
    unverifiedUser = await User.create({
      userId: 'USR_UNVERIFIED_001',
      username: 'unverified_user',
      password: hashedPwd,
      email: 'unverified@example.com',
      emailVerified: false,
      status: 'active',
    });

    verifiedToken = makeToken(verifiedUser.userId, verifiedUser.username);
    app = createApp();
  }, 30000);

  afterAll(async () => {
    await sequelize.close();
  }, 30000);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendTemplate.mockReset();
    verifyCode._clearAllForTest();
  });

  describe('POST /api/auth/change-password（已登录修改密码）', () => {
    test('未登录返回 401', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .send({ oldPassword: 'OldPassword123', newPassword: 'NewPassword123' });
      expect(res.status).toBe(401);
    });

    test('参数缺失返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({ oldPassword: '', newPassword: '' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('不能为空');
    });

    test('新密码长度不足返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({ oldPassword: 'OldPassword123', newPassword: '123' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain(`${PASSWORD_MIN_LENGTH}`);
    });

    test('旧密码错误返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({ oldPassword: 'WrongPassword', newPassword: 'NewPassword123' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('旧密码错误');
    });

    test('新密码与旧密码相同返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({ oldPassword: 'OldPassword123', newPassword: 'OldPassword123' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('不能与旧密码相同');
    });

    test('旧密码正确 → 密码修改成功', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({ oldPassword: 'OldPassword123', newPassword: 'NewPassword123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('修改成功');

      // 验证密码已被更新
      await verifiedUser.reload();
      const isMatch = await bcrypt.compare('NewPassword123', verifiedUser.password);
      expect(isMatch).toBe(true);
    });

    test('使用旧密码（修改前的）再次修改应失败', async () => {
      // 上一轮已改为 NewPassword123，使用 OldPassword123 应失败
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({ oldPassword: 'OldPassword123', newPassword: 'AnotherPwd456' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('旧密码错误');

      // 还原密码，便于后续测试
      await verifiedUser.update({
        password: await bcrypt.hash('OldPassword123', SALT_ROUNDS),
      });
    });
  });

  describe('POST /api/auth/forgot-password/send-code（找回密码验证码）', () => {
    test('邮箱为空返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/send-code')
        .send({ email: '' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('邮箱');
    });

    test('邮箱格式无效返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/send-code')
        .send({ email: 'invalid-email' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('格式');
    });

    test('邮箱不存在时仍返回成功（防枚举攻击）', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/send-code')
        .send({ email: 'nonexistent@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('如果');
      // 邮箱不存在时不应发送邮件
      expect(mockSendTemplate).not.toHaveBeenCalled();
    });

    test('邮箱未验证时仍返回成功（防枚举攻击）', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/send-code')
        .send({ email: 'unverified@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // 不应发送邮件
      expect(mockSendTemplate).not.toHaveBeenCalled();
    });

    test('已验证邮箱发送成功', async () => {
      mockSendTemplate.mockResolvedValue({ success: true });
      const res = await request(app)
        .post('/api/auth/forgot-password/send-code')
        .send({ email: 'verified@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSendTemplate).toHaveBeenCalledTimes(1);
      expect(mockSendTemplate.mock.calls[0][2].code).toMatch(/^\d{6}$/);
    });

    test('邮件服务未配置仍返回成功（防枚举：不泄露邮箱存在性）', async () => {
      mockSendTemplate.mockResolvedValue({ success: false, error: 'MAIL_NOT_CONFIGURED' });
      const res = await request(app)
        .post('/api/auth/forgot-password/send-code')
        .send({ email: 'verified@example.com' });
      // 防枚举：邮件服务未配置时也返回成功提示
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('已注册并验证');
    });

    test('无需登录即可访问', async () => {
      // 不带 Authorization 头也能正常访问
      mockSendTemplate.mockResolvedValue({ success: true });
      const res = await request(app)
        .post('/api/auth/forgot-password/send-code')
        .send({ email: 'verified@example.com' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/auth/forgot-password/reset（找回密码重置）', () => {
    test('参数缺失返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ email: '', code: '', newPassword: '' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('不能为空');
    });

    test('新密码长度不足返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ email: 'verified@example.com', code: '123456', newPassword: '123' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain(`${PASSWORD_MIN_LENGTH}`);
    });

    test('邮箱不存在时返回 400（不泄露具体原因）', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({
          email: 'nonexistent@example.com',
          code: '123456',
          newPassword: 'NewPassword123',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('验证码错误或已失效');
    });

    test('验证码错误返回 400', async () => {
      // 先发送验证码
      mockSendTemplate.mockResolvedValue({ success: true });
      await request(app)
        .post('/api/auth/forgot-password/send-code')
        .send({ email: 'verified@example.com' });

      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({
          email: 'verified@example.com',
          code: '000000',
          newPassword: 'NewPassword123',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('验证码正确 → 密码重置成功 + 账户自动激活', async () => {
      // 先把账户锁定，验证找回密码后能自动激活
      await verifiedUser.update({
        status: 'locked',
        loginCount: 5,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
      });

      mockSendTemplate.mockResolvedValue({ success: true });
      await request(app)
        .post('/api/auth/forgot-password/send-code')
        .send({ email: 'verified@example.com' });
      const sentCode = mockSendTemplate.mock.calls[0][2].code;

      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({
          email: 'verified@example.com',
          code: sentCode,
          newPassword: 'ResetPwd456',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('密码已重置');

      // 验证密码已更新
      await verifiedUser.reload();
      const isMatch = await bcrypt.compare('ResetPwd456', verifiedUser.password);
      expect(isMatch).toBe(true);
      // 验证账户已自动激活
      expect(verifiedUser.status).toBe('active');
      expect(verifiedUser.loginCount).toBe(0);
      expect(verifiedUser.lockedUntil).toBeNull();
    });

    test('跨场景验证码不可混用：邮箱验证的验证码不能用于找回密码', async () => {
      // 临时将 emailVerified 设为 false，确保 send-verify-code 会实际调用 mailer
      await verifiedUser.update({ emailVerified: false });

      // 用已登录身份发送邮箱验证码（scene=verify-email）
      mockSendTemplate.mockResolvedValue({ success: true });
      const sendRes = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({ email: 'verified@example.com' });
      expect(sendRes.status).toBe(200);
      const sentCode = mockSendTemplate.mock.calls[0][2].code;

      // 恢复 emailVerified 状态
      await verifiedUser.update({ emailVerified: true });

      // 尝试用 verify-email 场景的验证码找回密码，应失败（scene 隔离）
      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({
          email: 'verified@example.com',
          code: sentCode,
          newPassword: 'AnotherPwd789',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
