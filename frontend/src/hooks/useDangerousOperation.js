import React, { useState, useEffect } from 'react';
import { Modal, Input, Alert, Typography, Descriptions, Divider } from 'antd';
import { WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import {
  RISK_LEVEL,
  RISK_CONFIG,
  OPERATION_TYPES,
  OPERATION_LABELS,
  ENTITY_LABELS,
  getRiskLevel,
} from '../config/dangerousOperationConfig';

const { Text, Paragraph } = Typography;

export const useDangerousOperation = () => {
  const confirm = async ({
    operationType = OPERATION_TYPES.DELETE_SINGLE,
    entityType = 'item',
    items = [],
    itemCount = 1,
    title = '',
    description = '',
    impactDetails = {},
    onConfirm,
    onCancel,
  }) => {
    const riskLevel = getRiskLevel(operationType, itemCount, {
      isSystemLevel: impactDetails.isSystemLevel,
      hasRelatedData: impactDetails.relatedDataCount > 0,
    });

    const config = RISK_CONFIG[riskLevel];
    const entityLabel = ENTITY_LABELS[entityType] || entityType;
    const operationLabel = OPERATION_LABELS[operationType] || operationType;

    return new Promise(resolve => {
      const modalKey = `dangerous-${Date.now()}`;

      const handleOk = () => {
        Modal.confirm({
          title: '确认执行此操作？',
          content: '此操作不可逆，请再次确认。',
          okText: '确认执行',
          okType: 'danger',
          cancelText: '取消',
          onOk: async () => {
            try {
              if (onConfirm) {
                await onConfirm();
              }
              resolve(true);
            } catch (error) {
              resolve(false);
            }
          },
          onCancel: () => {
            if (onCancel) onCancel();
            resolve(false);
          },
        });
      };

      const renderContent = () => {
        const impactText = renderImpactDetails(impactDetails, entityLabel);

        return (
          <div style={styles.contentContainer}>
            <Alert
              message={
                <Text strong style={{ color: config.color }}>
                  {config.icon} {config.title}
                </Text>
              }
              description={
                <Paragraph style={{ marginBottom: 0 }}>
                  {description ||
                    `您即将${operationLabel} ${itemCount > 1 ? `${itemCount} 个` : '1 个'}${entityLabel}。`}
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    此操作不可逆，一旦删除将无法恢复。
                  </Text>
                </Paragraph>
              }
              type={
                riskLevel === RISK_LEVEL.EXTREME
                  ? 'error'
                  : riskLevel === RISK_LEVEL.HIGH
                    ? 'warning'
                    : 'info'
              }
              style={{
                backgroundColor: config.bgColor,
                borderColor: config.borderColor,
                marginBottom: 16,
              }}
            />

            {config.showImpactDetails && impactText && (
              <>
                <div style={styles.impactSection}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    <InfoCircleOutlined /> 影响范围：
                  </Text>
                  {impactText}
                </div>
                <Divider style={{ margin: '12px 0' }} />
              </>
            )}

            {riskLevel === RISK_LEVEL.EXTREME && config.requireKeyword && (
              <div style={styles.keywordSection}>
                <Alert
                  message={
                    <Text>
                      为确认此操作，请输入{' '}
                      <Text code strong>
                        CONFIRM
                      </Text>
                      ：
                    </Text>
                  }
                  type="error"
                  style={{ marginBottom: 8 }}
                />
                <Input
                  id={`keyword-input-${modalKey}`}
                  placeholder="请输入 CONFIRM"
                  onChange={e => {
                    const inputValue = e.target.value;
                    const okButton = document.querySelector('.ant-modal-confirm .ant-btn-primary');
                    if (okButton) {
                      okButton.disabled = inputValue !== config.keyword;
                    }
                  }}
                />
              </div>
            )}
          </div>
        );
      };

      const renderImpactDetails = (details, entityLabel) => {
        if (!details || Object.keys(details).length === 0) return null;

        const items = [];

        if (details.relatedDevices) {
          items.push(`关联设备：${details.relatedDevices} 个`);
        }
        if (details.relatedCables) {
          items.push(`关联接线：${details.relatedCables} 条`);
        }
        if (details.relatedPorts) {
          items.push(`关联端口：${details.relatedPorts} 个`);
        }
        if (details.relatedNetworkCards) {
          items.push(`关联网卡：${details.relatedNetworkCards} 张`);
        }
        if (details.relatedTickets) {
          items.push(`关联工单：${details.relatedTickets} 个`);
        }
        if (details.relatedDataCount > 0) {
          items.push(`其他关联数据：${details.relatedDataCount} 项`);
        }

        return items.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : null;
      };

      Modal.confirm({
        title: (
          <span style={{ color: config.color }}>
            {config.icon} {title || `${operationLabel}确认`}
          </span>
        ),
        icon: <WarningOutlined style={{ color: config.color }} />,
        content: renderContent(),
        okText: '确认',
        okType: 'danger',
        cancelText: '取消',
        okButtonProps: {
          disabled: riskLevel === RISK_LEVEL.EXTREME,
        },
        width: 520,
        onOk: handleOk,
        onCancel: () => {
          if (onCancel) onCancel();
          resolve(false);
        },
      });
    });
  };

  const logOperation = async ({
    operationType,
    targetType,
    targetId,
    targetName,
    metadata = {},
    success = true,
  }) => {
    try {
      await axios.post('/api/operation-logs/dangerous', {
        operationType,
        targetType,
        targetId,
        targetName,
        metadata,
        success,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log dangerous operation:', error);
    }
  };

  return { confirm, logOperation };
};

export const confirmDangerousOperation = async options => {
  const hook = useDangerousOperation();
  return hook.confirm(options);
};

export default useDangerousOperation;
