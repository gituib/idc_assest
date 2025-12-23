import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, message, Tooltip } from 'antd';
import { 
  ReloadOutlined, 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  RotateRightOutlined,
  CloudServerOutlined,
  SwitcherOutlined,
  DatabaseOutlined,
  CloudOutlined,
  LaptopOutlined,
  MobileOutlined,
  PrinterOutlined,
  SettingOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-50%) translateX(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) translateX(0) scale(1);
    }
  }
  
  /* LED指示灯闪烁动画 */
  @keyframes ledBlink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
  }
  
  /* Tooltip淡入动画 */
  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateY(-50%) translateX(-10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) translateX(0) scale(1);
    }
  }
  
  /* 金属拉丝纹理 */
  .metal-texture {
    background-image: 
      linear-gradient(90deg, 
        transparent 0%, 
        rgba(255,255,255,0.03) 50%, 
        transparent 100%),
      repeating-linear-gradient(0deg,
        transparent 0px,
        rgba(255,255,255,0.02) 1px,
        transparent 2px,
        transparent 3px);
    background-size: 100% 100%, 4px 4px;
  }
  
  /* 散热格栅效果 */
  .ventilation-grille {
    background-image: repeating-linear-gradient(
      0deg,
      #334155 0px,
      #334155 1px,
      transparent 1px,
      transparent 2px
    );
  }
  
  /* 悬停提亮效果 */
  .device-hover {
    background: linear-gradient(145deg, #e8f5e8, #d4edda) !important;
    box-shadow: 0 6px 16px rgba(0,0,0,0.3), 0 0 8px rgba(129, 199, 132, 0.4) !important;
  }
  
  /* Tooltip样式 */
  .device-tooltip {
    background: rgba(0, 0, 0, 0.9);
    color: #5eead4;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: 'Roboto Mono', monospace;
    font-size: 11px;
    border: 1px solid rgba(94, 234, 212, 0.3);
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    white-space: nowrap;
  }
  
  /* 设备数量badge */
  .device-count-badge {
    background: linear-gradient(145deg, #a5d6a7, #81c784);
    color: #2e7d32;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 2px 6px rgba(129, 199, 132, 0.3);
    border: 1px solid rgba(129, 199, 132, 0.5);
    backdrop-filter: blur(4px);
    transition: all 0.2s ease;
    white-space: 'nowrap';
  }

  .device-count-badge:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(129, 199, 132, 0.4);
  }
  

`;
document.head.appendChild(style);

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('机柜可视化组件错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '600px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          padding: '20px'
        }}>
          <h2 style={{ color: '#f44336' }}>可视化组件出错了</h2>
          <p style={{ color: '#666', margin: '10px 0' }}>
            错误信息: {this.state.error?.toString()}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1890ff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function RackVisualization() {
  const [racks, setRacks] = useState([]);
  const [selectedRack, setSelectedRack] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [zoom, setZoom] = useState(1.5);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState(null);
  const [deviceTooltip, setDeviceTooltip] = useState(null); // 设备详情tooltip
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 }); // tooltip位置
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundType, setBackgroundType] = useState('gradient'); // gradient or image
  const [backgroundSize, setBackgroundSize] = useState('contain'); // cover, contain, auto
  const [uploading, setUploading] = useState(false); // 上传状态
  const [showTooltipConfig, setShowTooltipConfig] = useState(false); // 显示tooltip配置面板
  const [tooltipDeviceFields, setTooltipDeviceFields] = useState([]); // 设备字段配置
  const [loadingTooltipFields, setLoadingTooltipFields] = useState(false); // 加载字段配置状态
  const [savingTooltipConfig, setSavingTooltipConfig] = useState(false); // 保存配置状态

  // 设备详情tooltip字段配置
  const [tooltipFields, setTooltipFields] = useState({});

  // 获取设备字段配置
  const fetchTooltipDeviceFields = async () => {
    try {
      setLoadingTooltipFields(true);
      const response = await axios.get('/api/deviceFields');
      const sortedFields = response.data.sort((a, b) => a.order - b.order);
      setTooltipDeviceFields(sortedFields);

      // 根据字段配置初始化tooltipFields
      const initialFields = {};
      sortedFields.forEach(field => {
        initialFields[field.fieldName] = {
          label: field.displayName,
          enabled: field.visible,
          field: field.fieldName,
          fieldType: field.fieldType
        };
      });
      setTooltipFields(initialFields);
    } catch (error) {
      console.error('获取设备字段配置失败:', error);
    } finally {
      setLoadingTooltipFields(false);
    }
  };

  // 保存tooltip字段配置
  const saveTooltipConfig = async () => {
    try {
      setSavingTooltipConfig(true);
      const fieldConfigs = Object.values(tooltipFields).map(field => ({
        fieldName: field.field,
        visible: field.enabled
      }));
      
      await axios.post('/api/deviceFields/config', fieldConfigs);
      message.success('字段配置已保存');
      setShowTooltipConfig(false);
    } catch (error) {
      console.error('保存字段配置失败:', error);
      message.error('保存字段配置失败');
    } finally {
      setSavingTooltipConfig(false);
    }
  };

  // 获取所有机柜
  const fetchRacks = async () => {
    try {
      setLoading(true);
      setError(null);
      // 为机柜可视化页面传递较大的pageSize以获取所有机柜
      const response = await axios.get('/api/racks', { params: { pageSize: 1000 } });
      
      // 验证数据结构并过滤有效机柜
      // 机柜API返回的是包含total和racks数组的对象
      const racksArray = response.data.racks || [];
      const validRacks = racksArray.filter(rack => 
        rack && 
        typeof rack === 'object' && 
        rack.rackId && 
        typeof rack.height === 'number'
      );
      
      setRacks(validRacks);
      if (validRacks.length > 0) {
        // 自动选择第一个机柜
        const firstRack = validRacks[0];
        setSelectedRack(firstRack);
        
        // 设置对应的机房
        if (firstRack?.Room) {
          const roomKey = firstRack.Room.roomId || firstRack.Room.id || firstRack.Room.name;
          setSelectedRoom(roomKey);
        }
        
        fetchDevices(firstRack.rackId);
      } else {
        setSelectedRack(null);
        setSelectedRoom(null);
        setDevices([]);
        message.warning('未找到有效的机柜数据');
      }
    } catch (error) {
      message.error('获取机柜列表失败');
      console.error('获取机柜列表失败:', error);
      setError(error);
      setRacks([]);
      setSelectedRack(null);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取机柜内的设备
  const fetchDevices = async (rackId) => {
    try {
      setLoadingDevices(true);
      console.log(`=== 开始获取机柜 ${rackId} 的设备数据 ===`);
      console.log('API URL:', `/api/devices?rackId=${rackId}`);
      
      const response = await axios.get(`/api/devices?rackId=${rackId}`);
      
      console.log('=== API响应完整信息 ===');
      console.log('HTTP状态码:', response.status);
      console.log('响应头:', response.headers);
      console.log('响应数据类型:', typeof response.data);
      console.log('响应数据:', JSON.stringify(response.data, null, 2));
      
      // 处理不同的响应格式
      let devicesData;
      if (Array.isArray(response.data)) {
        devicesData = response.data;
        console.log('响应是数组格式');
      } else if (response.data && Array.isArray(response.data.data)) {
        devicesData = response.data.data;
        console.log('响应是对象格式，数组在data字段中');
      } else if (response.data && Array.isArray(response.data.devices)) {
        devicesData = response.data.devices;
        console.log('响应是对象格式，数组在devices字段中');
      } else {
        devicesData = [];
        console.log('响应不是预期格式，设置为空数组');
      }
      
      console.log('=== 处理后的设备数据 ===');
      console.log('设备数组长度:', devicesData.length);
      console.log('设备数据:', devicesData);
      
      // 如果没有数据，显示警告
      if (devicesData.length === 0) {
        console.warn('=== 没有找到设备数据 ===');
        console.warn('可能的原因:');
        console.warn('1. 数据库中该机柜确实没有设备');
        console.warn('2. API路由配置错误');
        console.warn('3. 数据库查询条件问题');
        message.warning(`机柜 ${rackId} 暂无设备数据`);
        setDevices([]);
        return;
      }
      
      // 显示原始数据结构以供调试
      console.log('=== 数据结构分析 ===');
      if (devicesData.length > 0) {
        const firstDevice = devicesData[0];
        console.log('第一个设备完整数据:', JSON.stringify(firstDevice, null, 2));
        console.log('第一个设备的字段:', Object.keys(firstDevice));
        console.log('第一个设备的字段类型:');
        Object.keys(firstDevice).forEach(key => {
          console.log(`  ${key}: ${typeof firstDevice[key]} = ${JSON.stringify(firstDevice[key])}`);
        });
      }
      
      // 过滤有效的设备数据 - 放宽验证条件
      const validDevices = devicesData.filter(device => {
        if (!device) {
          console.log('跳过空设备');
          return false;
        }
        
        console.log('设备数据:', device);
        
        // 只要求有任意ID字段或标识符
        const hasId = device.deviceId || device.id || device.device_id || device.device;
        if (!hasId) {
          console.log('跳过缺少ID的设备:', device);
          return false;
        }
        
        // 放宽名称验证
        const hasName = device.name || device.deviceName || device.device_name || device.title;
        if (!hasName) {
          console.log('跳过缺少名称的设备:', device);
          return false;
        }
        
        // 检查位置和高度，允许字符串类型并转换
        let position = device.position || device.u_position || device.uPos || device.u;
        let height = device.height || device.u_height || device.uHeight || device.size || 1;
        
        // 如果是字符串，尝试转换为数字
        if (typeof position === 'string') {
          position = parseInt(position, 10);
        }
        if (typeof height === 'string') {
          height = parseInt(height, 10);
        }
        
        if (typeof position !== 'number' || isNaN(position) || position <= 0) {
          console.log('跳过位置无效的设备:', device);
          return false;
        }
        
        if (typeof height !== 'number' || isNaN(height) || height <= 0) {
          console.log('跳过高度无效的设备:', device);
          return false;
        }
        
        // 统一化数据格式
        device.position = position;
        device.height = height;
        device.name = hasName;
        device.deviceId = hasId;
        
        console.log('有效的设备:', device);
        return true;
      });
      
      console.log('最终有效设备列表:', validDevices);
      setDevices(validDevices);
      
      if (validDevices.length === 0) {
        console.warn('未找到有效设备数据');
        message.warning('该机柜内暂无设备数据');
      }
    } catch (error) {
      message.error('获取设备列表失败');
      console.error('获取设备列表失败:', error);
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchRacks();
    loadBackgroundSettings();
    fetchTooltipDeviceFields();
  }, []);

  // 根据设备类型获取图标
  const getDeviceIcon = (deviceType) => {
    try {
      if (!deviceType) return <CloudServerOutlined style={{ color: '#ffffff' }} />;
      const type = deviceType.toLowerCase();
      
      if (type.includes('server') || type.includes('服务器')) return <CloudServerOutlined style={{ color: '#ffffff' }} />;
      if (type.includes('switch') || type.includes('交换机')) return <SwitcherOutlined style={{ color: '#ffffff' }} />;
      if (type.includes('storage') || type.includes('存储')) return <DatabaseOutlined style={{ color: '#ffffff' }} />;
      if (type.includes('router') || type.includes('路由器')) return <CloudOutlined style={{ color: '#ffffff' }} />;
      if (type.includes('laptop') || type.includes('笔记本')) return <LaptopOutlined style={{ color: '#ffffff' }} />;
      if (type.includes('mobile') || type.includes('手机')) return <MobileOutlined style={{ color: '#ffffff' }} />;
      if (type.includes('printer') || type.includes('打印机')) return <PrinterOutlined style={{ color: '#ffffff' }} />;
      
      return <CloudServerOutlined style={{ color: '#ffffff' }} />;
    } catch (error) {
      console.error('设备图标渲染错误:', error);
      return <CloudServerOutlined style={{ color: '#ffffff' }} />;
    }
  };

  // 根据设备类型获取背景色
  const getDeviceColor = (deviceType) => {
    if (!deviceType) return '#1890ff';
    const type = deviceType.toLowerCase();
    
    if (type.includes('server') || type.includes('服务器')) return '#1890ff'; // 蓝色
    if (type.includes('switch') || type.includes('交换机')) return '#52c41a'; // 绿色
    if (type.includes('storage') || type.includes('存储')) return '#faad14'; // 黄色
    if (type.includes('router') || type.includes('路由器')) return '#f5222d'; // 红色
    if (type.includes('laptop') || type.includes('笔记本')) return '#722ed1'; // 紫色
    if (type.includes('mobile') || type.includes('手机')) return '#eb2f96'; // 粉色
    if (type.includes('printer') || type.includes('打印机')) return '#13c2c2'; // 青色
    
    return '#1890ff'; // 默认蓝色
  };

  // 获取设备状态颜色
  const getDeviceStatusColor = (status) => {
    const statusColorMap = {
      'normal': '#10b981',     // 正常 - 绿色常亮
      'warning': '#f59e0b',    // 预警 - 黄色常亮
      'error': '#ef4444',      // 告警 - 红色慢闪
      'offline': '#6b7280',    // 离线 - 灰色
      'maintenance': '#3b82f6', // 维护 - 蓝色常亮
      undefined: '#3b82f6',    // 默认普通设备 - 蓝色常亮
      null: '#3b82f6'
    };
    return statusColorMap[status] || '#3b82f6';
  };

  // 生成模拟监控数据
  const generateMonitoringData = (device) => {
    const baseTemp = device.type?.includes('服务器') ? 65 : 
                    device.type?.includes('存储') ? 55 : 
                    device.type?.includes('网络') ? 45 : 40;
    
    const baseVoltage = 220;
    const baseUptime = 24 * 365; // 假设运行了1年
    
    return {
      temperature: (baseTemp + Math.random() * 20 - 10).toFixed(1), // 温度
      voltage: (baseVoltage + Math.random() * 10 - 5).toFixed(1),   // 电压
      uptime: Math.floor(baseUptime + Math.random() * 24 * 30),     // 运行时长（小时）
      power: (50 + Math.random() * 200).toFixed(1),                 // 功耗
      load: Math.floor(Math.random() * 80 + 10)                     // 负载百分比
    };
  };

  const getDeviceStyle = (device, rackHeight) => {
    // 添加参数验证
    if (!device || typeof device.position !== 'number' || typeof device.height !== 'number') {
      return {};
    }
    
    const uHeight = 25; // 调整为更小的U高度以适应屏幕显示，1U=25px
    const deviceHeight = Math.max(1, device.height) * uHeight;
    
    // 设备位置从底部开始计算（U1在底部）
    let position = Math.max(1, device.position);
    let deviceUHeight = Math.max(1, device.height);
    
    // 确保设备不会超出机柜范围
    if (position + deviceUHeight - 1 > rackHeight) {
      // 如果设备会超出机柜，调整位置或高度
      position = Math.max(1, rackHeight - deviceUHeight + 1);
    }
    
    // 计算设备的顶部位置（从机柜顶部算起）
    // 设备占用从 position 到 position + height - 1 的U
    // 机柜顶部是U0，所以设备顶部的topPosition是：
    const deviceBottomU = position; // 设备底部U数
    const deviceTopU = position + deviceUHeight - 1; // 设备顶部U数
    const topPosition = (rackHeight - deviceTopU) * uHeight;
    
    return {
      height: `${deviceHeight}px`, // 确保设备高度精确等于U位高度
      top: `${topPosition}px`, // 确保设备顶部与U位网格线对齐
      // 移除任何可能影响占满U位的样式
      margin: 0,
      padding: 0
    };
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '未知';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    } catch (error) {
      return '无效日期';
    }
  };

  // 获取设备类型中文名称
  const getDeviceTypeName = (type) => {
    const typeMap = {
      'server': '服务器',
      'switch': '交换机',
      'router': '路由器',
      'storage': '存储设备',
      'ups': 'UPS',
      'firewall': '防火墙',
      'other': '其他设备'
    };
    return typeMap[type?.toLowerCase()] || '未知设备';
  };

  // 生成U数标记（每个U都有标记）
  const generateUMarks = (height) => {
    const marks = [];
    const uHeight = 25; // 调整为更小的U高度以适应屏幕显示
    
    for (let i = 1; i <= height; i++) {
      marks.push(
        <div 
          key={i} 
          className="u-mark"
          style={{
            top: `${(height - i) * uHeight}px`,
            height: '1px',
            backgroundColor: i % 5 === 0 ? '#81c784' : '#a5d6a7',
            width: '100%',
            position: 'absolute',
            borderTop: i % 5 === 0 ? '2px solid #81c784' : '1px solid #a5d6a7'
          }}
        >
          <span style={{
            position: 'absolute',
            left: '-40px',
            top: '-12px',
            fontSize: '12px',
            color: i % 5 === 0 ? '#2e7d32' : '#4caf50',
            fontWeight: i % 5 === 0 ? 'bold' : 'normal',
            textShadow: '1px 1px 1px rgba(255,255,255,0.8)'
          }}>
            {i}
          </span>
        </div>
      );
    }
    
    return marks;
  };

  // 生成左侧U数标记（从U1开始显示）
  const generateLeftUMarks = (height) => {
    const marks = [];
    const uHeight = 25; // 调整为更小的U高度以适应屏幕显示
    
    for (let u = 1; u <= height; u++) {
      // 使用与设备位置计算一致的逻辑
      // U1在最底部，计算U位标记的顶部位置（从机柜顶部算起）
      const topPosition = (height - u) * uHeight;
      
      marks.push(
        <div key={`left-${u}`}>
          {/* U位序号 */}
          <div 
            style={{
              position: 'absolute',
              top: `${topPosition}px`,
              left: '0',
              width: '30px',
              height: `${uHeight}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: u % 5 === 0 ? '#2e7d32' : '#4caf50', // 绿色系
              fontSize: '12px',
              fontWeight: u % 5 === 0 ? 'bold' : 'normal',
              textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
              zIndex: 30, // 提高z-index确保在前面板之上
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: '4px',
              border: '1px solid rgba(129, 199, 132, 0.5)',
              boxShadow: '0 2px 6px rgba(129, 199, 132, 0.3)'
            }}
          >
            {u}
          </div>
        </div>
      );
    }
    
    return marks;
  };

  // 生成右侧U数标记（从U1开始显示）
  const generateRightUMarks = (height) => {
    const marks = [];
    const uHeight = 25; // 调整为更小的U高度以适应屏幕显示
    
    for (let u = 1; u <= height; u++) {
      // 使用与设备位置计算一致的逻辑
      // U1在最底部，计算U位标记的顶部位置（从机柜顶部算起）
      const topPosition = (height - u) * uHeight;
      
      marks.push(
        <div key={`right-${u}`}>
          {/* U位序号 */}
          <div 
            style={{
              position: 'absolute',
              top: `${topPosition}px`,
              right: '0',
              width: '30px',
              height: `${uHeight}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: u % 5 === 0 ? '#2e7d32' : '#4caf50', // 绿色系
              fontSize: '12px',
              fontWeight: u % 5 === 0 ? 'bold' : 'normal',
              textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
              zIndex: 30, // 提高z-index确保在前面板之上
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: '4px',
              border: '1px solid rgba(129, 199, 132, 0.5)',
              boxShadow: '0 2px 6px rgba(129, 199, 132, 0.3)'
            }}
          >
            {u}
          </div>
        </div>
      );
    }
    
    return marks;
  };

  // 获取机房列表
  const getRooms = () => {
    const roomMap = new Map();
    racks.forEach(rack => {
      if (rack?.Room) {
        const roomKey = rack.Room.roomId || rack.Room.id || rack.Room.name;
        if (!roomMap.has(roomKey)) {
          roomMap.set(roomKey, {
            ...rack.Room,
            key: roomKey
          });
        }
      }
    });
    return Array.from(roomMap.values());
  };

  // 获取指定机房下的机柜
  const getRacksByRoom = (roomId) => {
    return racks.filter(rack => {
      const rackRoomId = rack?.Room?.roomId || rack?.Room?.id;
      return rackRoomId === roomId;
    });
  };

  // 选择机房
  const handleRoomChange = (roomId) => {
    console.log('选择机房:', roomId);
    setSelectedRoom(roomId);
    
    // 重置机柜选择
    setSelectedRack(null);
    setDevices([]);
    
    // 如果选择了机房，获取该机房下的机柜
    if (roomId) {
      const roomRacks = getRacksByRoom(roomId);
      if (roomRacks.length > 0) {
        // 自动选择第一个机柜
        const firstRack = roomRacks[0];
        setSelectedRack(firstRack);
        fetchDevices(firstRack.rackId);
      }
    }
  };

  // 选择机柜
  const handleRackChange = (rackId) => {
    const rack = racks.find(r => r.rackId === rackId);
    if (rack) {
      setSelectedRack(rack);
      fetchDevices(rackId);
    }
  };

  // 重新加载数据
  const handleReload = () => {
    setLoading(true);
    fetchRacks().then(() => {
      message.success('数据已刷新');
    });
  };
  
  // 保存背景设置到服务器
  const saveBackgroundSettings = async (type, image, size) => {
    try {
      await axios.post('/api/background/settings', {
        type,
        image,
        size
      });
    } catch (error) {
      console.error('保存背景设置失败:', error);
    }
  };
  
  // 从服务器加载背景设置
  const loadBackgroundSettings = async () => {
    try {
      const response = await axios.get('/api/background/settings');
      if (response.data) {
        setBackgroundType(response.data.type || 'gradient');
        setBackgroundImage(response.data.image || null);
        setBackgroundSize(response.data.size || 'contain');
      }
    } catch (error) {
      console.error('加载背景设置失败:', error);
    }
  };

  // 重置视角
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };

  // 放大
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.3, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.3, 0.7));
  };

  // 无需额外的初始化，CSS 3D变换直接在JSX中实现

  return (
    <div>
      <Card 
        title="机柜可视化"
        extra={
          <Space>
            <Select
              placeholder="选择机房"
              style={{ width: 180 }}
              value={selectedRoom}
              onChange={handleRoomChange}
              loading={loading}
              disabled={loading}
              allowClear
            >
              {getRooms().map(room => (
                <Option key={room.key} value={room.key}>
                  {room.name || '未知机房'} ({room.roomId || room.id || '无ID'})
                </Option>
              ))}
            </Select>
            <Select
              placeholder="选择机柜"
              style={{ width: 200 }}
              value={selectedRack?.rackId}
              onChange={handleRackChange}
              loading={loading || loadingDevices}
              disabled={!selectedRoom || loading}
              allowClear
            >
              {selectedRoom && getRacksByRoom(selectedRoom).map(rack => (
                <Option key={rack?.rackId || `rack-${Math.random()}`} value={rack?.rackId}>
                  {rack?.name || '未知机柜'} ({rack?.rackId || '无ID'}) - {rack?.height || 0}U
                </Option>
              ))}
            </Select>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleReload}
              loading={loading}
              disabled={loading}
            >
              刷新
            </Button>
            <Button 
              icon={<SettingOutlined />} 
              onClick={() => setShowTooltipConfig(true)}
              type={showTooltipConfig ? 'primary' : 'default'}
            >
              字段配置
            </Button>
          </Space>
        }  
      >
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Button icon={<ZoomInOutlined />} onClick={handleZoomIn}>放大</Button>
            <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut}>缩小</Button>
            <Button icon={<RotateRightOutlined />} onClick={handleResetView}>重置视角</Button>
            <Select
                  placeholder="选择背景类型"
                  style={{ width: 150 }}
                  value={backgroundType}
                  onChange={async (type) => {
                    setBackgroundType(type);
                    await saveBackgroundSettings(type, backgroundImage, backgroundSize);
                  }}
                >
                  <Option value="gradient">渐变背景</Option>
                  <Option value="image">自定义图片</Option>
                </Select>
                {backgroundType === 'image' && (
                  <Space>
                    <input
                      type="text"
                      placeholder="输入图片URL"
                      style={{ width: 200, padding: '4px 8px', borderRadius: '4px', border: '1px solid #d9d9d9' }}
                      onChange={async (e) => {
                        const image = e.target.value;
                        setBackgroundImage(image);
                        await saveBackgroundSettings(backgroundType, image, backgroundSize);
                      }}
                      value={backgroundImage || ''}
                    />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      try {
                        setUploading(true);
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('type', 'background');
                        
                        // 发送图片到服务器
                        const response = await axios.post('/api/background/upload', formData, {
                          headers: {
                            'Content-Type': 'multipart/form-data'
                          }
                        });
                        
                        // 保存服务器返回的图片路径
                        if (response.data && response.data.path) {
                          setBackgroundImage(response.data.path);
                          message.success('背景图片上传成功');
                          // 保存背景设置到服务器
                          await saveBackgroundSettings('image', response.data.path, backgroundSize);
                        } else {
                          message.error('上传失败：服务器返回格式不正确');
                        }
                      } catch (error) {
                        console.error('上传失败:', error);
                        message.error('背景图片上传失败，请重试');
                      } finally {
                        setUploading(false);
                      }
                    }
                  }}
                  style={{ display: 'none' }}
                  id="backgroundFileInput"
                />
                <Button onClick={() => document.getElementById('backgroundFileInput').click()} loading={uploading}>上传图片</Button>
                <Select
                  placeholder="图片大小"
                  style={{ width: 100 }}
                  value={backgroundSize}
                  onChange={async (size) => {
                    setBackgroundSize(size);
                    await saveBackgroundSettings(backgroundType, backgroundImage, size);
                  }}
                >
                  <Option value="contain">自适应</Option>
                  <Option value="cover">覆盖</Option>
                  <Option value="auto">原始大小</Option>
                </Select>
                {backgroundImage && (
                  <Button onClick={() => {
                    setBackgroundImage(null);
                    setBackgroundType('gradient');
                  }}>清除</Button>
                )}
              </Space>
            )}
          </Space>
        </div>
        
        <ErrorBoundary>
          {loading ? (
            <div style={{ 
              width: '100%', 
              height: '600px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              fontSize: '16px',
              color: '#666'
            }}>
              加载机柜数据中...
            </div>
          ) : selectedRack ? (
            <div 
              className="rack-visualization-container"
              style={{ 
                width: '100%',
                height: 'calc(100vh - 200px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                perspective: '1000px',
                overflow: 'auto',
                backgroundColor: '#f5f5f5',
                background: backgroundType === 'image' && backgroundImage 
                  ? `url(${backgroundImage})`
                  : '#f8fffe',
                backgroundSize: backgroundType === 'image' ? backgroundSize : 'auto',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                borderRadius: '8px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
                padding: '20px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}>
              {loadingDevices && (
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000
                }}>
                  <div style={{ 
                    padding: '20px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    加载设备数据中...
                  </div>
                </div>
              )}
              <div 
                style={{
                  transform: `scale(${zoom})`,
                  transition: 'transform 0.3s ease',
                  position: 'relative',
                  margin: '0 auto',
                  padding: '40px 50px', // 为U数标记预留空间
                  willChange: 'transform, scale'
                }}
              >
                {/* 机柜主体 */}
                <div style={{
                  position: 'relative',
                  width: '600px',
                  height: `${selectedRack.height * 25}px`,
                  background: 'linear-gradient(145deg, #e0f2fe, #b3e5fc)',
                  border: '2px solid #81c784',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  overflow: 'visible'
                }}>
                  {/* 左侧U数标记 */}
                  <div style={{
                    position: 'absolute',
                    left: '0',
                    top: '3px',
                    width: '30px',
                    bottom: '3px',
                    zIndex: 20,
                    pointerEvents: 'none'
                  }}>
                    {generateLeftUMarks(selectedRack.height)}
                  </div>
                  
                  {/* 右侧U数标记 */}
                  <div style={{
                    position: 'absolute',
                    right: '0',
                    top: '3px',
                    width: '30px',
                    bottom: '3px',
                    zIndex: 20,
                    pointerEvents: 'none'
                  }}>
                    {generateRightUMarks(selectedRack.height)}
                  </div>
                  
                  {/* 左侧U型安装导轨 */}
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: '33px',
                    width: '15px',
                    bottom: '3px',
                    background: 'linear-gradient(90deg, #5a6268 0%, #495057 50%, #343a40 100%)',
                    borderRight: '1px solid rgba(0,0,0,0.3)',
                    borderRadius: '2px 0 0 2px',
                    boxShadow: 'inset 0 0 3px rgba(0,0,0,0.4)'
                  }}>
                    {/* 导轨安装孔 - 左侧 */}
                    {Array.from({ length: Math.max(1, Math.floor((selectedRack.height * 25 - 6) / 25)) }).map((_, index) => (
                      <div
                        key={`left-rail-${index}`}
                        style={{
                          position: 'absolute',
                          left: '2px',
                          width: '11px',
                          height: '20px',
                          top: `${index * 25 + 2}px`,
                          background: 'linear-gradient(180deg, #2d3436 0%, #636e72 50%, #2d3436 100%)',
                          borderRadius: '1px',
                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1), 0 1px 1px rgba(0,0,0,0.3)'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          left: '3px',
                          top: '6px',
                          width: '5px',
                          height: '8px',
                          background: '#1a1a1a',
                          borderRadius: '1px'
                        }} />
                      </div>
                    ))}
                  </div>
                  
                  {/* 右侧U型安装导轨 */}
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    right: '33px',
                    width: '15px',
                    bottom: '3px',
                    background: 'linear-gradient(90deg, #343a40 0%, #495057 50%, #5a6268 100%)',
                    borderLeft: '1px solid rgba(0,0,0,0.3)',
                    borderRadius: '0 2px 2px 0',
                    boxShadow: 'inset 0 0 3px rgba(0,0,0,0.4)'
                  }}>
                    {/* 导轨安装孔 - 右侧 */}
                    {Array.from({ length: Math.max(1, Math.floor((selectedRack.height * 25 - 6) / 25)) }).map((_, index) => (
                      <div
                        key={`right-rail-${index}`}
                        style={{
                          position: 'absolute',
                          right: '2px',
                          width: '11px',
                          height: '20px',
                          top: `${index * 25 + 2}px`,
                          background: 'linear-gradient(180deg, #2d3436 0%, #636e72 50%, #2d3436 100%)',
                          borderRadius: '1px',
                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1), 0 1px 1px rgba(0,0,0,0.3)'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          right: '3px',
                          top: '6px',
                          width: '5px',
                          height: '8px',
                          background: '#1a1a1a',
                          borderRadius: '1px'
                        }} />
                      </div>
                    ))}
                  </div>
                  
                  {/* 前面板 */}
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: '51px',
                    right: '51px',
                    bottom: '3px',
                    background: 'linear-gradient(145deg, #f5f5f5, #e8e8e8)',
                    borderRadius: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'stretch',
                    padding: '3px',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    overflow: 'visible',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    {/* 细微网格纹理 */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)',
                      backgroundSize: '20px 20px',
                      borderRadius: '4px',
                      pointerEvents: 'none'
                    }} />
                    
                    {/* 移除了内侧U数标记，因为外侧已有U数显示 */}
                    
                    {/* 设备 */}
                    {/* 移除了设备数量显示，现在在机柜标题旁边 */}
                    
                    {devices.length > 0 ? devices.map(device => {
                      try {
                        // 处理统一化后的设备数据
                        const deviceId = device?.deviceId || device?.id || device?.device_id || device?.device || `device-${Math.random()}`;
                        const deviceName = device?.name || device?.deviceName || device?.device_name || device?.title || '未知设备';
                        const position = device?.position || 1;
                        const height = device?.height || 1;
                        
                        return (
                          <div 
                            key={deviceId} 
                            className="device"
                            style={{
                              ...getDeviceStyle(device, selectedRack.height),
                              position: 'absolute',
                              left: '2px',
                              right: '2px',
                              width: 'calc(100% - 4px)',
                              borderRadius: '2px',
                              display: 'flex',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 4px 6px rgba(0,0,0,0.2)',
                              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                              border: '1px solid #cbd5e1',
                              overflow: 'hidden',
                              margin: 0,
                              padding: 0,
                              zIndex: 100,
                              pointerEvents: 'auto'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.01)';
                              e.currentTarget.classList.add('device-hover');
                              
                              // 计算tooltip位置（机柜右侧）
                              const rect = e.currentTarget.getBoundingClientRect();
                              const tooltipX = rect.right + 5; // 设备右侧
                              const tooltipY = rect.top + rect.height / 2; // 设备中间高度
                              
                              setTooltipPosition({ x: tooltipX, y: tooltipY });
                              
                              // 设置设备详情tooltip
                              setDeviceTooltip({
                                device: device
                              });
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.classList.remove('device-hover');
                              
                              // 清除tooltip
                              setDeviceTooltip(null);
                            }}
                          >
                              {/* 左侧状态指示区域 */}
                              <div style={{
                                width: '8%',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '2px 0 0 2px',
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '2px 3px',
                                gap: '3px',
                                flexShrink: 0,
                                overflow: 'hidden',
                                position: 'relative',
                                borderRight: '1px solid rgba(148, 163, 184, 0.1)'
                              }}>
                                {/* 状态指示灯 */}
                                <div style={{
                                  width: '4px',
                                  height: '4px',
                                  borderRadius: '50%',
                                  backgroundColor: getDeviceStatusColor(device.status),
                                  animation: device.status === 'warning' ? 'ledBlink 2s ease-in-out infinite' : 
                                            device.status === 'error' ? 'ledBlink 0.8s ease-in-out infinite' : 'none',
                                  boxShadow: `0 0 6px ${getDeviceStatusColor(device.status)}`
                                }} />
                                <div style={{
                                  width: '4px',
                                  height: '4px',
                                  borderRadius: '50%',
                                  backgroundColor: device.status === 'running' ? '#22c55e' : '#64748b',
                                  boxShadow: device.status === 'running' ? '0 0 4px #22c55e' : 'none',
                                  animation: device.status === 'running' ? 'ledBlink 3s ease-in-out infinite' : 'none'
                                }} />
                                {/* 电源指示 */}
                                <div style={{
                                  width: '3px',
                                  height: '3px',
                                  borderRadius: '1px',
                                  backgroundColor: '#22c55e',
                                  boxShadow: '0 0 3px #22c55e'
                                }} />
                              </div>
                              
                              {/* 中间设备信息区域 */}
                              <div style={{
                                flex: 1,
                                background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '4px 10px',
                                gap: '8px',
                                overflow: 'hidden',
                                borderLeft: '1px solid rgba(148, 163, 184, 0.1)',
                                borderRight: '1px solid rgba(148, 163, 184, 0.1)',
                                position: 'relative'
                              }}>
                                {/* 设备图标 */}
                                <div style={{
                                  fontSize: '14px',
                                  color: '#e2e8f0',
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {getDeviceIcon(device.type)}
                                </div>
                                
                                {/* 分隔符 */}
                                <div style={{
                                  width: '1px',
                                  height: '14px',
                                  background: 'rgba(148, 163, 184, 0.3)'
                                }} />
                                
                                {/* 设备名称 */}
                                <div style={{
                                  color: '#f1f5f9',
                                  fontSize: '9px',
                                  fontWeight: '600',
                                  fontFamily: '"Roboto Mono", "Consolas", monospace',
                                  textAlign: 'left',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  flexShrink: 1,
                                  minWidth: 0
                                }}>
                                  {deviceName}
                                </div>
                                
                                {/* 型号/类型 */}
                                <div style={{
                                  color: '#64748b',
                                  fontSize: '7px',
                                  fontFamily: '"Roboto Mono", monospace',
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {device.model || device.type || ''}
                                </div>
                              </div>
                              
                              {/* 右侧功能区域 */}
                              <div style={{
                                width: '10%',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '0 2px 2px 0',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                padding: '2px 3px',
                                gap: '3px',
                                overflow: 'hidden',
                                position: 'relative',
                                borderLeft: '1px solid rgba(148, 163, 184, 0.1)'
                              }}>
                                {/* 端口指示 */}
                                <div style={{
                                  width: '3px',
                                  height: '4px',
                                  backgroundColor: '#22c55e',
                                  borderRadius: '0 0 1px 1px',
                                  boxShadow: '0 0 3px rgba(34, 197, 94, 0.5)'
                                }} />
                                <div style={{
                                  width: '3px',
                                  height: '4px',
                                  backgroundColor: '#22c55e',
                                  borderRadius: '0 0 1px 1px',
                                  boxShadow: '0 0 3px rgba(34, 197, 94, 0.5)'
                                }} />
                                <div style={{
                                  width: '3px',
                                  height: '4px',
                                  backgroundColor: '#64748b',
                                  borderRadius: '0 0 1px 1px'
                                }} />
                              </div>
                            </div>
                          );
                        } catch (error) {
                          console.error('设备渲染错误:', error, device);
                        // 渲染一个简单的错误显示元素
                        return (
                          <div 
                            key={`error-${Math.random()}`} 
                            style={{
                              position: 'absolute',
                              left: '35px',
                              right: '35px',
                              top: '50%',
                              height: '30px',
                              transform: 'translateY(-50%)',
                              backgroundColor: '#ff4d4f',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              borderRadius: '4px'
                            }}
                          >
                            设备加载错误
                          </div>
                        );
                      }
                    }) : (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#81c784',
                        fontSize: '16px',
                        textAlign: 'center',
                        padding: '16px 24px',
                        backgroundColor: 'rgba(240, 255, 240, 0.95)',
                        borderRadius: '12px',
                        border: '1px solid rgba(129, 199, 132, 0.3)',
                        boxShadow: '0 4px 12px rgba(129, 199, 132, 0.2)',
                        fontWeight: '500'
                      }}>
                        暂无设备数据
                      </div>
                    )}
                  </div>
                  
                  {/* 侧面 */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '100%',
                    width: '30px',
                    height: '100%',
                    backgroundColor: '#7f8c8d',
                    transformOrigin: 'left center',
                    transform: 'rotateY(90deg)',
                    borderTopRightRadius: '4px',
                    borderBottomRightRadius: '4px'
                  }} />
                  
                  {/* 机柜顶部 */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '0',
                    width: '100%',
                    height: '20px',
                    backgroundColor: '#666',
                    transformOrigin: 'bottom center',
                    transform: 'rotateX(90deg)',
                    borderTopLeftRadius: '4px',
                    borderTopRightRadius: '4px'
                  }} />
                  
                  {/* 机柜名称和设备数量 */}
                  <div style={{
                    position: 'absolute',
                    top: '-45px',
                    left: '0',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    {/* 机柜标题 */}
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#2e7d32',
                      textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                      padding: '6px 14px',
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(240,255,240,0.95))',
                      borderRadius: '10px',
                      border: '1px solid rgba(129, 199, 132, 0.4)',
                      boxShadow: '0 3px 10px rgba(129, 199, 132, 0.2)',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap',
                      maxWidth: '60%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {selectedRack.name} ({selectedRack.rackId})
                    </div>
                    
                    {/* 设备数量badge */}
                    <div className="device-count-badge">
                      设备数量: {devices.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              width: '100%', 
              height: '600px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              fontSize: '16px',
              color: '#666'
            }}>
              请选择机柜
            </div>
          )}
        </ErrorBoundary>
        
        {/* Tooltip字段配置面板 */}
        {showTooltipConfig && (
          <div 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2147483647,
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <div style={{
              background: 'linear-gradient(145deg, #1e293b, #0f172a)',
              borderRadius: '12px',
              padding: '20px',
              width: '380px',
              border: '1px solid rgba(94, 234, 212, 0.3)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(94, 234, 212, 0.2)'
              }}>
                <div style={{ color: '#f8fafc', fontSize: '16px', fontWeight: 'bold' }}>
                  设备详情字段配置
                </div>
                <button 
                  onClick={() => setShowTooltipConfig(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px 8px'
                  }}
                >
                  ×
                </button>
              </div>
              
              {loadingTooltipFields ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  color: '#94a3b8'
                }}>
                  加载字段配置中...
                </div>
              ) : Object.keys(tooltipFields).length === 0 ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center',
                  color: '#94a3b8'
                }}>
                  暂无字段配置，请先在设备字段管理中添加字段
                </div>
              ) : (
                <>
                  <div style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto',
                    paddingRight: '8px'
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
                      选择要在设备详情中显示的字段：
                    </div>
                    
                    {Object.entries(tooltipFields).map(([key, field]) => (
                      <label 
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '10px 12px',
                          marginBottom: '4px',
                          background: field.enabled ? 'rgba(94, 234, 212, 0.1)' : 'transparent',
                          borderRadius: '6px',
                          border: field.enabled ? '1px solid rgba(94, 234, 212, 0.3)' : '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={() => setTooltipFields(prev => ({
                            ...prev,
                            [key]: { ...prev[key], enabled: !prev[key].enabled }
                          }))}
                          style={{
                            marginRight: '12px',
                            width: '18px',
                            height: '18px',
                            accentColor: '#5eead4'
                          }}
                        />
                        <span style={{ 
                          color: field.enabled ? '#f8fafc' : '#64748b',
                          fontSize: '14px'
                        }}>
                          {field.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  
                  <div style={{ 
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(94, 234, 212, 0.2)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                  }}>
                    <button
                      onClick={() => {
                        const allDisabled = Object.values(tooltipFields).every(f => !f.enabled);
                        setTooltipFields(prev => {
                          const newFields = { ...prev };
                          Object.keys(newFields).forEach(key => {
                            newFields[key] = { ...newFields[key], enabled: allDisabled };
                          });
                          return newFields;
                        });
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid rgba(94, 234, 212, 0.3)',
                        background: 'transparent',
                        color: '#5eead4',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      全选/取消全选
                    </button>
                    <button
                      onClick={() => setShowTooltipConfig(false)}
                      style={{
                        padding: '8px 20px',
                        borderRadius: '6px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={saveTooltipConfig}
                      disabled={savingTooltipConfig}
                      style={{
                        padding: '8px 20px',
                        borderRadius: '6px',
                        border: 'none',
                        background: savingTooltipConfig ? 'rgba(94, 234, 212, 0.3)' : 'linear-gradient(145deg, #5eead4, #2dd4bf)',
                        color: savingTooltipConfig ? '#64748b' : '#0f172a',
                        cursor: savingTooltipConfig ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      {savingTooltipConfig ? '保存中...' : '保存'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* 设备详情tooltip - 放在容器外部确保不被遮挡 */}
        {deviceTooltip && (
          <div 
            className="device-tooltip"
            style={{
              position: 'fixed',
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translateY(-50%)',
              zIndex: 2147483646,
              pointerEvents: 'none',
              animation: 'tooltipFadeIn 0.3s ease-out'
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#f8fafc', fontSize: '12px' }}>
              设备详情
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
              {tooltipFields.name?.enabled && (
                <div style={{ color: '#94a3b8' }}>名称: <span style={{ color: '#e2e8f0' }}>{deviceTooltip.device.name || '未知设备'}</span></div>
              )}
              {tooltipFields.deviceId?.enabled && (
                <div style={{ color: '#94a3b8' }}>设备ID: <span style={{ color: '#e2e8f0' }}>{deviceTooltip.device.deviceId || deviceTooltip.device.id || '-'}</span></div>
              )}
              {tooltipFields.type?.enabled && (
                <div style={{ color: '#94a3b8' }}>类型: <span style={{ color: '#e2e8f0' }}>{deviceTooltip.device.type || deviceTooltip.device.device_type || '-'}</span></div>
              )}
              {tooltipFields.brand?.enabled && (
                <div style={{ color: '#94a3b8' }}>品牌: <span style={{ color: '#e2e8f0' }}>{deviceTooltip.device.brand || '-'}</span></div>
              )}
              {tooltipFields.model?.enabled && (
                <div style={{ color: '#94a3b8' }}>型号: <span style={{ color: '#e2e8f0' }}>{deviceTooltip.device.model || '-'}</span></div>
              )}
              {tooltipFields.status?.enabled && (
                <div style={{ color: '#94a3b8' }}>状态: <span style={{ color: deviceTooltip.device.status === 'running' ? '#4ade80' : deviceTooltip.device.status === 'warning' ? '#fbbf24' : deviceTooltip.device.status === 'error' ? '#f87171' : '#94a3b8' }}>{deviceTooltip.device.status === 'running' ? '运行中' : deviceTooltip.device.status === 'warning' ? '警告' : deviceTooltip.device.status === 'error' ? '故障' : deviceTooltip.device.status || '未知'}</span></div>
              )}
              {tooltipFields.position?.enabled && (
                <div style={{ color: '#94a3b8' }}>位置: <span style={{ color: '#e2e8f0' }}>U{deviceTooltip.device.position} ({deviceTooltip.device.height}U)</span></div>
              )}
              {tooltipFields.height?.enabled && (
                <div style={{ color: '#94a3b8' }}>高度: <span style={{ color: '#e2e8f0' }}>{deviceTooltip.device.height || '-'}U</span></div>
              )}
              {tooltipFields.ipAddress?.enabled && (
                <div style={{ color: '#94a3b8' }}>IP地址: <span style={{ color: '#e2e8f0' }}>{deviceTooltip.device.ipAddress || deviceTooltip.device.ip_address || '-'}</span></div>
              )}
              {tooltipFields.power?.enabled && (
                <div style={{ color: '#94a3b8' }}>功率: <span style={{ color: '#e2e8f0' }}>{deviceTooltip.device.power ? `${deviceTooltip.device.power}W` : '-'}</span></div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default RackVisualization;