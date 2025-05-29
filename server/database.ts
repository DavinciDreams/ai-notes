import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_notes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait for a connection
};

// Create the connection pool
const pool = new Pool(dbConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err: any) => {
  console.error('❌ PostgreSQL pool error:', err);
});

// Database schema initialization
export const initializeDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(200),
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);    // Documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        content TEXT,
        content_type VARCHAR(50) DEFAULT 'text',
        yjs_state BYTEA, -- Store Yjs document state
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        workspace_id INTEGER,
        is_public BOOLEAN DEFAULT FALSE,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT documents_content_type_check CHECK (content_type IN ('text', 'canvas', 'drawing', 'mixed'))
      )
    `);    // Canvas drawings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS canvas_drawings (
        id SERIAL PRIMARY KEY,
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        canvas_data JSONB NOT NULL, -- Store canvas state as JSON
        thumbnail_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tags table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        color VARCHAR(7) DEFAULT '#3b82f6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);    // Document tags junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_tags (
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (document_id, tag_id)
      )
    `);

    // Knowledge graph nodes
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_nodes (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(100) UNIQUE NOT NULL,
        label VARCHAR(500) NOT NULL,
        node_type VARCHAR(50) NOT NULL,        properties JSONB,
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT knowledge_nodes_type_check CHECK (node_type IN ('document', 'concept', 'person', 'tag', 'project'))
      )
    `);

    // Knowledge graph relationships
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_relationships (
        id SERIAL PRIMARY KEY,
        source_node_id VARCHAR(100) REFERENCES knowledge_nodes(node_id) ON DELETE CASCADE,
        target_node_id VARCHAR(100) REFERENCES knowledge_nodes(node_id) ON DELETE CASCADE,
        relationship_type VARCHAR(50) NOT NULL,
        weight DECIMAL(3,2) DEFAULT 1.0,
        properties JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT knowledge_relationships_type_check CHECK (relationship_type IN ('reference', 'similarity', 'collaboration', 'tag', 'hierarchy'))
      )
    `);

    // Collaboration sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS collaboration_sessions (        id SERIAL PRIMARY KEY,
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(100) NOT NULL,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        awareness_state JSONB, -- Store user cursor/selection state
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Search history for AI recommendations
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,        results_count INTEGER DEFAULT 0,
        clicked_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
        search_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
      CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
      CREATE INDEX IF NOT EXISTS idx_documents_title ON documents USING gin(to_tsvector('english', title));
      CREATE INDEX IF NOT EXISTS idx_documents_content ON documents USING gin(to_tsvector('english', content));
      CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes(node_type);
      CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source ON knowledge_relationships(source_node_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target ON knowledge_relationships(target_node_id);
      CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_document ON collaboration_sessions(document_id);
      CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
    `);

    await client.query('COMMIT');    console.log('🗄️ Database schema initialized successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Database initialization failed:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (connectionError) {
    console.error('❌ Could not connect to database:', connectionError);
    throw connectionError;
  }
};

// Database query helpers
export class DatabaseService {  static pool = pool;

  // Document operations
  static async createDocument(data: {
    title: string;
    content?: string;
    content_type?: string;
    owner_id: number;
    is_public?: boolean;
    yjs_state?: Buffer;
  }) {
    const query = `
      INSERT INTO documents (title, content, content_type, owner_id, is_public, yjs_state)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.title,
      data.content || '',
      data.content_type || 'text',
      data.owner_id,
      data.is_public || false,
      data.yjs_state
    ]);
    return result.rows[0];
  }

  static async getDocument(id: number) {
    const query = 'SELECT * FROM documents WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
  static async updateDocument(id: number, data: {
    title?: string;
    content?: string;
    yjsState?: Buffer;
  }) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push(`content = $${paramCount++}`);
      values.push(data.content);
    }
    if (data.yjsState !== undefined) {
      fields.push(`yjs_state = $${paramCount++}`);
      values.push(data.yjsState);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE documents 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async searchDocuments(query: string, userId?: number) {
    const searchQuery = `
      SELECT 
        d.*,
        u.username as author_name,
        ts_rank(
          to_tsvector('english', d.title || ' ' || d.content),
          plainto_tsquery('english', $1)
        ) as relevance_score
      FROM documents d
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE 
        to_tsvector('english', d.title || ' ' || d.content) @@ plainto_tsquery('english', $1)
        ${userId ? 'AND (d.owner_id = $2 OR d.is_public = true)' : ''}
      ORDER BY relevance_score DESC
      LIMIT 50
    `;

    const params = userId ? [query, userId] : [query];
    const result = await pool.query(searchQuery, params);
    return result.rows;
  }

  // Knowledge graph operations
  static async createKnowledgeNode(data: {
    nodeId: string;
    label: string;
    nodeType: string;
    properties?: any;
    documentId?: number;
  }) {
    const query = `
      INSERT INTO knowledge_nodes (node_id, label, node_type, properties, document_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.nodeId,
      data.label,
      data.nodeType,
      JSON.stringify(data.properties || {}),
      data.documentId
    ]);
    return result.rows[0];
  }

  static async createKnowledgeRelationship(data: {
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: string;
    weight?: number;
    properties?: any;
  }) {
    const query = `
      INSERT INTO knowledge_relationships (source_node_id, target_node_id, relationship_type, weight, properties)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.sourceNodeId,
      data.targetNodeId,
      data.relationshipType,
      data.weight || 1.0,
      JSON.stringify(data.properties || {})
    ]);
    return result.rows[0];
  }

  static async getKnowledgeGraph() {
    const nodesQuery = 'SELECT * FROM knowledge_nodes ORDER BY created_at DESC';
    const relationshipsQuery = 'SELECT * FROM knowledge_relationships ORDER BY weight DESC';

    const [nodesResult, relationshipsResult] = await Promise.all([
      pool.query(nodesQuery),
      pool.query(relationshipsQuery)
    ]);

    return {
      nodes: nodesResult.rows,
      relationships: relationshipsResult.rows
    };
  }

  // User management operations
  static async createUser(data: {
    email: string;
    username: string;
    password_hash: string;
    display_name?: string;
    avatar_url?: string;
  }): Promise<number> {
    const query = `
      INSERT INTO users (email, username, password_hash, display_name, avatar_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const result = await pool.query(query, [
      data.email,
      data.username,
      data.password_hash,
      data.display_name,
      data.avatar_url
    ]);
    return result.rows[0].id;
  }

  static async getUserById(id: number) {
    const query = `
      SELECT id, email, username, display_name, avatar_url, created_at, updated_at
      FROM users WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getUserByEmail(email: string) {
    const query = `
      SELECT id, email, username, display_name, avatar_url, created_at, updated_at
      FROM users WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async getUserByUsername(username: string) {
    const query = `
      SELECT id, email, username, display_name, avatar_url, created_at, updated_at
      FROM users WHERE username = $1
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  static async getUserWithPassword(email: string) {
    const query = `
      SELECT id, email, username, password_hash, display_name, avatar_url, created_at, updated_at
      FROM users WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async updateUser(id: number, data: {
    email?: string;
    username?: string;
    password_hash?: string;
    display_name?: string;
    avatar_url?: string;
  }) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.username !== undefined) {
      fields.push(`username = $${paramCount++}`);
      values.push(data.username);
    }
    if (data.password_hash !== undefined) {
      fields.push(`password_hash = $${paramCount++}`);
      values.push(data.password_hash);
    }
    if (data.display_name !== undefined) {
      fields.push(`display_name = $${paramCount++}`);
      values.push(data.display_name);
    }
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramCount++}`);
      values.push(data.avatar_url);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, username, display_name, avatar_url, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async deleteUser(id: number) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

export { pool };
export default DatabaseService;
