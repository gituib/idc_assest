const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const OperationLog = require('../models/OperationLog');

describe('OperationLog 模型测试', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await OperationLog.destroy({ where: {} });
  });

  describe('模型定义', () => {
    test('OperationLog 模型应该正确定义', () => {
      expect(OperationLog).toBeDefined();
      expect(typeof OperationLog.create).toBe('function');
      expect(typeof OperationLog.findAll).toBe('function');
      expect(typeof OperationLog.findOne).toBe('function');
    });

    test('模型应该有正确的表名', () => {
      expect(OperationLog.options.tableName).toBe('operation_logs');
    });
  });

  describe('创建日志记录', () => {
    test('应该能够创建基本的操作日志', async () => {
      const logData = {
        recordId: 'OPLOG_TEST_001',
        module: 'device',
        operationType: 'create',
        operationDescription: '创建设备 TEST_SERVER',
        targetId: 'DEV001',
        targetName: 'TEST_SERVER',
        operatorId: 'user_001',
        operatorName: '测试用户',
        operatorRole: '管理员',
        result: 'success'
      };

      const log = await OperationLog.create(logData);

      expect(log.recordId).toBe(logData.recordId);
      expect(log.module).toBe(logData.module);
      expect(log.operationType).toBe(logData.operationType);
      expect(log.operationDescription).toBe(logData.operationDescription);
      expect(log.targetId).toBe(logData.targetId);
      expect(log.targetName).toBe(logData.targetName);
      expect(log.operatorId).toBe(logData.operatorId);
      expect(log.operatorName).toBe(logData.operatorName);
      expect(log.result).toBe(logData.result);
      expect(log.createdAt).toBeDefined();
      expect(log.updatedAt).toBeDefined();
    });

    test('应该能够创建带有 beforeState 和 afterState 的日志', async () => {
      const beforeState = { name: '旧名称', status: 'offline' };
      const afterState = { name: '新名称', status: 'running' };

      const log = await OperationLog.create({
        recordId: 'OPLOG_TEST_002',
        module: 'device',
        operationType: 'update',
        operationDescription: '更新设备 TEST_DEVICE',
        targetId: 'DEV002',
        targetName: 'TEST_DEVICE',
        operatorId: 'user_001',
        operatorName: '测试用户',
        beforeState,
        afterState,
        result: 'success'
      });

      expect(log.beforeState).toEqual(beforeState);
      expect(log.afterState).toEqual(afterState);
    });

    test('应该能够创建带有 metadata 的日志', async () => {
      const metadata = {
        count: 5,
        source: 'batch_operation',
        extraInfo: '额外信息'
      };

      const log = await OperationLog.create({
        recordId: 'OPLOG_TEST_003',
        module: 'device',
        operationType: 'batch_delete',
        operationDescription: '批量删除设备',
        targetId: 'DEV001,DEV002,DEV003',
        targetName: '3台设备',
        operatorId: 'user_001',
        operatorName: '测试用户',
        metadata,
        result: 'success'
      });

      expect(log.metadata).toEqual(metadata);
    });

    test('应该能够创建带有 IP 地址和 UserAgent 的日志', async () => {
      const log = await OperationLog.create({
        recordId: 'OPLOG_TEST_004',
        module: 'user',
        operationType: 'create',
        operationDescription: '创建用户 test_user',
        targetId: 'user_test',
        targetName: 'test_user',
        operatorId: 'admin_user',
        operatorName: '管理员',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        result: 'success'
      });

      expect(log.ipAddress).toBe('192.168.1.100');
      expect(log.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    test('result 字段默认为 success', async () => {
      const log = await OperationLog.create({
        recordId: 'OPLOG_TEST_005',
        module: 'device',
        operationType: 'delete',
        operationDescription: '删除设备',
        targetId: 'DEV005',
        targetName: 'TEST_DEVICE',
        operatorId: 'user_001',
        operatorName: '测试用户'
      });

      expect(log.result).toBe('success');
    });

    test('metadata 字段默认为空对象', async () => {
      const log = await OperationLog.create({
        recordId: 'OPLOG_TEST_006',
        module: 'role',
        operationType: 'create',
        operationDescription: '创建角色',
        targetId: 'role_test',
        targetName: '测试角色',
        operatorId: 'user_001',
        operatorName: '测试用户'
      });

      expect(log.metadata).toEqual({});
    });
  });

  describe('查询日志记录', () => {
    beforeEach(async () => {
      await OperationLog.bulkCreate([
        {
          recordId: 'OPLOG_QUERY_001',
          module: 'device',
          operationType: 'create',
          operationDescription: '创建设备 设备A',
          targetId: 'DEV_A',
          targetName: '设备A',
          operatorId: 'user_001',
          operatorName: '用户A',
          result: 'success'
        },
        {
          recordId: 'OPLOG_QUERY_002',
          module: 'device',
          operationType: 'update',
          operationDescription: '更新设备 设备B',
          targetId: 'DEV_B',
          targetName: '设备B',
          operatorId: 'user_002',
          operatorName: '用户B',
          result: 'success'
        },
        {
          recordId: 'OPLOG_QUERY_003',
          module: 'user',
          operationType: 'create',
          operationDescription: '创建用户 用户C',
          targetId: 'user_C',
          targetName: '用户C',
          operatorId: 'user_001',
          operatorName: '用户A',
          result: 'success'
        },
        {
          recordId: 'OPLOG_QUERY_004',
          module: 'device',
          operationType: 'delete',
          operationDescription: '删除设备 设备D',
          targetId: 'DEV_D',
          targetName: '设备D',
          operatorId: 'user_001',
          operatorName: '用户A',
          result: 'failed'
        }
      ]);
    });

    test('应该能够按 module 查询', async () => {
      const deviceLogs = await OperationLog.findAll({
        where: { module: 'device' }
      });
      expect(deviceLogs.length).toBe(3);
    });

    test('应该能够按 operationType 查询', async () => {
      const createLogs = await OperationLog.findAll({
        where: { operationType: 'create' }
      });
      expect(createLogs.length).toBe(2);
    });

    test('应该能够按 operatorId 查询', async () => {
      const user001Logs = await OperationLog.findAll({
        where: { operatorId: 'user_001' }
      });
      expect(user001Logs.length).toBe(3);
    });

    test('应该能够按 result 查询', async () => {
      const failedLogs = await OperationLog.findAll({
        where: { result: 'failed' }
      });
      expect(failedLogs.length).toBe(1);
    });

    test('应该能够按 targetId 模糊查询', async () => {
      const { Op } = require('sequelize');
      const logs = await OperationLog.findAll({
        where: {
          targetId: { [Op.like]: '%DEV%' }
        }
      });
      expect(logs.length).toBe(3);
    });

    test('应该支持分页查询', async () => {
      const { count, rows } = await OperationLog.findAndCountAll({
        limit: 2,
        offset: 0,
        order: [['createdAt', 'DESC']]
      });
      expect(count).toBe(4);
      expect(rows.length).toBe(2);
    });
  });

  describe('索引测试', () => {
    test('应该有 module 索引', () => {
      const indexes = OperationLog.options.indexes;
      expect(indexes.some(idx => idx.fields.includes('module'))).toBe(true);
    });

    test('应该有 operationType 索引', () => {
      const indexes = OperationLog.options.indexes;
      expect(indexes.some(idx => idx.fields.includes('operationType'))).toBe(true);
    });

    test('应该有 targetId 索引', () => {
      const indexes = OperationLog.options.indexes;
      expect(indexes.some(idx => idx.fields.includes('targetId'))).toBe(true);
    });

    test('应该有 operatorId 索引', () => {
      const indexes = OperationLog.options.indexes;
      expect(indexes.some(idx => idx.fields.includes('operatorId'))).toBe(true);
    });

    test('应该有 createdAt 索引', () => {
      const indexes = OperationLog.options.indexes;
      expect(indexes.some(idx => idx.fields.includes('createdAt'))).toBe(true);
    });
  });
});
