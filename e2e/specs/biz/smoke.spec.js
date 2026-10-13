/**
 * 业务规则专项用例（模板）
 * 覆盖：删除保护矩阵（机房/机柜/仓库）、端口接线一致性
 * 运行：npx playwright test --project=biz
 */
const { test, expect } = require('../../fixtures/auth');

test.describe('冒烟：删除保护矩阵', () => {
  test('TC-BIZ-001 机房下有机柜禁止删除', async ({ adminApi }) => {
    // 1. 建机房
    const roomRes = await adminApi.post('/rooms', {
      name: `测试机房_${Date.now()}`, location: 'A区', area: 100, capacity: 10, status: 'active',
    });
    expect([200, 201]).toContain(roomRes.status());
    const roomBody = await roomRes.json();
    const roomId = roomBody.data?.roomId || roomBody.roomId || roomBody.data?.id;

    // 2. 机房下建机柜
    const rackRes = await adminApi.post('/racks', {
      name: `测试机柜_${Date.now()}`, roomId, height: 42, maxPower: 10000, status: 'active',
    });
    expect([200, 201]).toContain(rackRes.status());

    // 3. 含机柜的机房删除应被拒绝
    const delRes = await adminApi.del(`/rooms/${roomId}`);
    expect(delRes.status()).toBe(400);
    const delBody = await delRes.json();
    expect(JSON.stringify(delBody)).toContain('机柜');

    // 清理：先删机柜再删机房
    const rackBody = await rackRes.json();
    const rackId = rackBody.data?.rackId || rackBody.rackId || rackBody.data?.id;
    await adminApi.del(`/racks/${rackId}`);
    await adminApi.del(`/rooms/${roomId}`);
  });

  test('TC-BIZ-002 机柜下有设备禁止删除', async ({ adminApi }) => {
    // 1. 建机房 + 机柜
    const roomRes = await adminApi.post('/rooms', {
      name: `删除保护机房_${Date.now()}`, location: 'B区', area: 50, capacity: 5, status: 'active',
    });
    const roomBody = await roomRes.json();
    const roomId = roomBody.data?.roomId || roomBody.roomId || roomBody.data?.id;

    const rackRes = await adminApi.post('/racks', {
      name: `删除保护机柜_${Date.now()}`, roomId, height: 42, maxPower: 10000, status: 'active',
    });
    const rackBody = await rackRes.json();
    const rackId = rackBody.data?.rackId || rackBody.rackId || rackBody.data?.id;

    // 2. 机柜内建设备
    const devRes = await adminApi.post('/devices', {
      name: `删除保护设备_${Date.now()}`,
      type: 'server',
      serialNumber: `SN_BIZ_${Date.now()}`,
      rackId,
      position: 1,
      height: 1,
      powerConsumption: 500,
      status: 'offline',
    });
    expect([200, 201]).toContain(devRes.status());
    const devBody = await devRes.json();
    const deviceId = devBody.data?.deviceId || devBody.deviceId || devBody.data?.id;

    // 3. 含设备的机柜删除应被拒绝
    const delRes = await adminApi.del(`/racks/${rackId}`);
    expect(delRes.status()).toBe(400);

    // 清理
    await adminApi.del(`/devices/${deviceId}`);
    await adminApi.del(`/racks/${rackId}`);
    await adminApi.del(`/rooms/${roomId}`);
  });
});
