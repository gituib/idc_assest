/**
 * Redfish 驱动解析逻辑单元测试
 * - 纯函数测试只依赖 _internal 导出
 * - 末尾的 collect() 编排回归测试用 mock _get 驱动，不依赖网络与数据库
 */
const RedfishDriver = require('../services/serverDiscovery/drivers/redfish');
const {
  detectVendorFromManufacturer,
  parseSystem,
  parseMemoryModules,
  parseDrives,
  parseEthernetPorts,
  parsePhysicalPorts,
  parseNetworkAdapters,
  parseAdapterPort,
  buildResourceCandidates,
  mapPortsToAdapters,
  inferAdapterSpec,
  applyAdapterSpec,
  normalizeMac,
  extractNicIndex,
  formatCapacity,
  enrichResourceError,
} = require('../services/serverDiscovery/drivers/redfish')._internal;

describe('detectVendorFromManufacturer', () => {
  test.each([
    ['Dell Inc.', 'dell'],
    ['HPE', 'hpe'],
    ['Hewlett-Packard', 'hpe'],
    ['Huawei', 'huawei'],
    ['Inspur', 'inspur'],
    ['Supermicro', 'supermicro'],
    ['Lenovo', 'lenovo'],
    ['某小众厂商', 'generic'],
    [null, 'generic'],
    ['', 'generic'],
  ])('%s → %s', (input, expected) => {
    expect(detectVendorFromManufacturer(input)).toBe(expected);
  });
});

describe('parseSystem', () => {
  test('提取厂商/型号/序列号/CPU/内存摘要', () => {
    const sys = {
      Manufacturer: 'Dell Inc.',
      Model: 'PowerEdge R750',
      SerialNumber: 'SN12345',
      PowerState: 'On',
      ProcessorSummary: { Model: 'Intel Xeon Gold 6330', Count: 2 },
      MemorySummary: { TotalSystemMemoryGiB: 512 },
    };
    const hw = parseSystem(sys);
    expect(hw.manufacturer).toBe('Dell Inc.');
    expect(hw.model).toBe('PowerEdge R750');
    expect(hw.serialNumber).toBe('SN12345');
    expect(hw.powerState).toBe('On');
    expect(hw.cpu).toEqual({ model: 'Intel Xeon Gold 6330', count: 2 });
    expect(hw.memorySummary.totalGiB).toBe(512);
  });

  test('缺失字段回退 null，不抛错', () => {
    const hw = parseSystem({});
    expect(hw.manufacturer).toBeNull();
    expect(hw.cpu.model).toBeNull();
    expect(hw.memorySummary.totalGiB).toBeNull();
  });
});

describe('parseMemoryModules', () => {
  test('SizeMiB 换算为 GB，DeviceLocator 作为槽位', () => {
    const members = [
      { DeviceLocator: 'DIMM A1', SizeMiB: 32768, Manufacturer: 'Samsung', PartNumber: 'M393A4K40', SerialNumber: 'MEM001' },
    ];
    const result = parseMemoryModules(members);
    expect(result[0]).toEqual({
      slot: 'DIMM A1',
      size: '32GB',
      manufacturer: 'Samsung',
      partNumber: 'M393A4K40',
      serialNumber: 'MEM001',
    });
  });

  test('CapacityMiB 回退字段可用', () => {
    const members = [{ SocketLocator: 'P1-DIMM1', CapacityMiB: 65536 }];
    const result = parseMemoryModules(members);
    expect(result[0].slot).toBe('P1-DIMM1');
    expect(result[0].size).toBe('64GB');
  });

  test('空列表返回空数组', () => {
    expect(parseMemoryModules([])).toEqual([]);
    expect(parseMemoryModules(null)).toEqual([]);
  });
});

describe('parseDrives', () => {
  test('CapacityBytes 格式化为 GB/TB', () => {
    const drives = [
      { Name: 'Disk 0', Model: 'Samsung PM9A3', CapacityBytes: 1920383410176, MediaType: 'SSD', SerialNumber: 'D001' },
      { Name: 'Disk 1', Model: 'ST12000NM', CapacityBytes: 12000138625024, MediaType: 'HDD', SerialNumber: 'D002' },
    ];
    const result = parseDrives(drives);
    expect(result[0].size).toBe('2TB');
    expect(result[0].mediaType).toBe('SSD');
    expect(result[1].size).toBe('12TB');
  });

  test('容量缺失时 size 为 null', () => {
    const result = parseDrives([{ Name: 'Disk X', Model: 'Unknown' }]);
    expect(result[0].size).toBeNull();
  });
});

