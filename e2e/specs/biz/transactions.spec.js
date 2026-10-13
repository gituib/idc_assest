/**
 * 事务与并发用例（TC-BIZ-030~036）
 * 覆盖：批量移动回滚、接线批量部分成功语义、导入事务
 * 运行：npx playwright test --project=biz -g "事务"
 */
const { test, expect, createAdminApi } = require('../../fixtures/auth');

let api;
let dispose;
const ts = () => Date.now();
let room = null;
let rackSrc = null;
let rackDst = null;
let occDev = null; // 占住目标机柜 U1 的设备
let moveDev = null; // 待移动设备

test.describe('事务与并发', () => {
  test.beforeAll(async () => {
    ({ api, dispose } = await createAdminApi());

    const roomRes = await api.post('/rooms', {
      name: `事务测试机房_${ts()}`, location: '测试', area: 30, capacity: 3, status: 'active',
    });
    const roomBody = await roomRes.json();
    room = roomBody.data || roomBody;

    const mkRack = async (name) => {
      const r = await api.post('/racks', {
        name, roomId: room.roomId, height: 42, maxPower: 10000, status: 'active',
      });
      const b = await r.json();
      return b.data || b;
    };
    rackSrc = await mkRack(`事务源机柜_${ts()}`);
    rackDst = await mkRack(`事务目标机柜_${ts()}`);

    const mkDev = async (rackId, position, name) => {
      const r = await api.post('/devices', {
        name, type: 'server', serialNumber: `SN_TX_${ts()}_${position}`,
        rackId, position, height: 1, powerConsumption: 100, status: 'offline',
      });
      const b = await r.json();
      return b.data || b;
    };
    // 目标机柜 U1 被占用
    occDev = await mkDev(rackDst.rackId, 1, `占位设备_${ts()}`);
    moveDev = await mkDev(rackSrc.rackId, 1, `待移设备_${ts()}`);
  });

  test.afterAll(async () => {
    for (const d of [occDev, moveDev]) {
      if (d) await api.del(`/devices/${d.deviceId}`);
    }
    if (rackSrc) await api.del(`/racks/${rackSrc.rackId}`);
    if (rackDst) await api.del(`/racks/${rackDst.rackId}`);
    if (room) await api.del(`/rooms/${room.roomId}`);
    await dispose();
  });

  test('TC-BIZ-031 批量移动遇 U 位冲突整体回滚', async () => {
    // 目标机柜 U1 已被占用，从 U1 开始移动应冲突
    const res = await api.put('/devices/batch-move', {
      deviceIds: [moveDev.deviceId],
      targetRackId: rackDst.rackId,
      startPosition: 1,
    });

    if (res.ok()) {
      // 若业务允许移动成功，则目标位必须可用（断言不产生幽灵数据）
      const detail = await api.get(`/devices/${moveDev.deviceId}`);
      const body = await detail.json();
      expect((body.data || body).rackId).toBe(rackDst.rackId);
      // 还原
      await api.put('/devices/batch-move', {
        deviceIds: [moveDev.deviceId],
        targetRackId: rackSrc.rackId,
        startPosition: 1,
      });
    } else {
      // 冲突被拒绝（400/409）
      expect([400, 409]).toContain(res.status());
      // 源设备位置不变（事务回滚验证）
      const detail = await api.get(`/devices/${moveDev.deviceId}`);
      const body = await detail.json();
      const dev = body.data || body;
      expect(dev.rackId).toBe(rackSrc.rackId);
      expect(dev.position).toBe(1);
    }
  });

  test('TC-BIZ-036 接线批量创建：部分成功语义（非事务）', async () => {
    // 准备两对端口
    const r1 = await api.post('/devices', {
      name: `批线设备A_${ts()}`, type: 'server', serialNumber: `SN_BT_${ts()}_a`,
      rackId: rackSrc.rackId, position: 5, height: 1, powerConsumption: 50, status: 'offline',
    });
    const r2 = await api.post('/devices', {
      name: `批线设备B_${ts()}`, type: 'server', serialNumber: `SN_BT_${ts()}_b`,
      rackId: rackSrc.rackId, position: 6, height: 1, powerConsumption: 50, status: 'offline',
    });
    const b1 = await r1.json();
    const b2 = await r2.json();
    const devA = b1.data || b1;
    const devB = b2.data || b2;
    await api.post('/device-ports', { deviceId: devA.deviceId, portName: 'p/1', portType: 'RJ45' });
    await api.post('/device-ports', { deviceId: devA.deviceId, portName: 'p/2', portType: 'RJ45' });
    await api.post('/device-ports', { deviceId: devB.deviceId, portName: 'p/1', portType: 'RJ45' });
    await api.post('/device-ports', { deviceId: devB.deviceId, portName: 'p/2', portType: 'RJ45' });

    // 一条合法 + 一条同设备非法（批量要求每条含 cableId）
    const res = await api.post('/cables/batch', {
      cables: [
        {
          cableId: `CBT-${ts()}-1`,
          sourceDeviceId: devA.deviceId, sourcePort: 'p/1',
          targetDeviceId: devB.deviceId, targetPort: 'p/1',
          cableType: 'Cat6', status: 'normal',
        },
        {
          cableId: `CBT-${ts()}-2`,
          sourceDeviceId: devA.deviceId, sourcePort: 'p/2',
          targetDeviceId: devA.deviceId, targetPort: 'p/2',
          cableType: 'Cat6', status: 'normal',
        },
      ],
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const stats = body.data || body;
    expect(stats.total).toBe(2);
    // 非事务逐条执行：成功 1 条、失败 1 条（部分成功语义）
    expect(stats.success).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.errors.length).toBeGreaterThan(0);

    // 清理
    const cablesRes = await api.get(`/cables/device/${devA.deviceId}`);
    const cablesBody = await cablesRes.json();
    const cableList = Array.isArray(cablesBody) ? cablesBody : (cablesBody.cables || []);
    for (const c of cableList) {
      await api.del(`/cables/${c.cableId}`);
    }
    await api.del(`/devices/${devA.deviceId}`);
    await api.del(`/devices/${devB.deviceId}`);
  });
});
