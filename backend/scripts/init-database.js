/**
 * 数据库初始化脚本
 * 用于生产环境首次部署时创建表结构
 *
 * 注意：此脚本为独立运行脚本，与 server.js 的初始化逻辑重复
 * 如果 server.js 已能正常完成初始化，则无需单独运行此脚本
 * 如需单独运行：node backend/scripts/init-database.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sequelize } = require('../db');
const SystemSetting = require('../models/SystemSetting');
const Consumable = require('../models/Consumable');
const ConsumableLog = require('../models/ConsumableLog');
const ConsumableCategory = require('../models/ConsumableCategory');
const ConsumableRecord = require('../models/ConsumableRecord');
const ConsumableLogArchive = require('../models/ConsumableLogArchive');
const Device = require('../models/Device');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const User = require('../models/User');
const FaultCategory = require('../models/FaultCategory');
const InventoryPlan = require('../models/InventoryPlan');
const InventoryTask = require('../models/InventoryTask');
const InventoryRecord = require('../models/InventoryRecord');
const Warehouse = require('../models/Warehouse');
const Cable = require('../models/Cable');
const DeviceField = require('../models/DeviceField');
const DevicePort = require('../models/DevicePort');
const NetworkCard = require('../models/NetworkCard');
const PendingDevice = require('../models/PendingDevice');
const Business = require('../models/Business');
const DeviceBusiness = require('../models/DeviceBusiness');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const UserRole = require('../models/UserRole');
const Ticket = require('../models/Ticket');
const TicketField = require('../models/TicketField');
const TicketOperationRecord = require('../models/TicketOperationRecord');
const BackupLog = require('../models/BackupLog');
const OperationLog = require('../models/OperationLog');

// 默认系统设置（包含中文描述）
const defaultSettings = [
  // 全局配置
  {
    settingKey: 'site_name',
    settingValue: JSON.stringify('机柜管理系统'),
    settingType: 'string',
    category: 'general',
    description: '网站名称',
    isEditable: true,
  },
  {
    settingKey: 'site_logo',
    settingValue: JSON.stringify(''),
    settingType: 'string',
    category: 'general',
    description: '网站Logo URL',
    isEditable: true,
  },
  {
    settingKey: 'timezone',
    settingValue: JSON.stringify('Asia/Shanghai'),
    settingType: 'string',
    category: 'general',
    description: '时区设置',
    isEditable: true,
  },
  {
    settingKey: 'date_format',
    settingValue: JSON.stringify('YYYY-MM-DD'),
    settingType: 'string',
    category: 'general',
    description: '日期格式',
    isEditable: true,
  },
  {
    settingKey: 'session_timeout',
    settingValue: JSON.stringify(30),
    settingType: 'number',
    category: 'general',
    description: '登录有效期(分钟)',
    isEditable: true,
  },
  {
    settingKey: 'idle_timeout',
    settingValue: JSON.stringify(10),
    settingType: 'number',
    category: 'general',
    description: '用户空闲超时时间(分钟)',
    isEditable: true,
  },
  {
    settingKey: 'idle_warning_time',
    settingValue: JSON.stringify(10),
    settingType: 'number',
    category: 'general',
    description: '空闲超时前警告时间(秒)',
    isEditable: false,
  },
  {
    settingKey: 'max_login_attempts',
    settingValue: JSON.stringify(5),
    settingType: 'number',
    category: 'general',
    description: '最大登录尝试次数',
    isEditable: true,
  },
  {
    settingKey: 'maintenance_mode',
    settingValue: JSON.stringify(false),
    settingType: 'boolean',
    category: 'general',
    description: '维护模式',
    isEditable: true,
  },

  // 外观设置
  {
    settingKey: 'primary_color',
    settingValue: JSON.stringify('#667eea'),
    settingType: 'string',
    category: 'appearance',
    description: '主题主色调',
    isEditable: true,
  },
  {
    settingKey: 'secondary_color',
    settingValue: JSON.stringify('#764ba2'),
    settingType: 'string',
    category: 'appearance',
    description: '主题辅助色调',
    isEditable: true,
  },
  {
    settingKey: 'compact_mode',
    settingValue: JSON.stringify(false),
    settingType: 'boolean',
    category: 'appearance',
    description: '紧凑模式',
    isEditable: true,
  },
  {
    settingKey: 'sidebar_collapsed',
    settingValue: JSON.stringify(false),
    settingType: 'boolean',
    category: 'appearance',
    description: '侧边栏默认折叠',
    isEditable: true,
  },
  {
    settingKey: 'table_row_height',
    settingValue: JSON.stringify('default'),
    settingType: 'string',
    category: 'appearance',
    description: '表格行高: small/default/middle/large',
    isEditable: true,
  },
  {
    settingKey: 'animation_enabled',
    settingValue: JSON.stringify(true),
    settingType: 'boolean',
    category: 'appearance',
    description: '启用动画效果',
    isEditable: true,
  },

  // 关于页面
  {
    settingKey: 'app_version',
    settingValue: JSON.stringify('1.0.0'),
    settingType: 'string',
    category: 'about',
    description: '应用版本',
    isEditable: false,
  },
  {
    settingKey: 'company_name',
    settingValue: JSON.stringify(''),
    settingType: 'string',
    category: 'about',
    description: '公司/组织名称',
    isEditable: true,
  },
  {
    settingKey: 'contact_email',
    settingValue: JSON.stringify(''),
    settingType: 'string',
    category: 'about',
    description: '联系邮箱',
    isEditable: true,
  },
  {
    settingKey: 'contact_phone',
    settingValue: JSON.stringify(''),
    settingType: 'string',
    category: 'about',
    description: '联系电话',
    isEditable: true,
  },
  {
    settingKey: 'company_address',
    settingValue: JSON.stringify(''),
    settingType: 'string',
    category: 'about',
    description: '公司地址',
    isEditable: true,
  },
  {
    settingKey: 'system_description',
    settingValue: JSON.stringify('机柜管理系统 - 专业的数据中心设备管理解决方案'),
    settingType: 'string',
    category: 'about',
    description: '系统描述',
    isEditable: true,
  },
  {
    settingKey: 'privacy_policy',
    settingValue: JSON.stringify(''),
    settingType: 'string',
    category: 'about',
    description: '隐私政策URL',
    isEditable: true,
  },
  {
    settingKey: 'terms_of_service',
    settingValue: JSON.stringify(''),
    settingType: 'string',
    category: 'about',
    description: '服务条款URL',
    isEditable: true,
  },
];

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');

    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 同步所有模型（按依赖层级顺序）
    // 第0层：无外键依赖的独立模型
    console.log('开始同步模型...');
    await User.sync({ alter: true });
    await Room.sync({ alter: true });
    await Warehouse.sync({ alter: true });
    await Role.sync({ alter: true });
    await Permission.sync({ alter: true });
    await Business.sync({ alter: true });
    await ConsumableCategory.sync({ alter: true });
    await Consumable.sync({ alter: true });
    await FaultCategory.sync({ alter: true });
    await DeviceField.sync({ alter: true });
    await TicketField.sync({ alter: true });
    await SystemSetting.sync({ alter: true });
    await BackupLog.sync({ alter: true });
    await ConsumableLogArchive.sync({ alter: true });
    await OperationLog.sync({ alter: true });

    // 第1层：仅依赖第0层
    await Rack.sync({ alter: true });
    await UserRole.sync({ alter: true });
    await InventoryPlan.sync({ alter: true });
    await ConsumableRecord.sync({ alter: true });

    // 第2层：依赖第0-1层
    await Device.sync({ alter: true });
    await InventoryTask.sync({ alter: true });

    // 第3层：依赖第0-2层
    await Cable.sync({ alter: true });
    await NetworkCard.sync({ alter: true });
    await DevicePort.sync({ alter: true });
    await DeviceBusiness.sync({ alter: true });
    await Ticket.sync({ alter: true });
    await PendingDevice.sync({ alter: true });

    // 第4层：依赖第0-3层
    await TicketOperationRecord.sync({ alter: true });
    await InventoryRecord.sync({ alter: true });
    await ConsumableLog.sync({ alter: true });

    console.log('数据库表结构同步完成');

    // 初始化或更新系统设置
    console.log('开始初始化/更新系统设置...');
    for (const setting of defaultSettings) {
      try {
        const existing = await SystemSetting.findByPk(setting.settingKey);
        if (!existing) {
          // 创建新设置
          await SystemSetting.create(setting);
          console.log(`创建设置: ${setting.settingKey}`);
        } else {
          // 更新描述字段（确保是中文）
          if (existing.description !== setting.description) {
            await existing.update({ description: setting.description });
            console.log(`更新描述: ${setting.settingKey} -> ${setting.description}`);
          }
        }
      } catch (error) {
        console.error(`处理设置 ${setting.settingKey} 失败:`, error.message);
      }
    }
    console.log('系统设置初始化/更新完成');

    console.log('数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();