describe('parseEthernetPorts', () => {
  test('10G 网口映射为 SFP+ / 10G', () => {
    const members = [{ Id: 'NIC.Embedded.1-1-1', Name: 'Port 1', SpeedMbps: 10000, MACAddress: 'AA:BB:CC:DD:EE:01' }];
    const result = parseEthernetPorts(members);
    expect(result[0]).toMatchObject({
      portName: 'NIC.Embedded.1-1-1',
      portType: 'SFP+',
      portSpeed: '10G',
      status: 'free',
      macAddress: 'AA:BB:CC:DD:EE:01',
    });
  });

  test('1G 网口映射为 RJ45 / 1G', () => {
    const members = [{ Id: 'NIC.Embedded.2-2-1', Name: 'Port 2', SpeedMbps: 1000, MACAddress: 'AA:BB:CC:DD:EE:02' }];
    const result = parseEthernetPorts(members);
    expect(result[0].portType).toBe('RJ45');
    expect(result[0].portSpeed).toBe('1G');
  });

  test('速率缺失时按 1G 兜底', () => {
    const members = [{ Id: 'NIC.1', Name: 'Port X' }];
    const result = parseEthernetPorts(members);
    expect(result[0].portSpeed).toBe('1G');
  });

  test('无名条目跳过', () => {
    expect(parseEthernetPorts([{ MACAddress: 'AA' }, null])).toEqual([]);
  });
});

describe('formatCapacity', () => {
  test.each([
    [1000 * 1e9, '1TB'],
    [500 * 1e9, '500GB'],
    [null, null],
    [-1, null],
    ['abc', null],
  ])('%s → %s', (input, expected) => {
    expect(formatCapacity(input)).toBe(expected);
  });
});

describe('parseAdapterPort（PCIe 网卡端口）', () => {
  test('Dell 风格：Id 带槽位信息，LinkUp → occupied，25G → SFP+', () => {
    const port = {
      Id: 'NIC.Slot.6-1-1',
      PortId: 'dedicated.1',
      LinkStatus: 'LinkUp',
      CurrentLinkSpeedMbps: 25000,
    };
    const result = parseAdapterPort(port, 'NIC.Slot.6-1', null);
    expect(result).toMatchObject({
      portName: 'NIC.Slot.6-1-1',
      portType: 'SFP+',
      portSpeed: '25G',
      status: 'occupied',
    });
  });

  test('LinkDown → free，速率缺失回退 1G', () => {
    const port = { Id: 'NIC.Slot.6-2-1', LinkStatus: 'LinkDown' };
    const result = parseAdapterPort(port, 'NIC.Slot.6-2', null);
    expect(result.status).toBe('free');
    expect(result.portSpeed).toBe('1G');
    expect(result.portType).toBe('RJ45');
  });

  test('Id 缺失时用 adapterId + PortId 拼接，MAC 用 DeviceFunction 反查值', () => {
    const port = { PortId: 'Port 1', SupportedLinkCapabilities: [{ LinkSpeedMbps: 10000 }] };
    const result = parseAdapterPort(port, 'NIC.Integrated.1', 'AA:BB:CC:DD:EE:10');
    expect(result.portName).toBe('NIC.Integrated.1-Port 1');
    expect(result.portSpeed).toBe('10G');
    expect(result.macAddress).toBe('AA:BB:CC:DD:EE:10');
  });

  test('完全无名端口返回 null', () => {
    expect(parseAdapterPort({ LinkStatus: 'LinkUp' }, 'ADP', null)).toBeNull();
    expect(parseAdapterPort(null, 'ADP', null)).toBeNull();
  });
});

