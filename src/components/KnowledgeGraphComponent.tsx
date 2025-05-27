import React, { useEffect, useRef, useState } from 'react';
import { useKnowledgeGraph } from '../hooks/useKnowledgeGraph';
import type { KnowledgeNode, KnowledgeRelationship } from '../services/apiService';

interface KnowledgeGraphComponentProps {
  documentId?: string;
  onNodeClick?: (node: KnowledgeNode) => void;
  onNodeDoubleClick?: (node: KnowledgeNode) => void;
  height?: number;
  className?: string;
}

interface Position {
  x: number;
  y: number;
}

interface NodePosition extends KnowledgeNode {
  position: Position;
  color: string;
}

export const KnowledgeGraphComponent: React.FC<KnowledgeGraphComponentProps> = ({
  documentId,
  onNodeClick,
  onNodeDoubleClick,
  height = 600,
  className = "",
}) => {
  const {
    graphData,
    stats,
    isConnected,
    isLoading,    error,
    loadGraph,
    createNode,
    deleteNode,
    clearError,
  } = useKnowledgeGraph({ autoLoad: true });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<KnowledgeNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<NodePosition | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);

  // Colors for different node types
  const nodeColors: Record<string, string> = {
    concept: '#3B82F6',     // Blue
    entity: '#10B981',      // Green  
    topic: '#F59E0B',       // Amber
    document: '#8B5CF6',    // Purple
    person: '#EF4444',      // Red
    place: '#06B6D4',       // Cyan
    default: '#6B7280',     // Gray
  };

  // Generate positions for nodes using a simple force-directed layout simulation
  const generateNodePositions = (nodes: KnowledgeNode[], relationships: KnowledgeRelationship[]) => {
    const canvasWidth = canvasRef.current?.width || 800;
    const canvasHeight = canvasRef.current?.height || 600;
    
    // Start with random positions
    const positions: NodePosition[] = nodes.map(node => ({
      ...node,
      position: {
        x: Math.random() * (canvasWidth - 100) + 50,
        y: Math.random() * (canvasHeight - 100) + 50,
      },
      color: nodeColors[node.type] || nodeColors.default,
    }));

    // Simple force simulation (very basic)
    for (let iteration = 0; iteration < 50; iteration++) {
      // Repulsion between all nodes
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const node1 = positions[i];
          const node2 = positions[j];
          const dx = node2.position.x - node1.position.x;
          const dy = node2.position.y - node1.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            const force = (150 - distance) / distance * 0.1;
            const fx = dx * force;
            const fy = dy * force;
            
            node1.position.x -= fx;
            node1.position.y -= fy;
            node2.position.x += fx;
            node2.position.y += fy;
          }
        }
      }

      // Attraction between connected nodes
      relationships.forEach(rel => {
        const fromNode = positions.find(n => n.id === rel.fromNodeId);
        const toNode = positions.find(n => n.id === rel.toNodeId);
        
        if (fromNode && toNode) {
          const dx = toNode.position.x - fromNode.position.x;
          const dy = toNode.position.y - fromNode.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 100) {
            const force = (distance - 100) / distance * 0.05;
            const fx = dx * force;
            const fy = dy * force;
            
            fromNode.position.x += fx;
            fromNode.position.y += fy;
            toNode.position.x -= fx;
            toNode.position.y -= fy;
          }
        }
      });

      // Keep nodes within canvas bounds
      positions.forEach(node => {
        node.position.x = Math.max(30, Math.min(canvasWidth - 30, node.position.x));
        node.position.y = Math.max(30, Math.min(canvasHeight - 30, node.position.y));
      });
    }

    return positions;
  };

  // Update node positions when graph data changes
  useEffect(() => {
    if (graphData && canvasRef.current) {
      const positions = generateNodePositions(graphData.nodes, graphData.relationships);
      setNodePositions(positions);
    }
  }, [graphData]);

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw relationships (edges)
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    graphData.relationships.forEach(rel => {
      const fromNode = nodePositions.find(n => n.id === rel.fromNodeId);
      const toNode = nodePositions.find(n => n.id === rel.toNodeId);
      
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.position.x, fromNode.position.y);
        ctx.lineTo(toNode.position.x, toNode.position.y);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(toNode.position.y - fromNode.position.y, toNode.position.x - fromNode.position.x);
        const arrowLength = 10;
        const arrowX = toNode.position.x - 20 * Math.cos(angle);
        const arrowY = toNode.position.y - 20 * Math.sin(angle);
        
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle - Math.PI / 6),
          arrowY - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle + Math.PI / 6),
          arrowY - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    });

    // Draw nodes
    nodePositions.forEach(node => {
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      
      // Node circle
      ctx.fillStyle = node.color;
      ctx.strokeStyle = isSelected ? '#1F2937' : (isHovered ? '#374151' : node.color);
      ctx.lineWidth = isSelected ? 3 : (isHovered ? 2 : 1);
      
      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, isSelected ? 25 : (isHovered ? 22 : 20), 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();      // Node label
      ctx.fillStyle = '#1F2937';
      ctx.font = isSelected ? 'bold 12px sans-serif' : '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const label = node.label.length > 12 ? node.label.substring(0, 12) + '...' : node.label;
      ctx.fillText(label, node.position.x, node.position.y + 35);
    });
  }, [nodePositions, selectedNode, hoveredNode]);

  // Handle mouse events
  const getNodeAtPosition = (x: number, y: number): NodePosition | null => {
    return nodePositions.find(node => {
      const dx = x - node.position.x;
      const dy = y - node.position.y;
      return Math.sqrt(dx * dx + dy * dy) <= 20;
    }) || null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = getNodeAtPosition(x, y);
    if (node) {
      setSelectedNode(node);
      setIsDragging(true);
      setDragNode(node);
      
      if (onNodeClick) {
        onNodeClick(node);
      }
    } else {
      setSelectedNode(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && dragNode) {
      // Update dragged node position
      setNodePositions(prev => prev.map(node => 
        node.id === dragNode.id 
          ? { ...node, position: { x, y } }
          : node
      ));
    } else {
      // Update hovered node
      const node = getNodeAtPosition(x, y);
      setHoveredNode(node);
      canvas.style.cursor = node ? 'pointer' : 'default';
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDragNode(null);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = getNodeAtPosition(x, y);
    if (node && onNodeDoubleClick) {
      onNodeDoubleClick(node);
    }
  };

  const handleCreateNode = async (nodeData: {
    label: string;
    type: string;
    properties?: Record<string, any>;
  }) => {
    await createNode({
      ...nodeData,
      documentId,
    });
    setShowCreateForm(false);
  };

  const handleDeleteSelectedNode = async () => {
    if (selectedNode) {
      const success = await deleteNode(selectedNode.id);
      if (success) {
        setSelectedNode(null);
      }
    }
  };

  if (!isConnected) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            Knowledge Graph Service Not Available
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Please ensure Neo4j is running and configured properly.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <div className="text-gray-500 dark:text-gray-400">Loading knowledge graph...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="text-red-500 mb-2">Error loading knowledge graph</div>
          <p className="text-sm text-gray-500 mb-3">{error}</p>
          <button
            onClick={() => {
              clearError();
              loadGraph();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            Add Node
          </button>
          
          {selectedNode && (
            <button
              onClick={handleDeleteSelectedNode}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Delete Node
            </button>
          )}
          
          <button
            onClick={() => loadGraph()}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Refresh
          </button>
        </div>

        {stats && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Nodes: {stats.totalNodes} | Relationships: {stats.totalRelationships}
          </div>
        )}
      </div>

      {/* Graph Canvas */}
      <div className="border border-gray-200 rounded-lg dark:border-gray-600">
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onDoubleClick={handleCanvasDoubleClick}
          className="w-full bg-white dark:bg-gray-900 rounded-lg"
        />
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            {selectedNode.label}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Type: {selectedNode.type}
          </p>
          {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Properties:</span>
              <pre className="mt-1 text-xs text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                {JSON.stringify(selectedNode.properties, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Create Node Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Node
            </h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateNode({
                  label: formData.get('label') as string,
                  type: formData.get('type') as string,
                  properties: {
                    description: formData.get('description') as string,
                  },
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    name="label"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Node label"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    name="type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="concept">Concept</option>
                    <option value="entity">Entity</option>
                    <option value="topic">Topic</option>
                    <option value="person">Person</option>
                    <option value="place">Place</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
