import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Select, Button, Space, message, Tooltip, Modal, Form, Switch, Checkbox, Input, Badge, Typography } from 'antd';
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
  SettingOutlined,
  SearchOutlined,
  ClearOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { Text } = Typography;

// 工具函数提取到组件外部，避免每次渲染重复创建
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

const getDeviceColor = (deviceType) => {
  if (!deviceType) return '#1890ff';
  const type = deviceType.toLowerCase();
  
  if (type.includes('server') || type.includes('服务器')) return '#1890ff';
  if (type.includes('switch') || type.includes('交换机')) return '#52c41a';
  if (type.includes('storage') || type.includes('存储')) return '#faad14';
  if (type.includes('router') || type.includes('路由器')) return '#f5222d';
  if (type.includes('laptop') || type.includes('笔记本')) return '#722ed1';
  if (type.includes('mobile') || type.includes('手机')) return '#eb2f96';
  if (type.includes('printer') || type.includes('打印机')) return '#13c2c2';
  
  return '#1890ff';
};

const getDeviceStatusColor = (status) => {
  const statusColorMap = {
    'normal': '#10b981',
    'running': '#10b981',
    'warning': '#f59e0b',
    'error': '#ef4444',
    'fault': '#ef4444',
    'offline': '#6b7280',
    'maintenance': '#3b82f6',
    undefined: '#3b82f6',
    null: '#3b82f6'
  };
  return statusColorMap[status] || '#3b82f6';
};

const getStatusTheme = (status) => {
  const themeMap = {
    'normal': {
      bgGradient: 'linear-gradient(180deg, #059669 0%, #047857 50%, #065f46 100%)',
      borderColor: '#10b981',
      topBorderColor: '#34d399',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      shadowColor: 'rgba(16, 185, 129, 0.3)',
      iconColor: '#10b981',
      label: '正常'
    },
    'running': {
      bgGradient: 'linear-gradient(180deg, #059669 0%, #047857 50%, #065f46 100%)',
      borderColor: '#10b981',
      topBorderColor: '#34d399',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      shadowColor: 'rgba(16, 185, 129, 0.3)',
      iconColor: '#10b981',
      label: '运行中'
    },
    'warning': {
      bgGradient: 'linear-gradient(180deg, #d97706 0%, #b45309 50%, #92400e 100%)',
      borderColor: '#f59e0b',
      topBorderColor: '#fbbf24',
      glowColor: 'rgba(245, 158, 11, 0.4)',
      shadowColor: 'rgba(245, 158, 11, 0.3)',
      iconColor: '#f59e0b',
      label: '警告'
    },
    'error': {
      bgGradient: 'linear-gradient(180deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
      borderColor: '#ef4444',
      topBorderColor: '#f87171',
      glowColor: 'rgba(239, 68, 68, 0.5)',
      shadowColor: 'rgba(239, 68, 68, 0.4)',
      iconColor: '#ef4444',
      label: '故障'
    },
    'fault': {
      bgGradient: 'linear-gradient(180deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
      borderColor: '#ef4444',
      topBorderColor: '#f87171',
      glowColor: 'rgba(239, 68, 68, 0.5)',
      shadowColor: 'rgba(239, 68, 68, 0.4)',
      iconColor: '#ef4444',
      label: '故障'
    },
    'offline': {
      bgGradient: 'linear-gradient(180deg, #4b5563 0%, #374151 50%, #1f2937 100%)',
      borderColor: '#6b7280',
      topBorderColor: '#9ca3af',
      glowColor: 'rgba(107, 114, 128, 0.2)',
      shadowColor: 'rgba(0, 0, 0, 0.2)',
      iconColor: '#9ca3af',
      label: '离线'
    },
    'maintenance': {
      bgGradient: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)',
      borderColor: '#3b82f6',
      topBorderColor: '#60a5fa',
      glowColor: 'rgba(59, 130, 246, 0.4)',
      shadowColor: 'rgba(59, 130, 246, 0.3)',
      iconColor: '#3b82f6',
      label: '维护中'
    },
    'default': {
      bgGradient: 'linear-gradient(180deg, #3d4451 0%, #2d3139 50%, #252930 100%)',
      borderColor: '#4a5568',
      topBorderColor: '#565c6b',
      glowColor: 'rgba(56, 189, 248, 0.2)',
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      iconColor: '#38bdf8',
      label: '未知'
    }
  };
  
  return themeMap[status] || themeMap['default'];
};