describe('parseNetworkAdapters（网卡硬件清单）', () => {
  test('完整字段：型号/序列号/料号/位置 + MAC（来自已展开的 NetworkDeviceFunctions）', () => {
    const adapters = [
      {
        Id: 'NetworkAdapter-0',
        Manufacturer: 'Intel',
        Model: 'Ethernet Controller X710',
        SerialNumber: 'NIC001',
        PartNumber: 'X710-T4L',
        Location: 'PCIE Slot 3',
        __fns: [{ MACAddress: 'AA:BB:CC:DD:EE:01' }, { MACAddress: 'AA:BB:CC:DD:EE:02' }],
        PhysicalPorts: [
          { Name: 'Port 1', MACAddress: 'AA:BB:CC:DD:EE:01', LinkStatus: 'LinkUp' },
          { Name: 'Port 2', MACAddress: 'AA:BB:CC:DD:EE:02', LinkStatus: 'LinkDown' },
        ],
      },
    ];
    const result = parseNetworkAdapters(adapters);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      index: 0,
      id: 'NetworkAdapter-0',
      manufacturer: 'Intel',
      model: 'Ethernet Controller X710',
      serialNumber: 'NIC001',
      partNumber: 'X710-T4L',
      location: 'PCIE Slot 3',
    });
    expect(result[0].macs).toEqual(['AA:BB:CC:DD:EE:01', 'AA:BB:CC:DD:EE:02']);
    expect(result[0].ports).toEqual([
      { name: 'Port 1', macAddress: 'AA:BB:CC:DD:EE:01', linkStatus: 'LinkUp' },
      { name: 'Port 2', macAddress: 'AA:BB:CC:DD:EE:02', linkStatus: 'LinkDown' },
    ]);
  });

  test('index 随数组顺序递增（作为落库关联键）', () => {
    const result = parseNetworkAdapters([{ Model: 'A' }, { Model: 'B' }, { Model: 'C' }]);
    expect(result.map(r => r.index)).toEqual([0, 1, 2]);
  });

  test('缺失字段回退 null，无 PhysicalPorts 时 ports 为空数组', () => {
    const result = parseNetworkAdapters([{ Model: 'Unknown NIC' }]);
    expect(result[0].manufacturer).toBeNull();
    expect(result[0].serialNumber).toBeNull();
    expect(result[0].location).toBeNull();
    expect(result[0].macs).toEqual([]);
    expect(result[0].ports).toEqual([]);
  });

  test('空列表 / null 返回空数组', () => {
    expect(parseNetworkAdapters([])).toEqual([]);
    expect(parseNetworkAdapters(null)).toEqual([]);
  });
});

describe('inferAdapterSpec（从网卡型号推导端口硬件规格）', () => {
  test('Intel X722 10GbE SFP+ → SFP+ / 10G', () => {
    expect(inferAdapterSpec({ model: 'Ethernet Connection X722 for 10GbE SFP+' }))
      .toEqual({ portType: 'SFP+', portSpeed: '10G' });
  });

  test('Intel I350 Gigabit → RJ45 / 1G', () => {
    expect(inferAdapterSpec({ model: 'I350 Gigabit Network Connection' }))
      .toEqual({ portType: 'RJ45', portSpeed: '1G' });
  });

  test('万兆铜口（BASE-T/Cat）判为 RJ45，光口判为 SFP+', () => {
    expect(inferAdapterSpec({ model: 'Intel X550 10GBASE-T' }).portType).toBe('RJ45');
    expect(inferAdapterSpec({ model: 'Intel X710 10GbE SFP+' }).portType).toBe('SFP+');
  });

  test('25G/40G/50G/100G 档位与光口类型', () => {
    expect(inferAdapterSpec({ model: 'Mellanox ConnectX-5 25GbE SFP+' }))
      .toEqual({ portType: 'SFP+', portSpeed: '25G' });
    expect(inferAdapterSpec({ model: 'Mellanox ConnectX-4 40GbE QSFP+' }))
      .toEqual({ portType: 'QSFP+', portSpeed: '40G' });
    expect(inferAdapterSpec({ model: 'Intel E810 50GbE QSFP+' }))
      .toEqual({ portType: 'QSFP+', portSpeed: '50G' });
    expect(inferAdapterSpec({ model: 'NVIDIA BlueField-3 100GbE QSFP28' }))
      .toEqual({ portType: 'QSFP28', portSpeed: '100G' });
  });

  test('速率档位从高到低匹配：100GbE 不被 10GbE 规则截断', () => {
    expect(inferAdapterSpec({ model: 'Dual 100GbE/10GbE NIC' }).portSpeed).toBe('100G');
  });

  test('型号不含速率信息或缺失时返回 null（不臆测）', () => {
    expect(inferAdapterSpec({ model: 'Network Adapter' })).toBeNull();
    expect(inferAdapterSpec({ model: null })).toBeNull();
    expect(inferAdapterSpec({})).toBeNull();
  });
});

