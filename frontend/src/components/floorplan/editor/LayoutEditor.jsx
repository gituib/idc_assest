import React, { useState, useCallback } from 'react';
import { Button, Space, Modal, Form, InputNumber, message, Popconfirm } from 'antd';
import { SaveOutlined, CloseOutlined, UndoOutlined, ApartmentOutlined } from '@ant-design/icons';
import PositionValidator from './PositionValidator';

const LayoutEditor = ({ room, racks, editMode, onSave, onCancel, onInitLayout }) => {
  const [initModalVisible, setInitModalVisible] = useState(false);
  const [initForm] = Form.useForm();
  const [pendingPositions, setPendingPositions] = useState([]);

  const handleDragEnd = useCallback((rack, newRow, newCol) => {
    if (!room) return;

    const validation = PositionValidator.validate(
      rack,
      newRow,
      newCol,
      racks,
      room.gridRows,
      room.gridCols
    );

    if (!validation.valid) {
      message.warning(validation.error);
      return false;
    }

    setPendingPositions(prev => {
      const filtered = prev.filter(p => p.rackId !== rack.rackId);
      return [...filtered, { rackId: rack.rackId, rowPos: newRow, colPos: newCol, facing: rack.facing || 'front' }];
    });

    return true;
  }, [room, racks]);

  const handleSave = useCallback(async () => {
    if (pendingPositions.length === 0) {
      message.info('没有需要保存的更改');
      return;
    }

    const success = await onSave(pendingPositions);
    if (success) {
      setPendingPositions([]);
    }
  }, [pendingPositions, onSave]);

  const handleCancel = useCallback(() => {
    setPendingPositions([]);
    onCancel();
  }, [onCancel]);

  const handleInitLayout = useCallback(async () => {
    const values = await initForm.validateFields();
    const success = await onInitLayout(values.gridRows, values.gridCols);
    if (success) {
      setInitModalVisible(false);
      setPendingPositions([]);
    }
  }, [initForm, onInitLayout]);

  if (!editMode) return null;

  return (
    <>
      <Space
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff',
          padding: '8px 16px',
          borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          zIndex: 10,
        }}
      >
        <Button
          icon={<ApartmentOutlined />}
          onClick={() => {
            initForm.setFieldsValue({
              gridRows: room?.gridRows || 10,
              gridCols: room?.gridCols || 10,
            });
            setInitModalVisible(true);
          }}
        >
          初始化布局
        </Button>

        {pendingPositions.length > 0 && (
          <span style={{ color: '#faad14', fontSize: 12 }}>
            {pendingPositions.length} 处待保存
          </span>
        )}

        <Popconfirm
          title="确定取消编辑？未保存的更改将丢失"
          onConfirm={handleCancel}
          okText="确定"
          cancelText="继续编辑"
        >
          <Button icon={<CloseOutlined />}>取消</Button>
        </Popconfirm>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          disabled={pendingPositions.length === 0}
        >
          保存布局
        </Button>
      </Space>

      <Modal
        title="初始化机房布局"
        open={initModalVisible}
        onOk={handleInitLayout}
        onCancel={() => setInitModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={initForm} layout="vertical">
          <Form.Item
            name="gridRows"
            label="行数（排数）"
            rules={[{ required: true, message: '请输入行数' }]}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="gridCols"
            label="列数"
            rules={[{ required: true, message: '请输入列数' }]}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
        <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
          初始化将按行列顺序自动排列所有机柜，已有位置信息将被覆盖。
        </p>
      </Modal>
    </>
  );
};

export default LayoutEditor;
