import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { initializeDatabase } from './database';

// Import routes
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import aiRoutes from './routes/ai';
import ingestionRoutes from './routes/ingestion';
import enhancedIngestionRoutes from './routes/enhancedIngestion';
import searchRoutes from './routes/search';
import knowledgeGraphRoutes from './routes/knowledgeGraph';
import uploadRoutes from './routes/upload-simple';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3002;

// Initialize database
let dbInitialized = false;

async function initializeApp() {
  try {
    await initializeDatabase();
    dbInitialized = true;
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('⚠️  Running in limited mode without database');
    // Continue running but with limited functionality
    dbInitialized = false;
  }
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(morgan('combined') as express.RequestHandler);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/enhanced-ingestion', enhancedIngestionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/knowledge-graph', knowledgeGraphRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: dbInitialized ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Notes Collaborative Knowledge Management API',
    version: '1.0.0',    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      documents: '/api/documents',
      search: '/api/search',
      ai: '/api/ai',
      ingestion: '/api/ingestion',
      enhancedIngestion: '/api/enhanced-ingestion',
      knowledgeGraph: '/api/knowledge-graph',
      upload: '/api/upload'
    }
  });
});

// Voice transcription endpoint (placeholder for Whisper integration)
// Search endpoints
app.get('/api/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, type } = req.query;
    
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    // TODO: Implement search with Elasticsearch
    res.json({
      query: q,
      type: type || 'all',
      results: [],
      totalResults: 0,
      searchTime: '0ms'
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Knowledge graph endpoints
app.get('/api/knowledge-graph', async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Generate knowledge graph from stored data
    res.json({
      nodes: [],
      edges: [],
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Knowledge graph error:', error);
    res.status(500).json({ error: 'Failed to load knowledge graph' });
  }
});

// Socket.IO for real-time features
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-document', (documentId) => {
    socket.join(documentId);
    console.log(`User ${socket.id} joined document ${documentId}`);
  });

  socket.on('leave-document', (documentId) => {
    socket.leave(documentId);
    console.log(`User ${socket.id} left document ${documentId}`);
  });

  socket.on('cursor-position', (data) => {
    socket.to(data.documentId).emit('cursor-position', {
      userId: socket.id,
      ...data
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((error: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', error);
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Initialize database and start server
async function startServer() {
  await initializeApp();
  
  const PORT_TO_USE = process.env.PORT || 3002;
  
  server.listen(PORT_TO_USE, () => {
    console.log(`🚀 Server running on port ${PORT_TO_USE}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`💾 Database: ${dbInitialized ? 'Connected' : 'Disconnected (limited mode)'}`);
    console.log(`🔗 API Health: http://localhost:${PORT_TO_USE}/api/health`);
  });
}

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  // Try a different port if the current one is in use
  if (error.code === 'EADDRINUSE') {
    console.log('⚠️  Port in use, trying alternative port...');
    const altPort = (parseInt(process.env.PORT || '3002') + 1);
    server.listen(altPort, () => {
      console.log(`🚀 Server running on alternative port ${altPort}`);
    });
  }
});

export default app;
