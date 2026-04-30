import React from 'react';
import { Tag } from 'antd';
import {
  DatabaseOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StopOutlined,
  ThunderboltOutlined,
  BulbOutlined,
} from '@ant-design/icons';

const FloorPlanStats = ({ stats }) => {
  if (!stats) return null;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 8,
      padding: 12,
      border: '1px solid #e8e8e8',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DatabaseOutlined style={{ color: '#1677ff', fontSize: 14 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.85)' }}>
            概览
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
          {stats.totalRacks} 台
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1677ff', lineHeight: 1.2 }}>
            {stats.activeRacks}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.65)', marginTop: 2 }}>
            在用
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#faad14', lineHeight: 1.2 }}>
            {stats.maintenanceRacks}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.65)', marginTop: 2 }}>
            维护
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#bfbfbf', lineHeight: 1.2 }}>
            {stats.inactiveRacks}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.65)', marginTop: 2 }}>
            停用
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          background: '#f5f5f5',
          borderRadius: 6,
          padding: '6px 8px',
        }}>
          <BulbOutlined style={{ fontSize: 12, color: '#1677ff' }} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>
            {Math.round((stats.avgUtilization || 0) * 100)}%
          </span>
        </div>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          background: '#fff7e6',
          borderRadius: 6,
          padding: '6px 8px',
        }}>
          <ThunderboltOutlined style={{ fontSize: 12, color: '#faad14' }} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>
            {stats.totalCurrentPower || 0}W
          </span>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanStats;