const getDeviceTypeTheme = (type) => {
  const themeMap = {
    'server': {
      borderColor: '#38bdf8',
      accentColor: '#0ea5e9',
      glowColor: 'rgba(56, 189, 248, 0.3)',
      iconColor: '#38bdf8',
      label: '服务器'
    },
    'switch': {
      borderColor: '#22c55e',
      accentColor: '#16a34a',
      glowColor: 'rgba(34, 197, 94, 0.3)',
      iconColor: '#22c55e',
      label: '交换机'
    },
    'router': {
      borderColor: '#f59e0b',
      accentColor: '#d97706',
      glowColor: 'rgba(245, 158, 11, 0.3)',
      iconColor: '#f59e0b',
      label: '路由器'
    },
    'storage': {
      borderColor: '#8b5cf6',
      accentColor: '#7c3aed',
      glowColor: 'rgba(139, 92, 246, 0.3)',
      iconColor: '#8b5cf6',
      label: '存储'
    },
    'firewall': {
      borderColor: '#ef4444',
      accentColor: '#dc2626',
      glowColor: 'rgba(239, 68, 68, 0.3)',
      iconColor: '#ef4444',
      label: '防火墙'
    },
    'ups': {
      borderColor: '#14b8a6',
      accentColor: '#0d9488',
      glowColor: 'rgba(20, 184, 166, 0.3)',
      iconColor: '#14b8a6',
      label: 'UPS'
    },
    'pdus': {
      borderColor: '#64748b',
      accentColor: '#475569',
      glowColor: 'rgba(100, 116, 139, 0.3)',
      iconColor: '#64748b',
      label: 'PDU'
    },
    'other': {
      borderColor: '#94a3b8',
      accentColor: '#64748b',
      glowColor: 'rgba(148, 163, 184, 0.3)',
      iconColor: '#94a3b8',
      label: '其他设备'
    }
  };
  
  const normalizedType = type?.toLowerCase();
  
  if (normalizedType?.includes('server') || normalizedType?.includes('服务器')) return themeMap.server;
  if (normalizedType?.includes('switch') || normalizedType?.includes('交换机')) return themeMap.switch;
  if (normalizedType?.includes('router') || normalizedType?.includes('路由器')) return themeMap.router;
  if (normalizedType?.includes('storage') || normalizedType?.includes('存储')) return themeMap.storage;
  if (normalizedType?.includes('firewall') || normalizedType?.includes('防火墙')) return themeMap.firewall;
  if (normalizedType?.includes('ups') || normalizedType?.includes('不间断电源')) return themeMap.ups;
  if (normalizedType?.includes('pdu') || normalizedType?.includes('电源分配')) return themeMap.pdus;
  
  return themeMap.other;
};

