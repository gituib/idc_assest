import React from 'react';
import { Modal, Button, Space, Divider, Alert } from 'antd';
import {
  SwapOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import CloseButton from './CloseButton';
import { designTokens } from '../config/theme';

const PortAddGuideModal = ({ visible, onClose, onSelectType }) => {
  const handleSelectSwitch = () => {
    onSelectType('switch');
    onClose();
  };

  const handleSelectServer = () => {
    onSelectType('server');
    onClose();
  };

  return (
    <Modal
      open={visible}
      closeIcon={<CloseButton />}
      onCancel={onClose}
      footer={null}
      width={560}
      zIndex={1050}
      style={{ borderRadius: '16px', top: 80 }}
      styles={{ body: { padding: 0 } }}
      destroyOnClose
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.primary.dark} 100%)`,
          padding: '28px 24px',
          borderRadius: '16px 16px 0 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <SwapOutlined style={{ fontSize: '26px' }} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                color: '#fff',
                fontSize: '20px',
                fontWeight: 600,
              }}
            >
              选择端口类型
            </h3>
            <p
              style={{
                margin: '4px 0 0',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '13px',
              }}
            >
              请选择要添加的端口类型
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={handleSelectSwitch}
            style={{
              padding: '24px 20px',
              border: `2px solid ${designTokens.colors.success.light}40`,
              borderRadius: '14px',
              background: designTokens.colors.success.bg,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = designTokens.colors.success.main;
              e.currentTarget.style.boxShadow = `0 4px 16px ${designTokens.colors.success.light}30`;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = `${designTokens.colors.success.light}40`;
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: designTokens.colors.success.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <SwapOutlined style={{ fontSize: '28px' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: designTokens.colors.neutral[800],
                  marginBottom: '4px',
                }}
              >
                交换机端口
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: designTokens.colors.neutral[500],
                }}
              >
                直接添加端口
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: designTokens.colors.success.main,
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <span>立即添加</span>
              <ArrowRightOutlined style={{ fontSize: '11px' }} />
            </div>
          </button>

          <button
            onClick={handleSelectServer}
            style={{
              padding: '24px 20px',
              border: `2px solid ${designTokens.colors.primary.light}40`,
              borderRadius: '14px',
              background: designTokens.colors.primary.bg,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = designTokens.colors.primary.main;
              e.currentTarget.style.boxShadow = `0 4px 16px ${designTokens.colors.primary.light}30`;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = `${designTokens.colors.primary.light}40`;
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: designTokens.colors.primary.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <CloudServerOutlined style={{ fontSize: '28px' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: designTokens.colors.neutral[800],
                  marginBottom: '4px',
                }}
              >
                服务器端口
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: designTokens.colors.neutral[500],
                }}
              >
                需关联网卡
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: designTokens.colors.primary.main,
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <span>立即添加</span>
              <ArrowRightOutlined style={{ fontSize: '11px' }} />
            </div>
          </button>
        </div>

        <Divider style={{ margin: '0 0 20px' }}>
          <span
            style={{
              fontSize: '12px',
              color: designTokens.colors.neutral[400],
              fontWeight: 400,
            }}
          >
            端口类型说明
          </span>
        </Divider>

        <div
          style={{
            background: designTokens.colors.neutral[50],
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${designTokens.colors.neutral[200]}`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircleOutlined
                style={{
                  color: designTokens.colors.success.main,
                  fontSize: '16px',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: designTokens.colors.neutral[800],
                    marginBottom: '2px',
                  }}
                >
                  交换机端口
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: designTokens.colors.neutral[500],
                    lineHeight: 1.6,
                  }}
                >
                  交换机端口用于网络设备间的连接，可以直接创建端口，无需关联网卡。适用于创建 Uplink
                  端口、Trunk 端口等。
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <ExclamationCircleOutlined
                style={{
                  color: designTokens.colors.warning.main,
                  fontSize: '16px',
                  marginTop: '2px',
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: designTokens.colors.neutral[800],
                    marginBottom: '2px',
                  }}
                >
                  服务器端口
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: designTokens.colors.neutral[500],
                    lineHeight: 1.6,
                  }}
                >
                  服务器端口必须关联网卡（Network
                  Card），每个端口需要对应一个物理或虚拟网卡。请先在网卡管理中添加网卡。
                </div>
              </div>
            </div>
          </div>
        </div>

        <Alert
          message=""
          description={
            <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
              <strong>提示：</strong>
              如果服务器尚未添加网卡，系统会引导您先前往网卡管理添加网卡后再创建端口。
            </div>
          }
          type="info"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{
            marginTop: '16px',
            borderRadius: '8px',
            background: designTokens.colors.info.bg,
            border: `1px solid ${designTokens.colors.info.light}40`,
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '20px',
          }}
        >
          <Button onClick={onClose} style={{ borderRadius: '8px' }}>
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PortAddGuideModal;
