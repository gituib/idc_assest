import React from 'react';
import { Modal, Button, Typography, Divider } from 'antd';
import {
  ImportOutlined,
  InfoCircleOutlined,
  CloudServerOutlined as ServerOutlined,
  SwapOutlined as SwitcherOutlined,
} from '@ant-design/icons';
import { designTokens } from '../config/theme';
import CloseButton from './CloseButton';

const { Paragraph } = Typography;

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
            icon={<ServerOutlined />}
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
            <div style={{ fontSize: '16px', fontWeight: 600 }}>服务器批量导入</div>
            <div
              style={{ fontSize: '12px', color: designTokens.colors.neutral[500], fontWeight: 400 }}
            >
              同时导入网卡和端口
            </div>
          </Button>

          <Button
            size="large"
            icon={<SwitcherOutlined />}
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
            <div style={{ fontSize: '16px', fontWeight: 600 }}>交换机设备</div>
            <div
              style={{ fontSize: '12px', color: designTokens.colors.neutral[500], fontWeight: 400 }}
            >
              直接导入端口
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
                导入流程说明
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
                  <strong>服务器批量导入：</strong>通过一个模板文件同时导入网卡和端口数据。
                  系统会先导入网卡数据，再导入端口数据，自动关联网卡。
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>交换机设备：</strong>可直接批量导入端口，无需先导入网卡
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong>操作步骤：</strong>
                </div>
                <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                  <div>1. 点击对应设备类型的按钮</div>
                  <div>2. 下载导入模板并填写数据</div>
                  <div>3. 上传模板文件并开始导入</div>
                  <div>4. 查看导入结果</div>
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
