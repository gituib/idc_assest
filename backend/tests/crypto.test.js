const { encrypt, decrypt, maskSecret, ALGORITHM } = require('../utils/crypto');

describe('crypto 加解密工具测试', () => {
  describe('encrypt / decrypt 对称加解密', () => {
    test('encrypt 应返回 "iv_hex:cipher_hex" 格式', () => {
      const result = encrypt('hello world');
      expect(result).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
    });

    test('decrypt(encrypt(text)) 应还原原文', () => {
      const plain = 'my-smtp-password-123';
      const encrypted = encrypt(plain);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plain);
    });

    test('同一明文多次加密应产生不同密文（IV 随机）', () => {
      const plain = 'same-secret';
      const a = encrypt(plain);
      const b = encrypt(plain);
      expect(a).not.toBe(b);
      expect(decrypt(a)).toBe(plain);
      expect(decrypt(b)).toBe(plain);
    });

    test('应支持中文和特殊字符', () => {
      const plain = '授权码：测试@123#特殊$字符';
      const encrypted = encrypt(plain);
      expect(decrypt(encrypted)).toBe(plain);
    });

    test('应支持长字符串', () => {
      const plain = 'a'.repeat(1000);
      const encrypted = encrypt(plain);
      expect(decrypt(encrypted)).toBe(plain);
    });
  });

  describe('encrypt 异常处理', () => {
    test('null 入参应抛错', () => {
      expect(() => encrypt(null)).toThrow('加密内容不能为空');
    });

    test('undefined 入参应抛错', () => {
      expect(() => encrypt(undefined)).toThrow('加密内容不能为空');
    });
  });

  describe('decrypt 异常处理', () => {
    test('空字符串应抛错', () => {
      expect(() => decrypt('')).toThrow('密文格式无效');
    });

    test('非字符串应抛错', () => {
      expect(() => decrypt(12345)).toThrow('密文格式无效');
    });

    test('无分隔符的字符串应抛错', () => {
      expect(() => decrypt('abc123def456')).toThrow('密文格式无效');
    });

    test('非法 IV 应抛错（解密失败）', () => {
      expect(() => decrypt('invalid-iv:invalid-cipher')).toThrow();
    });
  });

  describe('maskSecret 掩码处理', () => {
    test('长字符串应保留后 4 位并加前缀', () => {
      expect(maskSecret('my-auth-code-1234')).toBe('••••••1234');
    });

    test('4 位及以下字符串应完全掩码', () => {
      expect(maskSecret('abcd')).toBe('••••');
      expect(maskSecret('ab')).toBe('••••');
    });

    test('空值应返回空字符串', () => {
      expect(maskSecret('')).toBe('');
      expect(maskSecret(null)).toBe('');
      expect(maskSecret(undefined)).toBe('');
    });

    test('非字符串应返回空字符串', () => {
      expect(maskSecret(12345)).toBe('');
    });
  });

  describe('ALGORITHM 常量', () => {
    test('应使用 aes-256-cbc 算法', () => {
      expect(ALGORITHM).toBe('aes-256-cbc');
    });
  });
});
