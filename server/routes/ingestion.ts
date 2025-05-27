import { Router, Request, Response } from 'express';
import { authService, AuthRequest } from '../services/authService';
import { dataIngestionService } from '../services/dataIngestionService';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'ingestion');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ingest-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow various file types for ingestion
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/pdf',
      'text/html',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(txt|md|markdown|csv|json|pdf|html|htm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported for ingestion'));
    }
  }
});

// Ingest single file
router.post('/file',
  authService.authenticateToken,
  upload.single('file'),
  [
    body('isPublic').optional().isBoolean(),
    body('extractKeywords').optional().isBoolean(),
    body('generateTitle').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    let filePath: string | undefined;
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      filePath = req.file.path;
      const {
        isPublic = false,
        extractKeywords = true,
        generateTitle = true
      } = req.body;

      const options = {
        userId: req.user.id,
        isPublic: isPublic === 'true' || isPublic === true,
        extractKeywords: extractKeywords === 'true' || extractKeywords === true,
        generateTitle: generateTitle === 'true' || generateTitle === true
      };

      const result = await dataIngestionService.ingestFile(filePath, options);

      if (result.success) {
        res.status(201).json({
          message: 'File ingested successfully',
          document: {
            id: result.documentId,
            title: result.title,
            keywords: result.keywords
          }
        });
      } else {
        res.status(500).json({ error: result.error || 'Ingestion failed' });
      }
    } catch (error) {
      console.error('File ingestion error:', error);
      res.status(500).json({ error: 'Failed to process file' });
    } finally {
      // Clean up uploaded file
      if (filePath) {
        dataIngestionService.cleanupFile(filePath);
      }
    }
  }
);

// Ingest multiple files
router.post('/files',
  authService.authenticateToken,
  upload.array('files', 10), // Max 10 files
  [
    body('isPublic').optional().isBoolean(),
    body('extractKeywords').optional().isBoolean(),
    body('generateTitle').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const filePaths: string[] = [];
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({ error: 'No files provided' });
        return;
      }

      // Store file paths for cleanup
      filePaths.push(...req.files.map(file => file.path));

      const {
        isPublic = false,
        extractKeywords = true,
        generateTitle = true
      } = req.body;

      const options = {
        userId: req.user.id,
        isPublic: isPublic === 'true' || isPublic === true,
        extractKeywords: extractKeywords === 'true' || extractKeywords === true,
        generateTitle: generateTitle === 'true' || generateTitle === true
      };

      const results = await dataIngestionService.ingestMultipleFiles(filePaths, options);

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.status(successful.length > 0 ? 201 : 500).json({
        message: `Processed ${req.files.length} files. ${successful.length} successful, ${failed.length} failed.`,
        successful: successful.map(r => ({
          id: r.documentId,
          title: r.title,
          keywords: r.keywords
        })),
        failed: failed.map(r => r.error)
      });
    } catch (error) {
      console.error('Multiple file ingestion error:', error);
      res.status(500).json({ error: 'Failed to process files' });
    } finally {
      // Clean up all uploaded files
      filePaths.forEach(filePath => {
        dataIngestionService.cleanupFile(filePath);
      });
    }
  }
);

// Ingest web clipping from URL
router.post('/web-clip',
  authService.authenticateToken,
  [
    body('url').isURL(),
    body('isPublic').optional().isBoolean(),
    body('extractKeywords').optional().isBoolean(),
    body('generateTitle').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        url,
        isPublic = false,
        extractKeywords = true,
        generateTitle = true
      } = req.body;

      const options = {
        userId: req.user.id,
        isPublic,
        extractKeywords,
        generateTitle
      };

      const result = await dataIngestionService.ingestWebClipping(url, options);

      if (result.success) {
        res.status(201).json({
          message: 'Web page clipped successfully',
          document: {
            id: result.documentId,
            title: result.title,
            keywords: result.keywords
          }
        });
      } else {
        res.status(500).json({ error: result.error || 'Web clipping failed' });
      }
    } catch (error) {
      console.error('Web clipping error:', error);
      res.status(500).json({ error: 'Failed to clip web page' });
    }
  }
);

// Ingest text content directly
router.post('/text',
  authService.authenticateToken,
  [
    body('content').isLength({ min: 1, max: 100000 }).trim(),
    body('title').optional().isLength({ min: 1, max: 200 }).trim(),
    body('contentType').optional().isIn(['text', 'markdown', 'html']),
    body('isPublic').optional().isBoolean(),
    body('extractKeywords').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        content,
        title = 'Untitled Document',
        contentType = 'text',
        isPublic = false,
        extractKeywords = true
      } = req.body;

      let keywords: string[] = [];

      // Extract keywords if enabled
      if (extractKeywords && content.length > 50) {
        try {
          const { aiService } = await import('../services/aiService');
          keywords = await aiService.extractKeywords(content);
        } catch (error) {
          console.warn('Failed to extract keywords:', error);
        }
      }

      // Create document directly in database
      const { DatabaseService } = await import('../database');
      const document = await DatabaseService.createDocument({
        title,
        content,
        content_type: contentType,
        owner_id: req.user.id,
        is_public: isPublic
      });

      res.status(201).json({
        message: 'Text content ingested successfully',
        document: {
          id: document.id,
          title: document.title,
          content: document.content,
          contentType: document.content_type,
          keywords
        }
      });
    } catch (error) {
      console.error('Text ingestion error:', error);
      res.status(500).json({ error: 'Failed to ingest text content' });
    }
  }
);

// Get ingestion history for user
router.get('/history',
  authService.authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { limit = 50, offset = 0 } = req.query;

      // Get user's recent documents (acts as ingestion history)
      const { DatabaseService } = await import('../database');
      const query = `
        SELECT id, title, content_type, created_at, updated_at
        FROM documents 
        WHERE owner_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;

      const result = await DatabaseService.pool.query(query, [
        req.user.id,
        parseInt(limit as string),
        parseInt(offset as string)
      ]);

      res.json({
        history: result.rows.map(doc => ({
          id: doc.id,
          title: doc.title,
          contentType: doc.content_type,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at
        })),
        total: result.rows.length
      });
    } catch (error) {
      console.error('History fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch ingestion history' });
    }
  }
);

// Get supported file types
router.get('/supported-types', (req: Request, res: Response): void => {
  res.json({
    fileTypes: [
      { extension: '.txt', mimeType: 'text/plain', description: 'Plain text files' },
      { extension: '.md', mimeType: 'text/markdown', description: 'Markdown files' },
      { extension: '.csv', mimeType: 'text/csv', description: 'Comma-separated values' },
      { extension: '.json', mimeType: 'application/json', description: 'JSON data files' },
      { extension: '.html', mimeType: 'text/html', description: 'HTML files' },
      { extension: '.pdf', mimeType: 'application/pdf', description: 'PDF documents (experimental)' }
    ],
    maxFileSize: '100MB',
    maxFilesPerRequest: 10,
    features: [
      'AI-powered title generation',
      'Automatic keyword extraction',
      'Multiple file format support',
      'Batch processing',
      'Web page clipping'
    ]
  });
});

export default router;
