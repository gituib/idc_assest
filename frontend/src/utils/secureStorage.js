const STORAGE_PREFIX = 'idc_';
const KEY_STORAGE_ID = '__idc_sk';
const SALT = new TextEncoder().encode('idc-secure-storage-salt-v1');
const PBKDF2_ITERATIONS = 100000;
const AES_KEY_LENGTH = 256;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const memoryCache = new Map();

let _cachedCryptoKey = null;

async function deriveKey(material) {
  if (_cachedCryptoKey) return _cachedCryptoKey;

  const keyMaterial = await crypto.subtle.importKey('raw', material, 'PBKDF2', false, [
    'deriveKey',
  ]);

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );

  _cachedCryptoKey = key;
  return key;
}

async function getOrCreateKeyMaterial() {
  let stored = sessionStorage.getItem(KEY_STORAGE_ID);
  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    return raw;
  }

  const fingerprint = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
  ].join('|');

  const fingerprintBytes = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', fingerprintBytes);
  const material = new Uint8Array(hashBuffer);

  sessionStorage.setItem(KEY_STORAGE_ID, btoa(String.fromCharCode(...material)));
  return material;
}

async function encrypt(plaintext) {
  const material = await getOrCreateKeyMaterial();
  const key = await deriveKey(material);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...payload));
}

async function decrypt(encrypted) {
  try {
    const material = await getOrCreateKeyMaterial();
    const key = await deriveKey(material);

    const raw = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return decoder.decode(decrypted);
  } catch {
    return null;
  }
}

async function decryptAndParse(encrypted) {
  const decrypted = await decrypt(encrypted);
  if (!decrypted) return null;

  try {
    const data = JSON.parse(decrypted);
    if (data.expiry && Date.now() > data.expiry) return null;
    return data.value;
  } catch {
    return null;
  }
}

export const secureStorage = {
  set: (key, value, options = {}) => {
    memoryCache.set(key, value);

    const storageKey = `${STORAGE_PREFIX}${key}`;
    const data = {
      value,
      timestamp: Date.now(),
      expiry: options.expiry || null,
    };
    const serialized = JSON.stringify(data);

    encrypt(serialized)
      .then(encrypted => {
        localStorage.setItem(storageKey, encrypted);
      })
      .catch(() => {});

    return true;
  },

  get: (key) => {
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }
    return null;
  },

  loadFromStorage: async (key) => {
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      const encrypted = localStorage.getItem(storageKey);
      if (!encrypted) return null;

      const value = await decryptAndParse(encrypted);
      if (value !== null) {
        memoryCache.set(key, value);
      } else {
        localStorage.removeItem(storageKey);
      }
      return value;
    } catch {
      return null;
    }
  },

  remove: (key) => {
    memoryCache.delete(key);
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`;
      localStorage.removeItem(storageKey);
    } catch {}
    return true;
  },

  clear: () => {
    memoryCache.clear();
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
        }
      }
      keys.forEach(key => localStorage.removeItem(key));
    } catch {}
    return true;
  },
};

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';
export const USER_ID_KEY = 'userId';
export const TICKET_COLUMNS_KEY = 'ticketVisibleColumns';

export default secureStorage;
