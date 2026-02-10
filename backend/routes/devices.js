const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize, dbDialect } = require('../db'); // Import sequelize and dbDialect for transactions
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const iconv = require('iconv-lite');
const Device = require('../models/Device');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const DeviceField = require('../models/DeviceField');
const Ticket = require('../models/Ticket');
const DevicePort = require('../models/DevicePort'); // Import DevicePort
const Cable = require('../models/Cable'); // Import Cable
const NetworkCard = require('../models/NetworkCard'); // Import NetworkCard
const { validateBody, validateQuery } = require('../middleware/validation');
const {
  createDeviceSchema,
  updateDeviceSchema,
  batchDeviceIdsSchema,
  batchStatusSchema,
  batchMoveSchema,
  queryDeviceSchema
} = require('../validation/deviceSchema');

// 获取所有设备（支持搜索和筛选）
router.get('/', validateQuery(queryDeviceSchema), async (req, res) => {
  try {
    const { keyword, status, type, rackId, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    const where = {};

    // 关键词搜索（所有文本字段 + 自定义字段）
    if (keyword) {
      console.log('搜索关键词:', keyword);
      console.log('数据库类型:', dbDialect);
      
      // 转义关键词中的特殊字符，防止SQL注入
      const escapedKeyword = keyword.replace(/'/g, "''");
      
      // 基础字段搜索条件（只包含文本类型字段）
      const searchConditions = [
        { deviceId: { [Op.like]: `%${escapedKeyword}%` } },
        { name: { [Op.like]: `%${escapedKeyword}%` } },
        { type: { [Op.like]: `%${escapedKeyword}%` } },
        { model: { [Op.like]: `%${escapedKeyword}%` } },
        { serialNumber: { [Op.like]: `%${escapedKeyword}%` } },
        { ipAddress: { [Op.like]: `%${escapedKeyword}%` } },
        { description: { [Op.like]: `%${escapedKeyword}%` } }
      ];

      // 动态获取文本类型的自定义字段
      const customFields = await DeviceField.findAll({
        where: {
          isSystem: false,
          fieldType: { [Op.in]: ['string', 'textarea'] }
        }
      });
      
      console.log('找到的自定义字段:', customFields.map(f => f.fieldName));

      // 构建自定义字段搜索条件（使用原始SQL，兼容SQLite和MySQL）
      if (customFields.length > 0) {
        // 使用原始SQL查询JSON字段
        const jsonConditions = customFields.map(field => {
          const fieldName = field.fieldName;
          // 使用 sequelize.literal 构建原始SQL条件
          if (dbDialect === 'mysql') {
            return sequelize.literal(`JSON_EXTRACT(customFields, '$."${fieldName}"') LIKE '%${escapedKeyword}%'`);
          } else {
            return sequelize.literal(`json_extract(customFields, '$.${fieldName}') LIKE '%${escapedKeyword}%'`);
          }
        });
        searchConditions.push(...jsonConditions);
      }

      // 合并所有搜索条件
      where[Op.or] = searchConditions;
      console.log('搜索条件数量:', searchConditions.length);
    }

    // 状态筛选
    if (status && status !== 'all') {
      where.status = status;
    }

    // 分类筛选
    if (type && type !== 'all') {
      where.type = type;
    }

    // 机柜筛选（用于机柜可视化功能）
    if (rackId) {
      where.rackId = rackId;
    }

    // 执行查询
    const { count, rows } = await Device.findAndCountAll({
      where,
      include: [
        {
          model: Rack,
          include: [
            { model: Room }
          ]
        }
      ],
      offset,
      limit: parseInt(pageSize)
    });

    res.json({
      total: count,
      devices: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('搜索设备失败:', error);
    console.error('错误详情:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    res.status(500).json({ error: error.message, sql: error.sql });
  }
});

// 生成设备ID的辅助函数
async function generateDeviceId() {
  // 获取当前最大的设备ID序号
  const devices = await Device.findAll({
    where: {
      deviceId: {
        [require('sequelize').Op.like]: 'DEV%'
      }
    }
  });
  
  let maxNumber = 0;
  devices.forEach(device => {
    const match = device.deviceId.match(/^DEV(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  // 生成新的设备ID，序号+1，至少3位数字
  const newNumber = maxNumber + 1;
  return `DEV${String(newNumber).padStart(3, '0')}`;
}

// 创建设备
router.post('/', validateBody(createDeviceSchema), async (req, res) => {
  try {
    const deviceData = { ...req.body };
    
    // 如果没有提供deviceId或为空，则自动生成
    if (!deviceData.deviceId || deviceData.deviceId.trim() === '') {
      deviceData.deviceId = await generateDeviceId();
    }
    
    const device = await Device.create(deviceData);
    
    // 更新机柜当前功率
    const rack = await Rack.findByPk(deviceData.rackId);
    if (rack) {
      await rack.update({
        currentPower: rack.currentPower + deviceData.powerConsumption
      });
    }
    
    res.status(201).json(device);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 设备导入模板下载
router.get('/import-template', async (req, res) => {
  try {
    // 查询设备字段配置
    const deviceFields = await DeviceField.findAll({
      order: [['order', 'ASC']]
    });
    
    // 根据字段配置动态生成CSV标题（排除设备ID，由系统自动生成）
    // 将rackId字段替换为机房名称+机柜名称，以便唯一定位
    // 注意：导入模板包含所有字段（不论visible状态），确保数据完整性
    const headers = [];
    deviceFields
      .filter(field => field.fieldName !== 'deviceId')
      .forEach(field => {
        // 如果是机柜字段，拆分为机房名称和机柜名称两列
        if (field.fieldName === 'rackId') {
          headers.push({ 
            id: '所在机房名称', 
            title: '所在机房名称' 
          });
          headers.push({ 
            id: '所在机柜名称', 
            title: '所在机柜名称' 
          });
          return;
        }
        
        // 直接使用displayName作为列名，不添加任何后缀
        headers.push({ id: field.displayName, title: field.displayName });
      });
    
    // 准备示例数据（根据字段配置生成，排除设备ID）
    // 注意：包含所有字段（不论visible状态）
    const exampleData = {};
    deviceFields
      .filter(field => field.fieldName !== 'deviceId')
      .forEach(field => {
        // 如果是机柜字段，拆分为机房名称和机柜名称
        if (field.fieldName === 'rackId') {
          exampleData['所在机房名称'] = '测试机房';
          exampleData['所在机柜名称'] = 'A01';
          return;
        }
        
        switch (field.fieldName) {
          case 'name':
            exampleData[field.displayName] = '测试服务器001';
            break;
          case 'type':
            exampleData[field.displayName] = 'server';
            break;
          case 'model':
            exampleData[field.displayName] = 'DELL R740';
            break;
          case 'serialNumber':
            exampleData[field.displayName] = 'SN1234567890';
            break;
          case 'position':
            exampleData[field.displayName] = '1';
            break;
          case 'height':
            exampleData[field.displayName] = '2';
            break;
          case 'powerConsumption':
            exampleData[field.displayName] = '500';
            break;
          case 'status':
            exampleData[field.displayName] = 'running';
            break;
          case 'purchaseDate':
            exampleData[field.displayName] = '2023-01-01';
            break;
          case 'warrantyExpiry':
            exampleData[field.displayName] = '2026-12-31';
            break;
          case 'ipAddress':
            exampleData[field.displayName] = '192.168.1.100';
            break;
          case 'description':
            exampleData[field.displayName] = '测试用服务器';
            break;
          default:
            // 自定义字段根据类型生成示例值
            if (field.fieldType === 'number') {
              exampleData[field.displayName] = '100';
            } else if (field.fieldType === 'boolean') {
              exampleData[field.displayName] = 'true';
            } else if (field.fieldType === 'date') {
              exampleData[field.displayName] = '2023-01-01';
            } else if (field.fieldType === 'select' && field.options && field.options.length > 0) {
              exampleData[field.displayName] = field.options[0].value;
            } else {
              exampleData[field.displayName] = `示例${field.displayName}`;
            }
        }
      });
    
    const templateData = [exampleData];
    
    // 确保temp目录存在
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const csvWriter = createObjectCsvWriter({
      path: path.join(tempDir, 'import_template.csv'),
      header: headers
    });
    
    // 写入CSV文件
    await csvWriter.writeRecords(templateData);
    
    // 读取文件并转换为GBK编码
    const csvContent = fs.readFileSync(path.join(tempDir, 'import_template.csv'), 'utf8');
    const gbkContent = iconv.encode(csvContent, 'gbk');
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=gbk');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('设备导入模板.csv')}`);
    
    // 发送CSV数据
    res.send(gbkContent);
    
    // 删除临时文件
    fs.unlinkSync(path.join(tempDir, 'import_template.csv'));
    
  } catch (error) {
    console.error('生成导入模板失败:', error);
    res.status(500).json({ error: '生成导入模板失败' });
  }
});

// 导出设备数据为CSV
router.get('/export', async (req, res) => {
  try {
    const { deviceIds } = req.query;
    
    // 查询条件
    const where = {};
    if (deviceIds) {
      // 支持多个设备ID，使用数组格式
      const ids = Array.isArray(deviceIds) ? deviceIds : [deviceIds];
      where.deviceId = { [Op.in]: ids };
    }
    
    // 查询设备字段配置
    const deviceFields = await DeviceField.findAll({
      order: [['order', 'ASC']]
    });
    
    // 查询设备数据
    const devices = await Device.findAll({
      where,
      include: [
        {
          model: Rack,
          include: [
            { model: Room }
          ]
        }
      ]
    });
    
    // 如果没有找到设备
    if (devices.length === 0) {
      return res.status(404).json({ error: '未找到指定的设备' });
    }
    
    // 创建字段名到displayName的映射
    const fieldNameToDisplayName = {};
    deviceFields.forEach(field => {
      fieldNameToDisplayName[field.fieldName] = field.displayName;
    });
    
    // 准备CSV数据 - 根据字段配置动态生成，与导入模板保持一致
    const csvData = devices.map(device => {
      const deviceData = {};
      
      // 根据字段配置生成数据（排除deviceId）
      deviceFields
        .filter(field => field.visible && field.fieldName !== 'deviceId')
        .forEach(field => {
          // rackId字段拆分为机房名称和机柜名称
          if (field.fieldName === 'rackId') {
            deviceData['所在机房名称'] = device.Rack?.Room?.name || '';
            deviceData['所在机柜名称'] = device.Rack?.name || '';
            return;
          }
          
          // 其他字段使用displayName作为列名
          const value = device[field.fieldName];
          
          // 日期格式处理
          if (field.fieldType === 'date' && value) {
            deviceData[field.displayName] = new Date(value).toLocaleDateString();
          } else {
            deviceData[field.displayName] = value !== undefined && value !== null ? value : '';
          }
        });
      
      // 添加自定义字段
      if (device.customFields) {
        Object.entries(device.customFields).forEach(([fieldName, value]) => {
          const field = deviceFields.find(f => f.fieldName === fieldName);
          if (field && field.visible) {
            deviceData[field.displayName] = value;
          }
        });
      }
      
      return deviceData;
    });
    
    // 设置CSV标题 - 与导入模板保持一致
    const headers = [];
    deviceFields
      .filter(field => field.visible && field.fieldName !== 'deviceId')
      .forEach(field => {
        // rackId拆分为两个列
        if (field.fieldName === 'rackId') {
          headers.push({ id: '所在机房名称', title: '所在机房名称' });
          headers.push({ id: '所在机柜名称', title: '所在机柜名称' });
          return;
        }
        
        headers.push({ id: field.displayName, title: field.displayName });
      });
    
    const csvWriter = createObjectCsvWriter({
      path: path.join(__dirname, '../temp/devices.csv'),
      header: headers,
      encoding: 'utf8'
    });
    
    // 确保temp目录存在
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'));
    }
    
    // 写入CSV文件
    await csvWriter.writeRecords(csvData);
    
    // 读取文件并转换为GBK编码
    const csvContent = fs.readFileSync(path.join(__dirname, '../temp/devices.csv'), 'utf8');
    const gbkContent = iconv.encode(csvContent, 'gbk');
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=devices.csv');
    
    // 发送CSV数据
    res.send(gbkContent);
    
    // 删除临时文件
    fs.unlinkSync(path.join(__dirname, '../temp/devices.csv'));
  } catch (error) {
    console.error('导出设备数据失败:', error);
    res.status(500).json({ error: '导出设备数据失败' });
  }
});

// 导入设备数据从CSV - 优化版：使用事务+批量插入
router.post('/import', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    if (!req.files || !req.files.csvFile) {
      await t.rollback();
      return res.status(400).json({ error: '请上传CSV文件' });
    }
    
    const csvFile = req.files.csvFile;
    const stats = { total: 0, success: 0, failed: 0, errors: [] };
    
    // 确保temp目录存在
    if (!fs.existsSync(path.join(__dirname, '../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../temp'));
    }
    
    // 保存上传的文件
    const filePath = path.join(__dirname, '../temp', csvFile.name);
    await csvFile.mv(filePath);
    
    // 读取并解析CSV文件（GBK编码）
    const results = [];
    const stream = fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('gbk'))
      .pipe(csv());
    
    await new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        stats.total++;
        results.push(data);
      })
      .on('end', resolve)
      .on('error', reject);
    });
    
    // 【优化1】批量查询所有必要数据（单次查询）
    const [rooms, racks, deviceFields, maxDeviceResult] = await Promise.all([
      Room.findAll({ transaction: t }),
      Rack.findAll({ include: [{ model: Room }], transaction: t }),
      DeviceField.findAll({ transaction: t }),
      // 查询最大设备ID序号
      Device.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.cast(sequelize.fn('SUBSTR', sequelize.col('deviceId'), 4), 'INTEGER')), 'maxNum']],
        where: { deviceId: { [Op.like]: 'DEV%' } },
        transaction: t
      })
    ]);
    
    // 创建查找映射
    const roomNameToIdMap = new Map(rooms.map(room => [room.name, room.roomId]));
    const rackLocationMap = new Map(racks.map(rack => [`${rack.Room?.name || ''}_${rack.name}`, rack.rackId]));
    const fieldMapping = {};
    const fieldNameToDisplayName = {};
    deviceFields.forEach(field => {
      fieldMapping[field.displayName] = field;
      fieldNameToDisplayName[field.fieldName] = field.displayName;
    });
    
    // 设备ID生成器
    let maxDeviceNum = maxDeviceResult?.get('maxNum') || 0;
    const generateDeviceId = () => {
      maxDeviceNum++;
      return `DEV${String(maxDeviceNum).padStart(3, '0')}`;
    };
    
    // 辅助函数：提取字段名
    const extractFieldName = (fieldNameWithFormat) => {
      const match = fieldNameWithFormat.match(/^(.+?)(\(必填\)|\(可选\)|\([a-zA-Z0-9\-\/]+\))$/);
      return match ? match[1].trim() : fieldNameWithFormat;
    };
    
    // 【优化2】收集所有需要验证的唯一键
    const allDeviceIds = new Set();
    const allSerialNumbers = new Set();
    const validTypes = ['server', 'switch', 'router', 'storage', 'other'];
    const validStatuses = ['running', 'maintenance', 'offline', 'fault'];
    const baseFieldNames = ['deviceId', 'name', 'type', 'model', 'serialNumber', 'rackId', 'position', 'height', 'powerConsumption', 'ipAddress', 'status', 'purchaseDate', 'warrantyExpiry', 'description'];
    
    // 第一遍：验证和收集数据
    const validDevices = [];
    
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2;
      
      try {
        // 解析字段值
        const fieldValueMap = {};
        Object.entries(row).forEach(([displayName, value]) => {
          const originalFieldName = extractFieldName(displayName);
          fieldValueMap[originalFieldName] = value;
          fieldValueMap[displayName] = value;
        });
        
        const getFieldValue = (fieldName) => {
          const displayName = fieldNameToDisplayName[fieldName];
          return displayName ? fieldValueMap[displayName] : undefined;
        };
        
        // 验证必填字段
        const trulyRequiredFields = [];
        deviceFields.forEach(field => {
          if (field.fieldName === 'deviceId') return;
          if (field.fieldName === 'rackId') {
            if (field.required) {
              trulyRequiredFields.push('所在机房名称', '所在机柜名称');
            }
            return;
          }
          if (field.required) trulyRequiredFields.push(field.displayName);
        });
        
        const missingFields = trulyRequiredFields.filter(fieldName => {
          const value = fieldValueMap[fieldName];
          return !value || (typeof value === 'string' && value.trim() === '');
        });
        
        if (missingFields.length > 0) {
          throw new Error(`缺少必填字段：${missingFields.join('、')}`);
        }
        
        // 验证设备类型
        const deviceType = getFieldValue('type');
        if (!validTypes.includes(deviceType)) {
          throw new Error(`设备类型无效：${deviceType}`);
        }
        
        // 处理设备ID
        let deviceId = getFieldValue('deviceId');
        if (!deviceId || deviceId.trim() === '') {
          deviceId = generateDeviceId();
        } else if (allDeviceIds.has(deviceId)) {
          throw new Error(`设备ID重复：${deviceId}`);
        }
        allDeviceIds.add(deviceId);
        
        // 验证序列号
        const serialNumber = getFieldValue('serialNumber');
        if (!serialNumber) throw new Error('序列号不能为空');
        if (allSerialNumbers.has(serialNumber)) {
          throw new Error(`序列号重复：${serialNumber}`);
        }
        allSerialNumbers.add(serialNumber);
        
        // 验证机房和机柜
        const roomName = fieldValueMap['所在机房名称'];
        const rackName = fieldValueMap['所在机柜名称'];
        if (!roomName?.trim()) throw new Error('所在机房名称不能为空');
        if (!rackName?.trim()) throw new Error('所在机柜名称不能为空');
        
        const roomId = roomNameToIdMap.get(roomName.trim());
        if (!roomId) throw new Error(`机房不存在：${roomName}`);
        
        const locationKey = `${roomName.trim()}_${rackName.trim()}`;
        let rackId = rackLocationMap.get(locationKey);
        
        // 机柜不存在则自动创建
        if (!rackId) {
          const maxRackResult = await Rack.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.cast(sequelize.fn('SUBSTR', sequelize.col('rackId'), 5), 'INTEGER')), 'maxNum']],
            where: { rackId: { [Op.like]: 'RACK%' } },
            transaction: t
          });
          let maxRackNum = maxRackResult?.get('maxNum') || 0;
          maxRackNum++;
          
          const newRack = await Rack.create({
            rackId: `RACK${String(maxRackNum).padStart(3, '0')}`,
            name: rackName.trim(),
            height: 42,
            maxPower: 10000,
            currentPower: 0,
            status: 'active',
            roomId: roomId
          }, { transaction: t });
          
          rackId = newRack.rackId;
          rackLocationMap.set(locationKey, rackId);
        }
        
        // 验证状态
        const status = getFieldValue('status');
        if (!validStatuses.includes(status)) {
          throw new Error(`状态值无效：${status}`);
        }
        
        // 验证数字字段
        const position = getFieldValue('position');
        const height = getFieldValue('height');
        const powerConsumption = getFieldValue('powerConsumption');
        
        if (position !== undefined && isNaN(Number(position))) {
          throw new Error(`位置必须是数字：${position}`);
        }
        if (height !== undefined && isNaN(Number(height))) {
          throw new Error(`高度必须是数字：${height}`);
        }
        if (powerConsumption !== undefined && isNaN(Number(powerConsumption))) {
          throw new Error(`功率必须是数字：${powerConsumption}`);
        }
        
        // 验证日期
        const purchaseDateValue = getFieldValue('purchaseDate');
        const warrantyExpiryValue = getFieldValue('warrantyExpiry');
        const purchaseDate = purchaseDateValue ? new Date(purchaseDateValue) : null;
        const warrantyExpiry = warrantyExpiryValue ? new Date(warrantyExpiryValue) : null;
        
        if (purchaseDateValue && isNaN(purchaseDate.getTime())) {
          throw new Error(`购买日期格式无效：${purchaseDateValue}`);
        }
        if (warrantyExpiryValue && isNaN(warrantyExpiry.getTime())) {
          throw new Error(`保修日期格式无效：${warrantyExpiryValue}`);
        }
        if (purchaseDate && warrantyExpiry && warrantyExpiry <= purchaseDate) {
          throw new Error(`保修日期必须晚于购买日期`);
        }
        
        // 处理自定义字段
        const customFields = {};
        Object.entries(row).forEach(([displayName, value]) => {
          const originalDisplayName = extractFieldName(displayName);
          const fieldConfig = fieldMapping[originalDisplayName];
          
          if (fieldConfig && !baseFieldNames.includes(fieldConfig.fieldName)) {
            let processedValue = value;
            if (fieldConfig.fieldType === 'number') {
              processedValue = value ? parseFloat(value) : null;
            } else if (fieldConfig.fieldType === 'boolean') {
              processedValue = value ? (value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === '是') : false;
            } else if (fieldConfig.fieldType === 'date') {
              processedValue = value ? new Date(value) : null;
            }
            customFields[fieldConfig.fieldName] = processedValue;
          }
        });
        
        // 收集有效设备数据
        validDevices.push({
          deviceId,
          name: getFieldValue('name'),
          type: deviceType,
          model: getFieldValue('model'),
          serialNumber,
          rackId,
          position: position ? parseInt(position) : 0,
          height: height ? parseInt(height) : 1,
          powerConsumption: powerConsumption ? parseFloat(powerConsumption) : 0,
          ipAddress: getFieldValue('ipAddress') || '',
          status,
          purchaseDate,
          warrantyExpiry,
          description: getFieldValue('description') || '',
          customFields: Object.keys(customFields).length > 0 ? customFields : null
        });
        
      } catch (error) {
        stats.failed++;
        stats.errors.push({ row: rowNum, error: error.message, data: row });
      }
    }
    
    // 【优化3】批量查询已存在的设备ID和序列号（单次查询）
    if (validDevices.length > 0) {
      const existingDevices = await Device.findAll({
        where: {
          [Op.or]: [
            { deviceId: validDevices.map(d => d.deviceId) },
            { serialNumber: validDevices.map(d => d.serialNumber) }
          ]
        },
        attributes: ['deviceId', 'serialNumber'],
        transaction: t
      });
      
      const existingDeviceIds = new Set(existingDevices.map(d => d.deviceId));
      const existingSerialNumbers = new Set(existingDevices.map(d => d.serialNumber));
      
      // 过滤掉已存在的设备
      const newDevices = validDevices.filter(device => {
        if (existingDeviceIds.has(device.deviceId)) {
          stats.failed++;
          stats.errors.push({ row: 0, error: `设备ID已存在：${device.deviceId}`, data: {} });
          return false;
        }
        if (existingSerialNumbers.has(device.serialNumber)) {
          stats.failed++;
          stats.errors.push({ row: 0, error: `序列号已存在：${device.serialNumber}`, data: {} });
          return false;
        }
        return true;
      });
      
      // 【优化4】批量创建设备
      if (newDevices.length > 0) {
        await Device.bulkCreate(newDevices, { transaction: t });
        stats.success = newDevices.length;
        
        // 【优化5】批量更新机柜功率
        const rackPowerMap = new Map();
        newDevices.forEach(device => {
          const current = rackPowerMap.get(device.rackId) || 0;
          rackPowerMap.set(device.rackId, current + device.powerConsumption);
        });
        
        for (const [rackId, powerToAdd] of rackPowerMap) {
          await Rack.update(
            { currentPower: sequelize.literal(`currentPower + ${powerToAdd}`) },
            { where: { rackId }, transaction: t }
          );
        }
      }
    }
    
    // 提交事务
    await t.commit();
    
    fs.unlinkSync(filePath);
    res.json({ statistics: stats });
    
  } catch (error) {
    await t.rollback();
    console.error('导入设备数据失败:', error);
    res.status(500).json({ 
      errors: [{ row: 0, error: error.message || '导入过程中发生未知错误' }] 
    });
  }
});

