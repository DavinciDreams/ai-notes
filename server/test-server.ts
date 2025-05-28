// Simple test server to verify our setup
import express from 'express';
import cors from 'cors';
import path from 'path';
import uploadRoutes from './routes/upload-simple';

const app = express();
const PORT = 3001;

// Basic middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'uploads')));

// Upload route
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Test server running'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
