/**
 * @file 端口与线缆选项常量
 * @description
 *  集中维护端口类型、端口速率、线缆类型三类下拉选项。
 *  - 前端通过 GET /api/port-options 拉取本文件内容
 *  - 后端模型（DevicePort.portType/portSpeed、Cable.cableType）的 ENUM 必须与下列 value 保持一致
 *  - 新增类型时：1) 在本文件追加选项；2) 同步修改对应模型的 ENUM；3) 前端无需改动
 *
 *  字段说明：
 *  - value：写入数据库的英文标识
 *  - label：界面显示文本
 *  - cnName：中文别名（用于下拉提示）
 *  - color：Ant Design Tag 预设颜色名（用于状态标签）
 *  - dotColor：HEX 颜色值（用于 Select 选项内的小圆点背景）
 *  - symbol：端口类型的视觉符号字符（用于端口面板图形化展示）
 *  - group：分组（用于前端按类别展示）
 *  - icon：可选 emoji 图标（线缆类型使用）
 *  - description：可选说明文字
 */

// 端口类型选项（与 DevicePort.portType 的 ENUM 同步）
const PORT_TYPE_OPTIONS = [
  // 电口（含 PoE 供电电口）
  { value: 'RJ45', label: 'RJ45', cnName: '电口', color: 'blue', dotColor: '#1890ff', symbol: '⬡', group: '电口', description: 'RJ45 电口（百兆/千兆/万兆）' },
  { value: 'PoE', label: 'PoE', cnName: 'PoE 供电口', color: 'blue', dotColor: '#1890ff', symbol: '⬡', group: '电口', description: 'PoE 供电电口（IEEE 802.3af，15.4W）' },
  { value: 'PoE+', label: 'PoE+', cnName: 'PoE+ 供电口', color: 'blue', dotColor: '#1890ff', symbol: '⬡', group: '电口', description: 'PoE+ 供电电口（IEEE 802.3at，30W）' },
  { value: 'PoE++', label: 'PoE++', cnName: 'PoE++ 供电口', color: 'blue', dotColor: '#1890ff', symbol: '⬡', group: '电口', description: 'PoE++ 供电电口（IEEE 802.3bt，60W/100W）' },

  // 1G 光模块
  { value: 'SFP', label: 'SFP', cnName: '小型可插拔光模块', color: 'green', dotColor: '#52c41a', symbol: '▭', group: '1G 光模块', description: 'SFP 光模块（1G）' },
  { value: 'GBIC', label: 'GBIC', cnName: '千兆接口转换器（已淘汰）', color: 'green', dotColor: '#52c41a', symbol: '▰', group: '1G 光模块', description: 'GBIC 光模块（1G，已淘汰）' },

  // 10G 光模块
  { value: 'SFP+', label: 'SFP+', cnName: '增强型 SFP 光模块', color: 'cyan', dotColor: '#13c2c2', symbol: '▭', group: '10G 光模块', description: 'SFP+ 光模块（10G）' },
  { value: 'XFP', label: 'XFP', cnName: '10G 小型可插拔光模块', color: 'cyan', dotColor: '#13c2c2', symbol: '▰', group: '10G 光模块', description: 'XFP 光模块（10G）' },
  { value: 'X2', label: 'X2', cnName: '10G 光模块（X2）', color: 'cyan', dotColor: '#13c2c2', symbol: '▰', group: '10G 光模块', description: 'X2 光模块（10G）' },
  { value: 'XENPAK', label: 'XENPAK', cnName: '10G 以网接口（已淘汰）', color: 'cyan', dotColor: '#13c2c2', symbol: '▰', group: '10G 光模块', description: 'XENPAK 光模块（10G，已淘汰）' },

  // 25G 光模块
  { value: 'SFP28', label: 'SFP28', cnName: '25G SFP 光模块', color: 'purple', dotColor: '#722ed1', symbol: '▭', group: '25G 光模块', description: 'SFP28 光模块（25G）' },

  // 40G 光模块
  { value: 'QSFP', label: 'QSFP', cnName: '四通道 SFP 光模块', color: 'orange', dotColor: '#fa8c16', symbol: '▯', group: '40G 光模块', description: 'QSFP 光模块（40G）' },
  { value: 'QSFP+', label: 'QSFP+', cnName: '增强型 QSFP 光模块', color: 'orange', dotColor: '#fa8c16', symbol: '▯', group: '40G 光模块', description: 'QSFP+ 光模块（40G）' },

  // 50G 光模块
  { value: 'SFP56', label: 'SFP56', cnName: '50G SFP 光模块', color: 'volcano', dotColor: '#fa541c', symbol: '▭', group: '50G 光模块', description: 'SFP56 光模块（50G）' },

  // 100G 光模块
  { value: 'QSFP28', label: 'QSFP28', cnName: '100G 四通道 SFP 光模块', color: 'red', dotColor: '#f5222d', symbol: '▯', group: '100G 光模块', description: 'QSFP28 光模块（100G）' },
  { value: 'CFP', label: 'CFP', cnName: '100G 封装可插拔光模块', color: 'red', dotColor: '#f5222d', symbol: '▮', group: '100G 光模块', description: 'CFP 光模块（100G）' },
  { value: 'CFP2', label: 'CFP2', cnName: '紧凑型 CFP 光模块', color: 'red', dotColor: '#f5222d', symbol: '▮', group: '100G 光模块', description: 'CFP2 光模块（100G/200G）' },
  { value: 'CFP4', label: 'CFP4', cnName: '超紧凑 CFP 光模块', color: 'red', dotColor: '#f5222d', symbol: '▮', group: '100G 光模块', description: 'CFP4 光模块（100G）' },
  { value: 'CXP', label: 'CXP', cnName: '100G 并行光模块', color: 'red', dotColor: '#f5222d', symbol: '▮', group: '100G 光模块', description: 'CXP 光模块（100G）' },
  { value: 'SFP-DD', label: 'SFP-DD', cnName: '双密度 SFP 光模块', color: 'red', dotColor: '#f5222d', symbol: '▭', group: '100G 光模块', description: 'SFP-DD 光模块（100G/200G）' },

  // 200G 光模块
  { value: 'QSFP56', label: 'QSFP56', cnName: '200G 四通道 SFP 光模块', color: 'magenta', dotColor: '#eb2f96', symbol: '▯', group: '200G 光模块', description: 'QSFP56 光模块（200G）' },

  // 400G 光模块
  { value: 'QSFP-DD', label: 'QSFP-DD', cnName: '四通道双密度光模块', color: 'gold', dotColor: '#faad14', symbol: '▯', group: '400G 光模块', description: 'QSFP-DD 光模块（400G/800G）' },
  { value: 'OSFP', label: 'OSFP', cnName: '八通道小型可插拔光模块', color: 'gold', dotColor: '#faad14', symbol: '▮', group: '400G 光模块', description: 'OSFP 光模块（400G/800G）' },
  { value: 'CFP8', label: 'CFP8', cnName: '第八代 CFP 光模块', color: 'gold', dotColor: '#faad14', symbol: '▮', group: '400G 光模块', description: 'CFP8 光模块（400G）' },

  // 800G 光模块
  { value: 'OSFP-XD', label: 'OSFP-XD', cnName: '扩展八通道光模块', color: 'geekblue', dotColor: '#2f54eb', symbol: '▮', group: '800G 光模块', description: 'OSFP-XD 光模块（800G）' },
  { value: 'QSFP-DD800G', label: 'QSFP-DD 800G', cnName: '800G 四通道双密度光模块', color: 'geekblue', dotColor: '#2f54eb', symbol: '▯', group: '800G 光模块', description: 'QSFP-DD 800G 光模块' },

  // 光纤连接器
  { value: 'LC', label: 'LC', cnName: '小型光纤连接器', color: 'lime', dotColor: '#a0d911', symbol: '◉', group: '光纤连接器', description: 'LC 双工/单工光纤连接器' },
  { value: 'SC', label: 'SC', cnName: '标准方形光纤连接器', color: 'lime', dotColor: '#a0d911', symbol: '◉', group: '光纤连接器', description: 'SC 双工/单工光纤连接器' },
  { value: 'FC', label: 'FC', cnName: '螺纹式光纤连接器', color: 'lime', dotColor: '#a0d911', symbol: '◉', group: '光纤连接器', description: 'FC 螺纹式光纤连接器' },
  { value: 'ST', label: 'ST', cnName: '卡口式光纤连接器', color: 'lime', dotColor: '#a0d911', symbol: '◉', group: '光纤连接器', description: 'ST 卡口式光纤连接器' },
  { value: 'MPO-12', label: 'MPO/MTP-12', cnName: '12 芯多光纤推拉式连接器', color: 'lime', dotColor: '#a0d911', symbol: '◉', group: '光纤连接器', description: 'MPO/MTP-12 芯多光纤连接器' },
  { value: 'MPO-24', label: 'MPO-24', cnName: '24 芯多光纤推拉式连接器', color: 'lime', dotColor: '#a0d911', symbol: '◉', group: '光纤连接器', description: 'MPO-24 芯多光纤连接器' },

  // 管理/控制端口
  { value: 'Console-RJ45', label: 'Console (RJ45)', cnName: 'RJ45 配置口', color: 'geekblue', dotColor: '#2f54eb', symbol: '⚙', group: '管理口', description: 'RJ45 Console 配置口' },
  { value: 'Console-USBC', label: 'Console (USB-C)', cnName: 'USB-C 配置口', color: 'geekblue', dotColor: '#2f54eb', symbol: '⚙', group: '管理口', description: 'USB-C Console 配置口' },
  { value: 'MGMT', label: 'MGMT', cnName: '管理网口', color: 'geekblue', dotColor: '#2f54eb', symbol: '⚙', group: '管理口', description: 'MGMT 管理以太网口' },
  { value: 'USB-A', label: 'USB Type-A', cnName: 'USB-A 接口', color: 'geekblue', dotColor: '#2f54eb', symbol: '⏚', group: '管理口', description: 'USB Type-A 接口' },
  { value: 'USB-C', label: 'USB Type-C', cnName: 'USB-C 接口', color: 'geekblue', dotColor: '#2f54eb', symbol: '⏚', group: '管理口', description: 'USB Type-C 接口' },

  // 堆叠/特殊端口
  { value: 'Stacking', label: 'Stacking', cnName: '堆叠口', color: 'gold', dotColor: '#faad14', symbol: '⇄', group: '堆叠口', description: '堆叠端口（StackWise/VStack 等）' },
];

