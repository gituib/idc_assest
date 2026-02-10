const cacheManager = (() => {
  const cache = new Map();
  const cacheTimestamps = new Map();
  const defaultTTL = 5 * 60 * 1000;
  const config = new Map();

  const generateKey = (method, url, params) => {
    const paramsStr = params ? JSON.stringify(params, Object.keys(params).sort()) : '';
    return `${method}:${url}:${paramsStr}`;
  };

  const isExpired = key => {
    const timestamp = cacheTimestamps.get(key);
    if (!timestamp) return true;
    const ttl = config.get(key)?.ttl || defaultTTL;
    return Date.now() - timestamp > ttl;
  };

  const get = (method, url, params) => {
    const key = generateKey(method, url, params);
    if (isExpired(key)) {
      cache.delete(key);
      cacheTimestamps.delete(key);
      return null;
    }
    return cache.get(key);
  };

  const set = (method, url, params, data, ttl) => {
    const key = generateKey(method, url, params);
    cache.set(key, data);
    cacheTimestamps.set(key, Date.now());
    config.set(key, { ttl });
    return key;
  };

  const invalidate = url => {
    const keysToDelete = [];
    cache.forEach((_, key) => {
      if (key.includes(url)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      cache.delete(key);
      cacheTimestamps.delete(key);
      config.delete(key);
    });
    return keysToDelete.length;
  };

  const invalidatePattern = pattern => {
    const regex = new RegExp(pattern);
    const keysToDelete = [];
    cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      cache.delete(key);
      cacheTimestamps.delete(key);
      config.delete(key);
    });
    return keysToDelete.length;
  };

  const clear = () => {
    cache.clear();
    cacheTimestamps.clear();
    config.clear();
  };

  const setTTL = (url, ttl) => {
    config.set(url, { ttl });
  };

  const getStats = () => {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  };

  return {
    get,
    set,
    invalidate,
    invalidatePattern,
    clear,
    setTTL,
    getStats,
    defaultTTL,
  };
})();

const cacheInterceptor = api => {
  const requestCache = new Set();
  const pendingRequests = new Map();

  api.interceptors.request.use(
    config => {
      if (config.method?.toLowerCase() === 'get') {
        const cacheKey = cacheManager.generateKey(config.method, config.url, config.params);

        if (requestCache.has(cacheKey)) {
          config.adapter = () => {
            const cachedData = cacheManager.get(config.method, config.url, config.params);
            if (cachedData) {
              return Promise.resolve({
                data: cachedData,
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
              });
            }
            requestCache.delete(cacheKey);
            return api.request(config);
          };
        }
      }
      return config;
    },
    error => Promise.reject(error)
  );

  api.interceptors.response.use(
    response => {
      if (response.config.method?.toLowerCase() === 'get') {
        const cacheKey = cacheManager.generateKey(
          response.config.method,
          response.config.url,
          response.config.params
        );
        cacheManager.set(
          response.config.method,
          response.config.url,
          response.config.params,
          response.data
        );
        requestCache.add(cacheKey);
      }
      return response;
    },
    error => {
      if (error.config) {
        const cacheKey = cacheManager.generateKey(
          error.config.method,
          error.config.url,
          error.config.params
        );
        requestCache.delete(cacheKey);
      }
      return Promise.reject(error);
    }
  );
};

export const cachedAPI = {
  get: async (url, params = {}, ttl) => {
    const method = 'get';
    const cached = cacheManager.get(method, url, params);
    if (cached) {
      return cached;
    }
    return api.get(url, { params }).then(data => {
      cacheManager.set(method, url, params, data, ttl);
      return data;
    });
  },

  post: (url, data) =>
    api.post(url, data).then(data => {
      cacheManager.invalidate(url);
      return data;
    }),

  put: (url, data) =>
    api.put(url, data).then(data => {
      cacheManager.invalidate(url);
      return data;
    }),

  delete: url =>
    api.delete(url).then(data => {
      cacheManager.invalidate(url);
      return data;
    }),

  invalidate: url => cacheManager.invalidate(url),

  invalidatePattern: pattern => cacheManager.invalidatePattern(pattern),

  clearCache: () => cacheManager.clear(),

  setCacheTTL: (url, ttl) => cacheManager.setTTL(url, ttl),

  getCacheStats: () => cacheManager.getStats(),
};

