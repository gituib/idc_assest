const express = require('express');
const router = express.Router();
const Rack = require('../models/Rack');
const Device = require('../models/Device');
const Room = require('../models/Room');
const { sequelize } = require('../db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { validateBody, validateQuery } = require('../middleware/validation');
const { createRackSchema, updateRackSchema, queryRackSchema } = require('../validation/rackSchema');

// 获取所有机柜
router.get('/', async (req, res) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 筛选参数
    const { roomId, status, keyword } = req.query;

    // 构建查询条件
    const where = {};
    if (roomId && roomId !== 'all') {
      where.roomId = roomId;
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (keyword) {
      where[require('sequelize').Op.or] = [
        { rackId: { [require('sequelize').Op.like]: `%${keyword}%` } },
        { name: { [require('sequelize').Op.like]: `%${keyword}%` } }
      ];
    }

    // 获取总记录数（带筛选条件）
    const total = await Rack.count({ where });

    // 获取分页数据 - 先查询机柜基本信息
    const racks = await Rack.findAll({
      where,
      include: [
        { model: Room, separate: false }
      ],
      limit: pageSize,
      offset: offset
    });

    // 单独查询每个机柜的设备信息（避免 JOIN 导致的数据重复问题）
    const rackIds = racks.map(r => r.rackId);
    const devices = await Device.findAll({
      where: { rackId: rackIds },
      attributes: ['deviceId', 'rackId', 'name', 'powerConsumption']
    });

    // 将设备信息关联到对应的机柜
    const deviceMap = {};
    devices.forEach(d => {
      if (!deviceMap[d.rackId]) {
        deviceMap[d.rackId] = [];
      }
      deviceMap[d.rackId].push(d);
    });

    racks.forEach(rack => {
      rack.dataValues.Devices = deviceMap[rack.rackId] || [];
    });

    // 返回带分页信息的响应
    res.json({
      racks,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导出机柜导入模板 - 必须放在 /:rackId 路由之前，避免被当作 rackId 参数
router.get('/import-template', async (req, res) => {
  try {
    // 准备模板数据 - 机柜ID留空表示自动生成
    const templateData = [
      {
        '机柜ID(留空自动生成)': '',
        '机柜名称': '测试机柜1',
        '所属机房名称': '测试机房1',
        '高度(U)': 42,
        '最大功率(W)': 5000,
        '状态': 'active'
      },
      {
        '机柜ID(留空自动生成)': 'RACK001',
        '机柜名称': '测试机柜2',
        '所属机房名称': '测试机房1',
        '高度(U)': 42,
        '最大功率(W)': 3000,
        '状态': 'maintenance'
      }
    ];
    
    // 使用xlsx创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 将数据转换为工作表
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 }
    ];
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '机柜模板');
    
    // 生成Excel文件的Buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent('机柜导入模板.xlsx')}`);
    
    // 发送文件
    res.send(excelBuffer);
    
  } catch (error) {
    console.error('生成导入模板失败:', error);
    res.status(500).json({ error: '生成导入模板失败' });
  }
});

// 导出租机柜数据 - 必须放在 /:rackId 路由之前，避免被当作 rackId 参数
router.get('/export', async (req, res) => {
  try {
    // 获取所有机柜数据（包含机房信息）
    const racks = await Rack.findAll({
      include: [
        { model: Room, attributes: ['name'] },
        { model: Device, attributes: ['deviceId', 'name', 'powerConsumption'] }
      ],
      order: [['rackId', 'ASC']]
    });

    // 准备导出数据
    const exportData = racks.map(rack => {
      const deviceCount = rack.Devices ? rack.Devices.length : 0;
      const totalPower = rack.Devices ? rack.Devices.reduce((sum, d) => sum + (d.powerConsumption || 0), 0) : 0;
      
      return {
        '机柜ID': rack.rackId,
        '机柜名称': rack.name,
        '所属机房': rack.Room ? rack.Room.name : '',
        '机柜高度(U)': rack.height,
        '最大功耗(W)': rack.maxPower,
        '当前功耗(W)': rack.currentPower || 0,
        '设备数量': deviceCount,
        '设备总功耗(W)': totalPower,
        '状态': rack.status === 'active' ? '启用' : rack.status === 'maintenance' ? '维护中' : '停用',
        '创建时间': rack.createdAt ? new Date(rack.createdAt).toLocaleString() : ''
      };
    });

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, // 机柜ID
      { wch: 20 }, // 机柜名称
      { wch: 20 }, // 所属机房
      { wch: 12 }, // 机柜高度
      { wch: 15 }, // 最大功耗
      { wch: 15 }, // 当前功耗
      { wch: 12 }, // 设备数量
      { wch: 15 }, // 设备总功耗
      { wch: 10 }, // 状态
      { wch: 20 }  // 创建时间
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '机柜列表');
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `机柜导出_${timestamp}.xlsx`;
    
    // 确保temp目录存在
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = path.join(tempDir, fileName);
    
    // 写入文件
    XLSX.writeFile(wb, filePath);
    
    // 发送文件
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // 发送完成后删除临时文件
    fileStream.on('close', () => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    fileStream.on('error', (err) => {
      console.error('文件流错误:', err);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
  } catch (error) {
    console.error('导出租机柜数据失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '导出失败',
      error: error.message 
    });
  }
});

// 获取单个机柜
router.get('/:rackId', async (req, res) => {
  try {
    const rack = await Rack.findByPk(req.params.rackId, {
      include: [
        { model: Room, separate: false },
        { model: Device, separate: false }
      ],
      subQuery: false  // 避免子查询导致的性能问题
    });
    if (!rack) {
      return res.status(404).json({ error: '机柜不存在' });
    }
    res.json(rack);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 生成机柜ID的辅助函数
async function generateRackId() {
  // 获取当前最大的机柜ID序号
  const racks = await Rack.findAll({
    where: {
      rackId: {
        [require('sequelize').Op.like]: 'RACK%'
      }
    }
  });
  
  let maxNumber = 0;
  racks.forEach(rack => {
    const match = rack.rackId.match(/^RACK(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  // 生成新的机柜ID，序号+1，至少3位数字
  const newNumber = maxNumber + 1;
  return `RACK${String(newNumber).padStart(3, '0')}`;
}

// 创建机柜
router.post('/', validateBody(createRackSchema), async (req, res) => {
  try {
    const rackData = { ...req.body };
    
    // 如果没有提供rackId或为空，则自动生成
    if (!rackData.rackId || rackData.rackId.trim() === '') {
      rackData.rackId = await generateRackId();
    }
    
    const rack = await Rack.create(rackData);
    res.status(201).json(rack);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新机柜
router.put('/:rackId', validateBody(updateRackSchema), async (req, res) => {
  try {
    const [updated] = await Rack.update(req.body, {
      where: { rackId: req.params.rackId }
    });
    if (updated) {
      const updatedRack = await Rack.findByPk(req.params.rackId, {
        include: [
          { model: Room, separate: false },
          { model: Device, separate: false }
        ],
        subQuery: false  // 避免子查询导致的性能问题
      });
      res.json(updatedRack);
    } else {
      res.status(404).json({ error: '机柜不存在' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除机柜
router.delete('/:rackId', async (req, res) => {
  try {
    // 检查是否有设备关联
    const devices = await Device.findAll({ where: { rackId: req.params.rackId } });
    if (devices.length > 0) {
      return res.status(400).json({ error: '该机柜下有设备，无法删除' });
    }
    
    const deleted = await Rack.destroy({
      where: { rackId: req.params.rackId }
    });
    if (deleted) {
      res.status(204).json();
    } else {
      res.status(404).json({ error: '机柜不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 导入机柜数据 - 优化版：使用事务+批量插入
router.post('/import', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    // 检查是否有上传文件
    if (!req.files || !req.files.file) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: '没有上传文件',
        error: '没有找到有效的上传文件，请选择一个Excel文件后重试' 
      });
    }

    const file = req.files.file;
    
    // 确保temp目录存在
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 保存临时文件
    const tempFilePath = path.join(tempDir, `${Date.now()}_${file.name}`);
    try {
      await file.mv(tempFilePath);
    } catch (saveError) {
      await t.rollback();
      return res.status(500).json({ 
        success: false, 
        message: '文件保存失败',
        error: `无法保存上传的文件: ${saveError.message}` 
      });
    }

    try {
      // 读取Excel文件
      let workbook;
      try {
        workbook = XLSX.readFile(tempFilePath);
      } catch (readError) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: '文件解析失败',
          error: `无法解析Excel文件: ${readError.message}` 
        });
      }
      
      // 获取第一个工作表
      if (!workbook.SheetNames.length) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: '文件格式错误',
          error: 'Excel文件中没有找到工作表' 
        });
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // 读取第一行作为列头
      const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, limit: 1 })[0] || [];
      
      // 定义列名映射（支持导入模板格式和导出文件格式）
      const columnMapping = {
        rackId: ['机柜ID(留空自动生成)', '机柜ID'],
        name: ['机柜名称'],
        roomName: ['所属机房名称', '所属机房'],
        height: ['高度(U)', '机柜高度(U)'],
        maxPower: ['最大功率(W)', '最大功耗(W)'],
        status: ['状态']
      };
      
      // 根据列头自动检测列索引映射
      const columnIndexMap = {};
      Object.keys(columnMapping).forEach(field => {
        const possibleNames = columnMapping[field];
        const index = headerRow.findIndex(h => possibleNames.includes(String(h).trim()));
        if (index !== -1) {
          columnIndexMap[field] = index;
        }
      });
      
      // 检查必需的列是否存在
      const requiredColumns = ['name', 'roomName', 'height', 'maxPower', 'status'];
      const missingColumns = requiredColumns.filter(col => columnIndexMap[col] === undefined);
      if (missingColumns.length > 0) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'Excel列名格式不正确',
          error: `缺少必需的列: ${missingColumns.join(', ')}，请使用系统导出的文件或下载导入模板` 
        });
      }
      
      // 转换为JSON格式
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: headerRow.map((h, i) => `col_${i}`),
        range: 1,
        blankrows: false
      });
      
      const jsonData = rawData.map(row => {
        const item = {};
        Object.keys(columnIndexMap).forEach(field => {
          const colIndex = columnIndexMap[field];
          item[field] = row[`col_${colIndex}`];
        });
        return item;
      });

      if (jsonData.length === 0) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: '没有找到有效数据',
          error: 'Excel文件中没有找到可导入的数据行' 
        });
      }

      // 状态值转换映射
      const statusMapping = {
        '启用': 'active', '在用': 'active', '停用': 'inactive',
        '禁用': 'inactive', '维护中': 'maintenance',
        'active': 'active', 'inactive': 'inactive', 'maintenance': 'maintenance'
      };
      
      const validStatuses = ['active', 'maintenance', 'inactive'];
      const validationResults = [];
      
      // 【优化1】批量查询机房信息（单次查询）
      const allRooms = await Room.findAll({ transaction: t });
      const roomNameToIdMap = new Map(allRooms.map(room => [room.name, room.roomId]));
      const validRoomNames = new Set(roomNameToIdMap.keys());
      
      // 【优化2】批量查询现有最大机柜ID（单次查询）
      const maxRackResult = await Rack.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.cast(sequelize.fn('SUBSTR', sequelize.col('rackId'), 5), 'INTEGER')), 'maxNum']],
        where: {
          rackId: {
            [require('sequelize').Op.like]: 'RACK%'
          }
        },
        transaction: t
      });
      let maxNumber = maxRackResult?.get('maxNum') || 0;
      
      // 处理数据
      const processedData = jsonData.map((item, index) => {
        const rowNumber = index + 2;
        const rawStatus = String(item.status || '').trim();
        const normalizedStatus = statusMapping[rawStatus] || rawStatus.toLowerCase();
        const rawRackId = item.rackId ? String(item.rackId).trim() : '';
        
        if (!rawRackId || rawRackId === '') {
          maxNumber++;
          return { 
            ...item, 
            rackId: `RACK${String(maxNumber).padStart(3, '0')}`, 
            status: normalizedStatus,
            rowNumber
          };
        }
        
        return { 
          ...item, 
          rackId: rawRackId, 
          status: normalizedStatus,
          rowNumber
        };
      });
      
      // 验证数据
      processedData.forEach((item) => {
        const errors = [];
        
        if (!/^RACK\d+$/.test(item.rackId)) {
          errors.push('机柜ID格式应为RACK+数字，如RACK001');
        }
        if (!item.name || String(item.name).trim() === '') {
          errors.push('机柜名称不能为空');
        }
        if (!item.roomName || String(item.roomName).trim() === '') {
          errors.push('所属机房名称不能为空');
        } else if (!validRoomNames.has(String(item.roomName).trim())) {
          errors.push(`所属机房名称不存在: ${item.roomName}`);
        }
        if (typeof item.height !== 'number' || item.height <= 0) {
          errors.push('高度必须是大于0的数字');
        }
        if (typeof item.maxPower !== 'number' || item.maxPower < 0) {
          errors.push('最大功率必须是大于等于0的数字');
        }
        if (!item.status || !validStatuses.includes(item.status)) {
          errors.push(`状态必须是以下值之一: ${validStatuses.join(', ')}`);
        }
        
        if (errors.length > 0) {
          validationResults.push({ row: item.rowNumber, data: item, errors });
        }
      });

      if (validationResults.length > 0) {
        await t.rollback();
        return res.status(400).json({ 
          success: false, 
          message: '数据验证失败',
          error: `${validationResults.length} 行数据格式错误`,
          details: validationResults
        });
      }

      // 【优化3】批量查询已存在的机柜ID（单次查询）
      const existingRacks = await Rack.findAll({
        where: {
          rackId: processedData.map(item => item.rackId)
        },
        transaction: t
      });
      
      const existingIds = new Set(existingRacks.map(rack => rack.rackId));
      const newData = processedData.filter(item => !existingIds.has(item.rackId));
      const duplicateCount = processedData.length - newData.length;
      
      // 【优化4】批量插入数据
      let createdCount = 0;
      if (newData.length > 0) {
        const dataWithRoomId = newData.map(item => ({
          rackId: item.rackId,
          name: item.name,
          height: item.height,
          maxPower: item.maxPower,
          status: item.status,
          roomId: roomNameToIdMap.get(item.roomName.trim()),
          currentPower: 0
        }));
        
        const result = await Rack.bulkCreate(dataWithRoomId, {
          transaction: t,
          ignoreDuplicates: true
        });
        createdCount = result.length;
      }
      
      // 提交事务
      await t.commit();

      res.status(200).json({ 
        success: true, 
        message: '机柜导入完成',
        imported: createdCount,
        duplicates: duplicateCount,
        total: jsonData.length
      });
    } finally {
      // 删除临时文件
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  } catch (error) {
    await t.rollback();
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误',
      error: `导入过程中发生未知错误: ${error.message}` 
    });
  }
});

module.exports = router;