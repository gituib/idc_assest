const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../db'); // Import sequelize for transactions
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
    
    // 关键词搜索（所有文本字段）
    if (keyword) {
      where[Op.or] = [
        { deviceId: { [Op.like]: `%${keyword}%` } },
        { name: { [Op.like]: `%${keyword}%` } },
        { type: { [Op.like]: `%${keyword}%` } },
        { model: { [Op.like]: `%${keyword}%` } },
        { serialNumber: { [Op.like]: `%${keyword}%` } },
        { position: { [Op.like]: `%${keyword}%` } },
        { ipAddress: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } }
      ];
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
    res.status(500).json({ error: error.message });
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
    
    // 字段类型提示映射
    const fieldTypeHints = {
      '设备类型': 'server/switch/router/storage/other',
      '状态': 'running/maintenance/offline/fault'
    };
    
    // 日期字段提示
    const dateFields = ['购买日期', '保修到期'];
    
    // 根据字段配置动态生成CSV标题
    const headers = deviceFields
      .filter(field => field.visible)
      .map(field => {
        let title = field.displayName;
        
        // 添加字段类型提示
        if (fieldTypeHints[field.displayName]) {
          title = `${field.displayName}(${fieldTypeHints[field.displayName]})`;
        } else if (dateFields.includes(field.displayName)) {
          title = `${field.displayName}(YYYY-MM-DD)`;
        } else if (field.fieldType === 'select' && field.options && field.options.length > 0) {
          // 下拉选择字段，显示可选值
          const optionValues = field.options.map(opt => opt.value).join('/');
          title = `${field.displayName}(${optionValues})`;
        } else {
          // 显示必填/可选标识
          title = `${field.displayName}(${field.required ? '必填' : '可选'})`;
        }
        
        return { id: field.displayName, title };
      });
    
    // 准备示例数据（根据字段配置生成）
    const exampleData = {};
    deviceFields
      .filter(field => field.visible)
      .forEach(field => {
        switch (field.fieldName) {
          case 'deviceId':
            exampleData[field.displayName] = 'DEV001';
            break;
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
          case 'rackId':
            exampleData[field.displayName] = 'A01';
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
    
    // 准备CSV数据
    const csvData = devices.map(device => {
      // 创建基础数据对象
      const deviceData = {
        '设备ID': device.deviceId,
        '设备名称': device.name,
        '设备类型': device.type,
        '型号': device.model,
        '序列号': device.serialNumber,
        '所在机房ID': device.Rack?.Room?.roomId || '',
        '所在机房名称': device.Rack?.Room?.name || '',
        '所在机柜ID': device.rackId,
        '所在机柜名称': device.Rack?.name || '',
        '位置(U)': device.position,
        '高度(U)': device.height,
        '功率(W)': device.powerConsumption,
        'IP地址': device.ipAddress,
        '状态': device.status,
        '购买日期': device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString() : '',
        '保修到期': device.warrantyExpiry ? new Date(device.warrantyExpiry).toLocaleDateString() : '',
        '描述': device.description,
        '创建时间': device.createdAt ? new Date(device.createdAt).toLocaleString() : ''
      };
      
      // 添加自定义字段（排除基础字段）
      if (device.customFields) {
        // 定义基础字段的显示名称
        const baseFieldDisplayNames = [
          '设备ID', '设备名称', '设备类型', '型号', '序列号', 
          '所在机房ID', '所在机房名称', '所在机柜ID', '所在机柜名称', '位置(U)', '高度(U)', 
          '功率(W)', 'IP地址', '状态', '购买日期', '保修到期', '描述', '创建时间'
        ];
        
        deviceFields.forEach(field => {
          // 只添加未在基础字段中出现的自定义字段
          if (field.visible && 
              device.customFields[field.fieldName] && 
              !baseFieldDisplayNames.includes(field.displayName)) {
            deviceData[field.displayName] = device.customFields[field.fieldName];
          }
        });
      }
      
      return deviceData;
    });
    
    // 设置CSV标题（包含自定义字段）
    const baseHeaders = [
      { id: '设备ID', title: '设备ID' },
      { id: '设备名称', title: '设备名称' },
      { id: '设备类型', title: '设备类型' },
      { id: '型号', title: '型号' },
      { id: '序列号', title: '序列号' },
      { id: '所在机房ID', title: '所在机房ID' },
      { id: '所在机房名称', title: '所在机房名称' },
      { id: '所在机柜ID', title: '所在机柜ID' },
      { id: '所在机柜名称', title: '所在机柜名称' },
      { id: '位置(U)', title: '位置(U)' },
      { id: '高度(U)', title: '高度(U)' },
      { id: '功率(W)', title: '功率(W)' },
      { id: 'IP地址', title: 'IP地址' },
      { id: '状态', title: '状态' },
      { id: '购买日期', title: '购买日期' },
      { id: '保修到期', title: '保修到期' },
      { id: '描述', title: '描述' },
      { id: '创建时间', title: '创建时间' }
    ];
    
    // 添加自定义字段标题（排除与基础字段重复的字段）
    const baseFieldTitles = baseHeaders.map(header => header.id);
    const customHeaders = deviceFields
      .filter(field => field.visible && !baseFieldTitles.includes(field.displayName))
      .map(field => ({ id: field.displayName, title: field.displayName }));
    
    const csvWriter = createObjectCsvWriter({
      path: path.join(__dirname, '../temp/devices.csv'),
      header: [...baseHeaders, ...customHeaders],
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

// 导入设备数据从CSV
router.post('/import', async (req, res) => {
  try {
    if (!req.files || !req.files.csvFile) {
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
    
    // 获取所有机柜信息用于验证
    const racks = await Rack.findAll();
    const rackIds = racks.map(rack => rack.rackId);
    
    // 获取所有机房信息，用于自动创建机柜时的默认机房
    let rooms = await Room.findAll();
    let defaultRoomId;
    
    // 如果没有机房，创建一个默认机房
    if (rooms.length === 0) {
      const defaultRoom = await Room.create({
        roomId: 'ROOM001',
        name: '默认机房',
        location: '默认位置',
        area: 100,
        capacity: 100
      });
      defaultRoomId = defaultRoom.roomId;
    } else {
      // 使用第一个机房作为默认机房
      defaultRoomId = rooms[0].roomId;
    }
    
    // 获取设备字段配置
    const deviceFields = await DeviceField.findAll();
    
    // 创建字段映射：displayName -> fieldConfig
    const fieldMapping = {};
    deviceFields.forEach(field => {
      fieldMapping[field.displayName] = field;
    });
    
    // 创建字段名到显示名称的映射（用于识别基础字段）
    const fieldNameToDisplayName = {};
    deviceFields.forEach(field => {
      fieldNameToDisplayName[field.fieldName] = field.displayName;
    });
    
    // 处理导入数据
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2; // CSV行号（第一行是标题）
      
      // 辅助函数：从带格式说明的字段名中提取原始字段名（如从"设备类型(server/switch/router/storage)"提取"设备类型"）
      const extractFieldName = (fieldNameWithFormat) => {
        const match = fieldNameWithFormat.match(/^([^\(]+)/);
        return match ? match[1].trim() : fieldNameWithFormat;
      };
      
      // 创建一个映射，将原始字段名映射到CSV中的值
      const fieldValueMap = {};
      Object.entries(row).forEach(([displayName, value]) => {
        const originalFieldName = extractFieldName(displayName);
        fieldValueMap[originalFieldName] = value;
        // 同时保留原始字段名的映射，以便兼容不同格式
        fieldValueMap[displayName] = value;
      });
      
      try {
          // 动态获取必填字段配置（从数据库读取）
          const requiredFieldConfigs = deviceFields.filter(field => field.required);
          const requiredFieldNames = requiredFieldConfigs.map(field => field.displayName);

          // 验证必填字段
          const missingFields = [];
          for (const fieldName of requiredFieldNames) {
            const value = fieldValueMap[fieldName];
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              missingFields.push(fieldName);
            }
          }

          if (missingFields.length > 0) {
            throw new Error(`缺少必填字段：${missingFields.join('、')}`);
          }
          
        // 获取动态字段显示名称（支持用户在字段管理中修改后的名称）
        const getFieldValue = (fieldName) => {
          const displayName = fieldNameToDisplayName[fieldName];
          return displayName ? fieldValueMap[displayName] : undefined;
        };
        
        // 验证设备类型值
        const validTypes = ['server', 'switch', 'router', 'storage', 'other'];
        const deviceType = getFieldValue('type');
        if (!validTypes.includes(deviceType)) {
          throw new Error(`设备类型无效，有效值为：${validTypes.join('、')}，当前值：${deviceType}`);
        }
        
        // 处理设备ID：如果为空则自动生成
        let deviceId = getFieldValue('deviceId');
        if (!deviceId || deviceId.trim() === '') {
          // 自动生成设备ID
          const allDevices = await Device.findAll({
            where: {
              deviceId: {
                [require('sequelize').Op.like]: 'DEV%'
              }
            }
          });
          
          let maxNumber = 0;
          allDevices.forEach(device => {
            const match = device.deviceId.match(/^DEV(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) {
                maxNumber = num;
              }
            }
          });
          
          deviceId = `DEV${String(maxNumber + 1).padStart(3, '0')}`;
        } else {
          // 验证设备ID是否已存在
          const existingDeviceById = await Device.findOne({
            where: { deviceId: deviceId }
          });
          if (existingDeviceById) {
            throw new Error(`设备ID已存在：${deviceId}`);
          }
        }
        
        // 验证序列号是否已存在
        const serialNumber = getFieldValue('serialNumber');
        if (!serialNumber) {
          throw new Error('序列号不能为空');
        }
        const existingDevice = await Device.findOne({
          where: { serialNumber: serialNumber }
        });
        if (existingDevice) {
          throw new Error(`序列号已存在：${serialNumber}`);
        }
        
        // 验证机柜ID是否为空
        const rackId = getFieldValue('rackId');
        if (!rackId || rackId.trim() === '') {
          throw new Error('所在机柜ID不能为空');
        }
        
        // 验证机柜是否存在，如果不存在则自动创建
        if (!rackIds.includes(rackId)) {
          // 自动创建机柜
          const newRack = await Rack.create({
            rackId: rackId,
            name: rackId, // 使用机柜ID作为默认名称
            height: 42, // 默认42U高度
            maxPower: 10000, // 默认最大功耗10000W
            currentPower: 0,
            status: 'active',
            roomId: defaultRoomId
          });
          
          // 更新机柜列表和ID列表
          racks.push(newRack);
          rackIds.push(newRack.rackId);
        }
        
        // 验证状态值
        const validStatus = ['running', 'maintenance', 'offline', 'fault'];
        const status = getFieldValue('status');
        if (!validStatus.includes(status)) {
          throw new Error(`状态值无效，有效值为：${validStatus.join('、')}，当前值：${status}`);
        }
        
        // 验证数字字段
        const position = getFieldValue('position');
        const height = getFieldValue('height');
        const powerConsumption = getFieldValue('powerConsumption');
        
        if (position !== undefined && isNaN(Number(position))) {
          throw new Error(`${fieldNameToDisplayName['position']}必须是数字，当前值：${position}`);
        }
        if (height !== undefined && isNaN(Number(height))) {
          throw new Error(`${fieldNameToDisplayName['height']}必须是数字，当前值：${height}`);
        }
        if (powerConsumption !== undefined && isNaN(Number(powerConsumption))) {
          throw new Error(`${fieldNameToDisplayName['powerConsumption']}必须是数字，当前值：${powerConsumption}`);
        }
        
        // 验证日期格式并解析日期
        const purchaseDateValue = getFieldValue('purchaseDate');
        const warrantyExpiryValue = getFieldValue('warrantyExpiry');
        const purchaseDate = purchaseDateValue ? new Date(purchaseDateValue) : null;
        const warrantyExpiry = warrantyExpiryValue ? new Date(warrantyExpiryValue) : null;
        
        if (purchaseDateValue && isNaN(purchaseDate.getTime())) {
          throw new Error(`${fieldNameToDisplayName['purchaseDate']}格式无效：${purchaseDateValue}，请使用YYYY-MM-DD格式`);
        }
        if (warrantyExpiryValue && isNaN(warrantyExpiry.getTime())) {
          throw new Error(`${fieldNameToDisplayName['warrantyExpiry']}格式无效：${warrantyExpiryValue}，请使用YYYY-MM-DD格式`);
        }
        
        // 验证日期逻辑
        if (purchaseDate && warrantyExpiry && warrantyExpiry <= purchaseDate) {
          throw new Error(`${fieldNameToDisplayName['warrantyExpiry']}必须晚于${fieldNameToDisplayName['purchaseDate']}：${purchaseDateValue} ~ ${warrantyExpiryValue}`);
        }
        
        // 构建设备数据
        const deviceData = {
          deviceId: deviceId,
          name: getFieldValue('name'),
          type: deviceType,
          model: getFieldValue('model'),
          serialNumber: serialNumber,
          rackId: rackId,
          position: position ? parseInt(position) : 0,
          height: height ? parseInt(height) : 1,
          powerConsumption: powerConsumption ? parseFloat(powerConsumption) : 0,
          ipAddress: getFieldValue('ipAddress') || '',
          status: status,
          purchaseDate: purchaseDate,
          warrantyExpiry: warrantyExpiry,
          description: getFieldValue('description') || ''
        };
        
        // 处理自定义字段（排除基础字段）
        const customFields = {};
        const baseFieldNames = ['deviceId', 'name', 'type', 'model', 'serialNumber', 'rackId', 'position', 'height', 'powerConsumption', 'ipAddress', 'status', 'purchaseDate', 'warrantyExpiry', 'description'];
        
        Object.entries(row).forEach(([displayName, value]) => {
          // 从带格式的字段名中提取原始显示名称
          const originalDisplayName = extractFieldName(displayName);
          // 查找对应的字段配置
          const fieldConfig = fieldMapping[originalDisplayName];
          
          if (fieldConfig && !baseFieldNames.includes(fieldConfig.fieldName)) {
            // 这是自定义字段，根据字段类型处理值
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
        
        // 如果有自定义字段，添加到设备数据中
        if (Object.keys(customFields).length > 0) {
          deviceData.customFields = customFields;
        }
        
        // 创建设备
        const device = await Device.create(deviceData);
        
        // 更新机柜当前功率
        const rack = await Rack.findByPk(rackId);
        if (rack) {
          await rack.update({
            currentPower: rack.currentPower + device.powerConsumption
          });
        }
        
        stats.success++;
      } catch (error) {
        stats.failed++;
        let errorMessage = error.message;
        
        if (error.name === 'SequelizeUniqueConstraintError') {
          const errors = error.errors || [];
          for (const err of errors) {
            if (err.path === 'deviceId') {
              errorMessage = `设备ID已存在`;
              break;
            } else if (err.path === 'serialNumber') {
              errorMessage = `序列号已存在`;
              break;
            }
          }
        } else if (error.name === 'SequelizeValidationError') {
          errorMessage = '数据验证失败，请检查字段格式';
        }
        
        stats.errors.push({ row: rowNum, error: errorMessage, data: row });
      }
    }
    
    fs.unlinkSync(filePath);
    
    res.json({ statistics: stats });
  } catch (error) {
    console.error('导入设备数据失败:', error);
    const errorMessage = error.message || '导入过程中发生未知错误';
    res.status(500).json({ 
      errors: [{ row: 0, error: errorMessage }] 
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

// 批量下线设备
router.put('/batch-offline', async (req, res) => {
  try {
    const { deviceIds } = req.body;
    
    if (!deviceIds || !Array.isArray(deviceIds)) {
      return res.status(400).json({ error: '无效的设备ID列表' });
    }
    
    // 更新设备状态为离线
    const updated = await Device.update(
      { status: 'offline' },
      { where: { deviceId: deviceIds } }
    );
    
    res.json({ message: `成功下线 ${updated[0]} 个设备` });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    // 2. 删除相关端口 (Delete associated DevicePorts)
    await DevicePort.destroy({
      where: { deviceId: { [Op.in]: deviceIds } },
      transaction: t
    });
    
    // 3. 解除工单关联
    await Ticket.update(
      { deviceId: null },
      { where: { deviceId: { [Op.in]: deviceIds } }, transaction: t }
    );
    
    // 4. 删除设备
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
    res.status(500).json({ error: error.message });
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
    
    // 2. 删除相关端口 (Delete associated DevicePorts)
    // 必须在删除设备之前删除，否则触发外键约束错误
    const deletedPorts = await DevicePort.destroy({
      where: { deviceId: deviceId },
      transaction: t
    });

    // 3. 解除工单关联 (Unlink Tickets)
    await Ticket.update(
      { deviceId: null },
      { where: { deviceId: deviceId }, transaction: t }
    );
    
    // 4. 删除设备 (Delete Device)
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

// 批量上线设备
router.put('/batch-online', async (req, res) => {
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
router.put('/batch-offline', async (req, res) => {
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
    
    if (startPosition === undefined || startPosition === null) {
      return res.status(400).json({ error: '请提供起始U位' });
    }
    
    // 验证目标机柜是否存在
    const targetRack = await Rack.findByPk(targetRackId);
    if (!targetRack) {
      return res.status(404).json({ error: '目标机柜不存在' });
    }
    
    // 获取要移动的设备
    const devices = await Device.findAll({
      where: { deviceId: { [Op.in]: deviceIds } }
    });
    
    if (devices.length === 0) {
      return res.status(404).json({ error: '未找到指定的设备' });
    }
    
    const movedDevices = [];
    let currentPosition = startPosition;
    
    for (const device of devices) {
      const oldRackId = device.rackId;
      const oldPosition = device.position;
      const deviceHeight = device.height || 1;
      
      const [updated] = await Device.update(
        { 
          rackId: targetRackId,
          position: currentPosition
        },
        { where: { deviceId: device.deviceId } }
      );
      
      if (updated) {
        movedDevices.push({
          deviceId: device.deviceId,
          name: device.name,
          oldRackId,
          oldPosition,
          newRackId: targetRackId,
          newPosition: currentPosition
        });
      }
      
      currentPosition += deviceHeight;
    }
    
    res.json({
      message: `批量移动成功，已将 ${movedDevices.length} 个设备移动到机柜 ${targetRackId}`,
      movedDevices
    });
  } catch (error) {
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