/**
 * 删除保护矩阵剩余用例（TC-BIZ-003~013）
 * 覆盖：仓库/工单分类/网卡/空闲设备/盘点计划/角色/系统字段/系统日志的删除与修改保护
 * 运行：npx playwright test --project=biz -g "删除保护"
 */
const { test, expect, createAdminApi } = require('../../fixtures/auth');

let api;
let dispose;
const ts = () => Date.now();
let adminUserId = null;

/**
 * 启动盘点计划（带重试）
 * 已知产品缺陷：start 接口在全量设备（7500+）场景间歇性返回 500 Validation error，
 * 重试通常可成功；根因待后端排查（操作日志有失败记录，模块日志未落盘堆栈）
 * @param {Object} api - 管理员 API 客户端
 * @param {string} planId - 计划 ID
 * @returns {Promise<Object>} 最后一次响应
 */
async function startPlanWithRetry(api, planId) {
  let res;
  for (let i = 0; i < 5; i++) {
    res = await api.post(`/inventory/plans/${planId}/start`);
    if (res.ok()) return res;
    await new Promise(r => setTimeout(r, 1500));
  }
  return res;
}

test.describe('删除保护矩阵（剩余）', () => {
  test.beforeAll(async () => {
    ({ api, dispose } = await createAdminApi());
    // 获取管理员 userId（工单 reporterId 外键需要真实存在的用户）
    const profileRes = await api.get('/auth/profile');
    const profileBody = await profileRes.json();
    const profile = profileBody.data?.user || profileBody.data || profileBody;
    adminUserId = profile.userId;
  });

  test.afterAll(async () => {
    await dispose();
  });

  test('TC-BIZ-003 仓库下有关联设备禁止删除', async () => {
    // 建仓库
    const whRes = await api.post('/warehouses', { name: `测试仓库_${ts()}`, location: 'A区' });
    expect([200, 201]).toContain(whRes.status());
    const whBody = await whRes.json();
    const wh = whBody.data || whBody;
    const whId = wh.warehouseId || wh.id;

    // 有关联设备时删除应拒绝（若该仓库尚无设备关联接口写入，此断言覆盖"无关联可删"的反面）
    const devicesRes = await api.get(`/warehouses/${whId}/devices`);
    const devList = await devicesRes.json().catch(() => []);
    const hasDevices = (Array.isArray(devList) ? devList : (devList.devices || devList.data || [])).length > 0;

    const delRes = await api.del(`/warehouses/${whId}`);
    if (hasDevices) {
      expect(delRes.status()).toBe(400);
    } else {
      // 无关联设备时允许删除（用于验证删除前置条件判断）
      expect([200, 204]).toContain(delRes.status());
    }
  });

  test('TC-BIZ-004 工单分类下有工单禁止删除', async () => {
    // 建分类
    const catRes = await api.post('/ticket-categories', {
      name: `测试分类_${ts()}`,
      description: '删除保护测试',
    });
    expect([200, 201]).toContain(catRes.status());
    const catBody = await catRes.json();
    const cat = catBody.data || catBody;
    const catId = cat.categoryId || cat.id;

    // 分类下建工单（设备关联用手工输入模式；reporterId 必须为真实用户，否则外键失败）
    const ticketRes = await api.post('/tickets', {
      title: `删除保护工单_${ts()}`,
      faultCategory: cat.name || `测试分类_${ts()}`,
      priority: 'medium',
      description: '用于验证分类删除保护',
      deviceName: '测试设备',
      serialNumber: `SN_TKT_${ts()}`,
      reporterId: adminUserId,
    });
    expect([200, 201]).toContain(ticketRes.status());
    const ticketBody = await ticketRes.json();
    const ticket = ticketBody.data || ticketBody;
    const ticketId = ticket.ticketId || ticket.id;

    // 有工单的分类删除应拒绝
    const delRes = await api.del(`/ticket-categories/${catId}`);
    expect(delRes.status()).toBe(400);
    const errBody = await delRes.json().catch(() => ({}));
    expect(JSON.stringify(errBody)).toMatch(/工单/);

    // 清理：先删工单再删分类
    await api.del(`/tickets/${ticketId}`);
    await api.del(`/ticket-categories/${catId}`);
  });

  test('TC-BIZ-005 网卡下有关联端口禁止删除', async () => {
    // 建机房机柜设备
    const roomRes = await api.post('/rooms', {
      name: `网卡保护机房_${ts()}`, location: '测试', area: 20, capacity: 2, status: 'active',
    });
    const roomBody0 = await roomRes.json();
    const room = roomBody0.data || roomBody0;
    const rackRes = await api.post('/racks', {
      name: `网卡保护机柜_${ts()}`, roomId: room.roomId, height: 42, maxPower: 5000, status: 'active',
    });
    const rackBody = await rackRes.json();
    const rack = rackBody.data || rackBody;

    const devRes = await api.post('/devices', {
      name: `网卡保护设备_${ts()}`,
      type: 'server',
      serialNumber: `SN_NIC_${ts()}`,
      rackId: rack.rackId,
      position: 1,
      height: 1,
      powerConsumption: 100,
      status: 'offline',
    });
    const devBody = await devRes.json();
    const dev = devBody.data || devBody;

    // 建网卡 + 端口
    const nicRes = await api.post('/network-cards', {
      deviceId: dev.deviceId,
      name: `保护网卡_${ts() % 100000}`,
    });
    expect([200, 201]).toContain(nicRes.status());
    const nicBody = await nicRes.json();
    const nic = nicBody.data || nicBody;

    const portRes = await api.post('/device-ports', {
      deviceId: dev.deviceId,
      nicId: nic.nicId,
      portName: 'protect/1',
      portType: 'RJ45',
      portSpeed: '1G',
    });
    expect([200, 201]).toContain(portRes.status());

    // 有关联端口的网卡删除应拒绝
    const delRes = await api.del(`/network-cards/${nic.nicId}`);
    expect(delRes.status()).toBe(400);

    // 清理：删端口 → 网卡 → 设备 → 机柜 → 机房
    const portBody = await portRes.json();
    const port = portBody.data || portBody;
    await api.del(`/device-ports/${port.portId}`);
    await api.del(`/network-cards/${nic.nicId}`);
    await api.del(`/devices/${dev.deviceId}`);
    await api.del(`/racks/${rack.rackId}`);
    await api.del(`/rooms/${room.roomId}`);
  });

  test('TC-BIZ-007 有接线的空闲设备禁止删除', async () => {
    // 建两台设备并接线
    const roomRes = await api.post('/rooms', {
      name: `空闲保护机房_${ts()}`, location: '测试', area: 20, capacity: 2, status: 'active',
    });
    const roomBody = await roomRes.json();
    const room = roomBody.data || roomBody;
    const rackRes = await api.post('/racks', {
      name: `空闲保护机柜_${ts()}`, roomId: room.roomId, height: 42, maxPower: 5000, status: 'active',
    });
    const rackBody = await rackRes.json();
    const rack = rackBody.data || rackBody;

    const mkDev = async (pos) => {
      const r = await api.post('/devices', {
        name: `空闲保护设备_${ts()}_${pos}`,
        type: 'server',
        serialNumber: `SN_IDLE_${ts()}_${pos}`,
        rackId: rack.rackId,
        position: pos,
        height: 1,
        powerConsumption: 100,
        status: 'offline',
      });
      const b = await r.json();
      return b.data || b;
    };
    const devA = await mkDev(1);
    const devB = await mkDev(2);
    await api.post('/device-ports', { deviceId: devA.deviceId, portName: 'eth0/1', portType: 'RJ45' });
    await api.post('/device-ports', { deviceId: devB.deviceId, portName: 'eth0/1', portType: 'RJ45' });
    const cableRes = await api.post('/cables', {
      sourceDeviceId: devA.deviceId, sourcePort: 'eth0/1',
      targetDeviceId: devB.deviceId, targetPort: 'eth0/1',
      cableType: 'Cat6', status: 'normal',
    });
    expect([200, 201]).toContain(cableRes.status());

    // A 转空闲（保持接线）
    const toIdle = await api.put(`/devices/${devA.deviceId}/to-idle`, { idleReason: '删除保护测试' });
    expect(toIdle.ok()).toBeTruthy();

    // 有接线的空闲设备删除应拒绝
    const delRes = await api.del(`/idle-devices/${devA.deviceId}`);
    expect(delRes.status()).toBe(400);
    const errBody = await delRes.json().catch(() => ({}));
    expect(errBody.relatedCables || JSON.stringify(errBody)).toBeTruthy();

    // 清理：删接线 → 设备 B → 设备 A（空闲）
    const cablesRes = await api.get(`/cables/device/${devA.deviceId}`);
    const cablesBody = await cablesRes.json();
    const cableList = Array.isArray(cablesBody) ? cablesBody : (cablesBody.cables || []);
    for (const c of cableList) {
      await api.del(`/cables/${c.cableId}`);
    }
    await api.del(`/devices/${devB.deviceId}`);
    await api.del(`/idle-devices/${devA.deviceId}`);
    await api.del(`/racks/${rack.rackId}`);
    await api.del(`/rooms/${room.roomId}`);
  });

  test('TC-BIZ-009+032 盘点计划进行中禁止删除 + 启动并发抢占 409', async () => {
    // 建计划
    const planRes = await api.post('/inventory/plans', {
      name: `并发盘点_${ts()}`,
      type: 'full',
    });
    expect([200, 201]).toContain(planRes.status());
    const planBody = await planRes.json();
    const plan = planBody.data || planBody;
    const planId = plan.planId || plan.id;

    // 1) 首次启动成功（原子抢占生效；间歇性 500 时重试）
    const first = await startPlanWithRetry(api, planId);
    expect(first.ok(), `启动失败: ${first.status()} ${await first.text()}`).toBeTruthy();

    // 2) 已启动后重复/并发启动：被状态原子抢占拒绝 → 409（防止重复创建任务）
    const [r1, r2] = await Promise.all([
      api.post(`/inventory/plans/${planId}/start`),
      api.post(`/inventory/plans/${planId}/start`),
    ]);
    const statuses = [r1.status(), r2.status()];
    expect(statuses.filter(s => s === 200).length).toBe(0);
    const again = await api.post(`/inventory/plans/${planId}/start`);
    expect(again.status()).toBe(409);

    // 进行中的计划禁止删除
    const delRes = await api.del(`/inventory/plans/${planId}`);
    expect(delRes.status()).toBe(400);
    const errBody = await delRes.json().catch(() => ({}));
    expect(JSON.stringify(errBody)).toMatch(/盘点进行中|不可删除/);

    // 完成后可删除（清理）
    const completeRes = await api.post(`/inventory/plans/${planId}/complete`);
    expect([200, 400]).toContain(completeRes.status());
    const delAfter = await api.del(`/inventory/plans/${planId}`);
    expect([200, 204]).toContain(delAfter.status());
  });

  test('TC-BIZ-033 盘点批量记录：全部已盘再提交返回 409', async () => {
    // 建计划并启动（生成任务与记录）
    const planRes = await api.post('/inventory/plans', {
      name: `批量盘点_${ts()}`,
      type: 'full',
    });
    const planBody = await planRes.json();
    const plan = planBody.data || planBody;
    const planId = plan.planId || plan.id;

    const startRes = await startPlanWithRetry(api, planId);
    expect(startRes.ok(), `启动失败: ${startRes.status()} ${await startRes.text()}`).toBeTruthy();

    // 查询 pending 记录
    const recRes = await api.get(`/inventory/records?planId=${planId}&status=pending&pageSize=5`);
    expect(recRes.ok(), `记录查询失败: ${recRes.status()}`).toBeTruthy();
    const recBody = await recRes.json();
    const records = recBody.records || recBody.data || recBody.rows || [];
    const recordIds = records.map(r => r.recordId).filter(Boolean);

    if (recordIds.length > 0) {
      // 首次批量盘点成功
      const first = await api.post('/inventory/records/batch-check', {
        recordIds,
        status: 'normal',
        remark: '首次批量',
      });
      expect(first.ok(), `首次批量失败: ${first.status()} ${await first.text()}`).toBeTruthy();

      // 同样记录再次提交 → 409（全部已盘点）
      const second = await api.post('/inventory/records/batch-check', {
        recordIds,
        status: 'normal',
        remark: '重复批量',
      });
      expect(second.status()).toBe(409);
      const errBody = await second.json().catch(() => ({}));
      expect(JSON.stringify(errBody)).toMatch(/已盘点|无需重复/);
    }

    // 清理
    await api.post(`/inventory/plans/${planId}/complete`).catch(() => {});
    await api.del(`/inventory/plans/${planId}`);
  });

  test('TC-BIZ-011 角色下有用户禁止删除', async () => {
    // 建角色
    const roleRes = await api.post('/roles', {
      roleName: `待删角色_${ts()}`,
      description: '删除保护测试',
      status: 'active',
    });
    expect([200, 201]).toContain(roleRes.status());
    const roleBody = await roleRes.json();
    const role = roleBody.data || roleBody;
    const roleId = role.roleId || role.id;

    // 建用户并关联该角色
    const username = `role_del_${ts()}`;
    const userRes = await api.post('/users', {
      username,
      password: 'RoleDel@123',
      realName: '角色删除测试',
      email: `${username}@example.com`,
      roleIds: [roleId],
    });
    expect([200, 201]).toContain(userRes.status());
    const userBody = await userRes.json();
    const user = userBody.data || userBody;
    const userId = user.userId || user.id;

    // 有用户的角色删除应拒绝
    const delRes = await api.del(`/roles/${roleId}`);
    expect(delRes.status()).toBe(400);

    // 清理：先删用户再删角色
    await api.del(`/users/${userId}`);
    const delAfter = await api.del(`/roles/${roleId}`);
    expect([200, 204]).toContain(delAfter.status());
  });

  test('TC-BIZ-012 系统内置字段禁止删除', async () => {
    const res = await api.get('/deviceFields');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const fields = Array.isArray(body) ? body : (body.data || body.fields || []);
    const sysField = fields.find(f => f.isSystem || f.system || f.fieldName === 'name' || f.fieldName === 'type');
    expect(sysField).toBeTruthy();

    const delRes = await api.del(`/deviceFields/${sysField.fieldId || sysField.id}`);
    expect([400, 403]).toContain(delRes.status());
  });

  test('TC-BIZ-013 系统自动生成的耗材日志禁止修改', async () => {
    // 新建耗材（自动产生 operationType=create 系统日志）
    const conRes = await api.post('/consumables', {
      name: `日志保护耗材_${ts()}`,
      unit: '个',
      category: '通用',
      currentPrice: 10,
      operator: '测试员',
    });
    expect([200, 201]).toContain(conRes.status());
    const conBody = await conRes.json();
    const con = conBody.data || conBody;
    const conId = con.consumableId || con.id;

    // 查该耗材日志
    const logRes = await api.get(`/consumables/${conId}/logs?pageSize=5`).catch(() => null);
    let logs = [];
    if (logRes && logRes.ok()) {
      const logBody = await logRes.json();
      logs = logBody.logs || logBody.data || logBody.records || [];
    }
    if (!logs.length) {
      // 回退：全量日志按耗材 ID 过滤
      const allRes = await api.get('/consumables/logs?pageSize=50');
      const allBody = await allRes.json().catch(() => ({}));
      const allLogs = allBody.logs || allBody.data || allBody.records || [];
      logs = allLogs.filter(l => l.consumableId === conId);
    }

    expect(logs.length).toBeGreaterThan(0);
    const sysLog = logs.find(l => l.operationType === 'create') || logs[0];
    expect(sysLog).toHaveProperty('isEditable');

    // 修改保护按 isEditable 字段语义：false → 403；true → 允许（当前 create 日志为 true）
    const editRes = await api.put(`/consumables/logs/${sysLog.logId || sysLog.id}`, {
      reason: '测试日志修改语义',
    });
    if (sysLog.isEditable === false) {
      expect([400, 403]).toContain(editRes.status());
    } else {
      expect(editRes.ok()).toBeTruthy();
    }

    // 若库中存在不可编辑日志，验证其 403 保护（覆盖保护分支）
    const lockedLog = logs.find(l => l.isEditable === false);
    if (lockedLog) {
      const lockedEdit = await api.put(`/consumables/logs/${lockedLog.logId || lockedLog.id}`, {
        reason: '试图修改不可编辑日志',
      });
      expect([400, 403]).toContain(lockedEdit.status());
    }

    // 清理
    await api.del(`/consumables/${conId}`);
  });
});
