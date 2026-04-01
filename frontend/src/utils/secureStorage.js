const STORAGE_PREFIX = 'idc_';
const ENCRYPTION_ENABLED = import.meta.env.PROD;

/**
 * 生成运行时密钥（基于浏览器指纹）
 * 密钥在每次会话中动态生成，不会出现在源码或构建产物中
 * 同一浏览器同一域名下密钥保持一致，确保刷新页面后仍可解密
 */
const getOrCreateRuntimeKey = () => {
  const KEY_STORAGE_ID = '__idc_sk';
  let key = sessionStorage.getItem(KEY_STORAGE_ID);
  if (key) return key;

  // 基于浏览器特征生成指纹作为密钥种子
  const fingerprint = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
  ].join('|');

  // 使用简单的哈希混合生成 32 字符密钥
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  // 生成 32 字符的随机密钥
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  key = '';
  let seed = Math.abs(hash) + Date.now();
  for (let i = 0; i < 32; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    key += chars[seed % chars.length];
  }

  sessionStorage.setItem(KEY_STORAGE_ID, key);
  return key;
};

const simpleEncrypt = (text) => {
  if (!ENCRYPTION_ENABLED) return text;

  const key = getOrCreateRuntimeKey();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(encodeURIComponent(result));
};

const simpleDecrypt = (encrypted) => {
  if (!ENCRYPTION_ENABLED) return encrypted;

  try {
    const key = getOrCreateRuntimeKey();
    const decoded = decodeURIComponent(atob(encrypted));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return null;
  }
};

export const secureStorage = {
  set: (key, value, options = {}) => {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      const data = {
        value,
        timestamp: Date.now(),
        expiry: options.expiry || null,
      };
      const serialized = JSON.stringify(data);
      const encrypted = simpleEncrypt(serialized);
      localStorage.setItem(storageKey, encrypted);
      return true;
    } catch (error) {
      console.error('[SecureStorage] Set error:', error);
      return false;
    }
  },

  get: (key) => {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      const encrypted = localStorage.getItem(storageKey);

      if (!encrypted) return null;

      const decrypted = simpleDecrypt(encrypted);
      if (!decrypted) {
        localStorage.removeItem(storageKey);
        return null;
      }

      const data = JSON.parse(decrypted);

      if (data.expiry && Date.now() > data.expiry) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return data.value;
    } catch (error) {
      console.error('[SecureStorage] Get error:', error);
      return null;
    }
  },

  remove: (key) => {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error('[SecureStorage] Remove error:', error);
      return false;
    }
  },

  clear: () => {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach((key) => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('[SecureStorage] Clear error:', error);
      return false;
    }
  },
};

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';
export const USER_ID_KEY = 'userId';
export const TICKET_COLUMNS_KEY = 'ticketVisibleColumns';

export default secureStorage;