describe('applyAdapterSpec（用网卡标称能力校正端口规格）', () => {
  // 真实场景：浪潮 SA5212M5 的 EthernetInterfaces 不返回 SpeedMbps，
  // 导致 X722（10GbE SFP+）端口被兜底标成 RJ45/1G
  const inspurAdapters = [
    { index: 0, model: 'Ethernet Connection X722 for 10GbE SFP+', macs: ['B4:05:5D:C3:D7:42:'] },
    { index: 1, model: 'I350 Gigabit Network Connection', macs: ['80:61:5F:12:B2:02:'] },
  ];

  test('BMC 未报速率时改用网卡标称：X722 端口变 SFP+/10G，I350 保持 RJ45/1G', () => {
    const ports = [
      { portName: 'OutboardNIC0Port0', portType: 'RJ45', portSpeed: '1G', bmcSpeedMbps: null, speedSource: 'unknown', nicRef: '0' },
      { portName: 'OutboardNIC1Port0', portType: 'RJ45', portSpeed: '1G', bmcSpeedMbps: null, speedSource: 'unknown', nicRef: '1' },
    ];
    const result = applyAdapterSpec(ports, inspurAdapters);
    expect(result[0]).toMatchObject({ portType: 'SFP+', portSpeed: '10G', speedSource: 'adapter' });
    expect(result[1]).toMatchObject({ portType: 'RJ45', portSpeed: '1G', speedSource: 'adapter' });
  });

  test('协商速率低于标称时用标称（未插模块/未协商上）', () => {
    const ports = [
      { portName: 'NIC.X', portType: 'RJ45', portSpeed: '1G', bmcSpeedMbps: 1000, speedSource: 'bmc', nicRef: '0' },
    ];
    const result = applyAdapterSpec(ports, inspurAdapters);
    expect(result[0]).toMatchObject({ portType: 'SFP+', portSpeed: '10G', speedSource: 'adapter' });
  });

  test('BMC 速率已达或超过标称时保留 BMC 值', () => {
    const ports = [
      { portName: 'NIC.X', portType: 'SFP+', portSpeed: '25G', bmcSpeedMbps: 25000, speedSource: 'bmc', nicRef: '0' },
    ];
    const result = applyAdapterSpec(ports, inspurAdapters);
    expect(result[0]).toMatchObject({ portSpeed: '25G', speedSource: 'bmc' });
  });

  test('无关联网卡（如板载口）保持原值不变', () => {
    const ports = [
      { portName: 'OutboardNIC9Port0', portType: 'RJ45', portSpeed: '1G', bmcSpeedMbps: null, speedSource: 'unknown', nicRef: null },
    ];
    const result = applyAdapterSpec(ports, inspurAdapters);
    expect(result[0]).toMatchObject({ portType: 'RJ45', portSpeed: '1G' });
    expect(result[0].speedSource).toBe('unknown');
  });

  test('网卡型号推不出规格时保持原值', () => {
    const ports = [
      { portName: 'NIC.X', portType: 'RJ45', portSpeed: '1G', bmcSpeedMbps: null, speedSource: 'unknown', nicRef: '0' },
    ];
    const result = applyAdapterSpec(ports, [{ index: 0, model: 'Unknown Adapter', macs: [] }]);
    expect(result[0]).toMatchObject({ portType: 'RJ45', portSpeed: '1G' });
  });
});

