const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const iconv = require('iconv-lite');
const Device = require('../models/Device');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const DeviceField = require('../models/DeviceField');

// 获取所有设备（支持搜索和筛选）
router.get('/', async (req, res) => {
  try {
    const { keyword, status, type, page = 1, pageSize = 10 } = req.query;
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

// 创建设备
router.post('/', async (req, res) => {
  try {
    const device = await Device.create(req.body);
    
    // 更新机柜当前功率
    const rack = await Rack.findByPk(req.body.rackId);
    if (rack) {
      await rack.update({
        currentPower: rack.currentPower + req.body.powerConsumption
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
    
    // 准备模板数据
    const templateData = [
      {
        '设备ID': 'DEV001',
        '设备名称': '测试服务器001',
        '设备类型': 'server',
        '型号': 'DELL R740',
        '序列号': 'SN1234567890',
        '所在机柜ID': 'A01',
        '位置(U)': '1',
        '高度(U)': '2',
        '功率(W)': '500',
        '状态': 'running',
        '购买日期': '2023-01-01',
        '保修到期': '2026-12-31',
        'IP地址': '192.168.1.100',
        '描述': '测试用服务器'
      }
    ];
    
    // 设置基础CSV标题（包含格式说明）
    const baseHeaders = [
      { id: '设备ID', title: '设备ID' },
      { id: '设备名称', title: '设备名称' },
      { id: '设备类型', title: '设备类型(server/switch/router/storage)' },
      { id: '型号', title: '型号' },
      { id: '序列号', title: '序列号' },
      { id: '所在机柜ID', title: '所在机柜ID' },
      { id: '位置(U)', title: '位置(U)' },
      { id: '高度(U)', title: '高度(U)' },
      { id: '功率(W)', title: '功率(W)' },
      { id: '状态', title: '状态(running/maintenance/offline/fault)' },
      { id: '购买日期', title: '购买日期(YYYY-MM-DD)' },
      { id: '保修到期', title: '保修到期(YYYY-MM-DD)' },
      { id: 'IP地址', title: 'IP地址(可选)' },
      { id: '描述', title: '描述(可选)' }
    ];
    
    // 添加自定义字段标题（排除与基础字段重复的字段）
    const baseFieldTitles = baseHeaders.map(header => header.id);
    const customHeaders = deviceFields
      .filter(field => field.visible && !baseFieldTitles.includes(field.displayName))
      .map(field => ({ 
        id: field.displayName, 
        title: `${field.displayName}(${field.required ? '必填' : '可选'})` 
      }));
    
    const csvWriter = createObjectCsvWriter({
      path: path.join(__dirname, '../temp/import_template.csv'),
      header: [...baseHeaders, ...customHeaders]
    });
    
    // 写入CSV文件
    await csvWriter.writeRecords(templateData);
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=gbk');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('设备导入模板.csv')}`);
    
    // 发送文件
    const fileStream = fs.createReadStream(path.join(__dirname, '../temp/import_template.csv'));
    fileStream.pipe(res);
    
    // 删除临时文件
    fileStream.on('end', () => {
      fs.unlinkSync(path.join(__dirname, '../temp/import_template.csv'));
    });
    
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
    
    // 创建字段映射：displayName -> fieldName
    const fieldMapping = {};
    deviceFields.forEach(field => {
      fieldMapping[field.displayName] = field;
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
          // 验证必填字段
          const requiredFields = {
            '设备ID': fieldValueMap['设备ID'],
            '设备名称': fieldValueMap['设备名称'],
            '设备类型': fieldValueMap['设备类型'],
            '型号': fieldValueMap['型号'],
            '序列号': fieldValueMap['序列号'],
            '所在机柜ID': fieldValueMap['所在机柜ID'],
            '位置(U)': fieldValueMap['位置(U)'],
            '高度(U)': fieldValueMap['高度(U)'],
            '功率(W)': fieldValueMap['功率(W)'],
            '状态': fieldValueMap['状态'],
            '购买日期': fieldValueMap['购买日期'],
            '保修到期': fieldValueMap['保修到期']
          };
          
          const missingFields = Object.keys(requiredFields).filter(fieldName => !requiredFields[fieldName]);
          if (missingFields.length > 0) {
            throw new Error(`缺少必填字段：${missingFields.join('、')}`);
          }
          
          // 验证序列号是否已存在
          const existingDevice = await Device.findOne({
            where: { serialNumber: fieldValueMap['序列号'] }
          });
          if (existingDevice) {
            throw new Error(`序列号已存在：${fieldValueMap['序列号']}`);
          }
          
          // 验证机柜是否存在，如果不存在则自动创建
          if (!rackIds.includes(fieldValueMap['所在机柜ID'])) {
            // 自动创建机柜
            const newRack = await Rack.create({
              rackId: fieldValueMap['所在机柜ID'],
              name: fieldValueMap['所在机柜ID'], // 使用机柜ID作为默认名称
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
          if (!validStatus.includes(fieldValueMap['状态'])) {
            throw new Error(`状态值无效，有效值为：${validStatus.join('、')}，当前值：${fieldValueMap['状态']}`);
          }
          
          // 验证数字字段
          const numericFields = {
            '位置(U)': fieldValueMap['位置(U)'],
            '高度(U)': fieldValueMap['高度(U)'],
            '功率(W)': fieldValueMap['功率(W)']
          };
          
          for (const [fieldName, value] of Object.entries(numericFields)) {
            if (isNaN(Number(value))) {
              throw new Error(`${fieldName}必须是数字，当前值：${value}`);
            }
          }
          
          // 验证日期格式并解析日期
          const purchaseDate = new Date(fieldValueMap['购买日期']);
          const warrantyExpiry = new Date(fieldValueMap['保修到期']);
          if (isNaN(purchaseDate.getTime())) {
            throw new Error(`购买日期格式无效：${fieldValueMap['购买日期']}，请使用YYYY-MM-DD格式`);
          }
          if (isNaN(warrantyExpiry.getTime())) {
            throw new Error(`保修到期日期格式无效：${fieldValueMap['保修到期']}，请使用YYYY-MM-DD格式`);
          }
          
          // 验证日期逻辑
          if (warrantyExpiry <= purchaseDate) {
            throw new Error(`保修到期日期必须晚于购买日期：购买日期${fieldValueMap['购买日期']}，保修到期${fieldValueMap['保修到期']}`);
          }
        
        // 构建设备数据
        const deviceData = {
          deviceId: fieldValueMap['设备ID'],
          name: fieldValueMap['设备名称'],
          type: fieldValueMap['设备类型'],
          model: fieldValueMap['型号'],
          serialNumber: fieldValueMap['序列号'],
          rackId: fieldValueMap['所在机柜ID'],
          position: parseInt(fieldValueMap['位置(U)']),
          height: parseInt(fieldValueMap['高度(U)']),
          powerConsumption: parseFloat(fieldValueMap['功率(W)']),
          ipAddress: fieldValueMap['IP地址'] || '',
          status: fieldValueMap['状态'],
          purchaseDate: purchaseDate,
          warrantyExpiry: warrantyExpiry,
          description: fieldValueMap['描述'] || ''
        };
        
        // 处理自定义字段
        const customFields = {};
        Object.entries(row).forEach(([displayName, value]) => {
          // 跳过基础字段
          const originalFieldName = extractFieldName(displayName);
          const baseFields = ['设备ID', '设备名称', '设备类型', '型号', '序列号', '所在机柜ID', '位置(U)', '高度(U)', '功率(W)', '状态', '购买日期', '保修到期', 'IP地址', '描述'];
          if (!baseFields.includes(originalFieldName)) {
            // 查找对应的字段配置（同时尝试原始字段名和带格式的字段名）
            const fieldConfig = fieldMapping[displayName] || fieldMapping[originalFieldName];
            if (fieldConfig) {
              // 根据字段类型处理值
              let processedValue = value;
              if (fieldConfig.fieldType === 'number') {
                processedValue = parseFloat(value);
              } else if (fieldConfig.fieldType === 'boolean') {
                processedValue = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === '是';
              } else if (fieldConfig.fieldType === 'date') {
                processedValue = new Date(value);
              }
              
              customFields[fieldConfig.fieldName] = processedValue;
            }
          }
        });
        
        // 如果有自定义字段，添加到设备数据中
        if (Object.keys(customFields).length > 0) {
          deviceData.customFields = customFields;
        }
        
        // 创建设备
        const device = await Device.create(deviceData);
        
        // 更新机柜当前功率
        const rack = await Rack.findByPk(row['所在机柜ID']);
        if (rack) {
          await rack.update({
            currentPower: rack.currentPower + device.powerConsumption
          });
        }
        
        stats.success++;
      } catch (error) {
        stats.failed++;
        stats.errors.push({ row: rowNum, error: error.message, data: row });
      }
    }
    
    // 删除临时文件
    fs.unlinkSync(filePath);
    
    res.json({ statistics: stats });
  } catch (error) {
    console.error('导入设备数据失败:', error);
    res.status(500).json({ error: '导入设备数据失败' });
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
router.put('/:deviceId', async (req, res) => {
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
router.delete('/batch-delete', async (req, res) => {
  try {
    const { deviceIds } = req.body;
    
    if (!deviceIds || !Array.isArray(deviceIds)) {
      return res.status(400).json({ error: '无效的设备ID列表' });
    }
    
    // 先获取所有设备的功率信息
    const devices = await Device.findAll({
      where: { deviceId: deviceIds }
    });
    
    // 更新机柜功率
    for (const device of devices) {
      const rack = await Rack.findByPk(device.rackId);
      if (rack) {
        await rack.update({
          currentPower: Math.max(0, rack.currentPower - device.powerConsumption)
        });
      }
    }
    
    // 删除设备
    const deleted = await Device.destroy({
      where: { deviceId: deviceIds }
    });
    
    res.json({ message: `成功删除 ${deleted} 个设备` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除设备
router.delete('/:deviceId', async (req, res) => {
  try {
    // 获取设备信息以更新功率
    const device = await Device.findByPk(req.params.deviceId);
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }
    
    const deleted = await Device.destroy({
      where: { deviceId: req.params.deviceId }
    });
    
    if (deleted) {
      // 更新机柜当前功率
      const rack = await Rack.findByPk(device.rackId);
      if (rack) {
        await rack.update({
          currentPower: Math.max(0, rack.currentPower - device.powerConsumption)
        });
      }
      
      res.status(204).json();
    } else {
      res.status(404).json({ error: '设备不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;