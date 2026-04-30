import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, OneToOneOutlined } from '@ant-design/icons';

const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onZoomReset }) => {
  const percent = Math.round(zoom * 100);

  return (
    <Space size={6} align="center" style={{ background: '#f8f9fa', padding: '6px 10px', borderRadius: 8 }}>
      <Tooltip title="缩小" placement="bottom">
        <button
          onClick={onZoomOut}
          disabled={zoom <= 0.3}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: zoom <= 0.3 ? '#f5f5f5' : '#fff',
            border: '1px solid #e8e8e8',
            borderRadius: 6,
            cursor: zoom <= 0.3 ? 'not-allowed' : 'pointer',
            color: zoom <= 0.3 ? '#d9d9d9' : '#595959',
            transition: 'all 0.2s',
            fontSize: 14,
          }}
          onMouseEnter={(e) => {
            if (zoom > 0.3) {
              e.target.style.background = '#e6f7ff';
              e.target.style.borderColor = '#91d5ff';
              e.target.style.color = '#1890ff';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.background = zoom <= 0.3 ? '#f5f5f5' : '#fff';
            e.target.style.borderColor = '#e8e8e8';
            e.target.style.color = zoom <= 0.3 ? '#d9d9d9' : '#595959';
          }}
        >
          <ZoomOutOutlined />
        </button>
      </Tooltip>

      <div style={{
        minWidth: 52,
        textAlign: 'center',
        fontSize: 11,
        color: '#595959',
        userSelect: 'none',
        fontWeight: 500,
        padding: '0 4px',
      }}>
        {percent}%
      </div>

      <Tooltip title="放大" placement="bottom">
        <button
          onClick={onZoomIn}
          disabled={zoom >= 2}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: zoom >= 2 ? '#f5f5f5' : '#fff',
            border: '1px solid #e8e8e8',
            borderRadius: 6,
            cursor: zoom >= 2 ? 'not-allowed' : 'pointer',
            color: zoom >= 2 ? '#d9d9d9' : '#595959',
            transition: 'all 0.2s',
            fontSize: 14,
          }}
          onMouseEnter={(e) => {
            if (zoom < 2) {
              e.target.style.background = '#e6f7ff';
              e.target.style.borderColor = '#91d5ff';
              e.target.style.color = '#1890ff';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.background = zoom >= 2 ? '#f5f5f5' : '#fff';
            e.target.style.borderColor = '#e8e8e8';
            e.target.style.color = zoom >= 2 ? '#d9d9d9' : '#595959';
          }}
        >
          <ZoomInOutlined />
        </button>
      </Tooltip>

      <Tooltip title="重置缩放" placement="bottom">
        <button
          onClick={onZoomReset}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            border: '1px solid #e8e8e8',
            borderRadius: 6,
            cursor: 'pointer',
            color: '#595959',
            transition: 'all 0.2s',
            fontSize: 14,
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#e6f7ff';
            e.target.style.borderColor = '#91d5ff';
            e.target.style.color = '#1890ff';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#fff';
            e.target.style.borderColor = '#e8e8e8';
            e.target.style.color = '#595959';
          }}
        >
          <OneToOneOutlined />
        </button>
      </Tooltip>
    </Space>
  );
};

export default ZoomControls;
