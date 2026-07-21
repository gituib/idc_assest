/**
 * systemSettings.js SMTP 邮件配置接口集成测试
 * 覆盖：GET/PUT /mail + POST /mail/test
 * - 真实使用 SystemSetting/User/Role/UserRole 模型 + authMiddleware + requireAdmin
 * - mock nodemailer（避免真实发信）和 operationLogger.logSystemOperation（避免污染）
 */
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../db');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const SystemSetting = require('../models/SystemSetting');

// 在 require 路由之前 mock 掉外部依赖
const mockSendTemplate = jest.fn();
jest.mock('../services/mailer', () => ({
  rebuildTransporter: jest.fn().mockResolvedValue(undefined),
  sendTemplate: (...args) => mockSendTemplate(...args),
}));

jest.mock('../utils/operationLogger', () => ({
  logSystemOperation: jest.fn().mockResolvedValue(null),
  logOperation: jest.fn().mockResolvedValue(null),
}));

const systemSettingsRouter = require('../routes/systemSettings');

const JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';

/** 构造 Bearer Token */
function makeToken(userId, username) {
  return jwt.sign({ userId, username, roleId: 'ROLE_ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
}

/** 构造一个最小化 Express app，仅挂载 systemSettings 路由 */
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/system-settings', systemSettingsRouter);
  return app;
}

describe('SMTP 邮件配置接口 /api/system-settings/mail', () => {
  let app;
  let adminUser, normalUser;
  let adminToken, normalToken;

  beforeAll(async () => {
    // 同步表结构（force: true 重置）
    await sequelize.sync({ force: true });

    // 创建超管角色 + 普通角色
    const adminRole = await Role.create({
      roleId: 'ROLE_ADMIN',
      roleName: '超级管理员',
      roleCode: 'admin',
      description: '系统超级管理员',
    });
    const normalRole = await Role.create({
      roleId: 'ROLE_USER',
      roleName: '普通用户',
      roleCode: 'user',
      description: '普通用户',
    });

    // 创建超管用户 + 普通用户（密码字段仅占位，不影响测试）
    adminUser = await User.create({
      userId: 'USR_ADMIN_001',
      username: 'admin_test',
      password: '$2b$10$placeholderhashforadmintestuserxxxxx',
      status: 'active',
    });
    normalUser = await User.create({
      userId: 'USR_NORMAL_001',
      username: 'normal_test',
      password: '$2b$10$placeholderhashfornormaltestuserxxxx',
      status: 'active',
    });

    // 绑定角色
    await UserRole.create({ UserId: adminUser.userId, RoleId: adminRole.roleId });
    await UserRole.create({ UserId: normalUser.userId, RoleId: normalRole.roleId });

    adminToken = makeToken(adminUser.userId, adminUser.username);
    normalToken = makeToken(normalUser.userId, normalUser.username);

    app = createApp();
  }, 30000);

  afterAll(async () => {
    await sequelize.close();
  }, 30000);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendTemplate.mockReset();
  });

  afterEach(async () => {
    // 每个用例后清空 mail 相关配置
    await SystemSetting.destroy({ where: { category: 'mail' } });
  });

  describe('权限校验', () => {
    test('未携带 Token 调用 GET /mail 返回 401', async () => {
      const res = await request(app).get('/api/system-settings/mail');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('普通用户调用 PUT /mail 返回 403', async () => {
      const res = await request(app)
        .put('/api/system-settings/mail')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({
          smtpHost: 'smtp.qq.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'test@qq.com',
          smtpPass: 'auth-code-123',
          mailFrom: 'test@qq.com',
          mailFromName: '测试系统',
        });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      // 普通用户被拒后不应写入任何 mail 配置
      const mailCount = await SystemSetting.count({ where: { category: 'mail' } });
      expect(mailCount).toBe(0);
    });

    test('普通用户调用 GET /mail 返回 403', async () => {
      const res = await request(app)
        .get('/api/system-settings/mail')
        .set('Authorization', `Bearer ${normalToken}`);
      expect(res.status).toBe(403);
    });

    test('普通用户调用 POST /mail/test 返回 403', async () => {
      const res = await request(app)
        .post('/api/system-settings/mail/test')
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ to: 'admin@example.com' });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /mail 超管保存配置', () => {
    test('保存成功：写入 7 条 mail 配置，密码为 AES 加密密文', async () => {
      const res = await request(app)
        .put('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.qq.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'test@qq.com',
          smtpPass: 'auth-code-123',
          mailFrom: 'test@qq.com',
          mailFromName: 'IDC资产管理系统',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('保存成功');

      // 验证 SystemSetting 表写入 7 条 mail 配置
      const mailSettings = await SystemSetting.findAll({ where: { category: 'mail' } });
      expect(mailSettings.length).toBe(7);

      // 验证密码字段为加密密文（不是明文）
      const passSetting = await SystemSetting.findByPk('smtp_pass_encrypted');
      expect(passSetting).not.toBeNull();
      expect(passSetting.settingValue).not.toContain('auth-code-123');
      // 密文格式应为 "iv_hex:cipher_hex"
      const stored = JSON.parse(passSetting.settingValue);
      expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);

      // 验证 host 等明文字段已正确写入
      const hostSetting = await SystemSetting.findByPk('smtp_host');
      expect(JSON.parse(hostSetting.settingValue)).toBe('smtp.qq.com');

      // 验证调用过 rebuildTransporter（热更新）
      const mailer = require('../services/mailer');
      expect(mailer.rebuildTransporter).toHaveBeenCalled();
    });

    test('缺少 smtpHost 返回 400', async () => {
      const res = await request(app)
        .put('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: '',
          smtpUser: 'test@qq.com',
          smtpPass: 'auth-code-123',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('必填项');
    });

    test('缺少 smtpUser 返回 400', async () => {
      const res = await request(app)
        .put('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.qq.com',
          smtpUser: '',
          smtpPass: 'auth-code-123',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('首次保存时未提供 smtpPass 返回 400', async () => {
      const res = await request(app)
        .put('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.qq.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'test@qq.com',
          smtpPass: '',
          mailFrom: 'test@qq.com',
          mailFromName: 'IDC资产管理系统',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('SMTP 密码');
    });

    test('二次保存时 smtpPass 为空：原密码不变', async () => {
      // 第一次保存（含密码）
      await request(app)
        .put('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.qq.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'test@qq.com',
          smtpPass: 'auth-code-123',
          mailFrom: 'test@qq.com',
          mailFromName: 'IDC资产管理系统',
        });

      // 记录原密码密文
      const originalPass = await SystemSetting.findByPk('smtp_pass_encrypted');
      const originalCipher = JSON.parse(originalPass.settingValue);

      // 第二次保存（不传密码）
      const res = await request(app)
        .put('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.163.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: 'test@163.com',
          smtpPass: '',
          mailFrom: 'test@163.com',
          mailFromName: 'IDC资产管理系统',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 验证密码密文未变
      const afterPass = await SystemSetting.findByPk('smtp_pass_encrypted');
      expect(JSON.parse(afterPass.settingValue)).toBe(originalCipher);

      // 验证其他字段已更新
      const hostSetting = await SystemSetting.findByPk('smtp_host');
      expect(JSON.parse(hostSetting.settingValue)).toBe('smtp.163.com');
    });
  });

  describe('GET /mail 读取配置（密码掩码）', () => {
    beforeEach(async () => {
      // 预置一条配置
      await request(app)
        .put('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.qq.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'test@qq.com',
          smtpPass: 'my-auth-code-xyz',
          mailFrom: 'test@qq.com',
          mailFromName: 'IDC资产管理系统',
        });
    });

    test('返回的 smtpPassMasked 为掩码格式（保留后 4 位）', async () => {
      const res = await request(app)
        .get('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.smtpHost).toBe('smtp.qq.com');
      expect(data.smtpPort).toBe(465);
      expect(data.smtpSecure).toBe(true);
      expect(data.smtpUser).toBe('test@qq.com');
      expect(data.mailFrom).toBe('test@qq.com');
      expect(data.mailFromName).toBe('IDC资产管理系统');
      expect(data.hasPassword).toBe(true);
      // 密码应为掩码：••••••xyz（保留后 3 位）—— 实际保留后 4 位为 -xyz
      expect(data.smtpPassMasked).toMatch(/^••••••.+$/);
      expect(data.smtpPassMasked).not.toContain('my-auth-code');
    });

    test('未配置时返回空配置 + hasPassword=false', async () => {
      // 清空 mail 配置
      await SystemSetting.destroy({ where: { category: 'mail' } });

      const res = await request(app)
        .get('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasPassword).toBe(false);
      expect(res.body.data.smtpPassMasked).toBe('');
      expect(res.body.data.smtpHost).toBe('');
    });
  });

  describe('POST /mail/test 发送测试邮件', () => {
    beforeEach(async () => {
      // 预置 SMTP 配置
      await request(app)
        .put('/api/system-settings/mail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          smtpHost: 'smtp.qq.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'test@qq.com',
          smtpPass: 'auth-code-123',
          mailFrom: 'test@qq.com',
          mailFromName: 'IDC资产管理系统',
        });
    });

    test('缺少 to 字段返回 400', async () => {
      const res = await request(app)
        .post('/api/system-settings/mail/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('收件人');
    });

    test('mailer.sendTemplate 返回成功时接口返回 200', async () => {
      mockSendTemplate.mockResolvedValue({ success: true, messageId: 'test-message-id-001' });

      const res = await request(app)
        .post('/api/system-settings/mail/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ to: 'admin@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('admin@example.com');

      // 验证 mailer.sendTemplate 被正确调用
      expect(mockSendTemplate).toHaveBeenCalledTimes(1);
      const args = mockSendTemplate.mock.calls[0];
      expect(args[0]).toBe('admin@example.com'); // to
      expect(args[1]).toBe('test-mail'); // 模板名
      expect(args[3]).toContain('测试邮件'); // 主题
    });

    test('mailer.sendTemplate 返回 MAIL_NOT_CONFIGURED 时接口返回 400', async () => {
      mockSendTemplate.mockResolvedValue({ success: false, error: 'MAIL_NOT_CONFIGURED' });

      const res = await request(app)
        .post('/api/system-settings/mail/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ to: 'admin@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('未配置');
    });

    test('mailer.sendTemplate 返回发送失败时接口返回 400 + 错误信息', async () => {
      mockSendTemplate.mockResolvedValue({ success: false, error: 'SMTP connect failed' });

      const res = await request(app)
        .post('/api/system-settings/mail/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ to: 'admin@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('SMTP connect failed');
    });
  });
});
