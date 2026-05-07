import React, { useState, useEffect, useRef } from 'react';
import { Select, Spin, message } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import axios from 'axios';
import { RoomOptionContent, RoomIndicator } from '../styles';

const RoomSelector = ({ selectedRoomId, onRoomChange }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const response = await axios.get('/api/rooms', { params: { pageSize: 1000 } });
        const roomList = response.data.rooms || [];
        setRooms(roomList);
        
        if (!hasAutoSelected.current && roomList.length > 0 && !selectedRoomId) {
          hasAutoSelected.current = true;
          onRoomChange(roomList[0].roomId);
        }
      } catch (err) {
        message.error('获取机房列表失败');
      } finally {
        setLoading(false);
      }
    };

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
          <RoomOptionContent>
            <RoomIndicator />
            {r.name}
          </RoomOptionContent>
        ),
      }))}
      notFoundContent={loading ? <Spin size="small" /> : '暂无机房'}
      size="middle"
    />
  );
};

export default RoomSelector;
