/**
 * MailerService 单元测试
 * mock nodemailer + config/mail，不真实发信
 */
const { sequelize } = require('../db');

// Mock nodemailer
const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockClose = jest.fn();
let mockCreateTransportResult = {
  sendMail: mockSendMail,
  verify: mockVerify,
  close: mockClose,
};
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockCreateTransportResult),
}));

// Mock config/mail
const mockLoadMailConfig = jest.fn();
jest.mock('../config/mail', () => ({
  loadMailConfig: (...args) => mockLoadMailConfig(...args),
}));

const mailer = require('../services/mailer');

const TEST_CONFIG = {
  smtpHost: 'smtp.qq.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: 'test@qq.com',
  smtpPass: 'auth-code-123',
  mailFrom: 'test@qq.com',
  mailFromName: 'IDC资产管理系统',
};

describe('MailerService 邮件服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mailer._resetForTest();
    mockLoadMailConfig.mockResolvedValue(TEST_CONFIG);
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    mockVerify.mockResolvedValue(true);
  });

  describe('getTransporter 单例', () => {
    test('首次调用应创建 transporter', async () => {
      const tp = await mailer.getTransporter();
      expect(tp).toBe(mockCreateTransportResult);
      expect(require('nodemailer').createTransport).toHaveBeenCalledTimes(1);
      expect(require('nodemailer').createTransport).toHaveBeenCalledWith({
        host: 'smtp.qq.com',
        port: 465,
        secure: true,
        auth: { user: 'test@qq.com', pass: 'auth-code-123' },
      });
    });

    test('多次调用应返回同一实例（懒加载单例）', async () => {
      const a = await mailer.getTransporter();
      const b = await mailer.getTransporter();
      expect(a).toBe(b);
      expect(require('nodemailer').createTransport).toHaveBeenCalledTimes(1);
    });

    test('SMTP 未配置时应返回 null', async () => {
      mockLoadMailConfig.mockResolvedValue(null);
      mailer._resetForTest();
      const tp = await mailer.getTransporter();
      expect(tp).toBeNull();
    });
  });

  describe('renderTemplate 模板渲染', () => {
    test('应渲染 verify-code 模板并包含验证码', async () => {
      const html = await mailer.renderTemplate('verify-code', {
        code: '123456',
        nickname: '张三',
        mailFromName: 'IDC资产管理系统',
      });
      expect(html).toContain('123456');
      expect(html).toContain('张三');
      expect(html).toContain('邮箱验证码');
    });

    test('应支持省略 nickname', async () => {
      const html = await mailer.renderTemplate('verify-code', {
        code: '999999',
        mailFromName: 'IDC资产管理系统',
      });
      expect(html).toContain('999999');
    });

    test('模板不存在时应抛错', async () => {
      await expect(mailer.renderTemplate('not-exist', {})).rejects.toThrow();
    });
  });

  describe('sendTemplate 发送模板邮件', () => {
    test('应调用 transporter.sendMail 并传入正确参数', async () => {
      const result = await mailer.sendTemplate(
        'user@example.com',
        'verify-code',
        { code: '123456', nickname: '张三' },
        '【IDC系统】邮箱验证码'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.to).toBe('user@example.com');
      expect(callArg.subject).toBe('【IDC系统】邮箱验证码');
      expect(callArg.from).toContain('IDC资产管理系统');
      expect(callArg.from).toContain('test@qq.com');
      expect(callArg.html).toContain('123456');
    });

    test('未配置 SMTP 时应返回 MAIL_NOT_CONFIGURED', async () => {
      mockLoadMailConfig.mockResolvedValue(null);
      mailer._resetForTest();
      const result = await mailer.sendTemplate('user@example.com', 'verify-code', { code: '123456' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('MAIL_NOT_CONFIGURED');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('SMTP 发送失败时应返回分类后的错误码', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP auth failed'));
      const result = await mailer.sendTemplate('user@example.com', 'verify-code', { code: '123456' });
      expect(result.success).toBe(false);
      // 应分类为稳定错误码（而非原始字符串），detail 保留原始消息
      expect(result.error).toBe('SMTP_AUTH_FAILED');
      expect(result.detail).toBe('SMTP auth failed');
      expect(result.hint).toBeTruthy();
    });

    test('主题为空时应使用默认主题', async () => {
      await mailer.sendTemplate('user@example.com', 'verify-code', { code: '123456' });
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.subject).toBe('IDC资产管理系统通知');
    });
  });

  describe('rebuildTransporter 重建连接', () => {
    test('应关闭旧 transporter 并创建新实例', async () => {
      const oldTp = await mailer.getTransporter();
      await mailer.rebuildTransporter();
      expect(mockClose).toHaveBeenCalledTimes(1);
      // 重建后 createTransport 应被再次调用
      expect(require('nodemailer').createTransport).toHaveBeenCalledTimes(2);
    });

    test('未初始化时调用 rebuildTransporter 不应抛错', async () => {
      mailer._resetForTest();
      await expect(mailer.rebuildTransporter()).resolves.not.toThrow();
    });
  });

  describe('verifyConnection 测试连接', () => {
    test('连接成功时应返回 success: true', async () => {
      const result = await mailer.verifyConnection();
      expect(result.success).toBe(true);
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });

    test('连接失败时应返回分类后的错误码', async () => {
      mockVerify.mockRejectedValue(new Error('Connection refused'));
      const result = await mailer.verifyConnection();
      expect(result.success).toBe(false);
      // econnrefused 应分类为 SMTP_CONNECTION_REFUSED
      expect(result.error).toBe('SMTP_CONNECTION_REFUSED');
      expect(result.detail).toBe('Connection refused');
      expect(result.hint).toBeTruthy();
    });

    test('未配置 SMTP 时应返回 MAIL_NOT_CONFIGURED', async () => {
      mockLoadMailConfig.mockResolvedValue(null);
      mailer._resetForTest();
      const result = await mailer.verifyConnection();
      expect(result.success).toBe(false);
      expect(result.error).toBe('MAIL_NOT_CONFIGURED');
    });
  });
});