describe('normalizeMac', () => {
  test('去掉分隔符并大写，兼容浪潮末尾多余冒号', () => {
    expect(normalizeMac('B4:05:5D:C3:D7:42:')).toBe('B4055DC3D742');
    expect(normalizeMac('b4-05-5d-c3-d7-42')).toBe('B4055DC3D742');
    expect(normalizeMac('')).toBe('');
    expect(normalizeMac(null)).toBe('');
  });
});

describe('extractNicIndex（端口名中的网卡序号）', () => {
  test('认明确的网卡序号格式', () => {
    expect(extractNicIndex('OutboardNIC0Port0')).toBe(0);
    expect(extractNicIndex('OutboardNIC1Port1')).toBe(1);
    expect(extractNicIndex('NIC2Port3')).toBe(2);
    expect(extractNicIndex('nic_3Port1')).toBe(3);
  });

  test('非网卡序号格式返回 null（不硬猜，避免误关联）', () => {
    expect(extractNicIndex('NIC.Embedded.1-1-1')).toBeNull();
    expect(extractNicIndex('NIC.Slot.6-1-1')).toBeNull();
    expect(extractNicIndex('eth0')).toBeNull();
    expect(extractNicIndex('enp0s3')).toBeNull();
    expect(extractNicIndex(null)).toBeNull();
  });
});

describe('mapPortsToAdapters（端口 ↔ 网卡 关联）', () => {
  // 真实场景：浪潮 SA5212M5，网卡 X722(2口) / I350(2口)，端口来自 EthernetInterfaces
  const inspurAdapters = [
    {
      index: 0, model: 'Ethernet Connection X722 for 10GbE SFP+',
      manufacturer: 'Intel Corporation', location: 'PCH PCIE Uplink(J45) CPU0',
      macs: ['B4:05:5D:C3:D7:42:', 'B4:05:5D:C3:D7:43:'],
    },
    {
      index: 1, model: 'I350 Gigabit Network Connection',
      manufacturer: 'Intel Corporation', location: 'PCIE X24 SLOT1(J102) CPU0/1',
      macs: ['80:61:5F:12:B2:02:', '80:61:5F:12:B2:03:'],
    },
  ];
  const inspurPorts = [
    { portName: 'OutboardNIC0Port0', macAddress: 'B4:05:5D:C3:D7:42:' },
    { portName: 'OutboardNIC0Port1', macAddress: 'B4:05:5D:C3:D7:43:' },
    { portName: 'OutboardNIC1Port0', macAddress: '80:61:5F:12:B2:02:' },
    { portName: 'OutboardNIC1Port1', macAddress: '80:61:5F:12:B2:03:' },
  ];

  test('MAC 精确匹配：端口正确归属到 X722 / I350', () => {
    const result = mapPortsToAdapters(inspurPorts, inspurAdapters);
    expect(result.map(p => p.nicRef)).toEqual(['0', '0', '1', '1']);
    expect(result[0]).toMatchObject({
      nicModel: 'Ethernet Connection X722 for 10GbE SFP+',
      nicManufacturer: 'Intel Corporation',
      nicLocation: 'PCH PCIE Uplink(J45) CPU0',
    });
    expect(result[2].nicModel).toBe('I350 Gigabit Network Connection');
    // 原字段保留
    expect(result[0].portName).toBe('OutboardNIC0Port0');
    expect(result[0].macAddress).toBe('B4:05:5D:C3:D7:42:');
  });

  test('网卡无 MAC 时回退端口名序号匹配', () => {
    const noMac = [{ index: 0, model: 'NIC-A' }, { index: 1, model: 'NIC-B' }];
    const result = mapPortsToAdapters(inspurPorts, noMac);
    expect(result.map(p => p.nicRef)).toEqual(['0', '0', '1', '1']);
    expect(result[0].nicModel).toBe('NIC-A');
  });

  test('MAC 匹配优先于端口名序号（两者冲突时以 MAC 为准）', () => {
    // 端口名写着 NIC0，但 MAC 属于网卡 1
    const adapters = [
      { index: 0, model: 'NIC-A', macs: [] },
      { index: 1, model: 'NIC-B', macs: ['AA:BB:CC:DD:EE:FF'] },
    ];
    const ports = [{ portName: 'OutboardNIC0Port0', macAddress: 'AA:BB:CC:DD:EE:FF' }];
    const result = mapPortsToAdapters(ports, adapters);
    expect(result[0].nicRef).toBe('1');
    expect(result[0].nicModel).toBe('NIC-B');
  });

  test('既无 MAC 也无序号时 nicRef 为 null（不硬猜）', () => {
    const adapters = [{ index: 0, model: 'NIC-A', macs: [] }];
    const ports = [{ portName: 'NIC.Embedded.1-1-1', macAddress: 'AA:BB:CC:00:00:01' }];
    const result = mapPortsToAdapters(ports, adapters);
    expect(result[0].nicRef).toBeNull();
    expect(result[0].nicModel).toBeNull();
  });

  test('端口序号越界时不误配', () => {
    const adapters = [{ index: 0, model: 'NIC-A', macs: [] }];
    const ports = [{ portName: 'OutboardNIC5Port0' }];
    expect(mapPortsToAdapters(ports, adapters)[0].nicRef).toBeNull();
  });

  test('无网卡数据时全部 nicRef 为 null', () => {
    const result = mapPortsToAdapters(inspurPorts, []);
    expect(result.every(p => p.nicRef === null)).toBe(true);
  });
});

