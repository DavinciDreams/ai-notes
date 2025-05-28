import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, audio, and documents
    const allowedTypes = /\.(jpg|jpeg|png|gif|mp4|webm|mp3|wav|pdf|doc|docx|txt)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Simple file upload endpoint
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileInfo = {
      id: path.parse(req.file.filename).name,
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      filename: req.file.filename,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Multiple file upload
router.post('/upload-multiple', upload.array('files', 10), async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const uploadedFiles = files.map(file => ({
      id: path.parse(file.filename).name,
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      filename: file.filename,
      uploadedAt: new Date().toISOString()
    }));

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get file info
router.get('/file/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const stats = fs.statSync(filePath);
    const fileInfo = {
      filename,
      size: stats.size,
      uploadedAt: stats.birthtime.toISOString(),
      url: `/uploads/${filename}`
    };

    res.json(fileInfo);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    storageType: 'local',
    uploadsDirectory: uploadsDir
  });
});

export default router;
