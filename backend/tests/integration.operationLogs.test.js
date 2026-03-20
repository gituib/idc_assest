const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { sequelize } = require('../db');
const OperationLog = require('../models/OperationLog');
const Device = require('../models/Device');
const Rack = require('../models/Rack');
const Room = require('../models/Room');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('设备/用户/角色操作日志集成测试', () => {
  let app;
  let authToken;
  let adminUser;
  let testRack;
  let testRoom;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    adminUser = await User.create({
      userId: 'admin_int_test',
      username: 'admin',
      password: '$2a$10$test',
      realName: '管理员',
      status: 'active'
    });

    testRoom = await Room.create({
      roomId: 'ROOM_INT_TEST',
      name: '测试机房',
      location: '测试位置',
      status: 'active'
    });

    testRack = await Rack.create({
      rackId: 'RACK_INT_TEST',
      name: '测试机柜',
      roomId: testRoom.roomId,
      totalPower: 10000,
      currentPower: 0,
      totalUnits: 48,
      usedUnits: 0,
      status: 'active'
    });

    app = createTestApp();
    authToken = jwt.sign(
      { userId: adminUser.userId, username: adminUser.username, realName: adminUser.realName, roleName: '管理员' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  afterEach(async () => {
    await OperationLog.destroy({ where: {} });
    await Device.destroy({ where: {} });
  });

  const createTestApp = () => {
    const app = express();
    app.use(bodyParser.json());

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

    const devicesRouter = require('../routes/devices');
    const usersRouter = require('../routes/users');
    const rolesRouter = require('../routes/roles');

    app.use('/api/devices', authMiddleware, devicesRouter);
    app.use('/api/users', authMiddleware, usersRouter);
    app.use('/api/roles', authMiddleware, rolesRouter);

    return app;
  };

  describe('设备操作日志记录', () => {
    test('创建设备应该记录操作日志', async () => {
      const deviceData = {
        name: '集成测试设备',
        deviceId: `DEV_INT_${Date.now()}`,
        type: 'server',
        rackId: testRack.rackId,
        position: 1,
        height: 2,
        powerConsumption: 500,
        status: 'running'
      };

      const response = await request(app)
        .post('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(201);

      expect(response.body.name).toBe(deviceData.name);

      const logs = await OperationLog.findAll({
        where: {
          module: 'device',
          operationType: 'create',
          targetId: response.body.deviceId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].operationDescription).toContain('创建设备');
      expect(logs[0].operatorId).toBe(adminUser.userId);
      expect(logs[0].result).toBe('success');
    });

    test('更新设备应该记录操作日志', async () => {
      const device = await Device.create({
        deviceId: `DEV_UPD_INT_${Date.now()}`,
        name: '更新前设备',
        type: 'server',
        rackId: testRack.rackId,
        position: 5,
        height: 2,
        powerConsumption: 500,
        status: 'offline'
      });

      const response = await request(app)
        .put(`/api/devices/${device.deviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '更新后设备', status: 'running' })
        .expect(200);

      expect(response.body.name).toBe('更新后设备');

      const logs = await OperationLog.findAll({
        where: {
          module: 'device',
          operationType: 'update',
          targetId: device.deviceId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].beforeState.name).toBe('更新前设备');
      expect(logs[0].afterState.name).toBe('更新后设备');
    });

    test('删除设备应该记录操作日志', async () => {
      const device = await Device.create({
        deviceId: `DEV_DEL_INT_${Date.now()}`,
        name: '待删除设备',
        type: 'server',
        rackId: testRack.rackId,
        position: 10,
        height: 2,
        powerConsumption: 500,
        status: 'running'
      });

      await request(app)
        .delete(`/api/devices/${device.deviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const logs = await OperationLog.findAll({
        where: {
          module: 'device',
          operationType: 'delete',
          targetId: device.deviceId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].beforeState.name).toBe('待删除设备');
    });

    test('批量删除设备应该记录操作日志', async () => {
      const device1 = await Device.create({
        deviceId: `DEV_BATCH1_${Date.now()}`,
        name: '批量设备1',
        type: 'server',
        rackId: testRack.rackId,
        position: 15,
        height: 2,
        powerConsumption: 500,
        status: 'running'
      });

      const device2 = await Device.create({
        deviceId: `DEV_BATCH2_${Date.now()}`,
        name: '批量设备2',
        type: 'server',
        rackId: testRack.rackId,
        position: 20,
        height: 2,
        powerConsumption: 500,
        status: 'running'
      });

      const response = await request(app)
        .post('/api/devices/batch-delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deviceIds: [device1.deviceId, device2.deviceId] })
        .expect(200);

      const logs = await OperationLog.findAll({
        where: { operationType: 'batch_delete' }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].metadata.count).toBe(2);
    });

    test('批量变更设备状态应该记录操作日志', async () => {
      const device1 = await Device.create({
        deviceId: `DEV_STAT1_${Date.now()}`,
        name: '状态设备1',
        type: 'server',
        rackId: testRack.rackId,
        position: 25,
        height: 2,
        powerConsumption: 500,
        status: 'offline'
      });

      const device2 = await Device.create({
        deviceId: `DEV_STAT2_${Date.now()}`,
        name: '状态设备2',
        type: 'server',
        rackId: testRack.rackId,
        position: 30,
        height: 2,
        powerConsumption: 500,
        status: 'offline'
      });

      const response = await request(app)
        .put('/api/devices/batch-status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deviceIds: [device1.deviceId, device2.deviceId], status: 'running' })
        .expect(200);

      const logs = await OperationLog.findAll({
        where: { operationType: 'status_change' }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].metadata.status).toBe('running');
      expect(logs[0].metadata.count).toBe(2);
    });
  });

  describe('用户操作日志记录', () => {
    let testRole;

    beforeAll(async () => {
      testRole = await Role.create({
        roleId: `ROLE_INT_TEST_${Date.now()}`,
        roleName: '测试角色',
        roleCode: `test_role_${Date.now()}`,
        permissions: ['read', 'write'],
        status: 'active'
      });
    });

    test('创建用户应该记录操作日志', async () => {
      const userData = {
        username: `int_test_user_${Date.now()}`,
        password: 'Password123!',
        realName: '集成测试用户',
        email: `test_${Date.now()}@example.com`,
        roleIds: [testRole.roleId]
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      const logs = await OperationLog.findAll({
        where: {
          module: 'user',
          operationType: 'create',
          targetName: userData.username
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].operationDescription).toContain(`创建用户 ${userData.username}`);
      expect(logs[0].metadata.roleIds).toContain(testRole.roleId);

      await User.destroy({ where: { userId: response.body.userId } });
    });

    test('更新用户应该记录操作日志', async () => {
      const user = await User.create({
        userId: `USER_UPD_INT_${Date.now()}`,
        username: `old_name_${Date.now()}`,
        password: 'Password123!',
        realName: '旧名称用户',
        email: `old_${Date.now()}@example.com`,
        status: 'active'
      });

      const response = await request(app)
        .put(`/api/users/${user.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ realName: '新名称用户' })
        .expect(200);

      const logs = await OperationLog.findAll({
        where: {
          module: 'user',
          operationType: 'update',
          targetId: user.userId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].beforeState.realName).toBe('旧名称用户');
      expect(logs[0].afterState.realName).toBe('新名称用户');

      await User.destroy({ where: { userId: user.userId } });
    });

    test('变更用户角色应该记录权限变更日志', async () => {
      const user = await User.create({
        userId: `USER_ROLE_INT_${Date.now()}`,
        username: `role_test_${Date.now()}`,
        password: 'Password123!',
        realName: '角色测试用户',
        email: `role_${Date.now()}@example.com`,
        status: 'active'
      });

      const newRole = await Role.create({
        roleId: `ROLE_NEW_INT_${Date.now()}`,
        roleName: '新测试角色',
        roleCode: `new_role_${Date.now()}`,
        permissions: ['admin'],
        status: 'active'
      });

      await UserRole.create({
        UserId: user.userId,
        RoleId: testRole.roleId
      });

      const response = await request(app)
        .put(`/api/users/${user.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roleIds: [newRole.roleId] })
        .expect(200);

      const logs = await OperationLog.findAll({
        where: {
          module: 'user',
          operationType: 'permission_change',
          targetId: user.userId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].metadata.oldRoleIds).toContain(testRole.roleId);
      expect(logs[0].metadata.newRoleIds).toContain(newRole.roleId);

      await UserRole.destroy({ where: { UserId: user.userId } });
      await User.destroy({ where: { userId: user.userId } });
      await Role.destroy({ where: { roleId: newRole.roleId } });
    });

    test('删除用户应该记录操作日志', async () => {
      const user = await User.create({
        userId: `USER_DEL_INT_${Date.now()}`,
        username: `del_test_${Date.now()}`,
        password: 'Password123!',
        realName: '删除测试用户',
        email: `del_${Date.now()}@example.com`,
        status: 'active'
      });

      await request(app)
        .delete(`/api/users/${user.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const logs = await OperationLog.findAll({
        where: {
          module: 'user',
          operationType: 'delete',
          targetId: user.userId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].beforeState.username).toBe(user.username);
    });
  });

  describe('角色操作日志记录', () => {
    test('创建角色应该记录操作日志', async () => {
      const roleData = {
        roleName: `集成测试角色_${Date.now()}`,
        roleCode: `int_test_role_${Date.now()}`,
        description: '集成测试用角色',
        permissions: ['read', 'write'],
        status: 'active'
      };

      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roleData)
        .expect(201);

      const logs = await OperationLog.findAll({
        where: {
          module: 'role',
          operationType: 'create',
          targetId: response.body.roleId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].operationDescription).toContain(`创建角色 ${roleData.roleName}`);
      expect(logs[0].metadata.roleCode).toBe(roleData.roleCode);

      await Role.destroy({ where: { roleId: response.body.roleId } });
    });

    test('更新角色应该记录操作日志', async () => {
      const role = await Role.create({
        roleId: `ROLE_UPD_INT_${Date.now()}`,
        roleName: `旧角色名_${Date.now()}`,
        roleCode: `old_role_${Date.now()}`,
        description: '旧描述',
        permissions: ['read'],
        status: 'active'
      });

      const response = await request(app)
        .put(`/api/roles/${role.roleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roleName: `新角色名_${Date.now()}`,
          permissions: ['read', 'write', 'delete']
        })
        .expect(200);

      const logs = await OperationLog.findAll({
        where: {
          module: 'role',
          operationType: 'update',
          targetId: role.roleId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].beforeState.roleName).toContain('旧角色名');
      expect(logs[0].afterState.roleName).toContain('新角色名');

      await Role.destroy({ where: { roleId: role.roleId } });
    });

    test('删除角色应该记录操作日志', async () => {
      const role = await Role.create({
        roleId: `ROLE_DEL_INT_${Date.now()}`,
        roleName: `待删除角色_${Date.now()}`,
        roleCode: `del_role_${Date.now()}`,
        description: '待删除',
        permissions: ['read'],
        status: 'active'
      });

      await request(app)
        .delete(`/api/roles/${role.roleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const logs = await OperationLog.findAll({
        where: {
          module: 'role',
          operationType: 'delete',
          targetId: role.roleId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].beforeState.roleName).toContain('待删除角色');
    });
  });

  describe('日志查询验证', () => {
    test('通过 API 应该能够查询到刚记录的操作日志', async () => {
      const device = await Device.create({
        deviceId: `DEV_QUERY_INT_${Date.now()}`,
        name: '查询测试设备',
        type: 'server',
        rackId: testRack.rackId,
        position: 40,
        height: 2,
        powerConsumption: 500,
        status: 'running'
      });

      await request(app)
        .put(`/api/devices/${device.deviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'maintenance' })
        .expect(200);

      const logsResponse = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const logs = await OperationLog.findAll({
        where: {
          module: 'device',
          operationType: 'update',
          targetId: device.deviceId
        }
      });

      expect(logs.length).toBe(1);
      expect(logs[0].beforeState.status).toBe('running');
      expect(logs[0].afterState.status).toBe('maintenance');
    });
  });
});
