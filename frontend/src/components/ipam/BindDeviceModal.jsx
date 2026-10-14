/**
 * IP 绑定到设备弹窗
 * 弹窗打开时加载轻量设备列表（直接 axios，绕过 SWR 避免解包歧义）
 * 注意：api 实例已配置 response interceptor 自动解包，r 就是后端 body
 *
 * Bug 修复历史：
 * 1. 后端接口问题：改用轻量 /devices/simple 替代 /devices/all（19MB 响应）
 * 2. axios 解包问题：api.get().then(r => ...) 中的 r 已是后端 body，不需要 r.data
 * 3. Select 搜索问题：optionFilterProp 不能指向 JSX 对象的 label，需用纯字符串字段
 */
import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, Switch, Row, Col, Spin, Tag } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import api from '../../api/index';

const IP_TYPE_CONFIG = {
  management: { label: '带外管理', tagColor: 'red' },
  business:   { label: '带内业务', tagColor: 'blue' },
  public:     { label: '公网出口', tagColor: 'green' },
  storage:    { label: '存储网络', tagColor: 'purple' },
  other:      { label: '其他',     tagColor: 'default' },
};

const IP_TYPE_OPTIONS = Object.entries(IP_TYPE_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

export default function BindDeviceModal({ open, ip, onCancel, onSubmit, initialIpType }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [deviceOptions, setDeviceOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * 弹窗打开时加载轻量设备列表
   * 直接拿到后端 body，axios 已被 interceptor 解包
   */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get('/devices/simple', { params: { _t: Date.now() } })
      .then((body) => {
        // body 已是后端 JSON：{ success: true, devices: [...] }
        const list = body?.devices || [];
        setDeviceOptions(list.map((d) => {
          const name = d.name || d.deviceId || '未命名';
          const id = d.deviceId || '';
          const typeText = d.type || '';
          const ipText = d.ipAddress || '';
          const snText = d.serialNumber || '';
          const modelText = d.model || '';
          // searchText 是纯字符串，供 antd Select 搜索过滤使用（覆盖：名称、ID、IP、SN、型号、类型）
          const searchText = `${name} ${id} ${ipText} ${snText} ${modelText} ${typeText}`.toLowerCase();
          // label 用纯文本，[SN] 有值时显示
          const snLabel = snText ? ` [SN:${snText}]` : '';
          const label = ipText
            ? `${name} (${id}) [${ipText}]${snLabel}`
            : `${name} (${id})${snLabel}`;
          return {
            value: d.deviceId,
            label,
            searchText,
            raw: d,
          };
        }));
      })
      .catch(() => setDeviceOptions([]))
      .finally(() => setLoading(false));
  }, [open]);

  /** 弹窗打开时重置表单 */
  useEffect(() => {
    if (open && ip) {
      form.resetFields();
      form.setFieldsValue({
        ipType: initialIpType || ip.ipType || 'business',
        customTag: ip.customTag || '',
        setPrimary: false,
      });
    }
  }, [open, ip, form, initialIpType]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onSubmit(values);
    } catch (e) {
      // 表单校验错误或已在父级处理
    } finally {
      setSubmitting(false);
    }
  };

  /** 自定义搜索过滤：纯字符串匹配，label 和 searchText 都搜 */
  const filterOption = (inputValue, option) => {
    const kw = inputValue.toLowerCase().trim();
    if (!kw) return true;
    const st = option.searchText || '';
    const lb = (typeof option.label === 'string' ? option.label : '').toLowerCase();
    return st.includes(kw) || lb.includes(kw);
  };

  if (!ip) return null;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LinkOutlined />
          <span>绑定 IP 到设备</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText="确认绑定"
      cancelText="取消"
      confirmLoading={submitting}
      width={560}
      destroyOnClose
    >
      {/* 目标 IP 展示 */}
      <div
        style={{
          background: '#fafafa',
          borderRadius: 6,
          padding: '10px 14px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>目标 IP</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1677ff' }}>
          {ip.ipAddress}
        </span>
        <Tag color={IP_TYPE_CONFIG[ip.ipType]?.tagColor || 'default'}>
          {IP_TYPE_CONFIG[ip.ipType]?.label || ip.ipType}
        </Tag>
        <Tag color={ip.status === 'free' ? 'default' : 'blue'}>
          {ip.status === 'free' ? '空闲' : '已用'}
        </Tag>
      </div>

      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          {/* 设备选择 */}
          <Form.Item
            label="选择设备"
            name="deviceId"
            rules={[{ required: true, message: '请选择要绑定的设备' }]}
          >
            <Select
              showSearch
              placeholder="输入名称、ID、IP、SN 或型号筛选..."
              options={deviceOptions}
              filterOption={filterOption}
              listHeight={300}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item label="IP 业务类型" name="ipType">
                <Select options={IP_TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="是否主 IP" name="setPrimary" valuePropName="checked">
                <Switch checkedChildren="设为主 IP" unCheckedChildren="否" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="分组标签" name="customTag">
            <Input placeholder="如：主备、VIP、cluster（可选）" allowClear />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
}
