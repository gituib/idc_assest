const { sequelize } = require('../db');
const FaultCategory = require('./FaultCategory');
const Ticket = require('./Ticket');
const TicketOperationRecord = require('./TicketOperationRecord');
const User = require('./User');
const Device = require('./Device');

const initDefaultFaultCategories = async () => {
  try {
    const count = await FaultCategory.count();
    if (count > 0) {
      console.log('故障分类已存在，跳过初始化');
      return;
    }

    const defaultCategories = [
      {
        categoryId: 'CAT001',
        name: '系统故障',
        code: 'system_fault',
        description: '操作系统、软件系统相关的故障',
        icon: 'DesktopOutlined',
        color: '#ff4d4f',
        priority: 1,
        defaultPriority: 'high',
        expectedDuration: 4,
        solutions: ['重启服务', '回滚版本', '修复配置', '重装系统'],
        isSystem: true
      },
      {
        categoryId: 'CAT002',
        name: '硬件故障',
        code: 'hardware_fault',
        description: '服务器、存储、网络设备等硬件故障',
        icon: 'CpuOutlined',
        color: '#fa8c16',
        priority: 2,
        defaultPriority: 'critical',
        expectedDuration: 8,
        solutions: ['更换部件', '联系厂商', '现场维修'],
        isSystem: true
      },
      {
        categoryId: 'CAT003',
        name: '网络故障',
        code: 'network_fault',
        description: '网络连接、交换机、路由器等问题',
        icon: 'WifiOutlined',
        color: '#1890ff',
        priority: 3,
        defaultPriority: 'high',
        expectedDuration: 2,
        solutions: ['检查网线', '重启交换机', '修复配置', '联系运营商'],
        isSystem: true
      },
      {
        categoryId: 'CAT004',
        name: '软件故障',
        code: 'software_fault',
        description: '应用程序、Bug、性能问题等',
        icon: 'AppstoreOutlined',
        color: '#722ed1',
        priority: 4,
        defaultPriority: 'medium',
        expectedDuration: 6,
        solutions: ['修复Bug', '优化性能', '更新版本', '配置调整'],
        isSystem: true
      },
      {
        categoryId: 'CAT005',
        name: '安全事件',
        code: 'security_incident',
        description: '安全漏洞、入侵检测、权限问题等',
        icon: 'SafetyOutlined',
        color: '#eb2f96',
        priority: 0,
        defaultPriority: 'critical',
        expectedDuration: 1,
        solutions: ['隔离系统', '调查取证', '修复漏洞', '更新安全策略'],
        isSystem: true
      },
      {
        categoryId: 'CAT006',
        name: '性能问题',
        code: 'performance_issue',
        description: '响应慢、卡顿、资源耗尽等性能问题',
        icon: 'RocketOutlined',
        color: '#52c41a',
        priority: 5,
        defaultPriority: 'medium',
        expectedDuration: 4,
        solutions: ['资源扩容', '优化SQL', '清理缓存', '负载均衡'],
        isSystem: true
      },
      {
        categoryId: 'CAT007',
        name: '配置变更',
        code: 'config_change',
        description: '配置修改、系统调优等需求',
        icon: 'SettingOutlined',
        color: '#13c2c2',
        priority: 6,
        defaultPriority: 'low',
        expectedDuration: 2,
        solutions: ['调整配置', '参数优化', '功能启用'],
        isSystem: true
      },
      {
        categoryId: 'CAT008',
        name: '例行维护',
        code: 'routine_maintenance',
        description: '定期维护、巡检、预防性保养',
        icon: 'ToolOutlined',
        color: '#faad14',
        priority: 7,
        defaultPriority: 'low',
        expectedDuration: 4,
        solutions: ['系统更新', '安全检查', '日志清理', '硬件检测'],
        isSystem: true
      },
      {
        categoryId: 'CAT009',
        name: '数据问题',
        code: 'data_issue',
        description: '数据丢失、数据错误、数据同步问题',
        icon: 'DatabaseOutlined',
        color: '#f5222d',
        priority: 1,
        defaultPriority: 'high',
        expectedDuration: 6,
        solutions: ['数据恢复', '数据修复', '重新同步', '备份还原'],
        isSystem: true
      },
      {
        categoryId: 'CAT010',
        name: '电源问题',
        code: 'power_issue',
        description: '电源故障、UPS、空调等电力系统问题',
        icon: 'ThunderboltOutlined',
        color: '#fa541c',
        priority: 0,
        defaultPriority: 'critical',
        expectedDuration: 2,
        solutions: ['切换电源', '更换UPS', '联系供电', '检查线路'],
        isSystem: true
      }
    ];

    for (const category of defaultCategories) {
      await FaultCategory.create(category);
    }

    console.log('默认故障分类初始化完成');
  } catch (error) {
    console.error('初始化故障分类失败:', error);
  }
};

const initAssociations = () => {
  Ticket.hasMany(TicketOperationRecord, { foreignKey: 'ticketId', as: 'operationRecords' });
  TicketOperationRecord.belongsTo(Ticket, { foreignKey: 'ticketId' });
};

const initializeModels = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('工单相关数据表同步完成');

    initAssociations();
    await initDefaultFaultCategories();

    console.log('工单系统数据初始化完成');
  } catch (error) {
    console.error('初始化工单系统数据失败:', error);
  }
};

module.exports = {
  initializeModels,
  Ticket,
  TicketOperationRecord,
  FaultCategory
};