export const deviceAPI = {
  list: params => cachedAPI.get('/devices', params),
  get: deviceId => cachedAPI.get(`/devices/${deviceId}`),
  create: data => cachedAPI.post('/devices', data),
  update: (deviceId, data) => cachedAPI.put(`/api/devices/${deviceId}`, data),
  delete: deviceId => cachedAPI.delete(`/api/devices/${deviceId}`),
  batchOffline: data => cachedAPI.post('/devices/batch-offline', data),
  batchDelete: data => cachedAPI.delete('/devices/batch-delete', { data }),
  export: params => api.get('/devices/export', { params, responseType: 'blob' }),
  import: formData =>
    api.post('/devices/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const rackAPI = {
  list: params => cachedAPI.get('/racks', params),
  get: rackId => cachedAPI.get(`/racks/${rackId}`),
  create: data => cachedAPI.post('/racks', data),
  update: (rackId, data) => cachedAPI.put(`/racks/${rackId}`, data),
  delete: rackId => cachedAPI.delete(`/racks/${rackId}`),
  import: formData =>
    api.post('/racks/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const roomAPI = {
  list: params => cachedAPI.get('/rooms', params),
  get: roomId => cachedAPI.get(`/rooms/${roomId}`),
  create: data => cachedAPI.post('/rooms', data),
  update: (roomId, data) => cachedAPI.put(`/rooms/${roomId}`, data),
  delete: roomId => cachedAPI.delete(`/rooms/${roomId}`),
};

export const deviceFieldAPI = {
  list: () => cachedAPI.get('/deviceFields'),
  get: fieldId => cachedAPI.get(`/deviceFields/${fieldId}`),
  create: data => cachedAPI.post('/deviceFields', data),
  update: (fieldId, data) => cachedAPI.put(`/deviceFields/${fieldId}`, data),
  delete: fieldId => cachedAPI.delete(`/deviceFields/${fieldId}`),
  updateConfig: data => cachedAPI.post('/deviceFields/config', data),
};

export const consumableAPI = {
  list: params => cachedAPI.get('/consumables', params),
  get: consumableId => cachedAPI.get(`/consumables/${consumableId}`),
  create: data => cachedAPI.post('/consumables', data),
  update: (consumableId, data) => cachedAPI.put(`/consumables/${consumableId}`, data),
  delete: consumableId => cachedAPI.delete(`/consumables/${consumableId}`),
  import: data => cachedAPI.post('/consumables/import', data),
  quickInOut: data => cachedAPI.post('/consumables/quick-inout', data),
  getStatistics: () => cachedAPI.get('/consumables/statistics/summary'),
  getLowStock: () => cachedAPI.get('/consumables/low-stock'),
};

export const consumableCategoryAPI = {
  list: params => cachedAPI.get('/consumable-categories', params),
  getList: params => cachedAPI.get('/consumable-categories/list', params),
  create: data => cachedAPI.post('/consumable-categories', data),
  update: (id, data) => cachedAPI.put(`/consumable-categories/${id}`, data),
  delete: id => cachedAPI.delete(`/consumable-categories/${id}`),
};

export const consumableLogAPI = {
  list: params => cachedAPI.get('/consumables/logs', params),
  create: data => cachedAPI.post('/consumables/logs', data),
  export: params => api.get('/consumables/logs/export', { params, responseType: 'blob' }),
  import: data => cachedAPI.post('/consumables/logs/import', data),
};

export const ticketCategoryAPI = {
  list: params => cachedAPI.get('/ticket-categories', params),
  create: data => cachedAPI.post('/ticket-categories', data),
  update: (code, data) => cachedAPI.put(`/ticket-categories/${code}`, data),
  delete: code => cachedAPI.delete(`/ticket-categories/${code}`),
  getTree: () => cachedAPI.get('/ticket-categories/tree'),
  init: () => cachedAPI.post('/ticket-categories/init'),
};

export { cacheManager };
export default { cachedAPI, cacheManager };