// 端口速率选项（与 DevicePort.portSpeed 的 ENUM 同步）
const PORT_SPEED_OPTIONS = [
  { value: '100M', label: '100M', color: 'blue', dotColor: '#1890ff', group: '低速' },
  { value: '1G', label: '1G', color: 'green', dotColor: '#52c41a', group: '千兆' },
  { value: '10G', label: '10G', color: 'cyan', dotColor: '#13c2c2', group: '万兆' },
  { value: '25G', label: '25G', color: 'purple', dotColor: '#722ed1', group: '二十五吉' },
  { value: '40G', label: '40G', color: 'orange', dotColor: '#fa8c16', group: '四万兆' },
  { value: '50G', label: '50G', color: 'volcano', dotColor: '#fa541c', group: '五十吉' },
  { value: '100G', label: '100G', color: 'red', dotColor: '#f5222d', group: '百万兆' },
  { value: '200G', label: '200G', color: 'magenta', dotColor: '#eb2f96', group: '二百吉' },
  { value: '400G', label: '400G', color: 'gold', dotColor: '#faad14', group: '四百吉' },
  { value: '800G', label: '800G', color: 'geekblue', dotColor: '#2f54eb', group: '八百吉' },
];

// 线缆类型选项（与 Cable.cableType 的 ENUM 同步）
const CABLE_TYPE_OPTIONS = [
  // 以太网线缆
  { value: 'ethernet', label: '网线', cnName: '以太网双绞线', color: 'blue', dotColor: '#1890ff', icon: '🔌', group: '以太网线缆', description: '双绞线（Cat5e/Cat6/Cat6a/Cat7/Cat8）' },
  { value: 'cat5e', label: 'Cat5e', cnName: '超五类网线', color: 'blue', dotColor: '#1890ff', icon: '🔌', group: '以太网线缆', description: '超五类非屏蔽/屏蔽双绞线（千兆）' },
  { value: 'cat6', label: 'Cat6', cnName: '六类网线', color: 'blue', dotColor: '#1890ff', icon: '🔌', group: '以太网线缆', description: '六类双绞线（千兆/万兆）' },
  { value: 'cat6a', label: 'Cat6a', cnName: '超六类网线', color: 'blue', dotColor: '#1890ff', icon: '🔌', group: '以太网线缆', description: '超六类双绞线（万兆）' },
  { value: 'cat7', label: 'Cat7', cnName: '七类网线', color: 'blue', dotColor: '#1890ff', icon: '🔌', group: '以太网线缆', description: '七类双屏蔽双绞线（万兆）' },
  { value: 'cat8', label: 'Cat8', cnName: '八类网线', color: 'blue', dotColor: '#1890ff', icon: '🔌', group: '以太网线缆', description: '八类双屏蔽双绞线（25G/40G）' },
  { value: 'dac', label: 'DAC', cnName: '直连铜缆', color: 'blue', dotColor: '#1890ff', icon: '⚡', group: '以太网线缆', description: 'Twinax 直连铜缆（10G/25G/40G/100G 短距）' },
  { value: 'aoc', label: 'AOC', cnName: '有源光缆', color: 'blue', dotColor: '#1890ff', icon: '🔷', group: '以太网线缆', description: '有源光缆（10G/25G/40G/100G 长距）' },

  // 光纤线缆
  { value: 'fiber', label: '光纤', cnName: '光纤跳线', color: 'cyan', dotColor: '#13c2c2', icon: '🔷', group: '光纤线缆', description: '光纤跳线（通用）' },
  { value: 'os2', label: 'OS2', cnName: '单模光纤', color: 'cyan', dotColor: '#13c2c2', icon: '🔷', group: '光纤线缆', description: '单模光纤（9/125μm，长距）' },
  { value: 'om1', label: 'OM1', cnName: '多模光纤 OM1', color: 'cyan', dotColor: '#13c2c2', icon: '🔷', group: '光纤线缆', description: '多模光纤（62.5/125μm，百兆/千兆）' },
  { value: 'om2', label: 'OM2', cnName: '多模光纤 OM2', color: 'cyan', dotColor: '#13c2c2', icon: '🔷', group: '光纤线缆', description: '多模光纤（50/125μm，千兆）' },
  { value: 'om3', label: 'OM3', cnName: '多模光纤 OM3', color: 'cyan', dotColor: '#13c2c2', icon: '🔷', group: '光纤线缆', description: '多模光纤（50/125μm，万兆，300m）' },
  { value: 'om4', label: 'OM4', cnName: '多模光纤 OM4', color: 'cyan', dotColor: '#13c2c2', icon: '🔷', group: '光纤线缆', description: '多模光纤（50/125μm，万兆/四万兆，400m）' },
  { value: 'om5', cnName: '多模光纤 OM5', label: 'OM5', color: 'cyan', dotColor: '#13c2c2', icon: '🔷', group: '光纤线缆', description: '宽带多模光纤（短波分复用）' },

  // 同轴/铜质线缆
  { value: 'copper', label: '铜缆', cnName: '同轴铜缆', color: 'orange', dotColor: '#fa8c16', icon: '⚡', group: '同轴线缆', description: '同轴铜质线缆' },
  { value: 'coax', label: 'Coax', cnName: '同轴电缆', color: 'orange', dotColor: '#fa8c16', icon: '⚡', group: '同轴线缆', description: '同轴电缆（RG58/RG6 等）' },

  // 电源/其他
  { value: 'power', label: '电源线', cnName: '电源线', color: 'red', dotColor: '#f5222d', icon: '🔌', group: '其他线缆', description: '设备电源线' },
  { value: 'console', label: 'Console 线', cnName: '配置线', color: 'geekblue', dotColor: '#2f54eb', icon: '⚙', group: '其他线缆', description: 'Console 配置线（RJ45/USB）' },
  { value: 'stack', label: '堆叠线', cnName: '堆叠线缆', color: 'gold', dotColor: '#faad14', icon: '⇄', group: '其他线缆', description: '堆叠专用线缆（StackWise/VStack）' },
];

module.exports = {
  PORT_TYPE_OPTIONS,
  PORT_SPEED_OPTIONS,
  CABLE_TYPE_OPTIONS,
};
