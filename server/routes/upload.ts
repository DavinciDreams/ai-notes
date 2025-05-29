import express from 'express';
import multer from 'multer';
import { Client } from 'minio';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Configure MinIO client
let minioClient: Client | null = null;

try {
  minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  });
  console.log('✅ MinIO client initialized');
} catch (error) {
  console.error('❌ MinIO client initialization failed:', error);
  console.log('⚠️  Upload functionality will be limited');
}

// Ensure bucket exists
const bucketName = 'ai-notes-files';
async function ensureBucketExists() {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName, 'us-east-1');
    console.log(`Created bucket: ${bucketName}`);
  }
}

// Initialize bucket
ensureBucketExists().catch(console.error);

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '100') * 1024 * 1024, // Default 100MB
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, and documents
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/mpeg',
      'application/pdf',
      'text/plain',
      'application/json',
      'application/zip',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// Upload single file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const objectName = `uploads/${fileName}`;

    // Upload to MinIO
    await minioClient.putObject(
      bucketName,
      objectName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
        'Original-Name': file.originalname,
        'Uploaded-By': req.user?.userId || 'anonymous',
        'Upload-Date': new Date().toISOString(),
      }
    );

    // Generate presigned URL for access
    const url = await minioClient.presignedGetObject(bucketName, objectName, 7 * 24 * 60 * 60); // 7 days

    const response = {
      success: true,
      file: {
        id: fileName,
        url,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        objectName,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.userId || 'anonymous',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
    });
  }
});

// Upload multiple files
router.post('/upload-multiple', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const files = req.files as any[];
    const uploadedFiles = [];

    for (const file of files) {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const objectName = `uploads/${fileName}`;

      // Upload to MinIO
      await minioClient.putObject(
        bucketName,
        objectName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
          'Original-Name': file.originalname,
          'Uploaded-By': req.user?.userId || 'anonymous',
          'Upload-Date': new Date().toISOString(),
        }
      );

      // Generate presigned URL for access
      const url = await minioClient.presignedGetObject(bucketName, objectName, 7 * 24 * 60 * 60);

      uploadedFiles.push({
        id: fileName,
        url,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        objectName,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.userId || 'anonymous',
      });
    }

    res.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload files',
    });
  }
});

// Upload from URL
router.post('/upload-url', authenticateToken, async (req, res) => {
  try {
    const { url, filename } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // Fetch the file from URL
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(400).json({ success: false, error: 'Failed to fetch file from URL' });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Generate filename if not provided
    const fileExtension = path.extname(new URL(url).pathname) || '.bin';
    const fileName = filename ? `${filename}${fileExtension}` : `${uuidv4()}${fileExtension}`;
    const objectName = `uploads/${fileName}`;

    // Upload to MinIO
    await minioClient.putObject(
      bucketName,
      objectName,
      buffer,
      buffer.length,
      {
        'Content-Type': contentType,
        'Source-URL': url,
        'Uploaded-By': req.user?.userId || 'anonymous',
        'Upload-Date': new Date().toISOString(),
      }
    );

    // Generate presigned URL for access
    const presignedUrl = await minioClient.presignedGetObject(bucketName, objectName, 7 * 24 * 60 * 60);

    res.json({
      success: true,
      file: {
        id: fileName,
        url: presignedUrl,
        name: filename || fileName,
        size: buffer.length,
        type: contentType,
        objectName,
        sourceUrl: url,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.userId || 'anonymous',
      },
    });
  } catch (error) {
    console.error('URL upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file from URL',
    });
  }
});

// Get file info
router.get('/file/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const objectName = `uploads/${fileId}`;

    // Get object stats
    const stats = await minioClient.statObject(bucketName, objectName);
    
    // Generate new presigned URL
    const url = await minioClient.presignedGetObject(bucketName, objectName, 7 * 24 * 60 * 60);

    res.json({
      success: true,
      file: {
        id: fileId,
        url,
        name: stats.metaData?.['original-name'] || fileId,
        size: stats.size,
        type: stats.metaData?.['content-type'],
        uploadedAt: stats.metaData?.['upload-date'],
        uploadedBy: stats.metaData?.['uploaded-by'],
        lastModified: stats.lastModified,
      },
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(404).json({
      success: false,
      error: 'File not found',
    });
  }
});

// Delete file
router.delete('/file/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const objectName = `uploads/${fileId}`;

    // Check if file exists and user has permission
    const stats = await minioClient.statObject(bucketName, objectName);
    const uploadedBy = stats.metaData?.['uploaded-by'];
    
    if (uploadedBy !== req.user?.userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this file',
      });
    }

    // Delete from MinIO
    await minioClient.removeObject(bucketName, objectName);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
    });
  }
});

// List user's files
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const userId = req.user?.userId;

    // List all objects in uploads folder
    const objectsStream = minioClient.listObjects(bucketName, 'uploads/', true);
    const objects = [];

    for await (const obj of objectsStream) {
      try {
        const stats = await minioClient.statObject(bucketName, obj.name);
        
        // Filter by user if not admin
        if (req.user?.role !== 'admin' && stats.metaData?.['uploaded-by'] !== userId) {
          continue;
        }

        // Filter by type if specified
        if (type && !stats.metaData?.['content-type']?.startsWith(type as string)) {
          continue;
        }

        objects.push({
          id: path.basename(obj.name),
          name: stats.metaData?.['original-name'] || path.basename(obj.name),
          size: stats.size,
          type: stats.metaData?.['content-type'],
          uploadedAt: stats.metaData?.['upload-date'],
          uploadedBy: stats.metaData?.['uploaded-by'],
          lastModified: stats.lastModified,
        });
      } catch (error) {
        // Skip objects that can't be accessed
        continue;
      }
    }

    // Sort by upload date (newest first)
    objects.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    // Paginate
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedObjects = objects.slice(startIndex, endIndex);

    res.json({
      success: true,
      files: paginatedObjects,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: objects.length,
        pages: Math.ceil(objects.length / Number(limit)),
      },
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list files',
    });
  }
});

export default router;
