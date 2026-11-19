/**
 * 服务器自动采集弹窗（Redfish 带外）
 * 入口：设备详情 → 服务器采集凭据面板 →「采集硬件清单」按钮
 * 流程：自动使用设备默认 Redfish 凭据 → 采集 → 硬件清单 + 网卡端口差异预览 → 勾选确认 → 落库
 * 硬件清单写入设备动态字段 customFields.hardware；网卡端口走 DevicePort diff 落库
 */
import { useState, useEffect } from 'react';
import { Modal, Button, Steps, message, Spin, Alert, Tabs, Checkbox, Tag, Space, Table } from 'antd';
import { HddOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { serverDiscoveryAPI } from '../api';

const VENDOR_LABELS = {
  dell: '戴尔',
  hpe: '慧与（HPE）',
  huawei: '华为',
  inspur: '浪潮',
  supermicro: '超微',
  lenovo: '联想',
  sugon: '曙光',
  generic: '通用',
};

const DIFF_STEPS = [
  { title: '执行采集', status: 'process' },
  { title: '差异预览', status: 'wait' },
  { title: '确认落库', status: 'wait' },
];

/** 内存条预览表格列 */
const MEMORY_COLUMNS = [
  { title: '槽位', dataIndex: 'slot', key: 'slot', render: v => <span style={{ fontFamily: 'monospace' }}>{v || '-'}</span> },
  { title: '容量', dataIndex: 'size', key: 'size', width: 90 },
  { title: '厂商', dataIndex: 'manufacturer', key: 'manufacturer', width: 110, render: v => v || '-' },
  { title: '料号', dataIndex: 'partNumber', key: 'partNumber', width: 130, render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '-'}</span> },
  { title: '序列号', dataIndex: 'serialNumber', key: 'serialNumber', width: 140, render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '-'}</span> },
];

/** 硬盘预览表格列 */
const DRIVE_COLUMNS = [
  { title: '位置', dataIndex: 'slot', key: 'slot', render: v => <span style={{ fontFamily: 'monospace' }}>{v || '-'}</span> },
  { title: '型号', dataIndex: 'model', key: 'model', render: v => v || '-' },
  { title: '容量', dataIndex: 'size', key: 'size', width: 90 },
  { title: '类型', dataIndex: 'mediaType', key: 'mediaType', width: 80, render: v => v || '-' },
  { title: '序列号', dataIndex: 'serialNumber', key: 'serialNumber', width: 150, render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '-'}</span> },
];

/** 网卡端口预览表格列（对齐端口 diff 展示习惯） */
const PORT_COLUMNS = [
  { title: '端口名', dataIndex: 'portName', key: 'portName', render: v => <span style={{ fontFamily: 'monospace' }}>{v}</span> },
  {
    title: '所属网卡',
    dataIndex: 'nicModel',
    key: 'nicModel',
    width: 200,
    render: (v, record) => (v
      ? (
        <span style={{ fontSize: 12 }}>
          {v}
          {record.nicLocation && <span style={{ color: 'var(--text-muted)' }}>（{record.nicLocation}）</span>}
        </span>
      )
      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>未关联</span>),
  },
  { title: '类型', dataIndex: 'portType', key: 'portType', width: 80 },
  { title: '速率', dataIndex: 'portSpeed', key: 'portSpeed', width: 70 },
  { title: 'MAC', dataIndex: 'macAddress', key: 'macAddress', width: 150, render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '-'}</span> },
];

/** 网卡硬件预览表格列（NetworkAdapter）—— 对齐 BMC 网页「网卡 → 端口」的表达方式 */
const NETWORK_ADAPTER_COLUMNS = [
  {
    title: '网卡型号',
    dataIndex: 'model',
    key: 'model',
    render: (v, record) => (
      <span>
        {v || '-'}
        {record.manufacturer && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>{record.manufacturer}</span>}
      </span>
    ),
  },
  {
    title: '位置',
    dataIndex: 'location',
    key: 'location',
    width: 180,
    render: v => v ? <span style={{ fontSize: 12 }}>{v}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>,
  },
  {
    title: '所属端口',
    key: 'ports',
    render: (_, record) => (record.ports?.length ? (
      <div>
        {record.ports.map((p, i) => (
          <div key={i} style={{ fontSize: 12, lineHeight: 1.7 }}>
            <span style={{ fontFamily: 'monospace' }}>{p.name}</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', marginLeft: 8 }}>{p.macAddress || '-'}</span>
          </div>
        ))}
      </div>
    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>未采集到端口明细</span>),
  },
  { title: '序列号', dataIndex: 'serialNumber', key: 'serialNumber', width: 140, render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '-'}</span> },
];

