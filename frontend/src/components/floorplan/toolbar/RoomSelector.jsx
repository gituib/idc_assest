import React, { useState, useEffect, useCallback } from 'react';
import { Select, Spin } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import axios from 'axios';

const RoomSelector = ({ selectedRoomId, onRoomChange }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/rooms', { params: { pageSize: 1000 } });
      setRooms(response.data.rooms || []);
      if (!selectedRoomId && response.data.rooms?.length > 0) {
        onRoomChange(response.data.rooms[0].roomId);
      }
    } catch (err) {
      console.error('获取机房列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, onRoomChange]);

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <Select
      value={selectedRoomId}
      onChange={onRoomChange}
      style={{ minWidth: 180 }}
      placeholder="选择机房"
      suffixIcon={loading ? <Spin size="small" /> : <HomeOutlined />}
      options={rooms.map(r => ({
        value: r.roomId,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#1677ff',
            }} />
            {r.name}
          </div>
        ),
      }))}
      notFoundContent={loading ? <Spin size="small" /> : '暂无机房'}
      size="middle"
    />
  );
};

export default RoomSelector;