describe('parsePhysicalPorts', () => {
  test('Name 缺失时回退 Id', () => {
    const result = parsePhysicalPorts([{ Id: 'P1', MACAddress: 'AA' }]);
    expect(result[0].name).toBe('P1');
  });

  test('非数组输入返回空数组', () => {
    expect(parsePhysicalPorts(null)).toEqual([]);
    expect(parsePhysicalPorts({ '@odata.id': '/x' })).toEqual([]);
  });
});

describe('enrichResourceError（固件未实现资源识别）', () => {
  test('iDRAC "URI is invalid" 类错误给出固件升级/手动录入引导', () => {
    const msg = enrichResourceError('Memory', [
      'Redfish 请求失败: /redfish/v1/Systems/System.Embedded.1/Memory → HTTP 400 | {"error":{"message":{"value":"failed: Request URI: /redfish/v1/Systems/System.Embedded.1/Memory is invalid"}}}',
    ]);
    expect(msg).toContain('未实现此资源');
    expect(msg).toContain('升级 BMC 固件');
    expect(msg).toContain('手动录入');
    // 原始错误（含 body）仍保留，便于追溯
    expect(msg).toContain('is invalid');
  });

  test('普通 4xx（非未实现）只透传，不臆测', () => {
    expect(enrichResourceError('X', 'Redfish 请求失败: /x → HTTP 401')).toBe('X: Redfish 请求失败: /x → HTTP 401');
  });
});

describe('buildResourceCandidates（System → Chassis 回退路径）', () => {
  test('无 Chassis 时只有 System 一个候选', () => {
    expect(buildResourceCandidates('Storage', '/redfish/v1/Systems/1', [])).toEqual([
      '/redfish/v1/Systems/1/Storage',
    ]);
  });

  test('有 Chassis 时按优先级追加（浪潮 iBMC：Storage 挂 Chassis 下）', () => {
    const candidates = buildResourceCandidates('NetworkAdapters', '/redfish/v1/Systems/1', [
      '/redfish/v1/Chassis/1',
      '/redfish/v1/Chassis/2',
    ]);
    expect(candidates).toEqual([
      '/redfish/v1/Systems/1/NetworkAdapters',
      '/redfish/v1/Chassis/1/NetworkAdapters',
      '/redfish/v1/Chassis/2/NetworkAdapters',
    ]);
  });

  test('chassisLinks 为 null 不抛错', () => {
    expect(buildResourceCandidates('Memory', '/redfish/v1/Systems/1', null)).toEqual([
      '/redfish/v1/Systems/1/Memory',
    ]);
  });

  test('probeChassis=false 时只保留 System 候选（Memory/EthernetInterfaces 不探测 Chassis）', () => {
    expect(buildResourceCandidates('Memory', '/redfish/v1/Systems/1', ['/redfish/v1/Chassis/1'], false)).toEqual([
      '/redfish/v1/Systems/1/Memory',
    ]);
    // 对照组：NetworkAdapters 仍需 Chassis 回退（浪潮 iBMC）
    expect(buildResourceCandidates('NetworkAdapters', '/redfish/v1/Systems/1', ['/redfish/v1/Chassis/1'], false)).toEqual([
      '/redfish/v1/Systems/1/NetworkAdapters',
    ]);
    expect(buildResourceCandidates('NetworkAdapters', '/redfish/v1/Systems/1', ['/redfish/v1/Chassis/1'])).toEqual([
      '/redfish/v1/Systems/1/NetworkAdapters',
      '/redfish/v1/Chassis/1/NetworkAdapters',
    ]);
  });
});

