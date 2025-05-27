# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with React + TypeScript + Vite
- Collaborative rich text editor with SimpleRichEditor fallback
- Real-time collaboration infrastructure with Yjs + Hocuspocus
- Voice controls with speech-to-text and text-to-speech
- Knowledge graph visualization with Neo4j backend
- Full-text search with Elasticsearch integration
- AI-powered features with local Ollama/Llama models
- Drawing canvas for visual collaboration
- User authentication and authorization system
- Docker-based development environment
- Comprehensive API endpoints for documents, search, and knowledge graph
- Multi-database architecture (PostgreSQL, Neo4j, Elasticsearch, Redis)
- File storage with MinIO integration
- Modern UI with Tailwind CSS
- Mobile-responsive design

### Infrastructure
- Docker Compose setup for all services
- PostgreSQL for primary data storage
- Neo4j for knowledge graph and relationships
- Elasticsearch for search capabilities
- Redis for caching and sessions
- MinIO for object storage
- Nginx reverse proxy configuration

### Security
- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- Environment-based configuration

### Developer Experience
- TypeScript throughout the stack
- ESLint and Prettier configuration
- Hot module replacement in development
- Comprehensive documentation
- Development and production Docker configurations
- VS Code tasks and settings

## [0.1.0] - 2025-05-27

### Added
- Initial release
- Basic collaborative knowledge management functionality
- Core features implemented and tested
- Development environment fully operational
- All major services integrated and working

### Notes
- This is the first working version of the AI Notes collaborative knowledge management system
- All core infrastructure is operational
- Ready for development and testing
- Suitable for self-hosted deployment
