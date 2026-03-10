import useSWR, { SWRConfig } from 'swr';
import api from '../api';

const fetcher = url => api.get(url).then(res => res);

export const swrConfig = {
  fetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: false,
  dedupingInterval: 5000,
  errorRetryCount: 2,
};

export const useSWRConfig = () => {
  return {
    mutate: useSWR().mutate,
  };
};

export const useFetch = (key, options = {}) => {
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, options);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    isError: !!error,
  };
};

export const useFetchList = (key, options = {}) => {
  const { data, error, isLoading, mutate } = useSWR(key, {
    ...options,
    onSuccess: data => {
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
  });

  return {
    list: data?.list || data?.devices || data?.racks || data?.rooms || data || [],
    total: data?.total || data?.count || 0,
    error,
    isLoading,
    mutate,
  };
};

export { SWRConfig, useSWR };
