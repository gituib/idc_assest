const DeviceField = require('./models/DeviceField');
const { sequelize } = require('./db');

// 默认设备字段配置
// 系统字段（isSystem: true）是核心字段，不可删除
const defaultDeviceFields = [
  {
    fieldName: 'deviceId',
    displayName: '设备ID',
    fieldType: 'string',
    required: true,
    order: 1,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'name',
    displayName: '设备名称',
    fieldType: 'string',
    required: true,
    order: 2,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'type',
    displayName: '设备类型',
    fieldType: 'select',
    required: true,
    order: 3,
    visible: true,
    isSystem: true,
    options: [
      { value: 'server', label: '服务器' },
      { value: 'switch', label: '交换机' },
      { value: 'router', label: '路由器' },
      { value: 'storage', label: '存储设备' },
      { value: 'other', label: '其他设备' }
    ]
  },
  {
    fieldName: 'model',
    displayName: '型号',
    fieldType: 'string',
    required: true,
    order: 4,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'serialNumber',
    displayName: '序列号',
    fieldType: 'string',
    required: true,
    order: 5,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'rackId',
    displayName: '所在机柜',
    fieldType: 'select',
    required: true,
    order: 6,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'position',
    displayName: '位置(U)',
    fieldType: 'number',
    required: true,
    order: 7,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'height',
    displayName: '高度(U)',
    fieldType: 'number',
    required: true,
    order: 8,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'powerConsumption',
    displayName: '功率(W)',
    fieldType: 'number',
    required: true,
    order: 9,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'status',
    displayName: '状态',
    fieldType: 'select',
    required: true,
    order: 10,
    visible: true,
    isSystem: true,
    options: [
      { value: 'running', label: '运行中' },
      { value: 'maintenance', label: '维护中' },
      { value: 'offline', label: '离线' },
      { value: 'fault', label: '故障' }
    ]
  },
  {
    fieldName: 'purchaseDate',
    displayName: '购买日期',
    fieldType: 'date',
    required: true,
    order: 11,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'warrantyExpiry',
    displayName: '保修到期',
    fieldType: 'date',
    required: true,
    order: 12,
    visible: true,
    isSystem: true
  },
  {
    fieldName: 'ipAddress',
    displayName: 'IP地址',
    fieldType: 'string',
    required: false,
    order: 13,
    visible: true,
    isSystem: false
  },
  {
    fieldName: 'description',
    displayName: '描述',
    fieldType: 'textarea',
    required: false,
    order: 14,
    visible: true,
    isSystem: false
  },
  {
    fieldName: 'brand',
    displayName: '品牌',
    fieldType: 'string',
    required: false,
    order: 15,
    visible: true,
    isSystem: false
  }
];

// 初始化设备字段
async function initDeviceFields() {
  try {
    console.log('开始初始化设备字段配置...');
    // 注意：数据库连接和表结构同步已在 server.js 中完成，这里直接初始化数据

    // 批量创建默认字段
    for (const field of defaultDeviceFields) {
      // 检查字段是否已存在
      const existingField = await DeviceField.findOne({
        where: { fieldName: field.fieldName }
      });
      
      if (existingField) {
        // 更新已有字段
        await existingField.update(field);
        console.log(`更新字段: ${field.displayName}`);
      } else {
        // 创建新字段
        await DeviceField.create(field);
        console.log(`创建字段: ${field.displayName}`);
      }
    }
    
    console.log('设备字段配置初始化完成');
  } catch (error) {
    console.error('设备字段配置初始化失败:', error);
  }
}

// 导出初始化函数
module.exports = initDeviceFields;