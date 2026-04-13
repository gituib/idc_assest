import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Spin, message, Alert, Space } from 'antd';
import {
  SwapOutlined,
  CloudServerOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { motion } from 'framer-motion';
import { designTokens } from '../../config/theme';
import TopologyGraph from './TopologyGraph';
import TopologySidebar from './TopologySidebar';
import TopologyControls from './TopologyControls';
import { useTopologyLayout } from './hooks/useTopologyLayout';

function TopologyModal({ visible, onClose }) {
  const [switchDevices, setSwitchDevices] = useState([]);
  const [selectedSwitchId, setSelectedSwitchId] = useState(null);
  const [topologyData, setTopologyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const { calculateLayout } = useTopologyLayout();

  const fetchSwitchDevices = useCallback(async () => {
    try {
      const response = await axios.get('/api/devices/all', {
        params: { pageSize: 50000, type: 'switch' }
      });
      setSwitchDevices(response.data.devices || []);
    } catch (err) {
      console.error('获取交换机列表失败:', err);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchSwitchDevices();
    }
  }, [visible, fetchSwitchDevices]);

  const handleSwitchChange = useCallback(async (switchId) => {
    setSelectedSwitchId(switchId);
    setSelectedNode(null);
    setSelectedEdge(null);
    setTopologyData(null);
    setError(null);

    if (!switchId) return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/topology/switch/${switchId}`, {
        params: { maxNodes: 100 }
      });

      if (response.data.success) {
        setTopologyData(response.data.data);
      } else {
        setError(response.data.error || '获取拓扑数据失败');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || '获取拓扑数据失败';
      setError(errorMessage);
      console.error('获取拓扑数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node.data || node);
    setSelectedEdge(null);
    setSidebarVisible(true);
  }, []);

  const handleEdgeClick = useCallback((edge) => {
    setSelectedEdge(edge.data || edge);
    setSelectedNode(null);
    setSidebarVisible(true);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarVisible(false);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const layoutedElements = React.useMemo(() => {
    if (!topologyData) return { nodes: [], edges: [] };

    const centerDevice = topologyData.centerDevice;
    const connectedNodes = topologyData.nodes || [];
    const edges = topologyData.edges || [];

    const allNodes = centerDevice ? [centerDevice, ...connectedNodes] : connectedNodes;
    return calculateLayout(allNodes, edges, {
      layoutType: 'TB',
      centerNodeId: centerDevice?.deviceId
    });
  }, [topologyData, calculateLayout]);

  const handleClose = useCallback(() => {
    setSelectedSwitchId(null);
    setTopologyData(null);
    setError(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: designTokens.colors.primary.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}
          >
            <SwapOutlined />
          </div>
          <span style={{ fontSize: 18, fontWeight: 600 }}>接线拓扑图</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      width="90%"
      style={{ top: 20 }}
      bodyStyle={{ padding: '16px 24px', height: 'calc(100vh - 180px)' }}
      footer={null}
      destroyOnClose
    >
      <div style={{ display: 'flex', height: '100%', gap: 16 }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          <TopologyControls
            switchDevices={switchDevices}
            selectedSwitchId={selectedSwitchId}
            onSwitchChange={handleSwitchChange}
            loading={loading}
            onRefresh={fetchSwitchDevices}
            statistics={topologyData?.statistics}
          />

          {topologyData?.statistics && (
            <div style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 }}>
              数据更新时间: {new Date().toLocaleTimeString()}
            </div>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          {loading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              background: 'rgba(255,255,255,0.9)',
              padding: 24,
              borderRadius: 8
            }}>
              <Spin size="large" tip="加载拓扑数据..." />
            </div>
          )}

          {error && (
            <div style={{ padding: 16 }}>
              <Alert
                type="error"
                message={error}
                showIcon
                style={{ marginBottom: 16 }}
              />
            </div>
          )}

          {!loading && !error && !selectedSwitchId && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <CloudServerOutlined style={{ fontSize: 48, color: '#ccc' }} />
              <div style={{ marginTop: 16, color: '#999' }}>
                请从左侧选择交换机以生成拓扑图
              </div>
            </div>
          )}

          <div style={{ width: '100%', height: '100%' }}>
            <TopologyGraph
              nodes={layoutedElements.nodes}
              edges={layoutedElements.edges}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
            />
          </div>
        </div>

        <TopologySidebar
          visible={sidebarVisible}
          onClose={handleSidebarClose}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          data={topologyData}
        />
      </div>
    </Modal>
  );
}

export default TopologyModal;