/**
 * 硬件清单差异摘要（当前库内值 vs 本次采集值）
 * @param {Object} hardwareDiff - { changed, current, incoming }
 * @param {number} portCount - 本次采集到的网口数（端口不存 hardware，单独传入）
 */
function HardwareDiffSummary({ hardwareDiff, portCount }) {
  if (!hardwareDiff || !hardwareDiff.changed) {
    return <Alert type="info" showIcon message="硬件清单与库内记录一致，无需更新" style={{ marginBottom: 12 }} />;
  }
  const render = (hw, title, showPorts) => (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
      {hw ? (
        <div style={{ fontSize: 12, lineHeight: 1.8 }}>
          <div>{hw.manufacturer || '-'} {hw.model || ''}</div>
          <div style={{ fontFamily: 'monospace' }}>SN: {hw.serialNumber || '-'}</div>
          <div>CPU: {hw.cpu?.model || '-'} ×{hw.cpu?.count ?? '-'}</div>
          <div>内存: {hw.memorySummary?.totalGiB ?? '-'} GB · {hw.memoryModules?.length ?? 0} 条</div>
          <div>硬盘: {hw.drives?.length ?? 0} 块 · 网卡: {hw.networkAdapters?.length ?? 0} 块{showPorts ? ` · 网口: ${portCount ?? 0}` : ''}</div>
        </div>
      ) : <div style={{ fontSize: 12 }}>（无记录）</div>}
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 14px', marginBottom: 12, borderRadius: 8, background: 'var(--bg-soft, #fafafa)', border: '1px solid var(--border)' }}>
      {render(hardwareDiff.current, '库内当前记录', false)}
      <div style={{ alignSelf: 'center', fontSize: 18, color: '#fa8c16' }}>→</div>
      {render(hardwareDiff.incoming, '本次采集结果', true)}
    </div>
  );
}

/**
 * 服务器自动采集弹窗（主组件）
 * @param {boolean} open
 * @param {Function} onClose - 关闭回调（落库成功时传 true，调用方可刷新数据）
 * @param {string} deviceId
 * @param {string} deviceName
 */
export default function ServerDiscoveryModal({ open, onClose, deviceId, deviceName }) {
  const [step, setStep] = useState(0); // 0 采集中/失败 1 预览 2 完成
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null); // { vendor, hardware, ports, portDiff, hardwareDiff, warnings }
  const [error, setError] = useState(null);
  const [applyStats, setApplyStats] = useState(null);
  const [applyHardware, setApplyHardware] = useState(true);
  const [applyAdded, setApplyAdded] = useState(true);
  const [applyChanged, setApplyChanged] = useState(true);
  const [applyRemoved, setApplyRemoved] = useState(false);

  /** 打开即自动采集（凭据由后端自动选取默认 Redfish 凭据） */
  useEffect(() => {
    if (!open || !deviceId) return;
    setError(null);
    setResult(null);
    setApplyStats(null);
    setStep(0);
    setApplyHardware(true);
    setApplyAdded(true);
    setApplyChanged(true);
    setApplyRemoved(false);
    handleDiscover();
  }, [open, deviceId]);

  /** 执行采集 */
  const handleDiscover = async () => {
    setError(null);
    setLoading(true);
    setStep(0);
    try {
      const res = await serverDiscoveryAPI.discover({ deviceId });
      if (!res.success) throw new Error(res.message || '采集失败');
      setResult(res);
      // 有差异的项默认勾选，无差异的不勾
      setApplyHardware(!!res.hardwareDiff?.changed);
      setStep(1);
    } catch (err) {
      // err 可能为 Error、axios 错误或字符串（历史代码曾 reject 字符串），统一兜底文案
      setError(
        err?.response?.data?.message
        || err?.message
        || (typeof err === 'string' ? err : '')
        || '采集失败，请检查 BMC 连通性后重试'
      );
    } finally {
      setLoading(false);
    }
  };

  /** 执行落库 */
  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await serverDiscoveryAPI.apply({
        deviceId,
        hardware: applyHardware ? result.hardware : undefined,
        portDiff: (applyAdded || applyChanged || applyRemoved) ? result.portDiff : undefined,
        options: { applyHardware, applyAdded, applyChanged, applyRemoved },
      });
      if (!res.success) throw new Error(res.message || '落库失败');
      setApplyStats(res.stats || res.data);
      setStep(2);
      message.success('服务器采集数据落库完成');
      setTimeout(() => onClose(true), 1500);
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || '落库失败');
    } finally {
      setApplying(false);
    }
  };

  /** 差异预览区 */
  const renderPreview = () => {
    const { vendor, hardware, ports, portDiff, hardwareDiff, warnings } = result;
    // 注意：portTabs 内的 JSX 会立即求值，故派生变量必须在 portTabs 之前声明（否则 TDZ 报错）
    const linkedPortCount = (ports || []).filter(p => p.nicRef).length;
    const portTabs = [
      {
        key: 'hardware',
        label: <Space><Tag color="blue">{hardware.memoryModules?.length || 0}</Tag>内存条</Space>,
        children: (hardware.memoryModules?.length || 0) === 0
          ? <Alert type="info" message="未采集到内存条信息" showIcon />
          : <Table size="small" rowKey={(_, i) => i} columns={MEMORY_COLUMNS} dataSource={hardware.memoryModules} pagination={false} scroll={{ y: 260 }} />,
      },
      {
        key: 'drives',
        label: <Space><Tag color="blue">{hardware.drives?.length || 0}</Tag>硬盘</Space>,
        children: (hardware.drives?.length || 0) === 0
          ? <Alert type="info" message="未采集到硬盘信息" showIcon />
          : <Table size="small" rowKey={(_, i) => i} columns={DRIVE_COLUMNS} dataSource={hardware.drives} pagination={false} scroll={{ y: 260 }} />,
      },
      {
        key: 'networkAdapters',
        label: <Space><Tag color="blue">{hardware.networkAdapters?.length || 0}</Tag>网卡</Space>,
        children: (hardware.networkAdapters?.length || 0) === 0
          ? <Alert type="info" message="未采集到网卡硬件信息（NetworkAdapters 资源不可用或设备无 PCIe 网卡）" showIcon />
          : <Table size="small" rowKey={(_, i) => i} columns={NETWORK_ADAPTER_COLUMNS} dataSource={hardware.networkAdapters} pagination={false} scroll={{ y: 260 }} />,
      },
      {
        key: 'ports',
        label: (
          <Space>
            <Tag color="green">+{portDiff?.added?.length || 0}</Tag>
            <Tag color="orange">~{portDiff?.changed?.length || 0}</Tag>
            网卡端口
            {linkedPortCount > 0 && <Tag color="blue">{linkedPortCount}/{ports?.length || 0} 已关联网卡</Tag>}
          </Space>
        ),
        children: (ports?.length || 0) === 0
          ? <Alert type="info" message="未采集到网卡端口" showIcon />
          : <Table size="small" rowKey={(_, i) => i} columns={PORT_COLUMNS} dataSource={ports} pagination={false} scroll={{ y: 260 }} />,
      },
    ];

    const hasPortChange = (portDiff?.added?.length || 0) + (portDiff?.changed?.length || 0) + (portDiff?.removed?.length || 0) > 0;
    const nothingToApply = !hardwareDiff?.changed && !hasPortChange;

    return (
      <div>
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="采集完成"
          description={
            <Space wrap>
              <span>厂商：{VENDOR_LABELS[vendor] || vendor || '未知'}</span>
              <span>{hardware.manufacturer} {hardware.model}</span>
              <span style={{ fontFamily: 'monospace' }}>SN: {hardware.serialNumber}</span>
              {hardware.powerState && <Tag>{hardware.powerState === 'On' ? '开机' : '关机'}</Tag>}
            </Space>
          }
          style={{ marginBottom: 12 }}
        />

        {warnings?.length > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message={`部分子资源读取失败（${warnings.length} 项），已降级跳过`}
            description={<pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>{warnings.join('\n')}</pre>}
            style={{ marginBottom: 12 }}
          />
        )}

        <HardwareDiffSummary hardwareDiff={hardwareDiff} portCount={ports?.length} />

        <Tabs items={portTabs} style={{ marginBottom: 12 }} />

        <Space wrap size={16} style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
          <Checkbox checked={applyHardware} onChange={e => setApplyHardware(e.target.checked)} disabled={!hardwareDiff?.changed}>
            更新硬件清单{hardwareDiff?.changed ? '' : '（无变化）'}
          </Checkbox>
          <Checkbox checked={applyAdded} onChange={e => setApplyAdded(e.target.checked)} disabled={!(portDiff?.added?.length > 0)}>
            新增端口（{portDiff?.added?.length || 0}）
          </Checkbox>
          <Checkbox checked={applyChanged} onChange={e => setApplyChanged(e.target.checked)} disabled={!(portDiff?.changed?.length > 0)}>
            变更端口（{portDiff?.changed?.length || 0}）
          </Checkbox>
          <Checkbox checked={applyRemoved} onChange={e => setApplyRemoved(e.target.checked)} disabled={!(portDiff?.removed?.length > 0)}>
            移除失效（{portDiff?.removed?.length || 0}）
          </Checkbox>
        </Space>

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Space>
            <Button onClick={() => { setResult(null); setStep(0); }}>返回</Button>
            <Button type="primary" loading={applying} disabled={nothingToApply} onClick={handleApply}>
              确认落库
            </Button>
          </Space>
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <HddOutlined />
          采集硬件清单 {deviceName ? `— ${deviceName}` : ''}
        </Space>
      }
      open={open}
      onCancel={() => onClose()}
      width={860}
      maskClosable={false}
      destroyOnClose
      footer={step === 0 && !loading ? <Button onClick={() => onClose()}>关闭</Button> : null}
    >
      <Steps size="small" current={step} style={{ marginBottom: 20 }} items={DIFF_STEPS} />

      {step === 0 && loading && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin indicator={<HddOutlined style={{ fontSize: 48 }} spin />} />
          <div style={{ marginTop: 16, color: 'var(--text-muted)' }}>正在通过 BMC（Redfish）采集硬件清单...</div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            需逐项读取内存 / 硬盘 / 网卡 / 网口，慢速 BMC 上可能需要 30~60 秒，请勿关闭弹窗
          </div>
        </div>
      )}

      {step === 0 && !loading && error && (
        <div style={{ padding: 8 }}>
          <Alert type="error" showIcon message="采集失败" description={error} style={{ marginBottom: 16 }} />
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => onClose()}>关闭</Button>
              <Button type="primary" onClick={handleDiscover}>重试</Button>
            </Space>
          </div>
        </div>
      )}

      {step === 1 && result && renderPreview()}

      {step === 2 && (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>落库完成</div>
          {applyStats && (
            <Space size={24}>
              {applyStats.hardwareApplied && <div><span style={{ color: '#52c41a', fontWeight: 500 }}>✓</span> 硬件清单已更新</div>}
              {((applyStats.networkCardsCreated || 0) + (applyStats.networkCardsUpdated || 0)) > 0 && (
                <div>
                  <span style={{ color: '#52c41a', fontWeight: 500 }}>✓</span> 网卡
                  {applyStats.networkCardsCreated > 0 && <> 新增{applyStats.networkCardsCreated}</>}
                  {applyStats.networkCardsUpdated > 0 && <> 更新{applyStats.networkCardsUpdated}</>}
                </div>
              )}
              {(applyStats.linked || 0) > 0 && (
                <div><span style={{ color: '#52c41a', fontWeight: 500 }}>{applyStats.linked}</span> 端口关联网卡</div>
              )}
              <div><span style={{ color: '#52c41a', fontWeight: 500 }}>+{applyStats.added || 0}</span> 新增端口</div>
              <div><span style={{ color: '#fa8c16', fontWeight: 500 }}>~{applyStats.changed || 0}</span> 变更</div>
              <div><span style={{ color: '#ff4d4f', fontWeight: 500 }}>-{applyStats.removed || 0}</span> 移除</div>
              {(applyStats.failed || 0) > 0 && <div><span style={{ color: '#ff4d4f', fontWeight: 500 }}>{applyStats.failed}</span> 失败</div>}
            </Space>
          )}
        </div>
      )}
    </Modal>
  );
}