// 初始化动画样式
const initAnimationStyles = () => {
  const existingStyle = document.getElementById('rack-visualization-styles');
  if (existingStyle) {
    return existingStyle;
  }
  
  const style = document.createElement('style');
  style.id = 'rack-visualization-styles';
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
    
    @keyframes ledBlink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0.3; }
    }
    
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
    
    @keyframes highlightPulse {
      0%, 100% {
        box-shadow: 
          0 0 20px rgba(56, 189, 248, 0.6),
          0 4px 12px rgba(56, 189, 248, 0.4),
          0 1px 2px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.2);
      }
      50% {
        box-shadow: 
          0 0 35px rgba(56, 189, 248, 0.9),
          0 6px 20px rgba(56, 189, 248, 0.6),
          0 1px 2px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.3);
      }
    }
    
    .device-highlighted {
      animation: highlightPulse 1.5s ease-in-out infinite;
    }
    
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
    
    .ventilation-grille {
      background-image: repeating-linear-gradient(
        0deg,
        #334155 0px,
        #334155 1px,
        transparent 1px,
        transparent 2px
      );
    }
    
    .device-hover {
      background: linear-gradient(145deg, #1e293b, #0f172a) !important;
      box-shadow: 0 6px 16px rgba(56, 189, 248, 0.3), 0 0 12px rgba(56, 189, 248, 0.2) !important;
      border-color: #38bdf8 !important;
    }
    
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
    
    .device-count-badge {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.2));
      color: #38bdf8;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(56, 189, 248, 0.2);
      border: 1px solid rgba(56, 189, 248, 0.3);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      white-space: nowrap;
      font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
    }
  `;
  document.head.appendChild(style);
  return style;
};

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
  const pageHeaderStyle = {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  };
  
  const titleStyle = {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  };
  
  const primaryButtonStyle = {
    height: '40px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.35)',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  };
  
  const secondaryButtonStyle = {
    height: '40px',
    borderRadius: '8px',
    border: '1px solid #e8e8e8',
    transition: 'all 0.3s ease'
  };
  
  const cardStyle = {
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden'
  };
  
  const searchCardStyle = {
    borderRadius: '12px',
    border: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    marginBottom: '20px'
  };
  
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

  // 设备搜索功能
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键词
  const [searchResults, setSearchResults] = useState([]); // 搜索结果
  const [highlightedDevice, setHighlightedDevice] = useState(null); // 高亮的设备
  const [searchMatchCount, setSearchMatchCount] = useState(0); // 匹配数量
  const [searching, setSearching] = useState(false); // 搜索中状态

  // 设备详情tooltip字段配置
  const [tooltipFields, setTooltipFields] = useState({});

  // 默认设备字段配置
  const defaultTooltipFields = useMemo(() => ({
    name: { label: '设备名称', enabled: true, field: 'name', fieldType: 'string' },
    deviceId: { label: '设备ID', enabled: true, field: 'deviceId', fieldType: 'string' },
    type: { label: '设备类型', enabled: true, field: 'type', fieldType: 'string' },
    brand: { label: '品牌', enabled: true, field: 'brand', fieldType: 'string' },
    model: { label: '型号', enabled: true, field: 'model', fieldType: 'string' },
    status: { label: '状态', enabled: true, field: 'status', fieldType: 'string' },
    position: { label: '位置', enabled: true, field: 'position', fieldType: 'number' },
    height: { label: '高度', enabled: true, field: 'height', fieldType: 'number' },
    ipAddress: { label: 'IP地址', enabled: true, field: 'ipAddress', fieldType: 'string' },
    power: { label: '功率', enabled: true, field: 'power', fieldType: 'number' }
  }), []);

  // 初始化样式
  useEffect(() => {
    initAnimationStyles();
  }, []);

  // 获取设备字段配置 - 使用 useCallback 避免重复创建
  const fetchTooltipDeviceFields = useCallback(async () => {
    try {
      setLoadingTooltipFields(true);
      console.log('开始获取设备字段配置...');
      const response = await axios.get('/api/deviceFields');
      console.log('API响应:', response.data);
      const fieldsData = response.data;
      
      if (Array.isArray(fieldsData) && fieldsData.length > 0) {
        console.log('使用API返回的字段配置');
        const sortedFields = fieldsData.sort((a, b) => a.order - b.order);
        setTooltipDeviceFields(sortedFields);

        // 根据字段配置初始化tooltipFields
        const initialFields = {};
        sortedFields.forEach(field => {
          console.log('字段:', field.fieldName, field.displayName, field.visible);
          initialFields[field.fieldName] = {
            label: field.displayName,
            enabled: field.visible,
            field: field.fieldName,
            fieldType: field.fieldType
          };
        });
        setTooltipFields(initialFields);
      } else {
        console.log('使用默认字段配置');
        // 使用默认字段配置
        setTooltipFields(defaultTooltipFields);
      }
    } catch (error) {
      console.error('获取设备字段配置失败，使用默认配置:', error);
      // 使用默认字段配置
      setTooltipFields(defaultTooltipFields);
    } finally {
      setLoadingTooltipFields(false);
    }
  }, [defaultTooltipFields]);

  // 初始化获取保存的字段配置
  useEffect(() => {
    fetchTooltipDeviceFields();
  }, [fetchTooltipDeviceFields]);

  // 保存tooltip字段配置
  const saveTooltipConfig = useCallback(async () => {
    try {
      setSavingTooltipConfig(true);
      
      const fieldConfigs = Object.entries(tooltipFields).map(([key, field]) => ({
        fieldName: field.field,
        visible: field.enabled,
        displayName: field.label,
        fieldType: field.fieldType
      }));
      
      await axios.post('/api/deviceFields/config', fieldConfigs);
      message.success('字段配置已保存');
      setShowTooltipConfig(false);
      
      // 重新获取配置以确保数据一致
      await fetchTooltipDeviceFields();
    } catch (error) {
      console.error('保存字段配置失败:', error);
      message.error('保存字段配置失败');
    } finally {
      setSavingTooltipConfig(false);
    }
  }, [tooltipFields, fetchTooltipDeviceFields]);

  // 获取机柜内的设备 - 使用 useCallback 避免重复创建
  const fetchDevices = useCallback(async (rackId) => {
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

      // 展开customFields中的字段到设备对象的直接属性
      const processedDevices = devicesData.map(device => {
        const deviceWithFields = { ...device };
        
        if (device.customFields && typeof device.customFields === 'object') {
          Object.entries(device.customFields).forEach(([fieldName, value]) => {
            deviceWithFields[fieldName] = value;
          });
        }
        
        return deviceWithFields;
      });
      
      console.log('展开customFields后的设备数据:', processedDevices);
      
      // 如果没有数据，显示警告
      if (processedDevices.length === 0) {
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
      if (processedDevices.length > 0) {
        const firstDevice = processedDevices[0];
        console.log('第一个设备完整数据:', JSON.stringify(firstDevice, null, 2));
        console.log('第一个设备的字段:', Object.keys(firstDevice));
        console.log('第一个设备的字段类型:');
        Object.keys(firstDevice).forEach(key => {
          console.log(`  ${key}: ${typeof firstDevice[key]} = ${JSON.stringify(firstDevice[key])}`);
        });
      }
      
      // 过滤有效的设备数据 - 放宽验证条件
      const validDevices = processedDevices.filter(device => {
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
  }, []);

  // 搜索设备 - 全局搜索，支持跨机柜
  const handleSearch = useCallback(async (keyword) => {
    setSearchKeyword(keyword);
    
    if (!keyword || !keyword.trim()) {
      setSearchResults([]);
      setHighlightedDevice(null);
      setSearchMatchCount(0);
      return;
    }
    
    const searchLower = keyword.toLowerCase().trim();
    setSearching(true);
    
    try {
      // 调用全局搜索API，搜索所有机柜的设备
      const response = await axios.get('/api/devices', {
        params: { keyword: searchLower, pageSize: 100 }
      });
      
      const devicesData = response.data.devices || [];
      
      // 构建搜索结果，包含机柜信息
      const results = devicesData.map(device => ({
        deviceId: device.deviceId || device.id,
        name: device.name,
        type: device.type,
        rackId: device.rackId,
        rackName: device.Rack?.name || '未知机柜',
        roomName: device.Rack?.Room?.name || '未知机房',
        position: device.position
      }));
      
      setSearchResults(results);
      setSearchMatchCount(results.length);
      
      // 如果有搜索结果，自动定位到第一个设备所在的机柜
      if (results.length > 0) {
        const firstResult = results[0];
        setHighlightedDevice(firstResult.deviceId);
        
        // 如果设备不在当前机柜，自动切换机柜
        if (selectedRack && firstResult.rackId !== selectedRack.rackId) {
          const targetRack = racks.find(r => r.rackId === firstResult.rackId);
          if (targetRack) {
            // 找到设备所在的机房
            if (targetRack?.Room) {
              const roomKey = targetRack.Room.roomId || targetRack.Room.id || targetRack.Room.name;
              if (roomKey !== selectedRoom) {
                setSelectedRoom(roomKey);
              }
            }
            
            // 切换到设备所在的机柜
            setSelectedRack(targetRack);
            fetchDevices(targetRack.rackId);
            message.info(`已跳转到机柜: ${firstResult.rackName}`);
          }
        } else {
          message.info(`已定位到设备: ${firstResult.name}`);
        }
      } else {
        setHighlightedDevice(null);
        message.warning('未找到匹配的设备');
      }
    } catch (error) {
      console.error('全局搜索失败:', error);
      message.error('搜索失败，请重试');
      setSearchResults([]);
      setSearchMatchCount(0);
    } finally {
      setSearching(false);
    }
  }, [selectedRack, selectedRoom, racks, fetchDevices]);

  // 清除搜索
  const clearSearch = useCallback(() => {
    setSearchKeyword('');
    setSearchResults([]);
    setHighlightedDevice(null);
    setSearchMatchCount(0);
  }, []);

  // 跳转到指定设备
  const jumpToDevice = useCallback((deviceId) => {
    setHighlightedDevice(deviceId);
    message.info(`已定位到设备: ${deviceId}`);
  }, []);

  // 获取所有机柜 - 使用 useCallback 避免重复创建
  const fetchRacks = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchRacks();
  }, [fetchRacks]);

  // 打开字段配置模态框时获取数据
  const handleOpenTooltipConfig = () => {
    if (Object.keys(tooltipFields).length === 0) {
      fetchTooltipDeviceFields();
    }
    setShowTooltipConfig(true);
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
    const uHeight = 25;
    
    for (let u = 1; u <= height; u++) {
      const topPosition = (height - u) * uHeight;
      
      marks.push(
        <div key={`left-${u}`}>
          <div 
            style={{
              position: 'absolute',
              top: `${topPosition}px`,
              left: '0',
              width: '16px',
              height: `${uHeight}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: u % 5 === 0 ? '#38bdf8' : '#cbd5e1',
              fontSize: '10px',
              fontWeight: u % 5 === 0 ? '700' : '500',
              textShadow: u % 5 === 0 ? '0 0 10px rgba(56, 189, 248, 0.6)' : '0 0 4px rgba(0, 0, 0, 0.5)',
              zIndex: 30,
              backgroundColor: u % 5 === 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.8)',
              borderRadius: '3px',
              border: u % 5 === 0 ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: u % 5 === 0 ? '0 0 8px rgba(56, 189, 248, 0.3)' : 'inset 0 0 4px rgba(0, 0, 0, 0.3)'
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
    const uHeight = 25;
    
    for (let u = 1; u <= height; u++) {
      const topPosition = (height - u) * uHeight;
      
      marks.push(
        <div key={`right-${u}`}>
          <div 
            style={{
              position: 'absolute',
              top: `${topPosition}px`,
              right: '0',
              width: '16px',
              height: `${uHeight}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: u % 5 === 0 ? '#38bdf8' : '#cbd5e1',
              fontSize: '10px',
              fontWeight: u % 5 === 0 ? '700' : '500',
              textShadow: u % 5 === 0 ? '0 0 10px rgba(56, 189, 248, 0.6)' : '0 0 4px rgba(0, 0, 0, 0.5)',
              zIndex: 30,
              backgroundColor: u % 5 === 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.8)',
              borderRadius: '3px',
              border: u % 5 === 0 ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: u % 5 === 0 ? '0 0 8px rgba(56, 189, 248, 0.3)' : 'inset 0 0 4px rgba(0, 0, 0, 0.3)'
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
    <div style={{ padding: '24px' }}>
      <div style={pageHeaderStyle}>
        <h1 style={titleStyle}>
          <CloudServerOutlined style={{ marginRight: '12px' }} />
          机柜可视化
        </h1>
        <Space size={12} wrap>
          <Input
            placeholder="搜索设备名称、ID、IP..."
            value={searchKeyword}
            onChange={(e) => handleSearch(e.target.value)}
            onPressEnter={(e) => handleSearch(e.target.value)}
            style={{ width: 220, height: '40px', borderRadius: '8px' }}
            allowClear
            prefix={<SearchOutlined />}
            suffix={
              searchMatchCount > 0 ? (
                <Badge count={searchMatchCount} size="small" style={{ backgroundColor: '#52c41a' }} />
              ) : null
            }
          />
          {searchKeyword && (
            <Button
              style={secondaryButtonStyle}
              icon={<ClearOutlined />}
              onClick={clearSearch}
              title="清除搜索"
            />
          )}
          <Select
            placeholder="选择机房"
            style={{ width: 180, height: '40px' }}
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
            style={{ width: 200, height: '40px' }}
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
            style={secondaryButtonStyle}
            icon={<ReloadOutlined />} 
            onClick={handleReload}
            loading={loading}
            disabled={loading}
          >
            刷新
          </Button>
          <Button 
            style={showTooltipConfig ? primaryButtonStyle : secondaryButtonStyle}
            icon={<SettingOutlined />} 
            onClick={handleOpenTooltipConfig}
            type={showTooltipConfig ? 'primary' : 'default'}
          >
            字段配置
          </Button>
        </Space>
      </div>
      
      {searchKeyword && (
        <Card size="small" style={searchCardStyle} bodyStyle={{ padding: '16px 20px' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <SearchOutlined style={{ 
              fontSize: 18, 
              color: searchResults.length > 0 ? '#52c41a' : '#ff4d4f'
            }} />
            <Text strong style={{ color: searchResults.length > 0 ? '#135200' : '#cf1322', margin: 0 }}>
              {searchResults.length > 0 
                ? `找到 ${searchResults.length} 个设备` 
                : searching ? '搜索中...' : '未找到匹配的设备'}
            </Text>
            {searching && (
              <Badge status="processing" text="正在搜索所有机柜..." />
            )}
            {searchResults.length > 0 && (
              <Space wrap size={4}>
                {searchResults.slice(0, 5).map(result => {
                  const isCurrentRack = selectedRack && result.rackId === selectedRack.rackId;
                  return (
                    <Button 
                      key={result.deviceId}
                      size="small"
                      type={highlightedDevice === result.deviceId ? 'primary' : 'default'}
                      icon={<EnvironmentOutlined />}
                      onClick={() => {
                        if (selectedRack && result.rackId !== selectedRack.rackId) {
                          const targetRack = racks.find(r => r.rackId === result.rackId);
                          if (targetRack) {
                            if (targetRack?.Room) {
                              const roomKey = targetRack.Room.roomId || targetRack.Room.id || targetRack.Room.name;
                              if (roomKey !== selectedRoom) {
                                setSelectedRoom(roomKey);
                              }
                            }
                            setSelectedRack(targetRack);
                            fetchDevices(targetRack.rackId);
                            message.info(`已跳转到机柜: ${result.rackName}`);
                          }
                        }
                        setHighlightedDevice(result.deviceId);
                      }}
                      style={{ 
                        borderColor: highlightedDevice === result.deviceId ? '#667eea' : undefined,
                        background: highlightedDevice === result.deviceId ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
                        height: '32px',
                        borderRadius: '6px'
                      }}
                    >
                      <Tooltip title={`机柜: ${result.rackName}${result.roomName ? ` | 机房: ${result.roomName}` : ''} | U${result.position || '?'}`}>
                        <span>
                          {result.name}
                          <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                            U{result.position || '?'}
                          </Text>
                          {!isCurrentRack && (
                            <EnvironmentOutlined style={{ marginLeft: 4, color: '#faad14' }} />
                          )}
                        </span>
                      </Tooltip>
                    </Button>
                  );
                })}
                {searchResults.length > 5 && (
                  <Text type="secondary">+ 还有 {searchResults.length - 5} 个</Text>
                )}
              </Space>
            )}
          </div>
        </Card>
      )}
      
      <Card style={cardStyle} bodyStyle={{ padding: '16px 20px' }}>
        <div style={{ marginBottom: 16 }}>
          <Space wrap size={12}>
            <Button style={secondaryButtonStyle} icon={<ZoomInOutlined />} onClick={handleZoomIn}>放大</Button>
            <Button style={secondaryButtonStyle} icon={<ZoomOutOutlined />} onClick={handleZoomOut}>缩小</Button>
            <Button style={secondaryButtonStyle} icon={<RotateRightOutlined />} onClick={handleResetView}>重置视角</Button>
            <Select
              placeholder="选择背景类型"
              style={{ width: 150, height: '40px' }}
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
              <Space size={8}>
                <input
                  type="text"
                  placeholder="输入图片URL"
                  style={{ width: 200, padding: '8px 12px', borderRadius: '8px', border: '1px solid #d9d9d9', height: '40px', boxSizing: 'border-box' }}
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
                        
                        const response = await axios.post('/api/background/upload', formData, {
                          headers: {
                            'Content-Type': 'multipart/form-data'
                          }
                        });
                        
                        if (response.data && response.data.path) {
                          setBackgroundImage(response.data.path);
                          message.success('背景图片上传成功');
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
                <Button style={secondaryButtonStyle} onClick={() => document.getElementById('backgroundFileInput').click()} loading={uploading}>上传图片</Button>
                <Select
                  placeholder="图片大小"
                  style={{ width: 100, height: '40px' }}
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
                  <Button style={secondaryButtonStyle} onClick={() => {
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
              backgroundColor: '#fafafa',
              fontSize: '16px',
              color: '#666',
              borderRadius: '12px'
            }}>
              加载机柜数据中...
            </div>
          ) : selectedRack ? (
            <div 
              className="rack-visualization-container"
              style={{ 
                width: '100%',
                height: 'calc(100vh - 280px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                perspective: '1000px',
                overflow: 'auto',
                backgroundColor: '#fafafa',
                background: backgroundType === 'image' && backgroundImage 
                  ? `url(${backgroundImage})`
                  : 'linear-gradient(180deg, #f8fffe 0%, #f0fdf4 50%, #e6fffa 100%)',
                backgroundSize: backgroundType === 'image' ? backgroundSize : 'auto',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                borderRadius: '12px',
                border: '1px solid #e8e8e8',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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
                  background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
                  border: '2px solid #38bdf8',
                  borderRadius: '12px',
                  boxShadow: `
                    0 0 40px rgba(56, 189, 248, 0.2),
                    0 0 80px rgba(56, 189, 248, 0.1),
                    0 20px 60px rgba(0, 0, 0, 0.5),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05),
                    inset 0 0 60px rgba(56, 189, 248, 0.05)
                  `,
                  overflow: 'visible',
                  backdropFilter: 'blur(10px)'
                }}>
                  {/* 扫描线效果 */}
                  <div className="scan-effect" style={{ top: '0' }} />
                  
                  {/* 玻璃光泽效果 */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    height: '50%',
                    background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.03) 0%, transparent 100%)',
                    borderRadius: '10px 10px 0 0',
                    pointerEvents: 'none'
                  }} />
                  {/* 左侧U数标记 - 贴紧机架边缘 */}
                  <div style={{
                    position: 'absolute',
                    left: '-18px',
                    top: '3px',
                    width: '18px',
                    bottom: '3px',
                    zIndex: 20,
                    pointerEvents: 'none'
                  }}>
                    {generateLeftUMarks(selectedRack.height)}
                  </div>
                  
                  {/* 右侧U数标记 - 贴紧机架边缘 */}
                  <div style={{
                    position: 'absolute',
                    right: '-18px',
                    top: '3px',
                    width: '18px',
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
                    background: 'linear-gradient(90deg, #374151 0%, #1f2937 50%, #111827 100%)',
                    borderRight: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '2px 0 0 2px',
                    boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5), 0 0 8px rgba(56, 189, 248, 0.1)'
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
                          top: `${(selectedRack.height - index - 1) * 25 + 2}px`,
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
                          top: `${(selectedRack.height - index - 1) * 25 + 2}px`,
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
                    
                    {/* U位网格线 */}
                    <div style={{
                      position: 'absolute',
                      top: '3px',
                      left: '48px',
                      right: '48px',
                      bottom: '3px',
                      pointerEvents: 'none',
                      zIndex: 5
                    }}>
                      {Array.from({ length: Math.max(0, selectedRack.height - 1) }).map((_, index) => (
                        <div
                          key={`grid-line-${index}`}
                          style={{
                            position: 'absolute',
                            top: `${(index + 1) * 25 - 1}px`,
                            left: 0,
                            right: 0,
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent 0%, rgba(148, 163, 184, 0.15) 10%, rgba(148, 163, 184, 0.2) 50%, rgba(148, 163, 184, 0.15) 90%, transparent 100%)'
                          }}
                        />
                      ))}
                    </div>
                    
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
                        
                        // 检查是否是高亮的设备
                        const isHighlighted = highlightedDevice === deviceId;
                        
                        // 获取状态主题
                        const statusTheme = getStatusTheme(device?.status);
                        const statusColor = getDeviceStatusColor(device?.status);
                        
                        return (
                          <div 
                            key={deviceId} 
                            className={`device ${isHighlighted ? 'device-highlighted' : ''}`}
                            style={{
                              ...getDeviceStyle(device, selectedRack.height),
                              position: 'absolute',
                              left: '3px',
                              right: '3px',
                              width: 'calc(100% - 6px)',
                              borderRadius: '3px',
                              display: 'flex',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: isHighlighted 
                                ? `
                                    0 0 20px ${statusTheme.glowColor},
                                    0 4px 12px ${statusTheme.shadowColor},
                                    0 1px 2px rgba(0,0,0,0.3),
                                    inset 0 1px 0 rgba(255,255,255,0.2)
                                  `
                                : `
                                    0 1px 2px rgba(0,0,0,0.3),
                                    0 2px 4px rgba(0,0,0,0.2),
                                    inset 0 1px 0 rgba(255,255,255,0.1),
                                    inset 0 -1px 0 rgba(0,0,0,0.1)
                                  `,
                              background: isHighlighted
                                ? statusTheme.bgGradient
                                : statusTheme.bgGradient,
                              border: isHighlighted 
                                ? `2px solid ${statusTheme.topBorderColor}` 
                                : `1px solid ${statusTheme.borderColor}`,
                              borderTop: isHighlighted
                                ? `2px solid ${statusTheme.topBorderColor}`
                                : `1px solid ${statusTheme.topBorderColor}`,
                              overflow: 'hidden',
                              margin: 0,
                              padding: 0,
                              zIndex: isHighlighted ? 200 : 100,
                              pointerEvents: 'auto',
                              animation: isHighlighted ? 'highlightPulse 1.5s ease-in-out infinite' : 
                                       device?.status === 'warning' ? 'ledBlink 2s ease-in-out infinite' :
                                       device?.status === 'error' || device?.status === 'fault' ? 'ledBlink 0.8s ease-in-out infinite' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              const isOneU = (device?.height || 1) === 1;
                              const isFaultStatus = device?.status === 'error' || device?.status === 'fault';
                              if (isOneU && !isFaultStatus) {
                                e.currentTarget.style.height = '33px';
                                e.currentTarget.style.zIndex = '150';
                              }
                              e.currentTarget.style.transform = 'scale(1.008)';
                              e.currentTarget.style.boxShadow = `
                                0 4px 12px ${statusTheme.shadowColor},
                                0 2px 6px rgba(0,0,0,0.3),
                                inset 0 1px 0 rgba(255,255,255,0.15)
                              `;
                              e.currentTarget.style.borderColor = statusTheme.topBorderColor;
                              
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipPosition({ x: rect.right + 5, y: rect.top + rect.height / 2 });
                              setDeviceTooltip({ device: device });
                            }}
                            onMouseLeave={(e) => {
                              const isOneU = (device?.height || 1) === 1;
                              const isFaultStatus = device?.status === 'error' || device?.status === 'fault';
                              if (isOneU && !isFaultStatus) {
                                const originalHeight = (device?.height || 1) * 25;
                                e.currentTarget.style.height = `${originalHeight}px`;
                                e.currentTarget.style.zIndex = '100';
                              }
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = `
                                0 1px 2px rgba(0,0,0,0.3),
                                0 2px 4px rgba(0,0,0,0.2),
                                inset 0 1px 0 rgba(255,255,255,0.1),
                                inset 0 -1px 0 rgba(0,0,0,0.1)
                              `;
                              e.currentTarget.style.borderColor = statusTheme.borderColor;
                              setDeviceTooltip(null);
                            }}
                          >
                            <div style={{
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '2px',
                              background: `linear-gradient(90deg, ${statusTheme.topBorderColor} 0%, ${statusTheme.borderColor} 50%, ${statusTheme.topBorderColor} 100%)`,
                              opacity: 0.8
                            }} />
                            
                              {/* 左侧状态指示区域 - 增强版 */}
                              <div style={{
                                width: '7%',
                                background: isHighlighted 
                                  ? `linear-gradient(180deg, ${statusTheme.borderColor}33 0%, ${statusTheme.borderColor}22 100%)`
                                  : `linear-gradient(180deg, ${statusTheme.borderColor}44 0%, ${statusTheme.borderColor}22 100%)`,
                                borderRadius: '3px 0 0 3px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4px 3px',
                                flexShrink: 0,
                                overflow: 'hidden',
                                position: 'relative',
                                borderRight: `1px solid ${statusTheme.borderColor}66`
                              }}>
                                {/* 设备类型标识 */}
                                <div style={{
                                  width: '100%',
                                  height: '8px',
                                  background: `linear-gradient(180deg, ${statusTheme.borderColor}66 0%, ${statusTheme.borderColor}33 100%)`,
                                  borderRadius: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: `1px solid ${statusTheme.borderColor}44`
                                }}>
                                  <span style={{
                                    fontSize: '4px',
                                    color: statusTheme.topBorderColor,
                                    fontWeight: '700',
                                    letterSpacing: '0.5px'
                                  }}>
                                    {device.type?.toUpperCase() || 'DEV'}
                                  </span>
                                </div>
                                
                                {/* LED状态指示灯组 */}
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '3px',
                                  alignItems: 'center'
                                }}>
                                  {/* 主状态灯 */}
                                  <div style={{
                                    display: 'flex',
                                    gap: '2px'
                                  }}>
                                    <div style={{
                                      width: '5px',
                                      height: '5px',
                                      borderRadius: '50%',
                                      backgroundColor: getDeviceStatusColor(device.status),
                                      animation: device.status === 'warning' ? 'ledBlink 2s ease-in-out infinite' : 
                                                device.status === 'error' ? 'ledBlink 0.8s ease-in-out infinite' : 'none',
                                      boxShadow: `0 0 8px ${getDeviceStatusColor(device.status)}`
                                    }} />
                                    <div style={{
                                      width: '5px',
                                      height: '5px',
                                      borderRadius: '50%',
                                      backgroundColor: device.status === 'running' ? '#22c55e' : '#4b5563',
                                      boxShadow: device.status === 'running' ? '0 0 6px #22c55e' : 'none',
                                      animation: device.status === 'running' ? 'ledBlink 3s ease-in-out infinite' : 'none'
                                    }} />
                                    <div style={{
                                      width: '5px',
                                      height: '5px',
                                      borderRadius: '50%',
                                      backgroundColor: '#22c55e',
                                      boxShadow: '0 0 6px #22c55e',
                                      animation: 'ledBlink 4s ease-in-out infinite'
                                    }} />
                                  </div>
                                  
                                  {/* 电源指示灯 */}
                                  <div style={{
                                    display: 'flex',
                                    gap: '2px',
                                    alignItems: 'center'
                                  }}>
                                    <div style={{
                                      width: '4px',
                                      height: '4px',
                                      borderRadius: '1px',
                                      backgroundColor: device.status !== 'offline' ? '#38bdf8' : '#475569',
                                      boxShadow: device.status !== 'offline' ? '0 0 4px #38bdf8' : 'none'
                                    }} />
                                    <span style={{
                                      fontSize: '4px',
                                      color: device.status !== 'offline' ? '#38bdf8' : '#64748b',
                                      fontWeight: '600'
                                    }}>
                                      PWR
                                    </span>
                                  </div>
                                </div>
                                
                                {/* 设备序列号标签 */}
                                <div style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                                  paddingTop: '2px'
                                }}>
                                  <span style={{
                                    fontSize: '4px',
                                    color: '#475569',
                                    fontFamily: 'monospace'
                                  }}>
                                    SN:{device.serial?.slice(-4) || '0000'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* 中间设备信息区域 - 增强版 */}
                              <div style={{
                                flex: 1,
                                background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                padding: '3px 8px',
                                overflow: 'hidden',
                                borderLeft: '1px solid rgba(148, 163, 184, 0.15)',
                                borderRight: '1px solid rgba(148, 163, 184, 0.15)',
                                position: 'relative'
                              }}>
                                {/* 设备品牌/厂商标识 */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginBottom: '2px'
                                }}>
                                  <div style={{
                                    fontSize: '10px',
                                    color: '#38bdf8',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}>
                                    {getDeviceIcon(device.type)}
                                  </div>
                                  <span style={{
                                    fontSize: '5px',
                                    color: '#64748b',
                                    fontWeight: '600',
                                    letterSpacing: '0.5px'
                                  }}>
                                    {device.brand || 'ENTERPRISE'}
                                  </span>
                                </div>
                                
                                {/* 设备名称 */}
                                <div style={{
                                  color: '#f1f5f9',
                                  fontSize: '8px',
                                  fontWeight: '600',
                                  fontFamily: '"Roboto Mono", "Consolas", monospace',
                                  textAlign: 'left',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  textShadow: '0 0 10px rgba(56, 189, 248, 0.3)'
                                }}>
                                  {deviceName}
                                </div>
                                
                                {/* 型号和规格 */}
                                <div style={{
                                  display: 'flex',
                                  gap: '8px',
                                  alignItems: 'center',
                                  marginTop: '2px'
                                }}>
                                  <span style={{
                                    color: '#64748b',
                                    fontSize: '6px',
                                    fontFamily: '"Roboto Mono", monospace',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    padding: '1px 4px',
                                    borderRadius: '2px',
                                    border: '1px solid rgba(56, 189, 248, 0.2)'
                                  }}>
                                    {device.model || device.type?.toUpperCase() || 'STD'}
                                  </span>
                                  {device.ip && (
                                    <span style={{
                                      color: '#22c55e',
                                      fontSize: '6px',
                                      fontFamily: '"Roboto Mono", monospace'
                                    }}>
                                      {device.ip}
                                    </span>
                                  )}
                                </div>
                                
                                {/* 散热/通风口装饰 - 根据设备类型显示 */}
                                {(device.type === 'server' || device.type === 'storage') && (
                                  <div style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    gap: '2px'
                                  }}>
                                    {Array.from({ length: 3 }).map((_, i) => (
                                      <div key={i} style={{
                                        width: '3px',
                                        height: '12px',
                                        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                                        borderRadius: '1px',
                                        border: '1px solid rgba(148, 163, 184, 0.2)'
                                      }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* 右侧端口/功能区域 - 增强版 */}
                              <div style={{
                                width: '12%',
                                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                                borderRadius: '0 3px 3px 0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                padding: '4px 3px',
                                gap: '4px',
                                overflow: 'hidden',
                                position: 'relative',
                                borderLeft: '1px solid rgba(148, 163, 184, 0.2)'
                              }}>
                                {/* 端口指示灯阵列 */}
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(2, 1fr)',
                                  gap: '2px'
                                }}>
                                  {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} style={{
                                      width: '4px',
                                      height: '4px',
                                      borderRadius: '1px',
                                      backgroundColor: i < 3 ? '#22c55e' : '#475569',
                                      boxShadow: i < 3 ? '0 0 3px rgba(34, 197, 94, 0.6)' : 'none',
                                      animation: i < 2 ? 'ledBlink 2s ease-in-out infinite' : 'none'
                                    }} />
                                  ))}
                                </div>
                                
                                {/* 管理接口标识 */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  marginTop: '2px'
                                }}>
                                  <div style={{
                                    width: '0',
                                    height: '0',
                                    borderLeft: '4px solid transparent',
                                    borderRight: '4px solid transparent',
                                    borderBottom: '6px solid #64748b'
                                  }} />
                                  <span style={{
                                    fontSize: '5px',
                                    color: '#64748b',
                                    fontWeight: '600'
                                  }}>
                                    MGMT
                                  </span>
                                </div>
                                
                                {/* 设备高度U数标识 */}
                                <div style={{
                                  fontSize: '5px',
                                  color: '#38bdf8',
                                  fontWeight: '700',
                                  fontFamily: '"Roboto Mono", monospace',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  padding: '1px 4px',
                                  borderRadius: '2px',
                                  border: '1px solid rgba(56, 189, 248, 0.3)'
                                }}>
                                  {device.height}U
                                </div>
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
                      color: '#0f172a',
                      textShadow: '0 1px 2px rgba(255,255,255,0.5)',
                      padding: '6px 14px',
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(241, 245, 249, 0.95))',
                      borderRadius: '10px',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      boxShadow: '0 3px 10px rgba(56, 189, 248, 0.2)',
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
                      <span style={{ color: '#38bdf8', fontWeight: '600' }}>{devices.length}</span>
                      <span style={{ color: '#94a3b8' }}> 设备</span>
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
        
        {/* 设备详情字段配置模态框 */}
        <Modal
          title="设备详情字段配置"
          open={showTooltipConfig}
          onCancel={() => setShowTooltipConfig(false)}
          footer={null}
          width={500}
        >
          {loadingTooltipFields ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              加载字段配置中...
            </div>
          ) : Object.keys(tooltipFields).length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              暂无字段配置，请先在设备字段管理中添加字段
            </div>
          ) : (
            <div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>
                  选择要在设备详情中显示的字段： ({Object.keys(tooltipFields).length} 个字段)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {Object.entries(tooltipFields).map(([key, field]) => (
                    <div
                      key={key}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: field.enabled ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                        border: field.enabled ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        setTooltipFields(prev => ({
                          ...prev,
                          [key]: { ...prev[key], enabled: !prev[key].enabled }
                        }));
                      }}
                    >
                      <Checkbox checked={field.enabled} />
                      {field.label}
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    const allEnabled = Object.values(tooltipFields).every(f => f.enabled);
                    setTooltipFields(prev => {
                      const newFields = { ...prev };
                      Object.keys(newFields).forEach(key => {
                        newFields[key] = { ...newFields[key], enabled: !allEnabled };
                      });
                      return newFields;
                    });
                  }}>
                    全选/取消全选
                  </Button>
                  <Button onClick={() => setShowTooltipConfig(false)}>
                    取消
                  </Button>
                  <Button type="primary" onClick={async () => {
                    await saveTooltipConfig();
                  }} loading={savingTooltipConfig}>
                    保存
                  </Button>
                </Space>
              </div>
            </div>
          )}
        </Modal>
        
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
              {console.log('tooltipFields:', tooltipFields)}
              {Object.entries(tooltipFields).map(([key, field]) => {
                if (!field.enabled) return null;
                
                let value = deviceTooltip.device[field.field];
                let displayValue = '-';
                
                if (value !== undefined && value !== null && value !== '') {
                  // 特殊字段格式化
                  if (field.field === 'status') {
                    const statusMap = {
                      'running': '运行中',
                      'maintenance': '维护中',
                      'offline': '离线',
                      'fault': '故障',
                      'warning': '警告',
                      'error': '故障'
                    };
                    displayValue = statusMap[value] || value;
                  } else if (field.field === 'type') {
                    const typeMap = {
                      'server': '服务器',
                      'switch': '交换机',
                      'router': '路由器',
                      'storage': '存储设备',
                      'other': '其他设备'
                    };
                    displayValue = typeMap[value] || value;
                  } else if (field.field === 'position') {
                    displayValue = `U${value}`;
                  } else if (field.field === 'height') {
                    displayValue = `${value}U`;
                  } else if (field.field === 'powerConsumption' || field.field === 'power') {
                    displayValue = `${value}W`;
                  } else if (field.fieldType === 'date') {
                    try {
                      displayValue = new Date(value).toLocaleDateString('zh-CN');
                    } catch (e) {
                      displayValue = value;
                    }
                  } else if (field.field === 'rackId') {
                    displayValue = value;
                  } else {
                    displayValue = value;
                  }
                }
                
                // 获取字段标签（优先使用配置中的label，否则使用fieldName）
                const label = field.label || field.fieldName;
                
                // 状态字段使用特殊颜色
                let valueColor = '#e2e8f0';
                if (field.field === 'status') {
                  if (value === 'running') valueColor = '#4ade80';
                  else if (value === 'warning') valueColor = '#fbbf24';
                  else if (value === 'error' || value === 'fault') valueColor = '#f87171';
                }
                
                return (
                  <div key={key} style={{ color: '#94a3b8' }}>
                    {label}: <span style={{ color: valueColor }}>{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default React.memo(RackVisualization);