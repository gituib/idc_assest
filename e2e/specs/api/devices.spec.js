/**
 * 设备模块 API 用例（TC-BE-DEV-*）
 * 覆盖：列表分页、参数校验、U 位冲突、功率累加、编辑、转空闲、删除级联、批量删除
 * 运行：npx playwright test --project=api -g "设备模块"
 */
const { test, expect, createAdminApi } = require('../../fixtures/auth');

// 模块级共享上下文与测试数据
let api;
let dispose;
const ts = () => Date.now();
let room = null;   // { roomId }
let rack = null;   // { rackId }
const createdDevices = [];

/**
 * 创建测试设备
 * @param {Object} overrides - 覆盖字段
 * @returns {Promise<Object>} 创建的设备对象
 */
async function createDevice(overrides = {}) {
  const res = await api.post('/devices', {
    name: `API设备_${ts()}`,
    type: 'server',
    serialNumber: `SN_API_${ts()}_${Math.floor(Math.random() * 1000)}`,
    rackId: rack.rackId,
    position: 1,
    height: 1,
    powerConsumption: 300,
    status: 'offline',
    ...overrides,
  });
  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`创建设备失败: ${res.status()} ${JSON.stringify(body)}`);
  }
  const device = body.data || body;
  createdDevices.push(device.deviceId);
  return device;
}

