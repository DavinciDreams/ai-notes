import { Router, Request, Response } from 'express';
import { authService, AuthRequest } from '../services/authService';
import { aiService } from '../services/aiService';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// File upload configuration for audio files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const audioUpload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Allow audio and video files for transcription
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and video files are allowed for transcription'));
    }
  }
});

// Health check for AI services
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const [whisperHealth, ollamaHealth] = await Promise.all([
      aiService.checkWhisperHealth(),
      aiService.checkOllamaHealth()
    ]);

    const models = ollamaHealth ? await aiService.getAvailableModels() : [];

    res.json({
      whisper: {
        available: whisperHealth,
        url: process.env.WHISPER_URL || 'http://localhost:9000'
      },
      ollama: {
        available: ollamaHealth,
        url: process.env.OLLAMA_URL || 'http://localhost:11434',
        models: models
      },
      status: whisperHealth && ollamaHealth ? 'healthy' : 'partial'
    });
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({ 
      error: 'Failed to check AI services health',
      whisper: { available: false },
      ollama: { available: false },
      status: 'unhealthy'
    });
  }
});

// Transcribe audio using Whisper
router.post('/transcribe', 
  authService.optionalAuth,
  audioUpload.single('audio'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No audio file provided' });
        return;
      }

      const audioPath = req.file.path;

      try {
        // Check if Whisper service is available
        const whisperAvailable = await aiService.checkWhisperHealth();
        if (!whisperAvailable) {
          res.status(503).json({ error: 'Whisper service is not available' });
          return;
        }

        const transcription = await aiService.transcribeAudio(audioPath);

        res.json({
          text: transcription.text,
          confidence: transcription.confidence,
          language: transcription.language,
          segments: transcription.segments
        });
      } catch (aiError) {
        console.error('Transcription error:', aiError);
        res.status(500).json({ error: 'Failed to transcribe audio' });
      } finally {
        // Clean up uploaded file
        fs.unlink(audioPath, (err) => {
          if (err) console.error('Error deleting uploaded file:', err);
        });
      }
    } catch (error) {
      console.error('Audio upload error:', error);
      res.status(500).json({ error: 'Failed to process audio file' });
    }
  }
);

// Generate text using LLM
router.post('/generate',
  [
    body('prompt').isLength({ min: 1, max: 5000 }).trim(),
    body('model').optional().isString(),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
    body('maxTokens').optional().isInt({ min: 1, max: 4096 })
  ],
  authService.optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { prompt, model = 'llama3.2:latest' } = req.body;

      // Check if Ollama service is available
      const ollamaAvailable = await aiService.checkOllamaHealth();
      if (!ollamaAvailable) {
        res.status(503).json({ error: 'Ollama service is not available' });
        return;
      }

      try {
        const response = await aiService.generateText(prompt, model);
        res.json({
          response: response.response,
          model: response.model,
          createdAt: response.created_at
        });
      } catch (aiError) {
        console.error('Text generation error:', aiError);
        res.status(500).json({ error: 'Failed to generate text' });
      }
    } catch (error) {
      console.error('Generate endpoint error:', error);
      res.status(500).json({ error: 'Failed to process request' });
    }
  }
);

// Chat with LLM
router.post('/chat',
  [
    body('messages').isArray({ min: 1 }),
    body('messages.*.role').isIn(['system', 'user', 'assistant']),
    body('messages.*.content').isLength({ min: 1, max: 5000 }),
    body('model').optional().isString()
  ],
  authService.optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { messages, model = 'llama3.2:latest' } = req.body;

      // Check if Ollama service is available
      const ollamaAvailable = await aiService.checkOllamaHealth();
      if (!ollamaAvailable) {
        res.status(503).json({ error: 'Ollama service is not available' });
        return;
      }

      // Validate message format
      for (const message of messages) {
        if (!['system', 'user', 'assistant'].includes(message.role)) {
          res.status(400).json({ error: 'Invalid message role' });
          return;
        }
      }

      try {
        const response = await aiService.chatWithLLM(messages, model);
        res.json({
          response: response.response,
          model: response.model,
          createdAt: response.created_at
        });
      } catch (aiError) {
        console.error('Chat error:', aiError);
        res.status(500).json({ error: 'Failed to chat with LLM' });
      }
    } catch (error) {
      console.error('Chat endpoint error:', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  }
);

// Summarize text
router.post('/summarize',
  [
    body('text').isLength({ min: 100, max: 50000 }).trim(),
    body('maxLength').optional().isInt({ min: 50, max: 1000 })
  ],
  authService.optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { text, maxLength = 200 } = req.body;

      // Check if Ollama service is available
      const ollamaAvailable = await aiService.checkOllamaHealth();
      if (!ollamaAvailable) {
        res.status(503).json({ error: 'Ollama service is not available' });
        return;
      }

      try {
        const summary = await aiService.summarizeDocument(text, maxLength);
        res.json({ summary });
      } catch (aiError) {
        console.error('Summarization error:', aiError);
        res.status(500).json({ error: 'Failed to summarize text' });
      }
    } catch (error) {
      console.error('Summarize endpoint error:', error);
      res.status(500).json({ error: 'Failed to process summarization request' });
    }
  }
);

// Extract keywords from text
router.post('/keywords',
  [body('text').isLength({ min: 50, max: 50000 }).trim()],
  authService.optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { text } = req.body;

      // Check if Ollama service is available
      const ollamaAvailable = await aiService.checkOllamaHealth();
      if (!ollamaAvailable) {
        res.status(503).json({ error: 'Ollama service is not available' });
        return;
      }

      try {
        const keywords = await aiService.extractKeywords(text);
        res.json({ keywords });
      } catch (aiError) {
        console.error('Keyword extraction error:', aiError);
        res.status(500).json({ error: 'Failed to extract keywords' });
      }
    } catch (error) {
      console.error('Keywords endpoint error:', error);
      res.status(500).json({ error: 'Failed to process keyword extraction request' });
    }
  }
);

// Generate title from content
router.post('/title',
  [body('content').isLength({ min: 50, max: 10000 }).trim()],
  authService.optionalAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation failed', details: errors.array() });
        return;
      }

      const { content } = req.body;

      // Check if Ollama service is available
      const ollamaAvailable = await aiService.checkOllamaHealth();
      if (!ollamaAvailable) {
        res.status(503).json({ error: 'Ollama service is not available' });
        return;
      }

      try {
        const title = await aiService.generateTitle(content);
        res.json({ title });
      } catch (aiError) {
        console.error('Title generation error:', aiError);
        res.status(500).json({ error: 'Failed to generate title' });
      }
    } catch (error) {
      console.error('Title endpoint error:', error);
      res.status(500).json({ error: 'Failed to process title generation request' });
    }
  }
);

// Get available models
router.get('/models', async (req: Request, res: Response): Promise<void> => {
  try {
    const ollamaAvailable = await aiService.checkOllamaHealth();
    if (!ollamaAvailable) {
      res.status(503).json({ error: 'Ollama service is not available', models: [] });
      return;
    }

    const models = await aiService.getAvailableModels();
    res.json({ models });
  } catch (error) {
    console.error('Models endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch available models', models: [] });
  }
});

export default router;
