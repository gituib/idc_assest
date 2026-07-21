/**
 * 邮箱验证码服务（内存存储）
 * 提供：验证码生成、校验、冷却控制、过期清理、每日上限
 * 存储：进程内 Map，重启失效（用户需重发）
 * 安全：通过 scene 区分不同场景的验证码，避免跨场景混用
 *      例如：邮箱验证的验证码不能用于密码重置
 */
const crypto = require('crypto');

const CODE_TTL_MS = 10 * 60 * 1000;       // 验证码有效期 10 分钟
const RESEND_COOLDOWN_MS = 60 * 1000;     // 重发冷却 60 秒
const DAILY_LIMIT = 10;                    // 每邮箱每场景每日发送上限
const CODE_LENGTH = 6;                     // 验证码位数
const MAX_VERIFY_ATTEMPTS = 5;             // 最大验证错误次数

/** 验证码场景常量（白名单，避免调用方传入任意值） */
const SCENES = {
  VERIFY_EMAIL: 'verify-email',       // 邮箱验证（绑定/换绑）
  RESET_PASSWORD: 'reset-password',   // 已登录用户密码重置
  FORGOT_PASSWORD: 'forgot-password', // 未登录用户找回密码
};

// key: `${scene}:${email}`, value: { code, expiresAt, sentAt, dailyCount, dailyResetAt, attempts, scene, email }
const codeStore = new Map();

/**
 * 获取当前时间戳（可被 jest.useFakeTimers 控制）
 * @returns {number}
 */
function now() {
  return Date.now();
}

/**
 * 构造存储 key（按 scene + email 隔离）
 * @param {string} email - 邮箱
 * @param {string} scene - 场景
 * @returns {string}
 */
function buildKey(email, scene) {
  return `${scene}:${email}`;
}

/**
 * 校验 scene 是否合法
 * @param {string} scene
 * @returns {boolean}
 */
function isValidScene(scene) {
  return Object.values(SCENES).includes(scene);
}

/**
 * 生成 6 位数字验证码
 * @returns {string} 6 位数字字符串
 */
function generateCode() {
  // 使用 crypto.randomInt 避免数学随机数偏差
  const min = 0;
  const max = 10 ** CODE_LENGTH; // 1000000
  return String(crypto.randomInt(min, max)).padStart(CODE_LENGTH, '0');
}

/**
 * 重置每日计数（若跨日）
 * @param {Object} record - 验证码记录
 * @returns {Object} 更新后的记录
 */
function resetDailyCountIfNeed(record) {
  const today = new Date(now());
  const resetDate = new Date(record.dailyResetAt || 0);
  if (
    today.getFullYear() !== resetDate.getFullYear() ||
    today.getMonth() !== resetDate.getMonth() ||
    today.getDate() !== resetDate.getDate()
  ) {
    record.dailyCount = 0;
    record.dailyResetAt = now();
  }
  return record;
}

/**
 * 生成并存储验证码（含冷却和每日上限校验）
 * @param {string} email - 目标邮箱
 * @param {string} [scene='verify-email'] - 场景，见 SCENES 常量
 * @returns {Promise<{success: boolean, code?: string, error?: string, retryAfter?: number}>}
 */
async function generate(email, scene = SCENES.VERIFY_EMAIL) {
  if (!email) {
    return { success: false, error: 'EMAIL_REQUIRED' };
  }
  if (!isValidScene(scene)) {
    return { success: false, error: 'INVALID_SCENE' };
  }

  const key = buildKey(email, scene);
  const currentTime = now();
  let record = codeStore.get(key);

  // 已有记录：检查冷却和每日上限
  if (record) {
    resetDailyCountIfNeed(record);

    // 冷却期内
    const elapsed = currentTime - record.sentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { success: false, error: 'CODE_COOLDOWN', retryAfter };
    }

    // 每日上限
    if (record.dailyCount >= DAILY_LIMIT) {
      return { success: false, error: 'DAILY_LIMIT_EXCEEDED' };
    }
  }

  // 生成新验证码
  const code = generateCode();
  const newRecord = {
    code,
    expiresAt: currentTime + CODE_TTL_MS,
    sentAt: currentTime,
    dailyCount: record ? record.dailyCount + 1 : 1,
    dailyResetAt: record ? record.dailyResetAt : currentTime,
    attempts: 0,
    scene,
    email,
  };
  codeStore.set(key, newRecord);

  return { success: true, code };
}

/**
 * 校验并消费验证码
 * - 校验成功：删除记录（一次性）
 * - 校验失败：累加错误次数，达到 MAX_VERIFY_ATTEMPTS 后删除记录
 * @param {string} email - 邮箱
 * @param {string} code - 用户输入的验证码
 * @param {string} [scene='verify-email'] - 场景
 * @returns {{success: boolean, error?: string}}
 */
function consume(email, code, scene = SCENES.VERIFY_EMAIL) {
  if (!email || !code) {
    return { success: false, error: 'INVALID_INPUT' };
  }
  if (!isValidScene(scene)) {
    return { success: false, error: 'INVALID_SCENE' };
  }

  const key = buildKey(email, scene);
  const record = codeStore.get(key);
  if (!record) {
    return { success: false, error: 'CODE_NOT_FOUND' };
  }

  // 已过期
  if (now() > record.expiresAt) {
    codeStore.delete(key);
    return { success: false, error: 'CODE_EXPIRED' };
  }

  // 错误次数已达上限
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    codeStore.delete(key);
    return { success: false, error: 'CODE_EXPIRED' };
  }

  // 校验验证码
  if (record.code !== String(code)) {
    record.attempts += 1;
    // 达到上限则删除，要求重新获取
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      codeStore.delete(key);
      return { success: false, error: 'CODE_EXPIRED' };
    }
    return { success: false, error: 'CODE_INVALID' };
  }

  // 校验成功，删除记录（一次性消费）
  codeStore.delete(key);
  return { success: true };
}

/**
 * 清除指定邮箱指定场景的验证码记录
 * @param {string} email - 邮箱
 * @param {string} [scene] - 场景；不传则清除该邮箱所有场景
 * @returns {void}
 */
function clear(email, scene) {
  if (scene) {
    codeStore.delete(buildKey(email, scene));
    return;
  }
  // 清除该邮箱所有场景
  for (const key of codeStore.keys()) {
    if (key.endsWith(`:${email}`)) {
      codeStore.delete(key);
    }
  }
}

/**
 * 清空所有验证码记录（仅供测试使用）
 * @returns {void}
 */
function _clearAllForTest() {
  codeStore.clear();
}

module.exports = {
  generate,
  consume,
  clear,
  _clearAllForTest,
  SCENES,
  CODE_TTL_MS,
  RESEND_COOLDOWN_MS,
  DAILY_LIMIT,
  MAX_VERIFY_ATTEMPTS,
  CODE_LENGTH,
};
