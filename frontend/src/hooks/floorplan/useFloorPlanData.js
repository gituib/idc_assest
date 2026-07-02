import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * 机房平面图数据 Hook
 * 负责加载布局数据、保存机柜位置、重置布局
 * @param {string} roomId - 机房ID
 * @returns {object} 数据与操作方法
 */
const useFloorPlanData = (roomId) => {
  const [layoutData, setLayoutData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchLayout = useCallback(async () => {
    if (!roomId) {
      setLayoutData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/rooms/${roomId}/layout`);
      setLayoutData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLayoutData(null);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  /**
   * 批量保存机柜位置到后端
   * @param {Array<{rackId:string, rowPos:number, colPos:number, facing?:string}>} positions - 位置数组
   * @returns {Promise<boolean>} 是否保存成功
   */
  const savePositions = useCallback(async (positions) => {
    if (!roomId || !Array.isArray(positions) || positions.length === 0) {
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await axios.put(`/api/rooms/${roomId}/racks-positions`, { positions });
      await fetchLayout();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [roomId, fetchLayout]);

  /**
   * 重置机房布局（让后端按名称顺序自动分配网格位置）
   * @param {number} [gridRows] - 网格行数（可选）
   * @param {number} [gridCols] - 网格列数（可选）
   * @returns {Promise<boolean>} 是否重置成功
   */
  const initLayout = useCallback(async (gridRows, gridCols) => {
    if (!roomId) return false;
    setSaving(true);
    setError(null);
    try {
      const body = {};
      if (Number.isInteger(gridRows)) body.gridRows = gridRows;
      if (Number.isInteger(gridCols)) body.gridCols = gridCols;
      await axios.post(`/api/rooms/${roomId}/init-layout`, body);
      await fetchLayout();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [roomId, fetchLayout]);

  return {
    layoutData,
    loading,
    saving,
    error,
    refetch: fetchLayout,
    savePositions,
    initLayout,
  };
};

export default useFloorPlanData;
