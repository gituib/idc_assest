import { useState, useEffect } from 'react';

/**
 * 防抖 Hook
 * @param {any} value - 需要防抖的值
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {any} 防抖后的值
 *
 * @example
 * const [keyword, setKeyword] = useState('');
 * const debouncedKeyword = useDebounce(keyword, 300);
 *
 * useEffect(() => {
 *   // 只有在停止输入 300ms 后才会执行
 *   fetchData(debouncedKeyword);
 * }, [debouncedKeyword]);
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖函数 Hook（用于回调函数）
 * @param {Function} callback - 需要防抖的回调函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 *
 * @example
 * const debouncedSearch = useDebouncedCallback((value) => {
 *   fetchData(value);
 * }, 300);
 *
 * <Input onChange={e => debouncedSearch(e.target.value)} />
 */
export function useDebouncedCallback(callback, delay = 300) {
  const [timeoutId, setTimeoutId] = useState(null);

  const debouncedFn = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  // 清理函数
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedFn;
}

export default useDebounce;
