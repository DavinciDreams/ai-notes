# AI Notes - Collaborative Knowledge Management System

A self-hosted collaborative knowledge management web application that integrates features from OneNote, Notion, Excalidraw, and AI-driven knowledge base functionality.

## 🌟 Features

### 📝 Rich Text Editing
- **Collaborative Editor**: Real-time collaborative editing with conflict resolution
- **Rich Formatting**: Bold, italic, underline, lists, quotes, code blocks
- **Document Management**: Create, edit, save, and organize documents
- **Version History**: Track changes and revert to previous versions

### 🎨 Visual Collaboration
- **Drawing Canvas**: Integrated drawing and sketching capabilities
- **Knowledge Graph**: Visual representation of relationships between concepts
- **Mind Mapping**: Connect ideas and visualize knowledge structures

### 🎤 Voice Integration
- **Speech-to-Text**: Convert voice recordings to text using Whisper
- **Text-to-Speech**: Browser-native text-to-speech functionality
- **Voice Commands**: Control the application with voice commands

### 🔍 Intelligent Search
- **Full-Text Search**: Search across all documents and content
- **Semantic Search**: AI-powered contextual search using Elasticsearch
- **Advanced Filters**: Filter by document type, date, tags, and more

### 🧠 AI-Powered Features
- **Local LLMs**: Integration with Llama models via Ollama (no external APIs)
- **Knowledge Extraction**: Automatically extract entities and relationships
- **Content Suggestions**: AI-powered writing assistance and content recommendations

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for fast development and building
- **React Query** for state management and API caching
- **React Router** for navigation

### Backend Services
- **Node.js/Express** - Main API server
- **FastAPI** - AI services (Python)
- **WebSocket Server** - Real-time collaboration via Yjs + Hocuspocus

### Databases
- **PostgreSQL** - Primary data storage
- **Neo4j** - Knowledge graph and relationships
- **Elasticsearch** - Full-text search and semantic search
- **Redis** - Caching and session management

### AI/ML Stack
- **Ollama** - Local LLM inference (Llama models)
- **Whisper** - Speech-to-text processing
- **Easy Speech** - Browser-native text-to-speech

### Storage
- **MinIO** - Object storage for files and attachments

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Python** 3.8+ (for AI services)
- **Ollama** (for local LLM inference)

### 1. Clone and Install

```bash
git clone <repository-url>
cd ai-notes
npm install
```

### 2. Start Infrastructure Services

```bash
# Start databases and services
npm run docker:up

# This starts:
# - PostgreSQL (port 5432)
# - Neo4j (ports 7474, 7687)
# - Elasticsearch (port 9200)
# - Redis (port 6379)
# - MinIO (port 9000)
```

### 3. Configure Environment

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Key environment variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL settings
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` - Neo4j settings
- `ELASTICSEARCH_URL` - Elasticsearch connection
- `REDIS_URL` - Redis connection
- `OLLAMA_URL` - Ollama API endpoint

### 4. Start Development Servers

```bash
# Start all services (frontend, backend, collaboration)
npm run dev

# Or start individually:
npm run dev:frontend    # React app (port 5173)
npm run dev:backend     # API server (port 3001)
npm run dev:collaboration # WebSocket server (port 1234)
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:3001/api
- **Neo4j Browser**: http://localhost:7474
- **MinIO Console**: http://localhost:9000

## 📖 Usage

### Getting Started
1. **Register**: Create a new account at the login screen
2. **Create Document**: Click the "+" button to create your first document
3. **Start Writing**: Use the rich text editor with formatting tools
4. **Add Voice Notes**: Click the microphone icon to add voice recordings
5. **Explore Knowledge**: Use the knowledge graph to visualize connections

### Collaboration
- **Real-time Editing**: Multiple users can edit the same document simultaneously
- **User Presence**: See who's currently editing with live cursors
- **Conflict Resolution**: Automatic merge of simultaneous changes

### Voice Features
- **Speech-to-Text**: Press the microphone button and speak
- **Voice Commands**: Say "create new document", "save document", etc.
- **Text-to-Speech**: Select text and use the speaker icon to hear it read aloud

