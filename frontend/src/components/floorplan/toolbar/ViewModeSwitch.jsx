import React from 'react';
import { Radio, Select, Space } from 'antd';
import { AppstoreOutlined, FireOutlined, EditOutlined } from '@ant-design/icons';

const ViewModeSwitch = ({ viewMode, heatMapDimension, editMode, onViewModeChange, onEditModeChange }) => {
  return (
    <Space size={8}>
      <Radio.Group
        value={editMode ? 'edit' : viewMode}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'edit') {
            onEditModeChange(true);
            onViewModeChange('standard');
          } else {
            onEditModeChange(false);
            onViewModeChange(val);
          }
        }}
        optionType="button"
        buttonStyle="solid"
        size="small"
      >
        <Radio.Button value="standard">
          <AppstoreOutlined /> 标准
        </Radio.Button>
        <Radio.Button value="heatmap">
          <FireOutlined /> 热力图
        </Radio.Button>
        <Radio.Button value="edit">
          <EditOutlined /> 编辑
        </Radio.Button>
      </Radio.Group>

      {viewMode === 'heatmap' && !editMode && (
        <Select
          value={heatMapDimension}
          onChange={(val) => onViewModeChange('heatmap', val)}
          size="small"
          style={{ width: 120 }}
          options={[
            { value: 'utilization', label: 'U位使用率' },
            { value: 'power', label: '功率负载' },
            { value: 'density', label: '设备密度' },
          ]}
        />
      )}
    </Space>
  );
};

export default ViewModeSwitch;
