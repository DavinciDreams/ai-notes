import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/apiService';
import type { 
  KnowledgeNode, 
  KnowledgeRelationship, 
  GraphData, 
  KnowledgeGraphStats 
} from '../services/apiService';

interface UseKnowledgeGraphOptions {
  autoLoad?: boolean;
  nodeTypes?: string[];
  relationshipTypes?: string[];
  limit?: number;
}

interface UseKnowledgeGraphReturn {
  // State
  graphData: GraphData | null;
  stats: KnowledgeGraphStats | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadGraph: (options?: {
    nodeTypes?: string[];
    relationshipTypes?: string[];
    limit?: number;
    documentId?: string;
  }) => Promise<void>;
  createNode: (node: {
    label: string;
    type: string;
    properties?: Record<string, any>;
    documentId?: string;
  }) => Promise<KnowledgeNode | null>;
  createRelationship: (relationship: {
    fromNodeId: string;
    toNodeId: string;
    type: string;
    properties?: Record<string, any>;
  }) => Promise<KnowledgeRelationship | null>;
  deleteNode: (nodeId: string) => Promise<boolean>;
  findSimilarNodes: (nodeId: string, limit?: number) => Promise<KnowledgeNode[]>;
  findShortestPath: (startNodeId: string, endNodeId: string) => Promise<{
    path: KnowledgeNode[];
    relationships: KnowledgeRelationship[];
    length: number;
  } | null>;
  getStats: () => Promise<void>;
  checkConnection: () => Promise<void>;
  clearError: () => void;
}

export function useKnowledgeGraph(options: UseKnowledgeGraphOptions = {}): UseKnowledgeGraphReturn {
  const { autoLoad = false, nodeTypes, relationshipTypes, limit = 100 } = options;
  
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [stats, setStats] = useState<KnowledgeGraphStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const response = await apiService.getKnowledgeGraphStatus();
      if (response.success && response.data) {
        setIsConnected(response.data.connected);
      }
    } catch (err) {
      console.error('Failed to check knowledge graph connection:', err);
      setIsConnected(false);
    }
  }, []);

  const getStats = useCallback(async () => {
    try {
      const response = await apiService.getKnowledgeGraphStats();
      if (response.success && response.data) {
        setStats(response.data);
        setIsConnected(response.data.isConnected);
      }
    } catch (err) {
      console.error('Failed to get knowledge graph stats:', err);
    }
  }, []);

  const loadGraph = useCallback(async (loadOptions?: {
    nodeTypes?: string[];
    relationshipTypes?: string[];
    limit?: number;
    documentId?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        nodeTypes: loadOptions?.nodeTypes || nodeTypes,
        relationshipTypes: loadOptions?.relationshipTypes || relationshipTypes,
        limit: loadOptions?.limit || limit,
        documentId: loadOptions?.documentId,
      };

      const response = await apiService.getKnowledgeGraph(params);
      
      if (response.success && response.data) {
        setGraphData(response.data);
      } else {
        setError(response.error || 'Failed to load knowledge graph');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge graph');
    } finally {
      setIsLoading(false);
    }
  }, [nodeTypes, relationshipTypes, limit]);

  const createNode = useCallback(async (node: {
    label: string;
    type: string;
    properties?: Record<string, any>;
    documentId?: string;
  }): Promise<KnowledgeNode | null> => {
    setError(null);

    try {
      const response = await apiService.createKnowledgeNode(node);
      
      if (response.success && response.data) {
        // Reload graph to include new node
        await loadGraph();
        return response.data;
      } else {
        setError(response.error || 'Failed to create knowledge node');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create knowledge node';
      setError(errorMessage);
      return null;
    }
  }, [loadGraph]);

  const createRelationship = useCallback(async (relationship: {
    fromNodeId: string;
    toNodeId: string;
    type: string;
    properties?: Record<string, any>;
  }): Promise<KnowledgeRelationship | null> => {
    setError(null);

    try {
      const response = await apiService.createKnowledgeRelationship(relationship);
      
      if (response.success && response.data) {
        // Reload graph to include new relationship
        await loadGraph();
        return response.data;
      } else {
        setError(response.error || 'Failed to create knowledge relationship');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create knowledge relationship';
      setError(errorMessage);
      return null;
    }
  }, [loadGraph]);

  const deleteNode = useCallback(async (nodeId: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await apiService.deleteKnowledgeNode(nodeId);
      
      if (response.success) {
        // Reload graph to reflect deletion
        await loadGraph();
        return true;
      } else {
        setError(response.error || 'Failed to delete knowledge node');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete knowledge node';
      setError(errorMessage);
      return false;
    }
  }, [loadGraph]);

  const findSimilarNodes = useCallback(async (
    nodeId: string, 
    searchLimit?: number
  ): Promise<KnowledgeNode[]> => {
    setError(null);

    try {
      const response = await apiService.findSimilarNodes(nodeId, searchLimit);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error || 'Failed to find similar nodes');
        return [];
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find similar nodes';
      setError(errorMessage);
      return [];
    }
  }, []);

  const findShortestPath = useCallback(async (
    startNodeId: string, 
    endNodeId: string
  ): Promise<{
    path: KnowledgeNode[];
    relationships: KnowledgeRelationship[];
    length: number;
  } | null> => {
    setError(null);

    try {
      const response = await apiService.findShortestPath(startNodeId, endNodeId);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error || 'Failed to find shortest path');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find shortest path';
      setError(errorMessage);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check connection and load stats on mount
  useEffect(() => {
    checkConnection();
    getStats();
  }, [checkConnection, getStats]);

  // Auto-load graph if requested
  useEffect(() => {
    if (autoLoad && isConnected) {
      loadGraph();
    }
  }, [autoLoad, isConnected, loadGraph]);

  return {
    // State
    graphData,
    stats,
    isConnected,
    isLoading,
    error,
    
    // Actions
    loadGraph,
    createNode,
    createRelationship,
    deleteNode,
    findSimilarNodes,
    findShortestPath,
    getStats,
    checkConnection,
    clearError,
  };
}