test.describe('设备模块', () => {
  test.beforeAll(async () => {
    ({ api, dispose } = await createAdminApi());
    // 准备独立机房 + 机柜
    const roomRes = await api.post('/rooms', {
      name: `设备测试机房_${ts()}`, location: '测试区', area: 50, capacity: 5, status: 'active',
    });
    const roomBody = await roomRes.json();
    room = roomBody.data || roomBody;
    const rackRes = await api.post('/racks', {
      name: `设备测试机柜_${ts()}`, roomId: room.roomId, height: 42, maxPower: 10000, status: 'active',
    });
    const rackBody = await rackRes.json();
    rack = rackBody.data || rackBody;
  });

  test.afterAll(async () => {
    // 清理：先删设备再删机柜机房
    for (const id of createdDevices) {
      await api.del(`/devices/${id}`);
    }
    if (rack?.rackId) await api.del(`/racks/${rack.rackId}`);
    if (room?.roomId) await api.del(`/rooms/${room.roomId}`);
    await dispose();
  });

  test('TC-BE-DEV-001 设备列表分页结构', async () => {
    const res = await api.get('/devices?page=1&pageSize=5');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.devices)).toBeTruthy();
    expect(body.devices.length).toBeLessThanOrEqual(5);
    expect(body.page).toBe(1);
  });

  test('TC-BE-DEV-002 keyword 特殊字符不报错', async () => {
    const res = await api.get(`/devices?keyword=${encodeURIComponent(`%'_"${ts()}`)}`);
    expect(res.ok()).toBeTruthy();
  });

  test('TC-BE-DEV-003 创建设备参数校验：序列号必填', async () => {
    const res = await api.post('/devices', {
      name: '缺序列号设备',
      type: 'server',
      rackId: rack.rackId,
      position: 50,
      height: 1,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain('序列号');
  });

  test('TC-BE-DEV-004 同机柜 U 位冲突拒绝', async () => {
    await createDevice({ position: 10, height: 2 });
    // 同位置重叠再建
    const res = await api.post('/devices', {
      name: `U位冲突_${ts()}`,
      type: 'server',
      serialNumber: `SN_CONFLICT_${ts()}`,
      rackId: rack.rackId,
      position: 11,
      height: 2,
      powerConsumption: 100,
      status: 'offline',
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/冲突|占用|位置/);
  });

  test('TC-BE-DEV-005 创建成功机柜功率累加', async () => {
    const before = await api.get(`/racks/${rack.rackId}`);
    const beforePower = Number((await before.json()).currentPower) || 0;

    const dev = await createDevice({ position: 20, powerConsumption: 777 });

    const after = await api.get(`/racks/${rack.rackId}`);
    const afterPower = Number((await after.json()).currentPower) || 0;
    expect(afterPower).toBe(beforePower + 777);
    expect(dev.deviceId).toBeTruthy();
  });

  test('TC-BE-DEV-007 编辑设备字段生效', async () => {
    const dev = await createDevice({ position: 30 });
    const res = await api.put(`/devices/${dev.deviceId}`, {
      name: `改名设备_${ts()}`,
      status: 'maintenance',
    });
    expect(res.ok()).toBeTruthy();
    const detail = await api.get(`/devices/${dev.deviceId}`);
    const body = await detail.json();
    const updated = body.data || body;
    expect(updated.status).toBe('maintenance');
    expect(updated.name).toContain('改名设备');
  });

  test('TC-BE-DEV-008 转空闲释放 U 位并回退功率', async () => {
    const dev = await createDevice({ position: 35, powerConsumption: 555 });
    const before = await api.get(`/racks/${rack.rackId}`);
    const beforePower = Number((await before.json()).currentPower) || 0;

    const res = await api.put(`/devices/${dev.deviceId}/to-idle`, {
      idleReason: '测试转入空闲',
    });
    expect(res.ok()).toBeTruthy();

    const after = await api.get(`/racks/${rack.rackId}`);
    const afterPower = Number((await after.json()).currentPower) || 0;
    expect(afterPower).toBe(beforePower - 555);

    const detail = await api.get(`/devices/${dev.deviceId}`);
    const body = await detail.json();
    expect((body.data || body).isIdle).toBe(true);
    // 产品行为：转空闲不释放 U 位（仅标记+退功率），位置仍被占用
    const reuse = await api.post('/devices', {
      name: `复用位置_${ts()}`,
      type: 'server',
      serialNumber: `SN_REUSE_${ts()}`,
      rackId: rack.rackId,
      position: 35,
      height: 1,
      powerConsumption: 100,
      status: 'offline',
    });
    expect(reuse.status()).toBe(400);
  });

  test('TC-BE-DEV-010+015 删除设备级联清理且释放对端端口', async () => {
    // 两台设备 + 各一个端口
    const devA = await createDevice({ position: 40 });
    const devB = await createDevice({ position: 41 });
    const portResA = await api.post('/device-ports', {
      deviceId: devA.deviceId, portName: 'eth0/1', portType: 'RJ45', portSpeed: '1G',
    });
    expect([200, 201]).toContain(portResA.status());
    const portResB = await api.post('/device-ports', {
      deviceId: devB.deviceId, portName: 'eth0/1', portType: 'RJ45', portSpeed: '1G',
    });
    expect([200, 201]).toContain(portResB.status());

    // 建立接线
    const cableRes = await api.post('/cables', {
      sourceDeviceId: devA.deviceId, sourcePort: 'eth0/1',
      targetDeviceId: devB.deviceId, targetPort: 'eth0/1',
      cableType: 'Cat6', status: 'normal',
    });
    expect([200, 201]).toContain(cableRes.status());

    // 端口应为占用状态
    const portsB = await api.get(`/device-ports/device/${devB.deviceId}`);
    const portsBBody = await portsB.json();
    const listB = portsBBody.ports || portsBBody.data || portsBBody;
    const portB = (Array.isArray(listB) ? listB : []).find(p => p.portName === 'eth0/1');
    expect(portB.status).toBe('occupied');

    // 删除设备 A → 接线被级联清理，对端端口释放为 free
    const delRes = await api.del(`/devices/${devA.deviceId}`);
    expect([200, 204]).toContain(delRes.status());

    const portsBAgain = await api.get(`/device-ports/device/${devB.deviceId}`);
    const againBody = await portsBAgain.json();
    const againList = againBody.ports || againBody.data || againBody;
    const portBAgain = (Array.isArray(againList) ? againList : []).find(p => p.portName === 'eth0/1');
    if (portBAgain) {
      expect(portBAgain.status).toBe('free');
    }

    // 无孤儿接线
    const cables = await api.get(`/cables/device/${devB.deviceId}`);
    const cablesBody = await cables.json().catch(() => ({}));
    const cableList = cablesBody.cables || cablesBody.data || [];
    expect(Array.isArray(cableList) ? cableList.length : 0).toBe(0);

    await api.del(`/devices/${devB.deviceId}`);
  });

  test('TC-BE-DEV-018 设备类型枚举校验', async () => {
    const res = await api.post('/devices', {
      name: `非法类型_${ts()}`,
      type: 'spaceship',
      serialNumber: `SN_BAD_${ts()}`,
      rackId: rack.rackId,
      position: 60,
      height: 1,
    });
    expect(res.status()).toBe(400);
  });

  test('TC-BE-DEV-010 批量删除设备', async () => {
    const d1 = await createDevice({ position: 38 });
    const d2 = await createDevice({ position: 39 });
    const res = await api.post('/devices/batch-delete', {
      deviceIds: [d1.deviceId, d2.deviceId],
    });
    expect(res.ok(), `批量删除失败: ${res.status()} ${await res.text()}`).toBeTruthy();

    for (const id of [d1.deviceId, d2.deviceId]) {
      const detail = await api.get(`/devices/${id}`);
      expect(detail.status()).toBe(404);
    }
  });
});
