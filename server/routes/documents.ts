import { Router, Request, Response } from 'express';
import { authService, AuthRequest } from '../services/authService';
import { aiService } from '../services/aiService';
import { DatabaseService } from '../database';
import { body, validationResult, param } from 'express-validator';

const router = Router();

// Get all documents for the current user
router.get('/', authService.optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search = '', limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    let documents;
    if (search && typeof search === 'string' && search.trim()) {
      documents = await DatabaseService.searchDocuments(search.trim(), userId);
    } else {
      // Get all documents (public ones + user's private ones if authenticated)
      const query = `
        SELECT 
          d.*,
          u.username as author_name
        FROM documents d
        LEFT JOIN users u ON d.owner_id = u.id
        WHERE d.is_public = true ${userId ? 'OR d.owner_id = $1' : ''}
        ORDER BY d.updated_at DESC
        LIMIT $${userId ? '2' : '1'} OFFSET $${userId ? '3' : '2'}
      `;
      
      const params = userId ? [userId, parseInt(limit as string), parseInt(offset as string)] 
                           : [parseInt(limit as string), parseInt(offset as string)];
      
      const result = await DatabaseService.pool.query(query, params);
      documents = result.rows;
    }

    res.json({
      documents: documents.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        contentType: doc.content_type,
        isPublic: doc.is_public,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        authorName: doc.author_name,
        isOwner: userId ? doc.owner_id === userId : false
      })),
      total: documents.length
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get a specific document
router.get('/:id', 
  [param('id').isInt({ min: 1 })],
  authService.optionalAuth, 
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Invalid document ID' });
        return;
      }

      const documentId = parseInt(req.params.id);
      const userId = req.user?.id;

      const document = await DatabaseService.getDocument(documentId);
      
      if (!document) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      // Check access permissions
      if (!document.is_public && document.owner_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Get author name
      const authorQuery = 'SELECT username FROM users WHERE id = $1';
      const authorResult = await DatabaseService.pool.query(authorQuery, [document.owner_id]);
      const authorName = authorResult.rows[0]?.username || 'Unknown';

      res.json({
        id: document.id,
        title: document.title,
        content: document.content,
        contentType: document.content_type,
        isPublic: document.is_public,
        yjsState: document.yjs_state,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
        authorName,
        isOwner: userId ? document.owner_id === userId : false
      });
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  }
);

// Create a new document
router.post('/',
  authService.authenticateToken,
  [
    body('title').optional().isLength({ min: 1, max: 200 }).trim(),
    body('content').optional().isString(),
    body('contentType').optional().isIn(['text', 'markdown', 'html']),
    body('isPublic').optional().isBoolean()
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
        title = 'Untitled Document', 
        content = '', 
        contentType = 'text',
        isPublic = false 
      } = req.body;

      const document = await DatabaseService.createDocument({
        title,
        content,
        content_type: contentType,
        owner_id: req.user.id,
        is_public: isPublic
      });

      // Generate AI-powered title if content exists and no title provided
      if (req.body.title === undefined && content && content.trim()) {
        try {
          const generatedTitle = await aiService.generateTitle(content);
          if (generatedTitle && generatedTitle !== 'Untitled Document') {
            await DatabaseService.updateDocument(document.id, { title: generatedTitle });
            document.title = generatedTitle;
          }
        } catch (aiError) {
          console.warn('Failed to generate title:', aiError);
        }
      }

      // Extract keywords for better searchability
      if (content && content.trim()) {
        try {
          const keywords = await aiService.extractKeywords(content);
          // Store keywords as tags or in a separate keywords field
          // This is a placeholder - you might want to implement a tags system
          console.log('Extracted keywords:', keywords);
        } catch (aiError) {
          console.warn('Failed to extract keywords:', aiError);
        }
      }

      res.status(201).json({
        id: document.id,
        title: document.title,
        content: document.content,
        contentType: document.content_type,
        isPublic: document.is_public,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
        authorName: req.user.username,
        isOwner: true
      });
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({ error: 'Failed to create document' });
    }
  }
);

// Update a document
router.put('/:id',
  [param('id').isInt({ min: 1 })],
  authService.authenticateToken,
  [
    body('title').optional().isLength({ min: 1, max: 200 }).trim(),
    body('content').optional().isString(),
    body('isPublic').optional().isBoolean()
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

      const documentId = parseInt(req.params.id);
      const document = await DatabaseService.getDocument(documentId);

      if (!document) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      if (document.owner_id !== req.user.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const updates: any = {};
      const { title, content, isPublic } = req.body;

      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (isPublic !== undefined) updates.is_public = isPublic;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      const updatedDocument = await DatabaseService.updateDocument(documentId, updates);

      res.json({
        id: updatedDocument.id,
        title: updatedDocument.title,
        content: updatedDocument.content,
        contentType: updatedDocument.content_type,
        isPublic: updatedDocument.is_public,
        createdAt: updatedDocument.created_at,
        updatedAt: updatedDocument.updated_at,
        authorName: req.user.username,
        isOwner: true
      });
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }
);

// Delete a document
router.delete('/:id',
  [param('id').isInt({ min: 1 })],
  authService.authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Invalid document ID' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const documentId = parseInt(req.params.id);
      const document = await DatabaseService.getDocument(documentId);

      if (!document) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      if (document.owner_id !== req.user.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Delete the document
      const deleteQuery = 'DELETE FROM documents WHERE id = $1';
      await DatabaseService.pool.query(deleteQuery, [documentId]);

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
);

// Summarize a document using AI
router.post('/:id/summarize',
  [param('id').isInt({ min: 1 })],
  authService.optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Invalid document ID' });
        return;
      }

      const documentId = parseInt(req.params.id);
      const userId = req.user?.id;

      const document = await DatabaseService.getDocument(documentId);
      
      if (!document) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      // Check access permissions
      if (!document.is_public && document.owner_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      if (!document.content || document.content.trim().length < 100) {
        res.status(400).json({ error: 'Document content is too short to summarize' });
        return;
      }

      try {
        const summary = await aiService.summarizeDocument(document.content);
        res.json({ summary });
      } catch (aiError) {
        console.error('AI summarization error:', aiError);
        res.status(503).json({ error: 'AI service unavailable' });
      }
    } catch (error) {
      console.error('Error summarizing document:', error);
      res.status(500).json({ error: 'Failed to summarize document' });
    }
  }
);

// Ask question about a document using AI
router.post('/:id/question',
  [
    param('id').isInt({ min: 1 }),
    body('question').isLength({ min: 1, max: 500 }).trim()
  ],
  authService.optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const documentId = parseInt(req.params.id);
      const { question } = req.body;
      const userId = req.user?.id;

      const document = await DatabaseService.getDocument(documentId);
      
      if (!document) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      // Check access permissions
      if (!document.is_public && document.owner_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      if (!document.content || document.content.trim().length < 50) {
        res.status(400).json({ error: 'Document content is too short to answer questions about' });
        return;
      }

      try {
        const answer = await aiService.answerQuestion(question, document.content);
        res.json({ question, answer });
      } catch (aiError) {
        console.error('AI question answering error:', aiError);
        res.status(503).json({ error: 'AI service unavailable' });
      }
    } catch (error) {
      console.error('Error answering question:', error);
      res.status(500).json({ error: 'Failed to answer question' });
    }
  }
);

export default router;
