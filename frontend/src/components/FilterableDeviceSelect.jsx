import React, { useState, useEffect } from 'react';
import { Select, Input, Button, Spin, Empty, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../api';

const { Option } = Select;

const DEVICE_TYPES = [
  { value: 'server', label: '服务器' },
  { value: 'switch', label: '交换机' },
  { value: 'router', label: '路由器' },
  { value: 'storage', label: '存储' },
  { value: 'other', label: '其他' },
];

const FilterableDeviceSelect = ({
  value = null,
  onChange,
  onDeviceListChange,
  filterType = '',
}) => {
  const [roomId, setRoomId] = useState(null);
  const [rackId, setRackId] = useState(null);
  const [type, setType] = useState(filterType || '');
  const [keyword, setKeyword] = useState('');

  const [rooms, setRooms] = useState([]);
  const [racks, setRacks] = useState([]);
  const [devices, setDevices] = useState([]);

  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingRacks, setLoadingRacks] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const response = await api.get('/rooms');
        const roomsData = response.rooms || response.data || response || [];
        setRooms(Array.isArray(roomsData) ? roomsData : []);
      } catch (error) {
        console.error('加载机房列表失败:', error);
        setRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!roomId) {
      setRacks([]);
      setRackId(null);
      return;
    }

    const fetchRacks = async () => {
      setLoadingRacks(true);
      try {
        const response = await api.get('/racks', { params: { roomId, pageSize: 500 } });
        const racksData = response.racks || response.data || response || [];
        setRacks(Array.isArray(racksData) ? racksData : []);
      } catch (error) {
        console.error('加载机柜列表失败:', error);
        setRacks([]);
      } finally {
        setLoadingRacks(false);
      }
    };
    fetchRacks();
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;
    const fetchDevices = async () => {
      setLoadingDevices(true);
      try {
        const params = {};
        if (roomId) params.roomId = roomId;
        if (rackId) params.rackId = rackId;
        if (type) params.type = type;
        if (keyword) params.keyword = keyword;
        params.pageSize = 500;

        const response = await api.get('/devices/all', { params });
        let deviceList = response.data || response.devices || response || [];
        if (!Array.isArray(deviceList)) {
          deviceList = [];
        }

        if (!cancelled) {
          setDevices(deviceList);
          if (onDeviceListChange) {
            onDeviceListChange(deviceList);
          }
        }
      } catch (error) {
        console.error('加载设备列表失败:', error);
        if (!cancelled) {
          setDevices([]);
          if (onDeviceListChange) {
            onDeviceListChange([]);
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingDevices(false);
        }
      }
    };

    const timer = setTimeout(fetchDevices, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [roomId, rackId, type, keyword, onDeviceListChange]);

  const handleReset = () => {
    setRoomId(null);
    setRackId(null);
    setType(filterType || '');
    setKeyword('');
  };

  const handleRoomChange = (newRoomId) => {
    setRoomId(newRoomId);
    setRackId(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: '#f5f5f5',
        borderRadius: '8px',
      }}
    >
      <Row gutter={[12, 12]} align="middle">
        <Col xs={24} sm={12} md={6}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>机房:</span>
            <Select
              placeholder="全部"
              allowClear
              value={roomId}
              onChange={handleRoomChange}
              loading={loadingRooms}
              style={{ flex: 1 }}
            >
              {rooms.map((room) => (
                <Option key={room.roomId} value={room.roomId}>
                  {room.name}
                </Option>
              ))}
            </Select>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>机柜:</span>
            <Select
              placeholder="全部"
              allowClear
              value={rackId}
              onChange={setRackId}
              loading={loadingRacks}
              disabled={!roomId}
              style={{ flex: 1 }}
            >
              {racks.map((rack) => (
                <Option key={rack.rackId} value={rack.rackId}>
                  {rack.name}
                </Option>
              ))}
            </Select>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>类型:</span>
            <Select
              placeholder="全部"
              allowClear
              value={type || undefined}
              onChange={setType}
              style={{ flex: 1 }}
            >
              {DEVICE_TYPES.map((t) => (
                <Option key={t.value} value={t.value}>
                  {t.label}
                </Option>
              ))}
            </Select>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Input
              placeholder="搜索设备名称/ID..."
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
              style={{ flex: 1 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              size="small"
            >
              重置
            </Button>
          </div>
        </Col>
      </Row>

      {loadingDevices && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      )}

      {!loadingDevices && devices.length === 0 && (keyword || roomId || rackId || type) && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="无匹配设备"
          />
        </div>
      )}
    </div>
  );
};

export default FilterableDeviceSelect;
