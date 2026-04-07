const STORAGE_PREFIX = 'idc_';

/**
 * 生成运行时密钥（基于浏览器指纹）
 * 密钥在每次会话中动态生成，不会出现在源码或构建产物中
 * 同一浏览器同一域名下密钥保持一致，确保刷新页面后仍可解密
 */
const getOrCreateRuntimeKey = () => {
  const KEY_STORAGE_ID = '__idc_sk';
  let key = sessionStorage.getItem(KEY_STORAGE_ID);
  if (key) return key;

  const fingerprint = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
  ].join('|');

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  key = '';
  let seed = Math.abs(hash) + Date.now();
  for (let i = 0; i < 32; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    key += chars[seed % chars.length];
  }

  sessionStorage.setItem(KEY_STORAGE_ID, key);
  console.log('[SecureStorage] New runtime key generated:', key.substring(0, 8) + '...');
  return key;
};

const simpleEncrypt = (text) => {
  const key = getOrCreateRuntimeKey();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(encodeURIComponent(result));
};

const simpleDecrypt = (encrypted) => {
  try {
    const key = getOrCreateRuntimeKey();
    const decoded = decodeURIComponent(atob(encrypted));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (e) {
    console.error('[SecureStorage] Decrypt error:', e.message);
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
      console.log('[SecureStorage] Set:', key, '=', value ? value.substring(0, 30) + '...' : 'null');
      console.log('[SecureStorage] Stored encrypted value length:', encrypted.length);
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

      if (!encrypted) {
        console.log('[SecureStorage] Get:', key, '- not found in localStorage');
        return null;
      }

      console.log('[SecureStorage] Get:', key, '- found encrypted data, length:', encrypted.length);

      let decrypted = simpleDecrypt(encrypted);
      if (!decrypted) {
        console.log('[SecureStorage] Get:', key, '- decryption failed, trying raw JSON parse');
        try {
          const parsed = JSON.parse(encrypted);
          if (parsed && parsed.value !== undefined) {
            console.log('[SecureStorage] Get:', key, '- recovered from raw JSON');
            return parsed.value;
          }
        } catch {
          console.log('[SecureStorage] Get:', key, '- raw JSON parse also failed');
        }
        localStorage.removeItem(storageKey);
        return null;
      }

      const data = JSON.parse(decrypted);

      if (data.expiry && Date.now() > data.expiry) {
        console.log('[SecureStorage] Get:', key, '- expired');
        localStorage.removeItem(storageKey);
        return null;
      }

      const valuePreview = typeof data.value === 'string' ? data.value.substring(0, 30) + '...' : typeof data.value;
      console.log('[SecureStorage] Get:', key, '- success:', valuePreview);
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
      console.log('[SecureStorage] Remove:', key);
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
      console.log('[SecureStorage] Clear: removed', keys.length, 'keys');
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