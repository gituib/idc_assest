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

  return {
    layoutData,
    loading,
    error,
    refetch: fetchLayout,
  };
};

export default useFloorPlanData;
