import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useFloorPlanData = (roomId) => {
  const [layoutData, setLayoutData] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const updateRackPosition = useCallback(async (rackId, rowPos, colPos, facing) => {
    try {
      await axios.put(`/api/racks/${rackId}/position`, { rowPos, colPos, facing });
      await fetchLayout();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return false;
    }
  }, [fetchLayout]);

  const batchUpdatePositions = useCallback(async (positions) => {
    try {
      await axios.put(`/api/rooms/${roomId}/racks-positions`, { positions });
      await fetchLayout();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return false;
    }
  }, [roomId, fetchLayout]);

  const updateLayout = useCallback(async (gridRows, gridCols, layoutConfig) => {
    try {
      await axios.put(`/api/rooms/${roomId}/layout`, { gridRows, gridCols, layoutConfig });
      await fetchLayout();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return false;
    }
  }, [roomId, fetchLayout]);

  const initLayout = useCallback(async (gridRows, gridCols, layoutConfig) => {
    try {
      await axios.post(`/api/rooms/${roomId}/init-layout`, { gridRows, gridCols, layoutConfig });
      await fetchLayout();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      return false;
    }
  }, [roomId, fetchLayout]);

  return {
    layoutData,
    loading,
    error,
    refetch: fetchLayout,
    updateRackPosition,
    batchUpdatePositions,
    updateLayout,
    initLayout,
  };
};

export default useFloorPlanData;
