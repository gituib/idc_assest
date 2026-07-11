import { useMemo } from 'react';
import useSWR from 'swr';
import api from '../api';

/**
 * @description 拉取端口/线缆选项接口的 fetcher
 * @param {string} url - 请求地址
 * @returns {Promise<Object>} 后端返回的 { portTypes, portSpeeds, cableTypes }
 */
const fetcher = url => api.get(url).then(res => res);

const EMPTY_LIST = [];

/**
 * @description 端口与线缆选项 Hook
 *  统一从 GET /api/port-options 拉取端口类型/端口速率/线缆类型选项，
 *  并提供基于选项数组生成的 value→option 映射，便于组件做颜色/文本渲染。
 *  SWR 默认会跨组件去重，多个组件共用同一 key 只发一次请求。
 * @returns {Object}
 *  - portTypes: Array<{value,label,color,group,description}>
 *  - portSpeeds: Array<{value,label,color,group}>
 *  - cableTypes: Array<{value,label,color,icon,description}>
 *  - portTypeMap: Map<value, option>
 *  - portSpeedMap: Map<value, option>
 *  - cableTypeMap: Map<value, option>
 *  - isLoading: boolean
 *  - error: Error | undefined
 */
export const usePortOptions = () => {
  // 注意：api 实例 baseURL 已为 '/api'，这里路径不要再带 /api 前缀
  const { data, error, isLoading } = useSWR('/port-options', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    dedupingInterval: 600000,
  });

  const portTypes = data?.portTypes || EMPTY_LIST;
  const portSpeeds = data?.portSpeeds || EMPTY_LIST;
  const cableTypes = data?.cableTypes || EMPTY_LIST;

  const portTypeMap = useMemo(() => new Map(portTypes.map(o => [o.value, o])), [portTypes]);
  const portSpeedMap = useMemo(() => new Map(portSpeeds.map(o => [o.value, o])), [portSpeeds]);
  const cableTypeMap = useMemo(() => new Map(cableTypes.map(o => [o.value, o])), [cableTypes]);

  return {
    portTypes,
    portSpeeds,
    cableTypes,
    portTypeMap,
    portSpeedMap,
    cableTypeMap,
    isLoading,
    error,
  };
};

export default usePortOptions;
