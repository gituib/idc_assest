import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, OneToOneOutlined } from '@ant-design/icons';
import { ZoomControlsWrapper, ZoomPercent } from '../styles';

const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onZoomReset }) => {
  const percent = Math.round(zoom * 100);

  return (
    <ZoomControlsWrapper>
      <Tooltip title="缩小" placement="bottom">
        <Button
          type="text"
          size="small"
          icon={<ZoomOutOutlined />}
          onClick={onZoomOut}
          disabled={zoom <= 0.3}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      </Tooltip>

      <ZoomPercent>{percent}%</ZoomPercent>

      <Tooltip title="放大" placement="bottom">
        <Button
          type="text"
          size="small"
          icon={<ZoomInOutlined />}
          onClick={onZoomIn}
          disabled={zoom >= 2}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      </Tooltip>

      <Tooltip title="重置缩放" placement="bottom">
        <Button
          type="text"
          size="small"
          icon={<OneToOneOutlined />}
          onClick={onZoomReset}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      </Tooltip>
    </ZoomControlsWrapper>
  );
};

export default ZoomControls;
