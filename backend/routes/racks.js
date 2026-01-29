const express = require('express');
const router = express.Router();
const Rack = require('../models/Rack');
const Device = require('../models/Device');
const Room = require('../models/Room');
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

    // 获取总记录数
    const total = await Rack.count();
    
    // 获取分页数据
    const racks = await Rack.findAll({
      include: [
        { model: Room },
        { model: Device }
      ],
      limit: pageSize,
      offset: offset
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

// 获取单个机柜
router.get('/:rackId', async (req, res) => {
  try {
    const rack = await Rack.findByPk(req.params.rackId, {
      include: [
        { model: Room },
        { model: Device }
      ]
    });
    if (!rack) {
      return res.status(404).json({ error: '机柜不存在' });
    }
    res.json(rack);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建机柜
router.post('/', validateBody(createRackSchema), async (req, res) => {
  try {
    const rack = await Rack.create(req.body);
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
          { model: Room },
          { model: Device }
        ]
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

// 导出机柜导入模板
router.get('/import-template', async (req, res) => {
  try {
    // 准备模板数据
    const templateData = [
      {
        '机柜ID': 'RACK001',
        '机柜名称': '测试机柜1',
        '所属机房名称': '测试机房1',
        '高度(U)': 42,
        '最大功率(W)': 5000,
        '状态': 'active'
      },
      {
        '机柜ID': 'RACK002',
        '机柜名称': '测试机柜2',
        '所属机房名称': '测试机房1',
        '高度(U)': 42,
        '最大功率(W)': 3000,
        '状态': 'maintenance'
      }
    ];
    
    // 设置CSV标题（包含格式说明）
    const headers = [
      { id: '机柜ID', title: '机柜ID' },
      { id: '机柜名称', title: '机柜名称' },
      { id: '所属机房名称', title: '所属机房名称' },
      { id: '高度(U)', title: '高度(U)' },
      { id: '最大功率(W)', title: '最大功率(W)' },
      { id: '状态', title: '状态(active/maintenance/inactive)' }
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

// 导入机柜数据
router.post('/import', async (req, res) => {
  try {
    // 检查是否有上传文件
    if (!req.files || !req.files.file) {
      return res.status(400).json({ 
        success: false, 
        message: '没有上传文件',
        error: '没有找到有效的上传文件，请选择一个Excel文件后重试' 
      });
    }

    const file = req.files.file;
    
    // 保存临时文件
    const tempFilePath = path.join(__dirname, '../temp', `${Date.now()}_${file.name}`);
    try {
      await file.mv(tempFilePath);
    } catch (saveError) {
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
        return res.status(400).json({ 
          success: false, 
          message: '文件解析失败',
          error: `无法解析Excel文件: ${readError.message}` 
        });
      }
      
      // 获取第一个工作表
      if (!workbook.SheetNames.length) {
        return res.status(400).json({ 
          success: false, 
          message: '文件格式错误',
          error: 'Excel文件中没有找到工作表' 
        });
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // 转换为JSON格式
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: ['rackId', 'name', 'roomName', 'height', 'maxPower', 'status'],
        range: 1, // 从第2行开始读取数据
        blankrows: false // 跳过空行
      });

      if (jsonData.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: '没有找到有效数据',
          error: 'Excel文件中没有找到可导入的数据行' 
        });
      }

      // 验证数据
      const validStatuses = ['active', 'maintenance', 'inactive'];
      const validationResults = [];
      
      // 获取所有有效的机房信息（名称到ID的映射）
      const allRooms = await Room.findAll();
      const roomNameToIdMap = new Map(allRooms.map(room => [room.name, room.roomId]));
      const validRoomNames = new Set(roomNameToIdMap.keys());
      
      jsonData.forEach((item, index) => {
        const rowNumber = index + 2; // 实际行号（加1是因为从0开始，加1是因为跳过了标题行）
        const errors = [];
        
        if (!item.rackId || item.rackId.trim() === '') {
          errors.push('机柜ID不能为空');
        }
        
        if (!item.name || item.name.trim() === '') {
          errors.push('机柜名称不能为空');
        }
        
        if (!item.roomName || item.roomName.trim() === '') {
          errors.push('所属机房名称不能为空');
        } else if (!validRoomNames.has(item.roomName.trim())) {
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
          validationResults.push({
            row: rowNumber,
            data: item,
            errors: errors
          });
        }
      });

      if (validationResults.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: '数据验证失败',
          error: `${validationResults.length} 行数据格式错误`,
          details: validationResults
        });
      }

      // 批量创建机柜
      let createdCount = 0;
      let duplicateCount = 0;
      
      try {
        // 检查重复的机柜ID
        const existingRacks = await Rack.findAll({
          where: {
            rackId: jsonData.map(item => item.rackId)
          }
        });
        
        const existingIds = new Set(existingRacks.map(rack => rack.rackId));
        const newData = jsonData.filter(item => !existingIds.has(item.rackId));
        const duplicateData = jsonData.filter(item => existingIds.has(item.rackId));
        
        duplicateCount = duplicateData.length;
        
        // 将roomName转换为roomId
        const dataWithRoomId = jsonData.map(item => {
          const trimmedRoomName = item.roomName.trim();
          return {
            ...item,
            roomId: roomNameToIdMap.get(trimmedRoomName),
            roomName: undefined // 移除不需要的字段
          };
        });
        
        // 只创建新的机柜
        if (newData.length > 0) {
          const dataToCreate = dataWithRoomId.filter(item => 
            jsonData.map(d => d.rackId).includes(item.rackId) &&
            !existingIds.has(item.rackId)
          );
          
          const result = await Rack.bulkCreate(dataToCreate, {
            ignoreDuplicates: true // 忽略重复的机柜ID
          });
          createdCount = result.length;
        }
      } catch (dbError) {
        return res.status(500).json({ 
          success: false, 
          message: '数据库操作失败',
          error: `保存机柜数据失败: ${dbError.message}` 
        });
      }

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
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误',
      error: `导入过程中发生未知错误: ${error.message}` 
    });
  }
});

module.exports = router;