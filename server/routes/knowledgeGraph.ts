import { Router, Response } from 'express';
import { KnowledgeGraphService } from '../services/knowledgeGraphService.js';
import { authService, AuthRequest } from '../services/authService.js';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();
const knowledgeGraphService = new KnowledgeGraphService();

// GET /api/knowledge-graph/status - Get connection status
router.get('/status', async (req, res: Response) => {
  try {
    const status = {
      connected: knowledgeGraphService['isConnected'] || false,
      service: 'Neo4j Knowledge Graph'
    };
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Knowledge graph status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get knowledge graph status'
    });
  }
});

// GET /api/knowledge-graph/stats - Get graph statistics
router.get('/stats', authService.authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await knowledgeGraphService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Knowledge graph stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get graph statistics'
    });
  }
});

// POST /api/knowledge-graph/nodes - Create a new node
router.post('/nodes',
  authService.authenticateToken,
  [
    body('label').notEmpty().withMessage('Label is required'),
    body('type').notEmpty().withMessage('Type is required'),
    body('properties').optional().isObject().withMessage('Properties must be an object'),
    body('documentId').optional().isString().withMessage('Document ID must be a string')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
      return;
    }

    try {
      const { label, type, properties = {}, documentId } = req.body;
      const userId = req.user?.id;

      // Add user context to properties
      const nodeProperties = {
        ...properties,
        createdBy: userId,
        createdAt: new Date().toISOString()
      };

      const nodeData = {
        label,
        type,
        properties: nodeProperties,
        documentId
      };

      const node = await knowledgeGraphService.createNode(nodeData);
      
      res.status(201).json({
        success: true,
        data: node
      });
    } catch (error) {
      console.error('Create node error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create knowledge graph node'
      });
    }
  }
);

// POST /api/knowledge-graph/relationships - Create a relationship
router.post('/relationships',
  authService.authenticateToken,
  [
    body('fromNodeId').notEmpty().withMessage('From node ID is required'),
    body('toNodeId').notEmpty().withMessage('To node ID is required'),
    body('type').notEmpty().withMessage('Relationship type is required'),
    body('properties').optional().isObject().withMessage('Properties must be an object')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
      return;
    }

    try {
      const { fromNodeId, toNodeId, type, properties = {} } = req.body;
      const userId = req.user?.id;

      // Add user context to properties
      const relationshipProperties = {
        ...properties,
        createdBy: userId,
        createdAt: new Date().toISOString()
      };

      const relationshipData = {
        fromNodeId,
        toNodeId,
        type,
        properties: relationshipProperties
      };

      const relationship = await knowledgeGraphService.createRelationship(relationshipData);
      
      res.status(201).json({
        success: true,
        data: relationship
      });
    } catch (error) {
      console.error('Create relationship error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create knowledge graph relationship'
      });
    }
  }
);

// GET /api/knowledge-graph/graph - Get graph data
router.get('/graph',
  authService.authenticateToken,
  [
    query('nodeTypes').optional().isString().withMessage('Node types must be a comma-separated string'),
    query('relationshipTypes').optional().isString().withMessage('Relationship types must be a comma-separated string'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    query('documentId').optional().isString().withMessage('Document ID must be a string')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
      return;
    }

    try {
      const { nodeTypes, relationshipTypes, limit = 100, documentId } = req.query;
      
      const nodeTypeArray = nodeTypes 
        ? (nodeTypes as string).split(',').map(t => t.trim())
        : undefined;

      const relationshipTypeArray = relationshipTypes 
        ? (relationshipTypes as string).split(',').map(t => t.trim())
        : undefined;

      const options = {
        nodeTypes: nodeTypeArray,
        relationshipTypes: relationshipTypeArray,
        limit: parseInt(limit as string),
        documentId: documentId as string
      };

      const graphData = await knowledgeGraphService.getGraph(options);
      
      res.json({
        success: true,
        data: graphData
      });
    } catch (error) {
      console.error('Get graph error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get knowledge graph data'
      });
    }
  }
);

// GET /api/knowledge-graph/path - Find shortest path between nodes
router.get('/path',
  authService.authenticateToken,
  [
    query('startNodeId').notEmpty().withMessage('Start node ID is required'),
    query('endNodeId').notEmpty().withMessage('End node ID is required')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
      return;
    }

    try {
      const { startNodeId, endNodeId } = req.query;
      
      const path = await knowledgeGraphService.findShortestPath(
        startNodeId as string,
        endNodeId as string
      );
      
      res.json({
        success: true,
        data: path
      });
    } catch (error) {
      console.error('Find path error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to find path in knowledge graph'
      });
    }
  }
);

// GET /api/knowledge-graph/similar/:nodeId - Find similar nodes
router.get('/similar/:nodeId',
  authService.authenticateToken,
  [
    param('nodeId').notEmpty().withMessage('Node ID is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
      return;
    }

    try {
      const { nodeId } = req.params;
      const { limit = 10 } = req.query;
      
      const similarNodes = await knowledgeGraphService.findSimilarNodes(
        nodeId,
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        data: similarNodes
      });
    } catch (error) {
      console.error('Find similar nodes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to find similar nodes'
      });
    }
  }
);

// DELETE /api/knowledge-graph/nodes/:nodeId - Delete a node
router.delete('/nodes/:nodeId',
  authService.authenticateToken,
  [
    param('nodeId').notEmpty().withMessage('Node ID is required')
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array() 
      });
      return;
    }

    try {
      const { nodeId } = req.params;
      await knowledgeGraphService.deleteNode(nodeId);
      
      res.json({
        success: true,
        message: 'Node deleted successfully'
      });
    } catch (error) {
      console.error('Delete node error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete knowledge graph node'
      });
    }
  }
);

export default router;
