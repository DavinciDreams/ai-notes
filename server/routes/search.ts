import { Router, Request, Response } from 'express';
import { authService, AuthRequest } from '../services/authService';
import { searchService } from '../services/searchService';
import { query, validationResult } from 'express-validator';

const router = Router();

// Search documents
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('type').optional().isIn(['all', 'documents', 'notes', 'files']).withMessage('Invalid search type'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
      return;
    }

    const {
      q: query,
      type = 'all',
      limit = 20,
      offset = 0,
      contentType,
      dateStart,
      dateEnd,
      owner
    } = req.query;

    // Get user ID if authenticated
    let userId: number | undefined;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = authService.verifyToken(token);
        userId = decoded.userId;
      }
    } catch (error) {
      // Not authenticated, continue with public search
    }

    const searchOptions = {
      query: query as string,
      type: type as 'all' | 'documents' | 'notes' | 'files',
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      userId,
      filters: {
        ...(contentType && { contentType: (contentType as string).split(',') }),
        ...(dateStart && dateEnd && {
          dateRange: {
            start: dateStart as string,
            end: dateEnd as string
          }
        }),
        ...(owner && { owner: owner as string })
      }
    };

    const results = await searchService.search(searchOptions);

    res.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
    });
  }
});

// Get search suggestions
router.get('/suggest', [
  query('q').notEmpty().withMessage('Query is required'),
  query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
      return;
    }

    const { q: query, limit = 5 } = req.query;

    const suggestions = await searchService.suggest(
      query as string,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
    });
  }
});

// Get search statistics
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await searchService.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search statistics',
      error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
    });
  }
});

// Advanced search with authentication
router.post('/advanced', 
  authService.authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      query,
      filters = {},
      sort = 'relevance',
      limit = 20,
      offset = 0
    } = req.body;

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
      return;
    }

    const searchOptions = {
      query,
      limit,
      offset,
      userId: req.user?.id,
      filters
    };

    const results = await searchService.search(searchOptions);

    res.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: 'Advanced search failed',
      error: process.env.NODE_ENV === 'development' ? error : 'Internal server error'
    });
  }
});

export default router;
