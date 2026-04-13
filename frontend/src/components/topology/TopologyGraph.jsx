import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, Tag, Badge, Typography } from 'antd';
import {
  CloudServerOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  SwapOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { SwitchNode, ServerNode, RouterNode, StorageNode, GenericNode, FirewallNode } from './nodes';

const { Text: AntText } = Typography;

const DEVICE_COLORS = {
  switch: '#1890ff',
  router: '#722ed1',
  server: '#52c41a',
  storage: '#fa8c16',
  firewall: '#eb595a',
  default: '#8c8c8c'
};

const DEVICE_ICONS = {
  switch: AppstoreOutlined,
  router: SwapOutlined,
  server: CloudServerOutlined,
  storage: DatabaseOutlined,
  firewall: SafetyOutlined,
  default: CloudServerOutlined
};

const CABLE_COLORS = {
  ethernet: '#1890ff',
  fiber: '#13c2c2',
  copper: '#fa8c16'
};

const STATUS_COLORS = {
  online: '#52c41a',
  offline: '#d9d9d9',
  fault: '#ff4d4f',
  warning: '#faad14'
};

function DeviceNode({ data }) {
  if (!data) {
    return (
      <Card size="small" style={{ width: 180 }}>
        <AntText type="secondary">无数据</AntText>
      </Card>
    );
  }

  const nodeType = data.type || 'default';

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#555', width: 8, height: 8 }} />
      {nodeType === 'switch' && <SwitchNode data={data} />}
      {nodeType === 'server' && <ServerNode data={data} />}
      {nodeType === 'router' && <RouterNode data={data} />}
      {nodeType === 'storage' && <StorageNode data={data} />}
      {nodeType === 'firewall' && <FirewallNode data={data} />}
      {(nodeType === 'default' || !['switch', 'server', 'router', 'storage', 'firewall'].includes(nodeType)) && <GenericNode data={data} />}
      <Handle type="source" position={Position.Right} style={{ background: '#555', width: 8, height: 8 }} />
    </>
  );
}

const nodeTypes = {
  device: DeviceNode
};

function TopologyGraph({ nodes, edges, onNodeClick, onEdgeClick, selectedNode, selectedEdge }) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    setFlowNodes(prevNodes => {
      const newNodes = nodes.map(node => {
        const existingNode = prevNodes.find(n => n.id === node.id);
        const position = existingNode?.position || node.position || { x: Math.random() * 400, y: Math.random() * 300 };

        return {
          id: node.id,
          type: 'device',
          position,
          data: {
            ...node,
            selected: selectedNode?.id === node.id,
            hovered: hoveredNodeId === node.id
          },
          selected: selectedNode?.id === node.id
        };
      });
      return newNodes;
    });
    initializedRef.current = true;
  }, [nodes, selectedNode, hoveredNodeId]);

  useEffect(() => {
    if (!edges || edges.length === 0) return;

    setFlowEdges(edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'default',
      animated: edge.status === 'fault',
      style: {
        stroke: edge.status === 'fault' ? '#ff4d4f' :
                edge.status === 'disconnected' ? '#d9d9d9' :
                CABLE_COLORS[edge.cableType] || '#8c8c8c',
        strokeWidth: edge.status === 'fault' ? 3 : 2,
        strokeDasharray: edge.status === 'disconnected' ? '5,5' : '0',
      },
      data: edge,
      selected: selectedEdge?.id === edge.id
    })));
  }, [edges, selectedEdge]);

  const onNodeClickHandler = useCallback((event, node) => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

  const onEdgeClickHandler = useCallback((event, edge) => {
    if (onEdgeClick) {
      onEdgeClick(edge);
    }
  }, [onEdgeClick]);

  const onNodeMouseEnterHandler = useCallback((event, node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeaveHandler = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <AntText type="secondary">暂无拓扑数据</AntText>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClickHandler}
      onEdgeClick={onEdgeClickHandler}
      onNodeMouseEnter={onNodeMouseEnterHandler}
      onNodeMouseLeave={onNodeMouseLeaveHandler}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-left"
      style={{ background: '#fafafa' }}
      defaultEdgeOptions={{
        type: 'default',
        animated: false
      }}
    >
      <Background color="#e0e0e0" gap={20} />
      <Controls
        showZoom={true}
        showFitView={true}
        showInteractive={false}
      />
      <MiniMap
        nodeColor={(node) => {
          const type = node.data?.type;
          switch (type) {
            case 'switch': return '#1890ff';
            case 'router': return '#722ed1';
            case 'server': return '#52c41a';
            case 'storage': return '#fa8c16';
            case 'firewall': return '#eb595a';
            default: return '#8c8c8c';
          }
        }}
        maskColor="rgba(0,0,0,0.1)"
        style={{ border: '1px solid #e0e0e0', borderRadius: 8 }}
      />

      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: 'rgba(255,255,255,0.9)',
        padding: '12px 16px',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        fontSize: 12,
        zIndex: 5
      }}>
        <div style={{ marginBottom: 8, fontWeight: 600, color: '#262626' }}>设备类型</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: '#1890ff', borderRadius: 2 }} />
            <span>交换机</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: '#722ed1', borderRadius: 2 }} />
            <span>路由器</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: '#52c41a', borderRadius: 2 }} />
            <span>服务器</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: '#fa8c16', borderRadius: 2 }} />
            <span>存储</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, background: '#eb595a', borderRadius: 2 }} />
            <span>防火墙</span>
          </div>
        </div>
        <div style={{ marginTop: 8, marginBottom: 4, fontWeight: 600, color: '#262626' }}>线缆类型</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 20, height: 2, background: '#1890ff' }} />
            <span>网线</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 20, height: 2, background: '#13c2c2' }} />
            <span>光纤</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 20, height: 2, background: '#fa8c16' }} />
            <span>铜缆</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 20, height: 2, background: '#ff4d4f', borderStyle: 'dashed' }} />
            <span>故障</span>
          </div>
        </div>
      </div>
    </ReactFlow>
  );
}

export default TopologyGraph;