// 批量上线设备
router.put('/batch-online', validateBody(batchDeviceIdsSchema), async (req, res) => {
  try {
    const { deviceIds } = req.body;
    
    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: '请提供有效的设备ID列表' });
    }
    
    // 更新设备状态为运行中
    const [affectedCount] = await Device.update(
      { status: 'running' },
      { where: { deviceId: { [Op.in]: deviceIds } } }
    );
    
    res.json({
      message: `批量上线成功，已更新 ${affectedCount} 个设备`,
      affectedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量下线设备
router.put('/batch-offline', validateBody(batchDeviceIdsSchema), async (req, res) => {
  try {
    const { deviceIds } = req.body;
    
    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: '请提供有效的设备ID列表' });
    }
    
    // 更新设备状态为离线
    const [affectedCount] = await Device.update(
      { status: 'offline' },
      { where: { deviceId: { [Op.in]: deviceIds } } }
    );
    
    res.json({
      message: `批量下线成功，已更新 ${affectedCount} 个设备`,
      affectedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量变更设备状态
router.put('/batch-status', async (req, res) => {
  try {
    const { deviceIds, status } = req.body;
    
    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: '请提供有效的设备ID列表' });
    }
    
    // 检查数据库中是否存在这些设备
    const existingDevices = await Device.findAll({
      where: { deviceId: { [Op.in]: deviceIds } },
      attributes: ['deviceId']
    });
    
    // 检查是否有不存在的设备
    const existingIds = existingDevices.map(d => d.deviceId);
    const missingIds = deviceIds.filter(id => !existingIds.includes(id));
    
    if (missingIds.length > 0) {
      return res.status(404).json({ error: `设备不存在: ${missingIds.join(', ')}` });
    }
    
    const validStatus = ['running', 'maintenance', 'offline', 'fault'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ 
        error: `状态值无效，有效值为：${validStatus.join('、')}` 
      });
    }
    
    // 状态映射
    const statusText = {
      running: '运行中',
      maintenance: '维护中',
      offline: '离线',
      fault: '故障'
    };
    
    // 更新设备状态
    const [affectedCount] = await Device.update(
      { status },
      { where: { deviceId: { [Op.in]: deviceIds } } }
    );
    
    res.json({
      message: `批量状态变更成功，已将 ${affectedCount} 个设备状态变更为"${statusText[status]}"`,
      affectedCount,
      newStatus: status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量移动设备
router.put('/batch-move', async (req, res) => {
  try {
    const { deviceIds, targetRackId, startPosition } = req.body;
    
    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: '请提供有效的设备ID列表' });
    }
    
    if (!targetRackId) {
      return res.status(400).json({ error: '请提供目标机柜ID' });
    }
    
    // 验证目标机柜是否存在
    const targetRack = await Rack.findByPk(targetRackId);
    if (!targetRack) {
      return res.status(404).json({ error: '目标机柜不存在' });
    }
    
    // 批量更新设备位置
    let movedCount = 0;
    for (let i = 0; i < deviceIds.length; i++) {
      const deviceId = deviceIds[i];
      const position = startPosition ? startPosition + i : undefined;
      
      const updateData = { rackId: targetRackId };
      if (position) {
        updateData.position = position;
      }
      
      const [updated] = await Device.update(updateData, {
        where: { deviceId }
      });
      
      if (updated) {
        movedCount++;
      }
    }
    
    res.json({
      message: `批量移动成功，已将 ${movedCount} 个设备移动到机柜 ${targetRackId}`,
      movedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个设备
router.get('/:deviceId', async (req, res) => {
  try {
    const device = await Device.findByPk(req.params.deviceId, {
      include: [
        {
          model: Rack,
          include: [
            { model: Room }
          ]
        }
      ]
    });
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新设备
router.put('/:deviceId', validateBody(updateDeviceSchema), async (req, res) => {
  try {
    // 获取旧设备信息以更新功率
    const oldDevice = await Device.findByPk(req.params.deviceId);
    if (!oldDevice) {
      return res.status(404).json({ error: '设备不存在' });
    }
    
    const [updated] = await Device.update(req.body, {
      where: { deviceId: req.params.deviceId }
    });
    
    if (updated) {
      // 更新机柜当前功率
      const rack = await Rack.findByPk(oldDevice.rackId);
      if (rack) {
        const powerDiff = req.body.powerConsumption - oldDevice.powerConsumption;
        await rack.update({
          currentPower: rack.currentPower + powerDiff
        });
      }
      
      const updatedDevice = await Device.findByPk(req.params.deviceId, {
        include: [
          {
            model: Rack,
            include: [
              { model: Room }
            ]
          }
        ]
      });
      res.json(updatedDevice);
    } else {
      res.status(404).json({ error: '设备不存在' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 批量删除设备
router.delete('/batch-delete', validateBody(batchDeviceIdsSchema), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deviceIds } = req.body;
    
    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: '请提供有效的设备ID列表' });
    }
    
    const devices = await Device.findAll({
      where: { deviceId: { [Op.in]: deviceIds } },
      transaction: t
    });
    
    // 1. 删除相关接线 (Delete associated Cables)
    await Cable.destroy({
      where: {
        [Op.or]: [
          { sourceDeviceId: { [Op.in]: deviceIds } },
          { targetDeviceId: { [Op.in]: deviceIds } }
        ]
      },
      transaction: t
    });

    // 2. 删除相关网卡 (Delete associated NetworkCards)
    await NetworkCard.destroy({
      where: { deviceId: { [Op.in]: deviceIds } },
      transaction: t
    });

    // 3. 删除相关端口 (Delete associated DevicePorts)
    await DevicePort.destroy({
      where: { deviceId: { [Op.in]: deviceIds } },
      transaction: t
    });
    
    // 4. 解除工单关联
    await Ticket.update(
      { deviceId: null },
      { where: { deviceId: { [Op.in]: deviceIds } }, transaction: t }
    );
    
    // 5. 删除设备
    const deletedCount = await Device.destroy({
      where: { deviceId: { [Op.in]: deviceIds } },
      transaction: t
    });
    
    // 更新机柜功率
    for (const device of devices) {
      if (device.rackId) {
        const rack = await Rack.findByPk(device.rackId, { transaction: t });
        if (rack) {
          await rack.update({
            currentPower: Math.max(0, rack.currentPower - device.powerConsumption)
          }, { transaction: t });
        }
      }
    }

    await t.commit();
    
    res.json({
      message: `批量删除成功，已删除 ${deletedCount} 个设备`,
      deletedCount
    });
  } catch (error) {
    await t.rollback();
    console.error('批量删除设备错误:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// 删除所有设备（一键清空）
router.delete('/delete-all', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // 获取所有设备
    const allDevices = await Device.findAll({ transaction: t });
    
    if (allDevices.length === 0) {
      await t.rollback();
      return res.json({ message: '没有设备需要删除', deletedCount: 0 });
    }
    
    const deviceIds = allDevices.map(d => d.deviceId);
    
    // 1. 删除相关接线
    await Cable.destroy({
      where: {
        [Op.or]: [
          { sourceDeviceId: { [Op.in]: deviceIds } },
          { targetDeviceId: { [Op.in]: deviceIds } }
        ]
      },
      transaction: t
    });
    
    // 2. 删除相关网卡
    await NetworkCard.destroy({
      where: { deviceId: { [Op.in]: deviceIds } },
      transaction: t
    });
    
    // 3. 删除相关端口
    await DevicePort.destroy({
      where: { deviceId: { [Op.in]: deviceIds } },
      transaction: t
    });
    
    // 4. 解除工单关联
    await Ticket.update(
      { deviceId: null },
      { where: { deviceId: { [Op.in]: deviceIds } }, transaction: t }
    );
    
    // 5. 更新机柜功率
    for (const device of allDevices) {
      if (device.rackId) {
        const rack = await Rack.findByPk(device.rackId, { transaction: t });
        if (rack) {
          await rack.update({
            currentPower: Math.max(0, rack.currentPower - device.powerConsumption)
          }, { transaction: t });
        }
      }
    }
    
    // 6. 删除所有设备
    const deletedCount = await Device.destroy({
      where: {},
      transaction: t
    });
    
    await t.commit();
    
    res.json({
      message: `成功删除所有设备，共删除 ${deletedCount} 个设备`,
      deletedCount
    });
  } catch (error) {
    await t.rollback();
    console.error('删除所有设备错误:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// 删除设备
router.delete('/:deviceId', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { deviceId } = req.params;
    
    // 获取设备信息以更新功率
    const device = await Device.findByPk(deviceId, { transaction: t });
    if (!device) {
      await t.rollback();
      return res.status(404).json({ error: '设备不存在' });
    }
    
    // 1. 删除相关接线 (Delete associated Cables)
    // 必须在删除设备之前删除，否则可能触发外键约束错误
    const deletedCables = await Cable.destroy({
      where: {
        [Op.or]: [
          { sourceDeviceId: deviceId },
          { targetDeviceId: deviceId }
        ]
      },
      transaction: t
    });
    
    // 2. 删除相关网卡 (Delete associated NetworkCards)
    const deletedNetworkCards = await NetworkCard.destroy({
      where: { deviceId: deviceId },
      transaction: t
    });

    // 3. 删除相关端口 (Delete associated DevicePorts)
    // 必须在删除设备之前删除，否则触发外键约束错误
    const deletedPorts = await DevicePort.destroy({
      where: { deviceId: deviceId },
      transaction: t
    });

    // 4. 解除工单关联 (Unlink Tickets)
    await Ticket.update(
      { deviceId: null },
      { where: { deviceId: deviceId }, transaction: t }
    );
    
    // 5. 删除设备 (Delete Device)
    await Device.destroy({
      where: { deviceId: deviceId },
      transaction: t
    });
    
    // 提交事务
    await t.commit();
    
    if (deletedCables > 0) {
      console.log(`已删除 ${deletedCables} 条相关接线`);
    }
    
    // 更新机柜功率 (Update Rack power)
    // 注意：设备已删除，不需要再减去功率？或者需要？
    // 原逻辑是：rack.currentPower - device.powerConsumption
    // 既然设备已经物理删除了，机柜的当前功率确实应该减少。
    if (device.rackId) {
      try {
        const rack = await Rack.findByPk(device.rackId);
        if (rack) {
          await rack.update({
            currentPower: Math.max(0, rack.currentPower - device.powerConsumption)
          });
        }
      } catch (err) {
        console.error('更新机柜功率失败:', err);
      }
    }
    
    res.status(200).json({ 
      message: '删除成功',
      deviceId: deviceId,
      deletedCablesCount: deletedCables,
      deletedPortsCount: deletedPorts
    });
  } catch (error) {
    await t.rollback();
    console.error('删除设备失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 增强导出设备数据（支持自定义字段）
router.get('/enhanced-export', async (req, res) => {
  try {
    const { deviceIds, format = 'csv', fields, fieldLabels } = req.query;
    
    // 解析字段列表
    let selectedFields = [];
    try {
      selectedFields = fields ? JSON.parse(fields) : [];
    } catch (e) {
      selectedFields = [];
    }
    
    // 解析字段标签
    let fieldLabelMap = {};
    try {
      fieldLabelMap = fieldLabels ? JSON.parse(fieldLabels) : {};
    } catch (e) {
      fieldLabelMap = {};
    }
    
    // 构建查询条件
    const where = {};
    if (deviceIds) {
      const ids = Array.isArray(deviceIds) ? deviceIds : [deviceIds];
      where.deviceId = { [Op.in]: ids };
    }
    
    // 查询设备数据
    const devices = await Device.findAll({
      where,
      include: [
        {
          model: Rack,
          include: [
            { model: Room }
          ]
        }
      ]
    });
    
    if (devices.length === 0) {
      return res.status(404).json({ error: '未找到指定的设备' });
    }
    
    // 准备导出数据
    const exportData = devices.map(device => {
      const data = {};
      
      selectedFields.forEach(fieldName => {
        // 映射字段名到中文标签
        const label = fieldLabelMap[fieldName] || fieldName;
        
        // 根据字段名获取值
        if (fieldName === 'rackName') {
          data[label] = device.Rack?.name || '';
        } else if (fieldName === 'roomName') {
          data[label] = device.Rack?.Room?.name || '';
        } else if (fieldName === 'status') {
          const statusMap = {
            running: '运行中',
            maintenance: '维护中',
            offline: '离线',
            fault: '故障'
          };
          data[label] = statusMap[device.status] || device.status;
        } else if (fieldName === 'type') {
          const typeMap = {
            server: '服务器',
            switch: '交换机',
            router: '路由器',
            storage: '存储设备',
            other: '其他设备'
          };
          data[label] = typeMap[device.type] || device.type;
        } else if (fieldName === 'purchaseDate' || fieldName === 'warrantyExpiry') {
          data[label] = device[fieldName] ? new Date(device[fieldName]).toLocaleDateString('zh-CN') : '';
        } else if (fieldName === 'customFields' && device.customFields) {
          // 如果选择导出自定义字段，展开为单独的列
          Object.entries(device.customFields).forEach(([key, value]) => {
            data[key] = value;
          });
        } else if (device[fieldName] !== undefined) {
          data[label] = device[fieldName];
        }
      });
      
      return data;
    });
    
    if (format === 'json') {
      // JSON格式导出
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=devices.json');
      res.json({
        exportTime: new Date().toISOString(),
        totalCount: devices.length,
        devices: exportData
      });
    } else {
      // CSV格式导出
      const csvWriter = createObjectCsvWriter({
        path: path.join(__dirname, '../temp/enhanced_export.csv'),
        header: Object.keys(exportData[0] || {}).map(key => ({ id: key, title: key })),
        encoding: 'utf8'
      });
      
      // 确保temp目录存在
      if (!fs.existsSync(path.join(__dirname, '../temp'))) {
        fs.mkdirSync(path.join(__dirname, '../temp'));
      }
      
      await csvWriter.writeRecords(exportData);
      
      const csvContent = fs.readFileSync(path.join(__dirname, '../temp/enhanced_export.csv'), 'utf8');
      const gbkContent = iconv.encode(csvContent, 'gbk');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=devices.csv');
      
      res.send(gbkContent);
      
      fs.unlinkSync(path.join(__dirname, '../temp/enhanced_export.csv'));
    }
  } catch (error) {
    console.error('增强导出失败:', error);
    res.status(500).json({ error: '增强导出失败' });
  }
});

module.exports = router;