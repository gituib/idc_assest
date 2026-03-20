import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, Alert, Typography, Space, Divider, Spin } from 'antd';
import { WarningOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import {
  RISK_LEVEL,
  RISK_CONFIG,
  OPERATION_TYPES,
  OPERATION_LABELS,
  ENTITY_LABELS,
  getRiskLevel,
} from '../config/dangerousOperationConfig';

const { Text, Paragraph, Title } = Typography;

export const DangerConfirmModal = ({
  open,
  operationType = OPERATION_TYPES.DELETE_SINGLE,
  entityType = 'item',
  items = [],
  itemCount = 1,
  title = '',
  description = '',
  impactDetails = {},
  onConfirm,
  onCancel,
  okText = '确认',
  cancelText = '取消',
}) => {
  const [keyword, setKeyword] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const inputRef = useRef(null);

  const riskLevel = getRiskLevel(operationType, itemCount, {
    isSystemLevel: impactDetails.isSystemLevel,
    hasRelatedData: impactDetails.relatedDataCount > 0,
  });

  const config = RISK_CONFIG[riskLevel];
  const entityLabel = ENTITY_LABELS[entityType] || entityType;
  const operationLabel = OPERATION_LABELS[operationType] || operationType;

  const isKeywordRequired = riskLevel === RISK_LEVEL.EXTREME && config.requireKeyword;
  const isKeywordValid = !isKeywordRequired || keyword.toUpperCase() === config.keyword;

  useEffect(() => {
    if (open && isKeywordRequired) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open, isKeywordRequired]);

  useEffect(() => {
    if (!open) {
      setKeyword('');
      setConfirmLoading(false);
    }
  }, [open]);

  const handleOk = async () => {
    if (!isKeywordValid) return;

    setConfirmLoading(true);
    try {
      await onConfirm?.();
    } finally {
      setConfirmLoading(false);
    }
  };

  const renderImpactDetails = () => {
    if (!impactDetails || Object.keys(impactDetails).length === 0) return null;

    const items = [];

    if (impactDetails.relatedDevices !== undefined) {
      items.push({ label: '关联设备', value: `${impactDetails.relatedDevices} 个` });
    }
    if (impactDetails.relatedCables !== undefined) {
      items.push({ label: '关联接线', value: `${impactDetails.relatedCables} 条` });
    }
    if (impactDetails.relatedPorts !== undefined) {
      items.push({ label: '关联端口', value: `${impactDetails.relatedPorts} 个` });
    }
    if (impactDetails.relatedNetworkCards !== undefined) {
      items.push({ label: '关联网卡', value: `${impactDetails.relatedNetworkCards} 张` });
    }
    if (impactDetails.relatedTickets !== undefined) {
      items.push({ label: '关联工单', value: `${impactDetails.relatedTickets} 个` });
    }
    if (impactDetails.relatedRacks !== undefined) {
      items.push({ label: '关联机柜', value: `${impactDetails.relatedRacks} 个` });
    }
    if (impactDetails.relatedRooms !== undefined) {
      items.push({ label: '关联机房', value: `${impactDetails.relatedRooms} 个` });
    }
    if (impactDetails.relatedDataCount > 0) {
      items.push({ label: '其他关联数据', value: `${impactDetails.relatedDataCount} 项` });
    }
    if (impactDetails.totalAffected !== undefined) {
      items.push({ label: '总影响数量', value: `${impactDetails.totalAffected} 项` });
    }

    if (items.length === 0) return null;

    return (
      <div style={styles.impactSection}>
        <Text strong style={{ display: 'block', marginBottom: 8, color: config.color }}>
          ⚠️ 影响范围
        </Text>
        <div style={styles.impactList}>
          {items.map((item, index) => (
            <div key={index} style={styles.impactItem}>
              <Text type="secondary">{item.label}：</Text>
              <Text strong>{item.value}</Text>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div style={styles.contentContainer}>
        <Alert
          message={
            <Space>
              <WarningOutlined style={{ color: config.color }} />
              <Text strong style={{ color: config.color, fontSize: 16 }}>
                {config.title}
              </Text>
            </Space>
          }
          description={
            <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
              {description || `确定要${operationLabel} ${itemCount > 1 ? `${itemCount} 个` : '该'}${entityLabel}吗？`}
            </Paragraph>
          }
          type={riskLevel === RISK_LEVEL.EXTREME ? 'error' : riskLevel === RISK_LEVEL.HIGH ? 'warning' : 'info'}
          style={{
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          }}
        />

        <Divider style={{ margin: '16px 0' }} />

        {riskLevel !== RISK_LEVEL.LOW && (
          <div style={styles.warningBox}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
              此操作不可逆，一旦删除将无法恢复
            </Text>
          </div>
        )}

        {config.showImpactDetails && renderImpactDetails()}

        {isKeywordRequired && (
          <div style={styles.keywordSection}>
            <Divider style={{ margin: '16px 0' }} />
            <Alert
              message={
                <Text>
                  为确认此{operationLabel}操作，请输入确认关键词：
                  <Text code strong style={{ marginLeft: 8, fontSize: 14 }}>
                    {config.keyword}
                  </Text>
                </Text>
              }
              type="error"
              style={{ marginBottom: 12 }}
              showIcon
            />
            <Input
              ref={inputRef}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={`请输入 ${config.keyword}`}
              status={keyword && !isKeywordValid ? 'error' : undefined}
              onPressEnter={handleOk}
              style={{ fontSize: 16, textAlign: 'center', letterSpacing: 2 }}
            />
            {keyword && !isKeywordValid && (
              <Text type="danger" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                关键词不正确，请重新输入
              </Text>
            )}
          </div>
        )}

        {itemCount > 1 && itemCount <= 5 && items.length > 0 && (
          <div style={styles.itemPreview}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              即将删除：
            </Text>
            <div style={styles.itemList}>
              {items.slice(0, 5).map((item, index) => (
                <Text key={index} style={styles.itemTag}>
                  {typeof item === 'string' ? item : item.name || item.label || item}
                </Text>
              ))}
              {itemCount > 5 && (
                <Text type="secondary">...还有 {itemCount - 5} 项</Text>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: config.color }} />
          <span style={{ color: config.color }}>
            {title || `${operationLabel}确认`}
          </span>
        </Space>
      }
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{
        danger: true,
        disabled: !isKeywordValid,
        loading: confirmLoading,
      }}
      cancelButtonProps={{
        disabled: confirmLoading,
      }}
      width={520}
      centered
      maskClosable={!confirmLoading}
      closable={!confirmLoading}
    >
      <Spin spinning={confirmLoading} tip="正在执行操作...">
        {renderContent()}
      </Spin>
    </Modal>
  );
};

const styles = {
  contentContainer: {
    padding: '8px 0',
  },
  impactSection: {
    backgroundColor: '#fafafa',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid #f0f0f0',
  },
  impactList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  impactItem: {
    display: 'flex',
    alignItems: 'center',
  },
  warningBox: {
    backgroundColor: '#fff2f0',
    padding: '10px 14px',
    borderRadius: 6,
    border: '1px solid #ffccc7',
  },
  keywordSection: {
    marginTop: 8,
  },
  itemPreview: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  itemList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  itemTag: {
    backgroundColor: '#fff',
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    fontSize: 12,
  },
};

export default DangerConfirmModal;
