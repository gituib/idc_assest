/**
 * auth.js 邮箱验证接口集成测试
 * 覆盖：POST /api/auth/send-verify-code + POST /api/auth/verify-email
 * - 真实使用 User 模型 + authMiddleware
 * - mock mailer（避免真实发信）+ verifyCode（避免污染状态）+ operationLogger
 */
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../db');
const User = require('../models/User');

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

function makeToken(userId, username) {
  return jwt.sign({ userId, username, roleId: 'ROLE_USER' }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('邮箱验证接口 /api/auth/send-verify-code + /verify-email', () => {
  let app;
  let user;
  let token;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    user = await User.create({
      userId: 'USR_TEST_001',
      username: 'mail_test_user',
      password: '$2b$10$placeholderhashformailtestuserxxxxx',
      email: 'old@example.com',
      emailVerified: false,
      status: 'active',
    });

    token = makeToken(user.userId, user.username);
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

  describe('POST /api/auth/send-verify-code', () => {
    test('未登录返回 401', async () => {
      const res = await request(app)
        .post('/api/auth/send-verify-code')
        .send({ email: 'new@example.com' });
      expect(res.status).toBe(401);
    });

    test('未提供 email 且用户未绑定邮箱时返回 400', async () => {
      // 临时清空用户邮箱（User 模型 email 字段有 isEmail 校验，空字符串不通过，需用 null）
      const oldEmail = user.email;
      await user.update({ email: null });

      const res = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('邮箱');

      // 恢复邮箱
      await user.update({ email: oldEmail });
    });

    test('邮箱格式无效返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'invalid-email' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('格式');
    });

    test('已验证邮箱重复验证时返回提示（不实际发送）', async () => {
      await user.update({ email: 'verified@example.com', emailVerified: true });

      const res = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'verified@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('已验证');
      // 不应调用 mailer
      expect(mockSendTemplate).not.toHaveBeenCalled();

      await user.update({ email: 'old@example.com', emailVerified: false });
    });

    test('发送成功：调用 mailer.sendTemplate 并返回 200', async () => {
      mockSendTemplate.mockResolvedValue({ success: true, messageId: 'test-msg-001' });

      const res = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('new@example.com');

      // 验证 mailer 被正确调用
      expect(mockSendTemplate).toHaveBeenCalledTimes(1);
      const args = mockSendTemplate.mock.calls[0];
      expect(args[0]).toBe('new@example.com');
      expect(args[1]).toBe('verify-code');
      expect(args[2].code).toMatch(/^\d{6}$/);
      expect(args[3]).toContain('邮箱验证');
    });

    test('不传 email 时使用用户已绑定的邮箱', async () => {
      await user.update({ email: 'bound@example.com', emailVerified: false });
      mockSendTemplate.mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(mockSendTemplate).toHaveBeenCalledTimes(1);
      expect(mockSendTemplate.mock.calls[0][0]).toBe('bound@example.com');
    });

    test('邮件服务未配置时返回 503', async () => {
      mockSendTemplate.mockResolvedValue({ success: false, error: 'MAIL_NOT_CONFIGURED' });

      const res = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new2@example.com' });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('未配置');
    });

    test('邮件发送失败时返回 500 + 错误信息', async () => {
      mockSendTemplate.mockResolvedValue({ success: false, error: 'SMTP timeout' });

      const res = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new3@example.com' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('SMTP timeout');
    });

    test('冷却期内重发返回 429 + retryAfter', async () => {
      mockSendTemplate.mockResolvedValue({ success: true });

      // 第一次发送
      await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'cooldown@example.com' });

      // 立即重发应触发冷却
      const res = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'cooldown@example.com' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    test('未登录返回 401', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ email: 'x@example.com', code: '123456' });
      expect(res.status).toBe(401);
    });

    test('缺少 email 或 code 返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: '', code: '123456' });
      expect(res.status).toBe(400);
    });

    test('验证码不存在返回 400', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'nonexist@example.com', code: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('不存在');
    });

    test('验证码错误返回 400', async () => {
      // 先发送验证码
      mockSendTemplate.mockResolvedValue({ success: true });
      await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'wrong-code@example.com' });

      // 故意输入错误验证码
      const res = await request(app)
        .post('/api/auth/verify-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'wrong-code@example.com', code: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('验证码错误');
    });

    test('验证成功：更新 user.email + emailVerified=true', async () => {
      // 发送验证码
      mockSendTemplate.mockResolvedValue({ success: true });
      const sendRes = await request(app)
        .post('/api/auth/send-verify-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'success@example.com' });

      expect(sendRes.status).toBe(200);

      // 从 mailer 调用中取出验证码
      const sentCode = mockSendTemplate.mock.calls[0][2].code;
      expect(sentCode).toMatch(/^\d{6}$/);

      // 提交验证码
      const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'success@example.com', code: sentCode });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.email).toBe('success@example.com');
      expect(verifyRes.body.data.emailVerified).toBe(true);

      // 验证数据库状态已更新
      await user.reload();
      expect(user.email).toBe('success@example.com');
      expect(user.emailVerified).toBe(true);

      // 重置状态以便后续测试
      await user.update({ email: 'old@example.com', emailVerified: false });
    });
  });
});
