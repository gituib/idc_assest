const { sequelize } = require('../db');
const OperationLog = require('../models/OperationLog');
const {
  logOperation,
  logDeviceOperation,
  logUserOperation,
  logRoleOperation,
} = require('../utils/operationLogger');

describe('operationLogger 工具函数测试', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await OperationLog.destroy({ where: {} });
  });

  describe('logOperation 基础函数', () => {
    test('应该能够记录基本操作日志', async () => {
      const mockReq = {
        user: {
          userId: 'user_test_001',
          realName: '测试用户',
          roleName: '管理员',
        },
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
      };

      await logOperation({
        module: 'device',
        operationType: 'create',
        operationDescription: '测试创建设备',
        targetId: 'DEV_TEST_001',
        targetName: '测试设备',
        beforeState: null,
        afterState: { name: '测试设备', status: 'running' },
        result: 'success',
        req: mockReq,
      });

      const logs = await OperationLog.findAll({
        where: { targetId: 'DEV_TEST_001' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].module).toBe('device');
      expect(logs[0].operationType).toBe('create');
      expect(logs[0].operationDescription).toBe('测试创建设备');
      expect(logs[0].targetId).toBe('DEV_TEST_001');
      expect(logs[0].targetName).toBe('测试设备');
      expect(logs[0].operatorId).toBe('user_test_001');
      expect(logs[0].operatorName).toBe('测试用户');
      expect(logs[0].operatorRole).toBe('管理员');
      expect(logs[0].ipAddress).toBe('192.168.1.100');
      expect(logs[0].userAgent).toBe('Mozilla/5.0 Test Browser');
      expect(logs[0].result).toBe('success');
    });

    test('应该能够处理没有用户信息的请求', async () => {
      const mockReq = {
        user: null,
        headers: {},
      };

      await logOperation({
        module: 'system',
        operationType: 'batch_update',
        operationDescription: '系统批量更新',
        targetId: 'SYSTEM',
        targetName: '系统',
        result: 'success',
        req: mockReq,
      });

      const logs = await OperationLog.findAll({
        where: { targetId: 'SYSTEM' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].operatorId).toBe('system');
      expect(logs[0].operatorName).toBe('系统');
    });

    test('应该能够处理没有请求对象的场景', async () => {
      await logOperation({
        module: 'device',
        operationType: 'update',
        operationDescription: '无请求更新',
        targetId: 'DEV_NO_REQ',
        targetName: '无请求设备',
        result: 'success',
        req: null,
      });

      const logs = await OperationLog.findAll({
        where: { targetId: 'DEV_NO_REQ' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].ipAddress).toBeNull();
      expect(logs[0].userAgent).toBeNull();
    });

    test('应该能够记录失败的操作', async () => {
      const mockReq = {
        user: { userId: 'user_fail', realName: '失败用户' },
        headers: {},
      };

      await logOperation({
        module: 'device',
        operationType: 'delete',
        operationDescription: '删除设备失败',
        targetId: 'DEV_FAIL',
        targetName: '失败设备',
        result: 'failed',
        req: mockReq,
        metadata: { errorMessage: '设备不存在' },
      });

      const logs = await OperationLog.findAll({
        where: { targetId: 'DEV_FAIL' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].result).toBe('failed');
    });

    test('应该使用提供的 metadata', async () => {
      const mockReq = {
        user: { userId: 'user_meta', realName: '元数据用户' },
        headers: {},
      };

      const customMetadata = {
        batchCount: 10,
        source: 'import',
        duration: 5000,
      };

      await logOperation({
        module: 'device',
        operationType: 'batch_update',
        operationDescription: '批量更新设备',
        targetId: 'DEV_BATCH',
        targetName: '批量设备',
        result: 'success',
        req: mockReq,
        metadata: customMetadata,
      });

      const logs = await OperationLog.findAll({
        where: { targetId: 'DEV_BATCH' },
      });

      expect(logs[0].metadata).toEqual(customMetadata);
    });
  });

  describe('logDeviceOperation 设备操作日志', () => {
    test('应该记录设备创建日志', async () => {
      const mockReq = {
        user: { userId: 'user_dev', realName: '设备管理员' },
        headers: { 'x-forwarded-for': '10.0.0.1' },
      };

      await logDeviceOperation('create', '创建设备 测试服务器 (DEV001)', {
        targetId: 'DEV001',
        targetName: '测试服务器',
        afterState: { deviceId: 'DEV001', name: '测试服务器', status: 'running' },
        req: mockReq,
      });

      const logs = await OperationLog.findAll({
        where: { module: 'device', operationType: 'create' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].module).toBe('device');
      expect(logs[0].operationType).toBe('create');
      expect(logs[0].targetId).toBe('DEV001');
      expect(logs[0].targetName).toBe('测试服务器');
    });

    test('应该记录设备更新日志并包含状态变更', async () => {
      const mockReq = {
        user: { userId: 'user_upd', realName: '更新操作员' },
        headers: {},
      };

      const beforeState = { name: '旧名称', status: 'offline' };
      const afterState = { name: '新名称', status: 'running' };

      await logDeviceOperation('update', '更新设备 DEV002', {
        targetId: 'DEV002',
        targetName: 'DEV002',
        beforeState,
        afterState,
        req: mockReq,
      });

      const logs = await OperationLog.findAll({
        where: { targetId: 'DEV002', operationType: 'update' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].beforeState).toEqual(beforeState);
      expect(logs[0].afterState).toEqual(afterState);
    });

    test('应该记录设备删除日志', async () => {
      const mockReq = {
        user: { userId: 'user_del', realName: '删除操作员' },
        headers: {},
      };

      await logDeviceOperation('delete', '删除设备 DEV003 (测试服务器)', {
        targetId: 'DEV003',
        targetName: '测试服务器',
        beforeState: { deviceId: 'DEV003', name: '测试服务器' },
        req: mockReq,
      });

      const logs = await OperationLog.findAll({
        where: { targetId: 'DEV003', operationType: 'delete' },
      });

      expect(logs.length).toBe(1);
    });

    test('应该记录批量删除日志', async () => {
      const mockReq = {
        user: { userId: 'user_batch', realName: '批量操作员' },
        headers: {},
      };

      await logDeviceOperation('batch_delete', '批量删除设备 3台 (DEV_A,DEV_B,DEV_C)', {
        targetId: 'DEV_A,DEV_B,DEV_C',
        targetName: '3台设备',
        beforeState: [
          { deviceId: 'DEV_A', name: '设备A' },
          { deviceId: 'DEV_B', name: '设备B' },
          { deviceId: 'DEV_C', name: '设备C' },
        ],
        req: mockReq,
        metadata: { count: 3 },
      });

      const logs = await OperationLog.findAll({
        where: { operationType: 'batch_delete' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].metadata.count).toBe(3);
    });

    test('应该记录状态变更日志', async () => {
      const mockReq = {
        user: { userId: 'user_status', realName: '状态管理员' },
        headers: {},
      };

      await logDeviceOperation('status_change', '批量变更设备状态为"运行中"', {
        targetId: 'DEV_STATUS_1,DEV_STATUS_2',
        targetName: '2台设备',
        beforeState: [
          { deviceId: 'DEV_STATUS_1', status: 'offline' },
          { deviceId: 'DEV_STATUS_2', status: 'maintenance' },
        ],
        afterState: [
          { deviceId: 'DEV_STATUS_1', status: 'running' },
          { deviceId: 'DEV_STATUS_2', status: 'running' },
        ],
        req: mockReq,
        metadata: { status: 'running', count: 2 },
      });

      const logs = await OperationLog.findAll({
        where: { operationType: 'status_change' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].metadata.status).toBe('running');
    });
  });

  describe('logUserOperation 用户操作日志', () => {
    test('应该记录用户创建日志', async () => {
      const mockReq = {
        user: { userId: 'admin', realName: '系统管理员' },
        headers: {},
      };

      await logUserOperation('create', '创建用户 new_user', {
        targetId: 'user_new',
        targetName: 'new_user',
        afterState: { username: 'new_user', email: 'new@example.com' },
        req: mockReq,
        metadata: { roleIds: ['role_admin'] },
      });

      const logs = await OperationLog.findAll({
        where: { module: 'user', operationType: 'create' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].module).toBe('user');
      expect(logs[0].targetName).toBe('new_user');
    });

    test('应该记录权限变更日志', async () => {
      const mockReq = {
        user: { userId: 'admin', realName: '管理员' },
        headers: {},
      };

      await logUserOperation('permission_change', '变更用户 test_user 的角色', {
        targetId: 'user_test',
        targetName: 'test_user',
        beforeState: { roleIds: ['role_viewer'] },
        afterState: { roleIds: ['role_admin'] },
        req: mockReq,
        metadata: { oldRoleIds: ['role_viewer'], newRoleIds: ['role_admin'] },
      });

      const logs = await OperationLog.findAll({
        where: { operationType: 'permission_change' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].metadata.oldRoleIds).toEqual(['role_viewer']);
      expect(logs[0].metadata.newRoleIds).toEqual(['role_admin']);
    });

    test('应该记录用户删除日志', async () => {
      const mockReq = {
        user: { userId: 'admin', realName: '管理员' },
        headers: {},
      };

      await logUserOperation('delete', '删除用户 deleted_user', {
        targetId: 'user_deleted',
        targetName: 'deleted_user',
        beforeState: { username: 'deleted_user', email: 'deleted@example.com' },
        req: mockReq,
      });

      const logs = await OperationLog.findAll({
        where: { module: 'user', operationType: 'delete' },
      });

      expect(logs.length).toBe(1);
    });
  });

  describe('logRoleOperation 角色操作日志', () => {
    test('应该记录角色创建日志', async () => {
      const mockReq = {
        user: { userId: 'admin', realName: '管理员' },
        headers: {},
      };

      await logRoleOperation('create', '创建角色 测试角色', {
        targetId: 'role_test',
        targetName: '测试角色',
        afterState: { roleName: '测试角色', permissions: ['read', 'write'] },
        req: mockReq,
        metadata: { roleCode: 'test_role', permissions: ['read', 'write'] },
      });

      const logs = await OperationLog.findAll({
        where: { module: 'role', operationType: 'create' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].targetName).toBe('测试角色');
      expect(logs[0].metadata.roleCode).toBe('test_role');
    });

    test('应该记录角色更新日志', async () => {
      const mockReq = {
        user: { userId: 'admin', realName: '管理员' },
        headers: {},
      };

      const beforeState = { roleName: '旧角色', permissions: ['read'] };
      const afterState = { roleName: '新角色', permissions: ['read', 'write', 'delete'] };

      await logRoleOperation('update', '更新角色 角色A', {
        targetId: 'role_a',
        targetName: '角色A',
        beforeState,
        afterState,
        req: mockReq,
        metadata: { oldRoleName: '旧角色', oldPermissions: ['read'] },
      });

      const logs = await OperationLog.findAll({
        where: { module: 'role', operationType: 'update' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].beforeState.roleName).toBe('旧角色');
      expect(logs[0].afterState.roleName).toBe('新角色');
    });

    test('应该记录角色删除日志', async () => {
      const mockReq = {
        user: { userId: 'admin', realName: '管理员' },
        headers: {},
      };

      await logRoleOperation('delete', '删除角色 测试角色B', {
        targetId: 'role_b',
        targetName: '测试角色B',
        beforeState: { roleName: '测试角色B', userCount: 0 },
        req: mockReq,
        metadata: { userCount: 0 },
      });

      const logs = await OperationLog.findAll({
        where: { module: 'role', operationType: 'delete' },
      });

      expect(logs.length).toBe(1);
      expect(logs[0].metadata.userCount).toBe(0);
    });
  });
});