### Knowledge Graph
- **Auto-generation**: Relationships are automatically extracted from your content
- **Manual Editing**: Add, edit, or delete nodes and relationships
- **Navigation**: Click on nodes to navigate to related documents

## 🛠️ Development

### Project Structure

```
ai-notes/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and service layers
│   └── types/             # TypeScript type definitions
├── server/                # Backend Node.js application
│   ├── routes/            # Express route handlers
│   ├── services/          # Business logic services
│   └── database.ts        # Database configuration
├── docker/                # Docker configuration files
└── public/                # Static assets
```

### Available Scripts

```bash
# Development
npm run dev                 # Start all services
npm run dev:frontend        # Frontend only
npm run dev:backend         # Backend only
npm run dev:collaboration   # Collaboration server only

# Building
npm run build              # Build frontend and backend
npm run build:backend      # Build backend only

# Production
npm start                  # Start production servers
npm run docker:build       # Build Docker images
npm run docker:up          # Start with Docker Compose

# Utilities
npm run lint               # Run ESLint
npm run preview            # Preview production build
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Backend server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `NEO4J_URI` | Neo4j connection URI | `bolt://localhost:7687` |
| `ELASTICSEARCH_URL` | Elasticsearch endpoint | `http://localhost:9200` |
| `OLLAMA_URL` | Ollama API endpoint | `http://localhost:11434` |
| `JWT_SECRET` | JWT signing secret | (required in production) |

## 🔧 Configuration

### AI Models
Configure AI models in your `.env` file:

```env
DEFAULT_LLM_MODEL=llama3.2
WHISPER_MODEL=base
ENABLE_GPU=false
```

### Database Settings
Ensure all database services are running and accessible:

```bash
# Check service status
npm run docker:up
docker-compose ps
```

### Security
- Change default passwords in production
- Set a secure `JWT_SECRET`
- Configure HTTPS in production
- Review CORS settings for your domain

## 📝 API Documentation

### Authentication
```bash
POST /api/auth/register     # Register new user
POST /api/auth/login        # User login
GET  /api/auth/profile      # Get user profile
```

### Documents
```bash
GET    /api/documents       # List documents
POST   /api/documents       # Create document
GET    /api/documents/:id   # Get document
PUT    /api/documents/:id   # Update document
DELETE /api/documents/:id   # Delete document
```

### Knowledge Graph
```bash
GET    /api/knowledge-graph/status    # Connection status
GET    /api/knowledge-graph/stats     # Graph statistics
GET    /api/knowledge-graph/graph     # Get graph data
POST   /api/knowledge-graph/nodes     # Create node
POST   /api/knowledge-graph/relationships # Create relationship
```

### Search
```bash
GET /api/search?q=query     # Search documents
POST /api/search/semantic   # Semantic search
```

## 🐳 Docker Deployment

### Development with Docker
```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f app
```

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production stack
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Use TypeScript for all new code
- Follow React best practices with hooks and functional components
- Implement modular microservices architecture
- Prioritize self-hosted, privacy-focused solutions
- Include comprehensive error handling
- Comment code extensively for maintenance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Services not starting:**
```bash
# Reset Docker containers
docker-compose down -v
docker-compose up -d
```

**Database connection issues:**
```bash
# Check database status
docker-compose ps
docker-compose logs postgres
```

**Port conflicts:**
- Frontend: Change `VITE_PORT` in `.env`
- Backend: Change `PORT` in `.env`
- Databases: Modify ports in `docker-compose.yml`

### Getting Help
- Check the [Issues](https://github.com/your-repo/issues) page
- Review the [API Documentation](#api-documentation)
- Ensure all [Prerequisites](#prerequisites) are installed

## 🔮 Roadmap

- [ ] **Enhanced Collaboration**: Real-time cursors and presence indicators
- [ ] **Mobile App**: React Native mobile application
- [ ] **Plugin System**: Extensible plugin architecture
- [ ] **Advanced AI**: Integration with more LLM providers
- [ ] **Team Management**: Organizations and team collaboration features
- [ ] **Advanced Search**: Natural language query processing
- [ ] **Offline Support**: PWA with offline editing capabilities
- [ ] **Import/Export**: Support for common document formats

---

Built with ❤️ using React, Node.js, and modern web technologies.
