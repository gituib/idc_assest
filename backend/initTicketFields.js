const TicketField = require('./models/TicketField');
const { sequelize } = require('./db');

const defaultTicketFields = [
  {
    fieldName: 'ticketId',
    displayName: '工单编号',
    fieldType: 'string',
    required: true,
    order: 1,
    visible: true
  },
  {
    fieldName: 'title',
    displayName: '标题',
    fieldType: 'string',
    required: true,
    order: 2,
    visible: true
  },
  {
    fieldName: 'deviceName',
    displayName: '设备名称',
    fieldType: 'string',
    required: false,
    order: 3,
    visible: true
  },
  {
    fieldName: 'serialNumber',
    displayName: '设备序列号',
    fieldType: 'string',
    required: false,
    order: 4,
    visible: true
  },
  {
    fieldName: 'faultCategory',
    displayName: '故障分类',
    fieldType: 'select',
    required: true,
    order: 5,
    visible: true,
    options: []
  },
  {
    fieldName: 'priority',
    displayName: '优先级',
    fieldType: 'select',
    required: true,
    order: 6,
    visible: true,
    options: [
      { value: 'low', label: '低' },
      { value: 'medium', label: '中' },
      { value: 'high', label: '高' },
      { value: 'urgent', label: '紧急' }
    ]
  },
  {
    fieldName: 'status',
    displayName: '状态',
    fieldType: 'select',
    required: true,
    order: 7,
    visible: true,
    options: [
      { value: 'pending', label: '待处理' },
      { value: 'in_progress', label: '处理中' },
      { value: 'completed', label: '已完成' },
      { value: 'closed', label: '已关闭' }
    ]
  },
  {
    fieldName: 'reporterName',
    displayName: '报告人',
    fieldType: 'string',
    required: false,
    order: 8,
    visible: true
  },
  {
    fieldName: 'createdAt',
    displayName: '创建时间',
    fieldType: 'datetime',
    required: false,
    order: 9,
    visible: true
  },
  {
    fieldName: 'expectedCompletionDate',
    displayName: '期望完成时间',
    fieldType: 'datetime',
    required: false,
    order: 10,
    visible: true
  },
  {
    fieldName: 'completionDate',
    displayName: '完成时间',
    fieldType: 'datetime',
    required: false,
    order: 11,
    visible: true
  },
  {
    fieldName: 'description',
    displayName: '故障描述',
    fieldType: 'textarea',
    required: false,
    order: 12,
    visible: true,
    placeholder: '请详细描述故障情况'
  },
  {
    fieldName: 'resolution',
    displayName: '解决方案',
    fieldType: 'textarea',
    required: false,
    order: 13,
    visible: true,
    placeholder: '请输入解决方案'
  },
  {
    fieldName: 'location',
    displayName: '位置',
    fieldType: 'string',
    required: false,
    order: 14,
    visible: false
  }
];

async function initializeTicketFields() {
  try {
    const count = await TicketField.count();
    if (count === 0) {
      await TicketField.bulkCreate(defaultTicketFields);
      console.log('工单字段初始化完成');
    } else {
      console.log('工单字段已存在，跳过初始化');
    }
  } catch (error) {
    console.error('工单字段初始化失败:', error);
  }
}

module.exports = initializeTicketFields;
