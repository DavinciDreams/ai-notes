import neo4j, { Driver, Session, Record as Neo4jRecord } from 'neo4j-driver';

interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties: { [key: string]: any };
  documentId?: string;
}

interface KnowledgeRelationship {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: string;
  properties: { [key: string]: any };
}

interface GraphData {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
}

class KnowledgeGraphService {
  private driver: Driver | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
      const username = process.env.NEO4J_USERNAME || 'neo4j';
      const password = process.env.NEO4J_PASSWORD || 'password';

      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
      
      // Test connection
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      
      this.isConnected = true;
      console.log('✅ Neo4j connected successfully');
      
      // Create constraints and indices
      await this.setupSchema();
      
    } catch (error) {
      console.error('❌ Neo4j connection failed:', error);
      this.isConnected = false;
    }
  }

  private async setupSchema(): Promise<void> {
    if (!this.driver) return;

    const session = this.driver.session();
    try {
      // Create constraints
      await session.run(`
        CREATE CONSTRAINT unique_node_id IF NOT EXISTS
        FOR (n:KnowledgeNode) REQUIRE n.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT unique_document_id IF NOT EXISTS  
        FOR (d:Document) REQUIRE d.id IS UNIQUE
      `);

      // Create indices for better performance
      await session.run(`
        CREATE INDEX node_type_index IF NOT EXISTS
        FOR (n:KnowledgeNode) ON (n.type)
      `);

      await session.run(`
        CREATE INDEX document_title_index IF NOT EXISTS
        FOR (d:Document) ON (d.title)
      `);

      console.log('✅ Neo4j schema setup completed');
    } catch (error) {
      console.error('❌ Error setting up Neo4j schema:', error);
    } finally {
      await session.close();
    }
  }

  async createNode(node: Omit<KnowledgeNode, 'id'>): Promise<KnowledgeNode> {
    if (!this.isConnected || !this.driver) {
      throw new Error('Neo4j not connected');
    }

    const session = this.driver.session();
    try {
      const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await session.run(`
        CREATE (n:KnowledgeNode {
          id: $id,
          label: $label,
          type: $type,
          documentId: $documentId,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        SET n += $properties
        RETURN n
      `, {
        id: nodeId,
        label: node.label,
        type: node.type,
        documentId: node.documentId || null,
        properties: node.properties
      });

      if (result.records.length === 0) {
        throw new Error('Failed to create node');
      }      const createdNode = result.records[0].get('n').properties;
      return {
        id: createdNode.id,
        label: createdNode.label,
        type: createdNode.type,
        properties: node.properties,
        documentId: createdNode.documentId
      };
    } finally {
      await session.close();
    }
  }

  async createRelationship(rel: Omit<KnowledgeRelationship, 'id'>): Promise<KnowledgeRelationship> {
    if (!this.isConnected || !this.driver) {
      throw new Error('Neo4j not connected');
    }

    const session = this.driver.session();
    try {
      const relId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await session.run(`
        MATCH (from:KnowledgeNode {id: $fromNodeId})
        MATCH (to:KnowledgeNode {id: $toNodeId})
        CREATE (from)-[r:RELATED {
          id: $id,
          type: $type,
          createdAt: datetime(),
          updatedAt: datetime()
        }]->(to)
        SET r += $properties
        RETURN r
      `, {
        id: relId,
        fromNodeId: rel.fromNodeId,
        toNodeId: rel.toNodeId,
        type: rel.type,
        properties: rel.properties
      });

      if (result.records.length === 0) {
        throw new Error('Failed to create relationship');
      }

      return {
        id: relId,
        fromNodeId: rel.fromNodeId,
        toNodeId: rel.toNodeId,
        type: rel.type,
        properties: rel.properties
      };
    } finally {
      await session.close();
    }
  }

  async getGraph(options: {
    documentId?: string;
    nodeType?: string;
    limit?: number;
    depth?: number;
  } = {}): Promise<GraphData> {
    if (!this.isConnected || !this.driver) {
      // Return empty graph if not connected
      return { nodes: [], relationships: [] };
    }

    const session = this.driver.session();
    try {
      const { documentId, nodeType, limit = 100, depth = 2 } = options;
      
      let query = `
        MATCH (n:KnowledgeNode)
        OPTIONAL MATCH (n)-[r:RELATED]-(m:KnowledgeNode)
      `;
      
      const params: { [key: string]: any } = { limit };
      
      if (documentId) {
        query += ` WHERE n.documentId = $documentId OR m.documentId = $documentId`;
        params.documentId = documentId;
      } else if (nodeType) {
        query += ` WHERE n.type = $nodeType`;
        params.nodeType = nodeType;
      }
      
      query += `
        RETURN DISTINCT n as node, r as relationship, m as relatedNode
        LIMIT $limit
      `;

      const result = await session.run(query, params);
      
      const nodes = new Map<string, KnowledgeNode>();
      const relationships: KnowledgeRelationship[] = [];

      result.records.forEach((record: Neo4jRecord) => {
        const node = record.get('node');
        const relationship = record.get('relationship');
        const relatedNode = record.get('relatedNode');

        if (node) {
          const nodeProps = node.properties;
          nodes.set(nodeProps.id, {
            id: nodeProps.id,
            label: nodeProps.label,
            type: nodeProps.type,
            properties: { ...nodeProps },
            documentId: nodeProps.documentId
          });
        }

        if (relatedNode) {
          const relatedProps = relatedNode.properties;
          nodes.set(relatedProps.id, {
            id: relatedProps.id,
            label: relatedProps.label,
            type: relatedProps.type,
            properties: { ...relatedProps },
            documentId: relatedProps.documentId
          });
        }

        if (relationship && node && relatedNode) {
          const relProps = relationship.properties;
          relationships.push({
            id: relProps.id,
            fromNodeId: node.properties.id,
            toNodeId: relatedNode.properties.id,
            type: relProps.type,
            properties: { ...relProps }
          });
        }
      });

      return {
        nodes: Array.from(nodes.values()),
        relationships
      };
    } finally {
      await session.close();
    }
  }

  async findSimilarNodes(nodeId: string, limit: number = 10): Promise<KnowledgeNode[]> {
    if (!this.isConnected || !this.driver) {
      return [];
    }

    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n:KnowledgeNode {id: $nodeId})
        MATCH (similar:KnowledgeNode)
        WHERE similar.id <> n.id 
        AND (similar.type = n.type OR similar.label CONTAINS n.label)
        RETURN similar
        LIMIT $limit
      `, { nodeId, limit });

      return result.records.map(record => {
        const props = record.get('similar').properties;
        return {
          id: props.id,
          label: props.label,
          type: props.type,
          properties: { ...props },
          documentId: props.documentId
        };
      });
    } finally {
      await session.close();
    }
  }

  async findShortestPath(fromNodeId: string, toNodeId: string): Promise<{
    path: KnowledgeNode[];
    relationships: KnowledgeRelationship[];
  }> {
    if (!this.isConnected || !this.driver) {
      return { path: [], relationships: [] };
    }

    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH path = shortestPath(
          (from:KnowledgeNode {id: $fromNodeId})-[*]-(to:KnowledgeNode {id: $toNodeId})
        )
        RETURN path
      `, { fromNodeId, toNodeId });

      if (result.records.length === 0) {
        return { path: [], relationships: [] };
      }

      const path = result.records[0].get('path');
      const nodes: KnowledgeNode[] = [];
      const relationships: KnowledgeRelationship[] = [];

      path.segments.forEach((segment: any) => {
        const startNode = segment.start.properties;
        const endNode = segment.end.properties;
        const relationship = segment.relationship.properties;

        nodes.push({
          id: startNode.id,
          label: startNode.label,
          type: startNode.type,
          properties: { ...startNode },
          documentId: startNode.documentId
        });

        relationships.push({
          id: relationship.id,
          fromNodeId: startNode.id,
          toNodeId: endNode.id,
          type: relationship.type,
          properties: { ...relationship }
        });
      });

      // Add the final node
      const lastSegment = path.segments[path.segments.length - 1];
      const endNode = lastSegment.end.properties;
      nodes.push({
        id: endNode.id,
        label: endNode.label,
        type: endNode.type,
        properties: { ...endNode },
        documentId: endNode.documentId
      });

      return { path: nodes, relationships };
    } finally {
      await session.close();
    }
  }

  async deleteNode(nodeId: string): Promise<void> {
    if (!this.isConnected || !this.driver) {
      throw new Error('Neo4j not connected');
    }

    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (n:KnowledgeNode {id: $nodeId})
        DETACH DELETE n
      `, { nodeId });
    } finally {
      await session.close();
    }
  }

  async getStats(): Promise<{
    totalNodes: number;
    totalRelationships: number;
    nodeTypes: Record<string, number>;
    isConnected: boolean;
  }> {
    if (!this.isConnected || !this.driver) {
      return {
        totalNodes: 0,
        totalRelationships: 0,
        nodeTypes: {},
        isConnected: false
      };
    }

    const session = this.driver.session();
    try {
      const [nodesResult, relsResult, typesResult] = await Promise.all([
        session.run('MATCH (n:KnowledgeNode) RETURN count(n) as count'),
        session.run('MATCH ()-[r:RELATED]->() RETURN count(r) as count'),
        session.run('MATCH (n:KnowledgeNode) RETURN n.type as type, count(n) as count')
      ]);

      const totalNodes = nodesResult.records[0]?.get('count').toNumber() || 0;
      const totalRelationships = relsResult.records[0]?.get('count').toNumber() || 0;
      
      const nodeTypes: Record<string, number> = {};
      typesResult.records.forEach(record => {
        const type = record.get('type');
        const count = record.get('count').toNumber();
        nodeTypes[type] = count;
      });

      return {
        totalNodes,
        totalRelationships,
        nodeTypes,
        isConnected: true
      };
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.isConnected = false;
      console.log('✅ Neo4j connection closed');
    }
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
export { KnowledgeGraphService };
export type { KnowledgeNode, KnowledgeRelationship, GraphData };
