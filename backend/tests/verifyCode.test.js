/**
 * VerifyCodeService 验证码服务测试
 * 覆盖：生成、校验、冷却、过期、每日上限、错误次数上限
 */
const verifyCode = require('../services/verifyCode');

const TEST_EMAIL = 'test@example.com';

describe('VerifyCodeService 验证码服务测试', () => {
  beforeEach(() => {
    verifyCode._clearAllForTest();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generate 生成验证码', () => {
    test('应返回 6 位数字字符串', async () => {
      const result = await verifyCode.generate(TEST_EMAIL);
      expect(result.success).toBe(true);
      expect(result.code).toMatch(/^\d{6}$/);
    });

    test('邮箱为空应返回 EMAIL_REQUIRED', async () => {
      const result = await verifyCode.generate('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('EMAIL_REQUIRED');
    });

    test('多次生成应产生不同验证码（高概率）', async () => {
      const codes = new Set();
      for (let i = 0; i < 20; i++) {
        // 每次清空避免冷却
        verifyCode._clearAllForTest();
        const result = await verifyCode.generate(TEST_EMAIL);
        codes.add(result.code);
      }
      // 20 次至少应产生 5 种以上不同值
      expect(codes.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('generate 冷却机制', () => {
    test('60 秒内重发应返回 CODE_COOLDOWN + retryAfter', async () => {
      const first = await verifyCode.generate(TEST_EMAIL);
      expect(first.success).toBe(true);

      const second = await verifyCode.generate(TEST_EMAIL);
      expect(second.success).toBe(false);
      expect(second.error).toBe('CODE_COOLDOWN');
      expect(second.retryAfter).toBeGreaterThan(0);
      expect(second.retryAfter).toBeLessThanOrEqual(60);
    });

    test('超过 60 秒应允许重发', async () => {
      await verifyCode.generate(TEST_EMAIL);

      // 推进 61 秒
      jest.advanceTimersByTime(61 * 1000);

      const second = await verifyCode.generate(TEST_EMAIL);
      expect(second.success).toBe(true);
    });
  });

  describe('generate 每日上限', () => {
    test('同一邮箱每日最多 10 次，第 11 次应被拒绝', async () => {
      // 模拟一天内发送 10 次（每次都过冷却期）
      for (let i = 0; i < 10; i++) {
        if (i > 0) {
          jest.advanceTimersByTime(61 * 1000);
        }
        const result = await verifyCode.generate(TEST_EMAIL);
        expect(result.success).toBe(true);
      }

      // 第 11 次（再过 61 秒）
      jest.advanceTimersByTime(61 * 1000);
      const result = await verifyCode.generate(TEST_EMAIL);
      expect(result.success).toBe(false);
      expect(result.error).toBe('DAILY_LIMIT_EXCEEDED');
    });

    test('跨日应重置每日计数', async () => {
      // 当日发 10 次
      for (let i = 0; i < 10; i++) {
        if (i > 0) jest.advanceTimersByTime(61 * 1000);
        await verifyCode.generate(TEST_EMAIL);
      }

      // 推进到次日（25 小时后）
      jest.advanceTimersByTime(25 * 60 * 60 * 1000);

      const result = await verifyCode.generate(TEST_EMAIL);
      expect(result.success).toBe(true);
    });
  });

  describe('consume 校验验证码', () => {
    test('正确验证码应校验成功并一次性消费', async () => {
      const { code } = await verifyCode.generate(TEST_EMAIL);

      const result = verifyCode.consume(TEST_EMAIL, code);
      expect(result.success).toBe(true);

      // 第二次消费应失败（已删除）
      const second = verifyCode.consume(TEST_EMAIL, code);
      expect(second.success).toBe(false);
      expect(second.error).toBe('CODE_NOT_FOUND');
    });

    test('错误验证码应返回 CODE_INVALID', async () => {
      await verifyCode.generate(TEST_EMAIL);
      const result = verifyCode.consume(TEST_EMAIL, '000000');
      expect(result.success).toBe(false);
      expect(result.error).toBe('CODE_INVALID');
    });

    test('验证码不存在应返回 CODE_NOT_FOUND', () => {
      const result = verifyCode.consume('not-exist@example.com', '123456');
      expect(result.success).toBe(false);
      expect(result.error).toBe('CODE_NOT_FOUND');
    });

    test('参数缺失应返回 INVALID_INPUT', () => {
      expect(verifyCode.consume('', '123456').error).toBe('INVALID_INPUT');
      expect(verifyCode.consume(TEST_EMAIL, '').error).toBe('INVALID_INPUT');
    });
  });

  describe('consume 过期处理', () => {
    test('超过 10 分钟应返回 CODE_EXPIRED', async () => {
      const { code } = await verifyCode.generate(TEST_EMAIL);

      // 推进 11 分钟
      jest.advanceTimersByTime(11 * 60 * 1000);

      const result = verifyCode.consume(TEST_EMAIL, code);
      expect(result.success).toBe(false);
      expect(result.error).toBe('CODE_EXPIRED');
    });
  });

  describe('consume 错误次数上限', () => {
    test('错误 5 次后应失效，需重新获取', async () => {
      const { code } = await verifyCode.generate(TEST_EMAIL);

      // 故意输错 4 次
      for (let i = 0; i < 4; i++) {
        const result = verifyCode.consume(TEST_EMAIL, '000000');
        expect(result.success).toBe(false);
        expect(result.error).toBe('CODE_INVALID');
      }

      // 第 5 次错误应触发失效
      const fifth = verifyCode.consume(TEST_EMAIL, '000000');
      expect(fifth.success).toBe(false);
      expect(fifth.error).toBe('CODE_EXPIRED');

      // 此时即使输入正确验证码也已失效
      const correct = verifyCode.consume(TEST_EMAIL, code);
      expect(correct.success).toBe(false);
      expect(correct.error).toBe('CODE_NOT_FOUND');
    });

    test('错误 4 次后输入正确验证码仍可成功', async () => {
      const { code } = await verifyCode.generate(TEST_EMAIL);

      for (let i = 0; i < 4; i++) {
        verifyCode.consume(TEST_EMAIL, '000000');
      }

      const result = verifyCode.consume(TEST_EMAIL, code);
      expect(result.success).toBe(true);
    });
  });

  describe('clear 清除记录', () => {
    test('清除后 consume 应返回 CODE_NOT_FOUND', async () => {
      const { code } = await verifyCode.generate(TEST_EMAIL);
      verifyCode.clear(TEST_EMAIL);
      const result = verifyCode.consume(TEST_EMAIL, code);
      expect(result.error).toBe('CODE_NOT_FOUND');
    });
  });

  describe('常量导出', () => {
    test('应导出正确的常量值', () => {
      expect(verifyCode.CODE_TTL_MS).toBe(10 * 60 * 1000);
      expect(verifyCode.RESEND_COOLDOWN_MS).toBe(60 * 1000);
      expect(verifyCode.DAILY_LIMIT).toBe(10);
      expect(verifyCode.CODE_LENGTH).toBe(6);
      expect(verifyCode.MAX_VERIFY_ATTEMPTS).toBe(5);
    });
  });
});
