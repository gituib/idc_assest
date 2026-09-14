// 快速报修 - 离线规则解析工具
// 把用户自由粘贴的文本（含 SN、故障现象、紧急程度等）解析成工单结构化字段。
// 纯前端、无外部依赖：正则抽 SN + 关键词字典匹配分类/优先级。

// 显式 SN 标签，例如 "SN: xxx" / "序列号：xxx" / "资产编号 xxx"
const SN_LABEL_RE = /(?:SN|序列号|Serial|资产编号|设备编号|编号)[：: ]+/i;
// 通用 SN：字母数字混合，长度 6-30，避免纯中文
const SN_TOKEN_RE = /[A-Za-z0-9][A-Za-z0-9\-_]{5,29}/;
// 整行就是 SN 的形态（仅一个 token 且像 SN）
const SN_LINE_RE = /^[A-Za-z0-9\-_]{6,30}$/;

// 概念 -> 关键词（用于从文本猜测故障分类，再对齐到系统真实分类名）
// 注意：避免同义词跨概念重复（如「网线」只在网络，「电源」只在电源），以减少误判。
const CATEGORY_KEYWORDS = {
  系统: [
    '系统', '操作系统', '宕机', '死机', '假死', '蓝屏', '黑屏', '崩溃', '无法启动',
    '启动不了', '进不去', '引导失败', '重启', '异常重启', '卡死', '卡顿', '无响应',
    '登录不了', '服务挂了', '进程', '报错', '配置', '升级失败', '补丁', '病毒',
    '中毒', '勒索', '性能差', '变慢', '软件', '应用', '数据库',
  ],
  网络: [
    '网络', '断网', '掉线', '网络中断', '网络慢', '网络不通', '不通', 'ping', '丢包',
    '延迟', '时延', '抖动', 'dns', '网关', '路由', 'vlan', '光衰', '光模块', '网卡',
    '网口', '端口down', '链路', '无法访问', '访问慢', '连接不上', 'ip', '交换机', '网线',
  ],
  电源: [
    '电源', '掉电', '断电', '停电', '供电', 'ups', '电池', '没电', '跳闸', '空开',
    'pdu', '电流', '电压', '浪涌', '市电', '双电源',
  ],
  硬件: [
    '硬件', '硬件故障', '内存', '内存条', '主板', 'cpu', 'gpu', '显卡', '风扇',
    '异响', '报警', '告警', '红灯', '指示灯', '故障灯', '损坏', '烧毁', '冒烟',
    '进水', '变形', '鼓包', '电容', '硬盘',
  ],
  存储: [
    '存储', '阵列', 'raid', '磁盘', '掉盘', '坏道', '磁盘满', '容量', '读写慢',
    'ssd', '机械盘', 'nas', 'san', '卷', '文件系统',
  ],
  空调: [
    '空调', '制冷', '过热', '高温', '温度', '机房温度', '温湿度', '湿度',
    '精密空调', '列间空调', '漏水',
  ],
  线缆: ['线缆', '光纤', '跳线', '理线', '配线', '标签'],
};

// 优先级关键词（命中即采用，critical 优先于 high）
const PRIORITY_KEYWORDS = {
  critical: [
    '紧急', '特急', '立刻', '马上', '立即', '致命', '业务中断', '停产', '大面积',
    '核心', '数据丢失', 'crash', 'down', '宕机', '全断', '已宕',
  ],
  high: [
    '尽快', '急', '优先', '高优', 'urgent', 'high', '影响业务', '影响用户', '影响客户',
    '尽快处理', '严重', '投诉', '现场',
  ],
  low: ['不急', '有空', '以后再', 'low', '不紧急', '观察', '暂不', '排期', '例行', '计划'],
};

// 分类概念优先级（打分相同时，靠前的概念优先）
// 系统 > 网络 > 电源 > 硬件：电源提到硬件前，避免「电源烧毁」被归到硬件
const CATEGORY_PRIORITY = ['系统', '网络', '电源', '硬件', '存储', '空调', '线缆'];

// 从文本中抽取序列号
export function extractSerialNumber(text) {
  if (!text) return '';
  const lines = text.split(/\r?\n/);

  // 1) 显式标签后面的 token
  for (const line of lines) {
    const m = line.match(SN_LABEL_RE);
    if (m) {
      const after = line.slice(m[0].length).trim();
      const token = after.match(SN_TOKEN_RE);
      if (token) return token[0];
    }
  }

  // 2) 整行只有一个像 SN 的 token
  for (const line of lines) {
    const t = line.trim();
    if (t && SN_LINE_RE.test(t) && /[A-Za-z]/.test(t) && /[0-9]/.test(t)) {
      return t;
    }
  }

  // 3) 任意像 SN 的 token（排除 http/www/ip 之类）
  const tokens = text.match(/[A-Za-z0-9][A-Za-z0-9\-_]{5,29}/g) || [];
  const candidate = tokens.find(
    t => /[A-Za-z]/.test(t) && /[0-9]/.test(t) && !/^(https?|www)/i.test(t)
  );
  return candidate || '';
}

// 将文本对齐到系统已配置的故障分类名（关键词打分，命中多者胜）
export function matchCategory(text, categories = []) {
  const names = (categories || []).map(c => c.name).filter(Boolean);

  // 1) 文本直接包含某个分类名
  const direct = names.find(n => text.includes(n));
  if (direct) return direct;

  // 2) 各概念关键词打分，得分最高者胜（平局按 CATEGORY_PRIORITY 顺序优先）
  const lower = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const concept of CATEGORY_PRIORITY) {
    const kws = CATEGORY_KEYWORDS[concept] || [];
    let score = 0;
    for (const kw of kws) {
      if (lower.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = concept;
    }
  }

  // 3) 把命中的概念对齐到系统真实分类名
  if (best && bestScore > 0) {
    const hit = names.find(n => n.includes(best) || best.includes(n));
    if (hit) return hit;
  }

  // 4) 兜底：优先“其他/未分类”，否则取第一个配置的分类
  return names.find(n => n.includes('其他') || n.includes('未分类')) || names[0] || '';
}

// 匹配优先级
export function matchPriority(text) {
  for (const [p, kws] of Object.entries(PRIORITY_KEYWORDS)) {
    if (kws.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) return p;
  }
  return 'medium';
}

// 主解析函数
// text: 用户粘贴的自由文本
// categories: 系统已配置的故障分类 [{ name, ... }]
export function parseQuickReport(text, categories = []) {
  const serialNumber = extractSerialNumber(text);
  const faultCategory = matchCategory(text, categories);
  const priority = matchPriority(text);

  // 描述：去掉显式 SN 行，其余原样保留作为故障描述
  const descLines = (text || '').split(/\r?\n/).filter(l => {
    const t = l.trim();
    if (!t) return false;
    if (SN_LABEL_RE.test(t) && SN_TOKEN_RE.test(t)) return false;
    if (t === serialNumber) return false;
    return true;
  });
  const description = descLines.join('\n').trim() || text.trim();

  return {
    serialNumber,
    faultCategory,
    priority,
    description,
    title: '',
  };
}
