const STORAGE_PREFIX = 'idc_';
const ENCRYPTION_ENABLED = import.meta.env.PROD;

const simpleEncrypt = (text) => {
  if (!ENCRYPTION_ENABLED) return text;
  
  const key = import.meta.env.VITE_STORAGE_KEY || 'idc_default_secret_key_2024';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(encodeURIComponent(result));
};

const simpleDecrypt = (encrypted) => {
  if (!ENCRYPTION_ENABLED) return encrypted;
  
  try {
    const key = import.meta.env.VITE_STORAGE_KEY || 'idc_default_secret_key_2024';
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
