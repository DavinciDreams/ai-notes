import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthService } from '../services/authService';
import type { AuthRequest as AuthenticatedRequest } from '../services/authService';

const authService = new AuthService();
const authenticateToken = authService.authenticateToken;
import { enhancedIngestionService } from '../services/enhancedIngestionService';
import type { IngestionOptions, BatchIngestionOptions } from '../services/enhancedIngestionService';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Max 10 files
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types
    const allowedTypes = /\.(txt|pdf|docx|xlsx|csv|json|html|md|jpg|jpeg|png|gif|mp3|wav|mp4|avi)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

/**
 * Upload and ingest a single file
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
      return;
    }

    const options: IngestionOptions = {
      userId: req.user!.id,
      isPublic: req.body.isPublic === 'true',
      extractKeywords: req.body.extractKeywords !== 'false',
      generateTitle: req.body.generateTitle !== 'false',
      extractEntities: req.body.extractEntities === 'true',
      buildKnowledgeGraph: req.body.buildKnowledgeGraph === 'true',
      chunkSize: parseInt(req.body.chunkSize) || 1000,
      overlapSize: parseInt(req.body.overlapSize) || 200,
      enableOCR: req.body.enableOCR === 'true',
      language: req.body.language || 'en',
      tags: req.body.tags ? req.body.tags.split(',').map((t: string) => t.trim()) : []
    };

    const job = await enhancedIngestionService.ingestFile(req.file.path, options);

    res.json({
      success: true,
      data: {
        jobId: job.id,
        fileName: job.fileName,
        fileSize: job.fileSize,
        status: job.status,
        message: 'File uploaded and queued for processing'
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Upload and ingest multiple files
 */
router.post('/batch', authenticateToken, upload.array('files', 10), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const options: BatchIngestionOptions = {
      userId: req.user!.id,
      isPublic: req.body.isPublic === 'true',
      extractKeywords: req.body.extractKeywords !== 'false',
      generateTitle: req.body.generateTitle !== 'false',
      extractEntities: req.body.extractEntities === 'true',
      buildKnowledgeGraph: req.body.buildKnowledgeGraph === 'true',
      chunkSize: parseInt(req.body.chunkSize) || 1000,
      overlapSize: parseInt(req.body.overlapSize) || 200,
      enableOCR: req.body.enableOCR === 'true',
      language: req.body.language || 'en',
      tags: req.body.tags ? req.body.tags.split(',').map((t: string) => t.trim()) : [],
      maxConcurrent: parseInt(req.body.maxConcurrent) || 3
    };

    const filePaths = req.files.map(file => file.path);
    const jobs = await enhancedIngestionService.ingestBatch(filePaths, options);

    res.json({
      success: true,
      jobs: jobs.map(job => ({
        jobId: job.id,
        fileName: job.fileName,
        fileSize: job.fileSize
      })),
      message: `${jobs.length} files uploaded and queued for processing`
    });
  } catch (error) {
    console.error('Batch ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get job status
 */
router.get('/jobs/:jobId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const job = enhancedIngestionService.getJobStatus(jobId);

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // Only allow users to view their own jobs
    if (job.userId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        fileName: job.fileName,
        fileSize: job.fileSize,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        result: job.result
      }
    });

  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * List user's ingestion jobs
 */
router.get('/jobs', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, limit = '20', offset = '0' } = req.query;
    
    const limitNum = parseInt(limit as string) || 20;
    const offsetNum = parseInt(offset as string) || 0;

    const allJobs = enhancedIngestionService.getAllJobs();
    
    // Filter jobs for the current user
    const userJobs = allJobs.filter(job => job.userId === req.user!.id);
    
    // Apply status filter if provided
    const filteredJobs = status ? 
      userJobs.filter(job => job.status === status) : 
      userJobs;

    // Apply pagination
    const paginatedJobs = filteredJobs.slice(offsetNum, offsetNum + limitNum);

    res.json({
      success: true,
      data: {
        jobs: paginatedJobs.map(job => ({
          id: job.id,
          fileName: job.fileName,
          fileSize: job.fileSize,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          error: job.error
        })),
        pagination: {
          total: filteredJobs.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < filteredJobs.length
        }
      }
    });

  } catch (error) {
    console.error('Error listing jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete ingestion job
 */
router.delete('/jobs/:jobId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const job = enhancedIngestionService.getJobStatus(jobId);

    if (!job) {
      res.status(404).json({ 
        success: false,
        error: 'Job not found' 
      });
      return;
    }

    // Only allow users to delete their own jobs
    if (job.userId !== req.user!.id) {
      res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
      return;
    }

    await enhancedIngestionService.cancelJob(jobId);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete job',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Ingest content from URL
 */
router.post('/url', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { url, options } = req.body;

    if (!url) {
      res.status(400).json({ 
        success: false,
        error: 'URL is required' 
      });
      return;
    }

    const ingestionOptions: IngestionOptions = {
      userId: req.user!.id,
      ...options
    };

    const job = await enhancedIngestionService.ingestUrl(url, ingestionOptions);

    res.json({
      success: true,
      data: {
        jobId: job.id,
        url,
        status: job.status,
        message: 'URL content queued for processing'
      }
    });

  } catch (error) {
    console.error('URL ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ingest URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Ingest text content directly
 */
router.post('/text', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { text, title, options } = req.body;

    if (!text) {
      res.status(400).json({ 
        success: false,
        error: 'Text content is required' 
      });
      return;
    }

    const ingestionOptions: IngestionOptions = {
      userId: req.user!.id,
      title: title || 'Text Document',
      ...options
    };

    const job = await enhancedIngestionService.ingestText(text, ingestionOptions);

    res.json({
      success: true,
      data: {
        jobId: job.id,
        title: title || 'Text Document',
        status: job.status,
        message: 'Text content queued for processing'
      }
    });

  } catch (error) {
    console.error('Text ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ingest text',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get ingestion statistics
 */
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const allJobs = enhancedIngestionService.getAllJobs();
    
    // Filter jobs for the current user
    const userJobs = allJobs.filter(job => job.userId === req.user!.id);

    const stats = {
      totalJobs: userJobs.length,
      completedJobs: userJobs.filter(job => job.status === 'completed').length,
      failedJobs: userJobs.filter(job => job.status === 'failed').length,
      processingJobs: userJobs.filter(job => job.status === 'processing').length,
      pendingJobs: userJobs.filter(job => job.status === 'pending').length,
      totalFilesProcessed: userJobs.filter(job => job.status === 'completed').reduce((sum, job) => sum + (job.result?.documentsCreated || 0), 0),
      totalDocumentsCreated: userJobs.filter(job => job.status === 'completed').reduce((sum, job) => sum + (job.result?.documentsCreated || 0), 0),
      supportedFormats: [
        'txt', 'pdf', 'docx', 'xlsx', 'csv', 'json', 'html', 'md',
        'jpg', 'jpeg', 'png', 'gif', 'mp3', 'wav', 'mp4', 'avi'
      ],
      averageProcessingTime: userJobs
        .filter(job => job.status === 'completed' && job.startedAt && job.completedAt)
        .reduce((sum, job) => {
          const processingTime = new Date(job.completedAt!).getTime() - new Date(job.startedAt!).getTime();
          return sum + processingTime;
        }, 0) / Math.max(1, userJobs.filter(job => job.status === 'completed').length)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
