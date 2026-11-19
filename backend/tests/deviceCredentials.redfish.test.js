/**
 * Redfish 凭据「测试连接」接口回归测试
 *
 * 背景（已修复的 bug）：
 *   protocol=redfish 的凭据在测试连接时误走了 SSH 厂商自动探测（detectVendor），
 *   redfish 不在 ssh/snmp/telnet 分支中，落入 SSH 逐个尝试 huawei/h3c/cisco/ruijie
 *   驱动后全部失败，必然抛「无法自动识别设备厂商，请在凭据中手动指定 vendor」。
 *   而 Redfish 驱动本身是协议级、厂商无关的（vendor 由采集时从 BMC 的 Manufacturer
 *   自动识别），根本不需要用户指定 vendor。
 *
 * 本测试锁定修复行为：
 *   1. protocol=redfish 的凭据测试直接走 RedfishDriver.test()，成功/失败都正确返回；
 *   2. 不调用 detectVendor（不依赖 vendor）；
 *   3. 传给 RedfishDriver 的是解密后的凭据（host/username/password）；
 *   4. 测试结果写回凭据的 testStatus/testMessage。
 */
process.env.JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';
process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqlite';
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../db');
const User = require('../models/User');
const Room = require('../models/Room');
const Rack = require('../models/Rack');
const Device = require('../models/Device');
const DeviceCredential = require('../models/DeviceCredential');
const { encrypt } = require('../utils/crypto');

// mock 权限中间件（工厂函数）：测试聚焦路由逻辑，不建角色权限数据
jest.mock('../middleware/requirePermission', () => () => (req, res, next) => next());

// mock RedfishDriver：避免真实网络请求；记录构造参数（校验解密）与 test 调用
const mockRedfishConstructorArgs = [];
const mockRedfishTest = jest.fn();
jest.mock('../services/serverDiscovery/drivers/redfish', () =>
  jest.fn().mockImplementation((credential) => {
    mockRedfishConstructorArgs.push(credential);
    return { test: (...args) => mockRedfishTest(...args) };
  })
);

// mock detectVendor：redfish 协议下不应被调用，一旦调用立即抛错定位问题
const mockDetectVendor = jest.fn(async () => {
  throw new Error('detectVendor 不应被调用（redfish 协议不走 SSH 厂商探测）');
});
jest.mock('../services/portDiscovery', () => ({
  ...jest.requireActual('../services/portDiscovery'),
  detectVendor: (...args) => mockDetectVendor(...args),
}));

const credentialsRouter = require('../routes/deviceCredentials');

const JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';

// 与 middleware/auth.js 保持一致：HS256 算法、固定 iss/aud、tokenVersion 声明
function makeToken(userId, username) {
  return jwt.sign(
    { userId, username, roleId: 'ROLE_USER', tokenVersion: 0 },
    JWT_SECRET,
    {
      expiresIn: '1h',
      algorithm: 'HS256',
      issuer: 'idc-asset-system',
      audience: 'idc-asset-system',
    }
  );
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/device-credentials', credentialsRouter);
  return app;
}

describe('Redfish 凭据测试连接（/api/device-credentials/:id/test）', () => {
  let app;
  let token;
  let credentialId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const user = await User.create({
      userId: 'USR_REDFISH_TEST',
      username: 'redfish_tester',
      password: 'hashed-password-placeholder',
      email: 'redfish-tester@example.com',
      emailVerified: true,
      status: 'active',
    });
    token = makeToken(user.userId, user.username);

    const room = await Room.create({ name: '测试机房', location: '一层', area: 50, capacity: 10 });
    const rack = await Rack.create({ name: 'T-01', height: 42, maxPower: 5, roomId: room.roomId });
    const device = await Device.create({
      name: 'SRV-REDFISH-01',
      type: 'server',
      model: 'PowerEdge R750',
      serialNumber: 'SN-REDFISH-001',
      rackId: rack.rackId,
      position: 1,
      ipAddress: '10.0.0.100',
      status: 'running',
      description: 'Redfish 测试设备',
      powerConsumption: 0,
      isIdle: false,
    });

    // 关键：protocol=redfish 且不配置 vendor（Redfish 驱动协议级、厂商无关）
    const cred = await DeviceCredential.create({
      credentialId: 'DCRE_REDFISH_TEST',
      deviceId: device.deviceId,
      protocol: 'redfish',
      host: '10.0.0.100',
      port: 443,
      username: 'admin',
      password: encrypt('bmc-pass'),
      vendor: null,
    });
    credentialId = cred.credentialId;
    app = createApp();
  }, 30000);

  beforeEach(() => {
    mockRedfishTest.mockReset();
    mockDetectVendor.mockClear();
    mockRedfishConstructorArgs.length = 0;
  });

  it('测试成功：走 RedfishDriver.test()，不再报「无法自动识别设备厂商」', async () => {
    mockRedfishTest.mockResolvedValue({ ok: true, message: 'Redfish 连通成功（Dell BMC）' });

    const res = await request(app)
      .post(`/api/device-credentials/${credentialId}/test`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Redfish 连通成功（Dell BMC）');

    // 走了 Redfish 测试链路，且没有触发 SSH 厂商自动探测
    expect(mockRedfishTest).toHaveBeenCalledTimes(1);
    expect(mockDetectVendor).not.toHaveBeenCalled();

    // 传给 RedfishDriver 的是解密后的凭据（Basic Auth 需要明文）
    expect(mockRedfishConstructorArgs).toHaveLength(1);
    expect(mockRedfishConstructorArgs[0]).toMatchObject({
      host: '10.0.0.100',
      username: 'admin',
      password: 'bmc-pass',
    });

    // 测试结果写回凭据
    const updated = await DeviceCredential.findByPk(credentialId);
    expect(updated.testStatus).toBe('success');
    expect(updated.testMessage).toBe('Redfish 连通成功（Dell BMC）');
    expect(updated.lastTestedAt).not.toBeNull();
  });

  it('测试失败：返回 Redfish 驱动的错误信息（如认证失败），testStatus=failed', async () => {
    mockRedfishTest.mockResolvedValue({ ok: false, message: 'Redfish 请求失败: /redfish/v1 → HTTP 401' });

    const res = await request(app)
      .post(`/api/device-credentials/${credentialId}/test`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Redfish 请求失败: /redfish/v1 → HTTP 401');
    expect(mockDetectVendor).not.toHaveBeenCalled();

    const updated = await DeviceCredential.findByPk(credentialId);
    expect(updated.testStatus).toBe('failed');
    expect(updated.testMessage).toBe('Redfish 请求失败: /redfish/v1 → HTTP 401');
  });

  it('凭据不存在时返回 404', async () => {
    const res = await request(app)
      .post('/api/device-credentials/DCRE_NOT_EXIST/test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(mockRedfishTest).not.toHaveBeenCalled();
  });
});
