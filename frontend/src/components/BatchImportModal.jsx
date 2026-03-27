import React from 'react';
import { Modal, Button, Typography, Divider } from 'antd';
import {
  ImportOutlined,
  CloudServerOutlined,
  ApiOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { designTokens } from '../config/theme';
import CloseButton from './CloseButton';

const { Text, Paragraph } = Typography;

function BatchImportModal({ visible, onClose, onImportNetworkCard, onImportPort }) {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: designTokens.borderRadius.md,
              background: designTokens.colors.primary.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <ImportOutlined />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 600 }}>批量导入</span>
        </div>
      }
      open={visible}
      closeIcon={<CloseButton />}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <div style={{ padding: '16px 0' }}>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <Button
            size="large"
            icon={<CloudServerOutlined />}
            onClick={() => {
              onClose();
              onImportNetworkCard();
            }}
            style={{
              flex: 1,
              height: '80px',
              borderRadius: designTokens.borderRadius.md,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600 }}>批量导入网卡</div>
            <div
              style={{ fontSize: '12px', color: designTokens.colors.neutral[500], fontWeight: 400 }}
            >
              用于服务器设备
            </div>
          </Button>

          <Button
            size="large"
            icon={<ApiOutlined />}
            onClick={() => {
              onClose();
              onImportPort();
            }}
            style={{
              flex: 1,
              height: '80px',
              borderRadius: designTokens.borderRadius.md,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 600 }}>批量导入端口</div>
            <div
              style={{ fontSize: '12px', color: designTokens.colors.neutral[500], fontWeight: 400 }}
            >
              用于所有设备
            </div>
          </Button>
        </div>

        <Divider style={{ margin: '0 0 16px 0' }} />

        <div
          style={{
            padding: '16px',
            background: designTokens.colors.info.bg,
            borderRadius: designTokens.borderRadius.md,
            border: `1px solid ${designTokens.colors.info.light}40`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <InfoCircleOutlined
              style={{
                fontSize: '18px',
                color: designTokens.colors.info.main,
                marginTop: '2px',
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: designTokens.colors.info.dark,
                  marginBottom: '8px',
                }}
              >
                交换机与服务器导入说明
              </div>
              <Paragraph
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: designTokens.colors.neutral[700],
                  lineHeight: '1.8',
                }}
              >
                <div style={{ marginBottom: '4px' }}>
                  <strong>交换机端口：</strong>可直接批量导入端口，无需先导入网卡
                </div>
                <div>
                  <strong>服务器端口：</strong>必须先在"网卡管理"中添加网卡，才能导入端口。
                  服务器的网卡和端口是层级关系：设备 → 网卡 → 端口
                </div>
              </Paragraph>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default BatchImportModal;
