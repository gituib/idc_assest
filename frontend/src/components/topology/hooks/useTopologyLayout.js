import { useCallback } from 'react';
import dagre from 'dagre';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

export function useTopologyLayout() {
  const calculateLayout = useCallback((nodes, edges, options = {}) => {
    if (!nodes || nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const { layoutType = 'TB', centerNodeId = null } = options;

    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: layoutType,
      nodesep: 60,
      ranksep: 100,
      marginx: 30,
      marginy: 30
    });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach(node => {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach(edge => {
      g.setEdge(edge.source, edge.target);
    });

    dagre.layout(g);

    const positionedNodes = nodes.map(node => {
      const nodeData = g.node(node.id);
      if (!nodeData) return node;

      let x = nodeData.x - NODE_WIDTH / 2;
      let y = nodeData.y - NODE_HEIGHT / 2;

      if (centerNodeId && node.id === centerNodeId) {
        x = nodeData.x - NODE_WIDTH / 2;
        y = nodeData.y - NODE_HEIGHT / 2;
      }

      return {
        ...node,
        position: { x, y }
      };
    });

    return {
      nodes: positionedNodes,
      edges: edges.map(edge => ({
        ...edge,
        source: edge.source,
        target: edge.target
      }))
    };
  }, []);

  const getLayoutedElements = useCallback((centerDevice, connectedNodes, edges, options = {}) => {
    const allNodes = centerDevice ? [centerDevice, ...connectedNodes] : connectedNodes;
    const layouted = calculateLayout(allNodes, edges, options);
    return layouted;
  }, [calculateLayout]);

  return {
    calculateLayout,
    getLayoutedElements
  };
}
