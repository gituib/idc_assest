import { useState, useCallback } from 'react';
import axios from 'axios';

export function useTopologyData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTopologyBySwitch = useCallback(async (switchId, options = {}) => {
    if (!switchId) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = { maxNodes: options.maxNodes || 100 };
      const response = await axios.get(`/api/topology/switch/${switchId}`, { params });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || '获取拓扑数据失败');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || '获取拓扑数据失败';
      setError(errorMessage);
      console.error('获取拓扑数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopologyByRack = useCallback(async (rackId, options = {}) => {
    if (!rackId) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = { maxNodes: options.maxNodes || 100 };
      const response = await axios.get(`/api/topology/rack/${rackId}`, { params });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || '获取拓扑数据失败');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || '获取拓扑数据失败';
      setError(errorMessage);
      console.error('获取拓扑数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    fetchTopologyBySwitch,
    fetchTopologyByRack,
    clearData
  };
}