/**
 * collect() 编排回归测试
 *
 * 背景：曾出现「重构时把 hardware.networkAdapters 赋值移到返回值展开中，
 * 但日志行仍读 hardware.networkAdapters.length」→ 采集直接抛
 * TypeError: Cannot read properties of undefined (reading 'length')。
 * 纯函数测试覆盖不到这类「返回值结构与代码假设不一致」，故补编排级测试。
 *
 * 用 mock 的 _get 驱动整条流程：System 下 Storage 404 → Chassis 回退成功、
 * NetworkAdapters 挂在 Chassis 下、端口经 MAC 关联到网卡。
 */
describe('RedfishDriver.collect（采集编排回归）', () => {
  /**
   * 构造带 mock _get 的驱动实例（不建立真实连接）
   * @param {Object} routes - URL → 响应体映射；未命中则模拟 HTTP 404
   */
  function makeDriver(routes) {
    const drv = new RedfishDriver({ host: '10.0.0.1', username: 'admin', password: 'x' });
    drv.systemsUrl = '/redfish/v1/Systems';
    drv._get = async (url) => {
      if (!(url in routes)) {
        throw new Error(`Redfish 请求失败: ${url} → HTTP 404`);
      }
      return routes[url];
    };
    return drv;
  }

  const INSPUR_ROUTES = {
    '/redfish/v1/Systems': { Members: [{ '@odata.id': '/redfish/v1/Systems/1' }] },
    '/redfish/v1/Systems/1': {
      Manufacturer: 'Inspur',
      Model: 'SA5212M5',
      SerialNumber: '720764980',
      PowerState: 'On',
      Links: { Chassis: [{ '@odata.id': '/redfish/v1/Chassis/1' }] },
    },
    '/redfish/v1/Chassis/1': { ChassisType: 'RackMount' },
    '/redfish/v1/Systems/1/Memory': { Members: [{ '@odata.id': '/mem/1' }] },
    '/mem/1': { DeviceLocator: 'DIMM A1', SizeMiB: 32768, Manufacturer: 'Samsung' },
    // System 下无 Storage（404 未命中），硬盘在 Chassis 下
    '/redfish/v1/Chassis/1/Storage': { Members: [{ '@odata.id': '/st/1' }] },
    '/st/1': { Drives: [{ '@odata.id': '/drive/1' }] },
    '/drive/1': { Name: 'Disk 0', Model: 'Samsung PM9A3', CapacityBytes: 1920383410176, MediaType: 'SSD' },
    // 网卡在 Chassis 下
    '/redfish/v1/Chassis/1/NetworkAdapters': { Members: [{ '@odata.id': '/na/0' }, { '@odata.id': '/na/1' }] },
    '/na/0': {
      Id: 'na0', Manufacturer: 'Intel Corporation', Model: 'Ethernet Connection X722 for 10GbE SFP+',
      Location: 'PCH PCIE Uplink(J45) CPU0',
      NetworkDeviceFunctions: [{ '@odata.id': '/fn/0' }, { '@odata.id': '/fn/1' }],
    },
    '/na/1': {
      Id: 'na1', Manufacturer: 'Intel Corporation', Model: 'I350 Gigabit Network Connection',
      Location: 'PCIE X24 SLOT1(J102) CPU0/1',
      NetworkDeviceFunctions: [{ '@odata.id': '/fn/2' }],
    },
    '/fn/0': { Id: 'fn0', MACAddress: 'B4:05:5D:C3:D7:42:' },
    '/fn/1': { Id: 'fn1', MACAddress: 'B4:05:5D:C3:D7:43:' },
    '/fn/2': { Id: 'fn2', MACAddress: '80:61:5F:12:B2:02:' },
    '/redfish/v1/Systems/1/EthernetInterfaces': {
      Members: [
        { '@odata.id': '/eth/0' },
        { '@odata.id': '/eth/1' },
        { '@odata.id': '/eth/2' },
      ],
    },
    '/eth/0': { Id: 'OutboardNIC0Port0', Name: 'Port 1', MACAddress: 'B4:05:5D:C3:D7:42:', SpeedMbps: 1000 },
    '/eth/1': { Id: 'OutboardNIC0Port1', Name: 'Port 2', MACAddress: 'B4:05:5D:C3:D7:43:', SpeedMbps: 1000 },
    '/eth/2': { Id: 'OutboardNIC1Port0', Name: 'Port 1', MACAddress: '80:61:5F:12:B2:02:', SpeedMbps: 1000 },
  };

  test('完整采集不抛错，返回结构完整（含 networkAdapters）', async () => {
    const drv = makeDriver(INSPUR_ROUTES);
    const r = await drv.collect();

    expect(r.vendor).toBe('inspur');
    expect(r.hardware.serialNumber).toBe('720764980');
    // 各数组字段均存在且为数组（防止 undefined.length 类崩溃）
    expect(Array.isArray(r.hardware.memoryModules)).toBe(true);
    expect(Array.isArray(r.hardware.drives)).toBe(true);
    expect(Array.isArray(r.hardware.networkAdapters)).toBe(true);
    expect(Array.isArray(r.ports)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);

    expect(r.hardware.memoryModules).toHaveLength(1);
    expect(r.hardware.drives).toHaveLength(1);
    expect(r.hardware.networkAdapters).toHaveLength(2);
    expect(r.ports).toHaveLength(3);
    // 硬盘在 Chassis 下通过回退采到，不应再有 Storage 降级警告
    expect(r.warnings.join('')).not.toContain('Storage');
  });

  test('端口按 MAC 关联到网卡，并回填到各网卡的 ports', async () => {
    const drv = makeDriver(INSPUR_ROUTES);
    const r = await drv.collect();

    const x722 = r.hardware.networkAdapters.find(a => a.model.includes('X722'));
    const i350 = r.hardware.networkAdapters.find(a => a.model.includes('I350'));
    expect(x722.index).toBe(0);
    expect(i350.index).toBe(1);
    expect(x722.macs).toEqual(['B4:05:5D:C3:D7:42:', 'B4:05:5D:C3:D7:43:']);

    // MAC 末尾多冒号也能正确关联（normalizeMac 生效）
    const byName = Object.fromEntries(r.ports.map(p => [p.portName, p]));
    expect(byName.OutboardNIC0Port0.nicRef).toBe('0');
    expect(byName.OutboardNIC0Port0.nicModel).toContain('X722');
    expect(byName.OutboardNIC1Port0.nicRef).toBe('1');
    expect(byName.OutboardNIC1Port0.nicModel).toContain('I350');

    // 网卡条目内回填端口明细，供前端按「网卡 → 端口」展示
    expect(x722.ports.map(p => p.name)).toEqual(['OutboardNIC0Port0', 'OutboardNIC0Port1']);
    expect(i350.ports.map(p => p.name)).toEqual(['OutboardNIC1Port0']);
  });

  test('所有子资源都不可用时仍能返回（数组为空 + warnings），不抛错', async () => {
    const drv = makeDriver({
      '/redfish/v1/Systems': { Members: [{ '@odata.id': '/redfish/v1/Systems/1' }] },
      '/redfish/v1/Systems/1': { Manufacturer: 'Inspur', Model: 'X', SerialNumber: 'SN', Links: {} },
    });
    const r = await drv.collect();
    expect(r.hardware.memoryModules).toEqual([]);
    expect(r.hardware.drives).toEqual([]);
    expect(r.hardware.networkAdapters).toEqual([]);
    expect(r.ports).toEqual([]);
    // Chassis 不可用 + 四类子资源缺失 → 有降级警告但不阻断
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
