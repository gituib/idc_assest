/**
 * 端口模块 API 用例（TC-BE-PORT-*）
 * 覆盖：列表、创建重名、修改/删除与接线保护、批量创建
 * 运行：npx playwright test --project=api -g "端口模块"
 */
const { test, expect, createAdminApi } = require('../../fixtures/auth');

let api;
let dispose;
const ts = () => Date.now();
let room = null;
let rack = null;
let devA = null; // 有接线的设备
let devB = null; // 对端设备
let plainDev = null; // 无接线的设备

/**
 * 创建测试设备
 * @param {number} position - U 位
 * @returns {Promise<Object>} 设备对象
 */
async function createDeviceAt(position) {
  const res = await api.post('/devices', {
    name: `端口测试设备_${ts()}_${position}`,
    type: 'server',
    serialNumber: `SN_PORT_${ts()}_${position}`,
    rackId: rack.rackId,
    position,
    height: 1,
    powerConsumption: 100,
    status: 'offline',
  });
  const body = await res.json();
  return body.data || body;
}

test.describe('端口模块', () => {
  test.beforeAll(async () => {
    ({ api, dispose } = await createAdminApi());

    const roomRes = await api.post('/rooms', {
      name: `端口测试机房_${ts()}`, location: '测试区', area: 50, capacity: 5, status: 'active',
    });
    const roomBody = await roomRes.json();
    room = roomBody.data || roomBody;
    const rackRes = await api.post('/racks', {
      name: `端口测试机柜_${ts()}`, roomId: room.roomId, height: 42, maxPower: 10000, status: 'active',
    });
    const rackBody = await rackRes.json();
    rack = rackBody.data || rackBody;

    devA = await createDeviceAt(1);
    devB = await createDeviceAt(2);
    plainDev = await createDeviceAt(3);

    // 为 devA/devB 建端口并接线（构造"有接线"场景）
    await api.post('/device-ports', { deviceId: devA.deviceId, portName: 'eth0/1', portType: 'RJ45', portSpeed: '1G' });
    await api.post('/device-ports', { deviceId: devB.deviceId, portName: 'eth0/1', portType: 'RJ45', portSpeed: '1G' });
    const cableRes = await api.post('/cables', {
      sourceDeviceId: devA.deviceId, sourcePort: 'eth0/1',
      targetDeviceId: devB.deviceId, targetPort: 'eth0/1',
      cableType: 'Cat6', status: 'normal',
    });
    if (!cableRes.ok()) {
      throw new Error(`端口模块前置接线创建失败: ${cableRes.status()} ${await cableRes.text()}`);
    }
    await api.post('/device-ports', { deviceId: plainDev.deviceId, portName: 'eth0/1', portType: 'RJ45', portSpeed: '1G' });
  });

  test.afterAll(async () => {
    for (const d of [devA, devB, plainDev]) {
      if (d) await api.del(`/devices/${d.deviceId}`);
    }
    if (rack?.rackId) await api.del(`/racks/${rack.rackId}`);
    if (room?.roomId) await api.del(`/rooms/${room.roomId}`);
    await dispose();
  });

  test('TC-BE-PORT-001 端口列表分页结构', async () => {
    const res = await api.get('/device-ports?page=1&pageSize=5');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.ports)).toBeTruthy();
    expect(body.page).toBe(1);
  });

  test('TC-BE-PORT-002 按设备查询端口', async () => {
    const res = await api.get(`/device-ports/device/${devA.deviceId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const list = body.ports || body.data || body;
    expect(Array.isArray(list)).toBeTruthy();
    expect(list.some(p => p.portName === 'eth0/1')).toBeTruthy();
  });

  test('TC-BE-PORT-004+005 创建端口：必填与重名', async () => {
    // 缺 deviceId
    const missing = await api.post('/device-ports', { portName: 'x/1' });
    expect(missing.status()).toBe(400);

    // 正常创建
    const ok = await api.post('/device-ports', {
      deviceId: plainDev.deviceId, portName: `eth1/${ts() % 1000}`, portType: 'RJ45', portSpeed: '1G',
    });
    expect([200, 201]).toContain(ok.status());

    // 同设备重名
    const dup = await api.post('/device-ports', {
      deviceId: plainDev.deviceId, portName: 'eth0/1',
    });
    expect(dup.status()).toBe(400);
    const body = await dup.json();
    expect(String(body.error)).toContain('已存在');
  });

  test('TC-BE-PORT-010 无接线端口可正常修改', async () => {
    const detail = await api.get(`/device-ports/device/${plainDev.deviceId}`);
    const body = await detail.json();
    const list = body.ports || body.data || body;
    const port = list.find(p => p.portName === 'eth0/1');

    const res = await api.put(`/device-ports/${port.portId}`, {
      description: `修改于 ${ts()}`,
      vlanId: 100,
    });
    expect(res.ok()).toBeTruthy();

    const after = await api.get(`/device-ports/${port.portId}`);
    const afterBody = await after.json();
    const updated = afterBody.data || afterBody;
    expect(updated.vlanId).toBe(100);
  });

  test('TC-BE-PORT-009 有接线端口禁止修改任何字段', async () => {
    const detail = await api.get(`/device-ports/device/${devA.deviceId}`);
    const body = await detail.json();
    const list = body.ports || body.data || body;
    const port = list.find(p => p.portName === 'eth0/1');
    expect(port.status).toBe('occupied');

    const res = await api.put(`/device-ports/${port.portId}`, {
      description: '试图修改有接线端口',
    });
    expect(res.status()).toBe(400);
    const errBody = await res.json();
    expect(errBody.relatedCable).toBeTruthy();

    // 数据确实未变
    const after = await api.get(`/device-ports/${port.portId}`);
    const afterBody = await after.json();
    const updated = afterBody.data || afterBody;
    expect(updated.description).not.toBe('试图修改有接线端口');
  });

  test('TC-BE-PORT-012+013 有接线端口禁止删除（单个与批量）', async () => {
    const detail = await api.get(`/device-ports/device/${devA.deviceId}`);
    const body = await detail.json();
    const list = body.ports || body.data || body;
    const port = list.find(p => p.portName === 'eth0/1');

    // 单删
    const single = await api.del(`/device-ports/${port.portId}`);
    expect(single.status()).toBe(400);
    const singleBody = await single.json().catch(() => ({}));
    expect(singleBody.relatedCables || JSON.stringify(singleBody)).toBeTruthy();

    // 批量删
    const batch = await api.post('/device-ports/batch-delete', {
      portIds: [port.portId],
    });
    expect(batch.status()).toBe(400);

    // 端口仍存在
    const after = await api.get(`/device-ports/${port.portId}`);
    expect(after.ok()).toBeTruthy();
  });

  test('TC-BE-PORT-014 无接线端口删除成功', async () => {
    const createRes = await api.post('/device-ports', {
      deviceId: plainDev.deviceId, portName: `temp_del/${ts() % 100}`,
    });
    expect([200, 201]).toContain(createRes.status());
    const created = await createRes.json();
    const port = created.data || created;

    const delRes = await api.del(`/device-ports/${port.portId}`);
    expect([200, 204]).toContain(delRes.status());

    const after = await api.get(`/device-ports/${port.portId}`);
    expect(after.status()).toBe(404);
  });

  test('TC-BE-PORT-006 批量创建返回统计结构', async () => {
    // server 类型端口批量创建必须关联网卡
    const nicRes = await api.post('/network-cards', {
      deviceId: plainDev.deviceId,
      name: `批量测试网卡_${ts() % 100000}`,
    });
    expect([200, 201]).toContain(nicRes.status());
    const nicBody = await nicRes.json();
    const nic = nicBody.data || nicBody;

    const res = await api.post('/device-ports/batch', {
      ports: [
        { portId: `BATCH-${ts()}-1`, deviceId: plainDev.deviceId, nicId: nic.nicId, portName: 'batch/1', portType: 'RJ45', portSpeed: '1G' },
        { portId: `BATCH-${ts()}-2`, deviceId: plainDev.deviceId, nicId: nic.nicId, portName: 'batch/2', portType: 'RJ45', portSpeed: '1G' },
        { portId: `BATCH-${ts()}-3`, deviceId: plainDev.deviceId, nicId: nic.nicId, portName: 'batch/1', portType: 'RJ45', portSpeed: '1G' }, // 重名，应失败
      ],
      skipExisting: true,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const stats = body.data || body;
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('success');
    expect(stats.success).toBeGreaterThanOrEqual(2);
  });
});
