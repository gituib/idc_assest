process.env.JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';
process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize } = require('../db');
const OperationLog = require('../models/OperationLog');

const JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: '无效的令牌' });
    }
  };

  const operationLogsRouter = express.Router();

  operationLogsRouter.get('/', authMiddleware, async (req, res) => {
    try {
      const {
        page = 1,
        pageSize = 20,
        module,
        operationType,
        targetId,
        operatorId,
        keyword,
        startDate,
        endDate,
        result,
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = Math.min(parseInt(pageSize), 100);

      const where = {};

      if (module && module !== 'all') {
        where.module = module;
      }

      if (operationType && operationType !== 'all') {
        where.operationType = operationType;
      }

      if (targetId) {
        where.targetId = { [Op.like]: `%${targetId}%` };
      }

      if (operatorId) {
        where.operatorId = operatorId;
      }

      if (keyword) {
        where[Op.or] = [
          { operationDescription: { [Op.like]: `%${keyword}%` } },
          { targetName: { [Op.like]: `%${keyword}%` } },
          { operatorName: { [Op.like]: `%${keyword}%` } },
        ];
      }

      if (result && result !== 'all') {
        where.result = result;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          where.createdAt[Op.lte] = endOfDay;
        }
      }

      const { count, rows: logs } = await OperationLog.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        offset,
        limit,
      });

      res.json({
        success: true,
        data: {
          total: count,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          logs,
        },
      });
    } catch (error) {
      console.error('获取操作日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作日志失败',
      });
    }
  });

  operationLogsRouter.get('/:recordId', authMiddleware, async (req, res) => {
    try {
      const log = await OperationLog.findByPk(req.params.recordId);

      if (!log) {
        return res.status(404).json({
          success: false,
          message: '日志记录不存在',
        });
      }

      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      console.error('获取操作日志详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取操作日志详情失败',
      });
    }
  });

  app.use('/api/operation-logs', operationLogsRouter);

  return app;
};

describe('OperationLogs API 路由测试', () => {
  let app;
  let authToken;
  const testUser = {
    userId: 'test_user_001',
    username: 'testuser',
    realName: '测试用户',
    roleName: '管理员',
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    app = createTestApp();
    authToken = jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });
  });

  afterEach(async () => {
    await OperationLog.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const createTestLog = async (data = {}) => {
    const defaultData = {
      recordId: `OPLOG_API_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      module: 'device',
      operationType: 'create',
      operationDescription: '测试日志',
      targetId: 'DEV_TEST',
      targetName: '测试设备',
      operatorId: testUser.userId,
      operatorName: testUser.realName,
      operatorRole: testUser.roleName,
      result: 'success',
    };
    return await OperationLog.create({ ...defaultData, ...data });
  };

  describe('GET /api/operation-logs', () => {
    test('未授权访问应该返回 401', async () => {
      const response = await request(app).get('/api/operation-logs').expect(401);

      expect(response.body.success).toBe(false);
    });

    test('应该能够获取日志列表', async () => {
      await createTestLog({ recordId: 'OPLOG_LST_001' });
      await createTestLog({ recordId: 'OPLOG_LST_002' });

      const response = await request(app)
        .get('/api/operation-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    test('应该支持分页参数', async () => {
      for (let i = 0; i < 15; i++) {
        await createTestLog({ recordId: `OPLOG_PAGE_${i}` });
      }

      const response = await request(app)
        .get('/api/operation-logs')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(10);
      expect(response.body.data.total).toBe(15);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(10);
    });

    test('应该支持按 module 筛选', async () => {
      await createTestLog({ module: 'device', recordId: 'OPLOG_MOD_1' });
      await createTestLog({ module: 'user', recordId: 'OPLOG_MOD_2' });
      await createTestLog({ module: 'role', recordId: 'OPLOG_MOD_3' });

      const response = await request(app)
        .get('/api/operation-logs')
        .query({ module: 'device' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].module).toBe('device');
    });

    test('应该支持按 operationType 筛选', async () => {
      await createTestLog({ operationType: 'create', recordId: 'OPLOG_TYPE_1' });
      await createTestLog({ operationType: 'update', recordId: 'OPLOG_TYPE_2' });
      await createTestLog({ operationType: 'delete', recordId: 'OPLOG_TYPE_3' });

      const response = await request(app)
        .get('/api/operation-logs')
        .query({ operationType: 'create' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].operationType).toBe('create');
    });

    test('应该支持按 keyword 搜索', async () => {
      await createTestLog({
        operationDescription: '创建设备 SERVER_A',
        recordId: 'OPLOG_KW_1',
        targetName: '服务器A',
      });
      await createTestLog({
        operationDescription: '更新设备 SERVER_B',
        recordId: 'OPLOG_KW_2',
        targetName: '服务器B',
      });
      await createTestLog({
        operationDescription: '删除用户 USER_C',
        recordId: 'OPLOG_KW_3',
        targetName: '用户C',
      });

      const response = await request(app)
        .get('/api/operation-logs')
        .query({ keyword: 'SERVER' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.logs).toHaveLength(2);
      expect(
        response.body.data.logs.every(log => log.operationDescription.includes('SERVER'))
      ).toBe(true);
    });

    test('应该支持按 result 筛选', async () => {
      await createTestLog({ result: 'success', recordId: 'OPLOG_RES_1' });
      await createTestLog({ result: 'failed', recordId: 'OPLOG_RES_2' });

      const response = await request(app)
        .get('/api/operation-logs')
        .query({ result: 'failed' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].result).toBe('failed');
    });

    test('应该支持多条件组合筛选', async () => {
      await createTestLog({
        module: 'device',
        operationType: 'create',
        result: 'success',
        recordId: 'OPLOG_COMB_1',
      });
      await createTestLog({
        module: 'device',
        operationType: 'update',
        result: 'success',
        recordId: 'OPLOG_COMB_2',
      });
      await createTestLog({
        module: 'user',
        operationType: 'create',
        result: 'success',
        recordId: 'OPLOG_COMB_3',
      });

      const response = await request(app)
        .get('/api/operation-logs')
        .query({ module: 'device', operationType: 'create' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].module).toBe('device');
      expect(response.body.data.logs[0].operationType).toBe('create');
    });
  });

  describe('GET /api/operation-logs/:recordId', () => {
    test('应该能够获取单个日志详情', async () => {
      const log = await createTestLog({
        recordId: 'OPLOG_DETAIL_001',
        beforeState: { name: '旧名称' },
        afterState: { name: '新名称' },
        metadata: { customField: '自定义值' },
      });

      const response = await request(app)
        .get('/api/operation-logs/OPLOG_DETAIL_001')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recordId).toBe('OPLOG_DETAIL_001');
    });

    test('不存在的日志应该返回 404', async () => {
      const response = await request(app)
        .get('/api/operation-logs/NON_EXISTENT_LOG')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
