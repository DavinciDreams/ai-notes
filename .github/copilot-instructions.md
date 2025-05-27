# Collaborative Knowledge Management System - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a self-hosted collaborative knowledge management web application that integrates features from OneNote, Notion, Excalidraw, and AI-driven knowledge base functionality.

## Architecture
- **Frontend**: React + TypeScript with Tailwind CSS
- **Backend**: Node.js/Express + FastAPI for AI services
- **Collaboration**: Yjs + Hocuspocus for real-time editing
- **AI/ML**: Local LLMs (Llama via Ollama), Whisper, Easy Speech
- **Database**: PostgreSQL + Elasticsearch + Neo4j
- **Storage**: MinIO for files

## Key Integrations
- Affine: Base collaborative platform
- Tiptap: Rich-text editor with Yjs collaboration
- Quivr: AI knowledge base
- Whisper: Speech-to-text
- Easy Speech: Browser-native text-to-speech
- Open Canvas: AI content creation

## Development Guidelines
- Use TypeScript for all new code
- Follow React best practices with hooks and functional components
- Implement modular microservices architecture
- Prioritize self-hosted, privacy-focused solutions
- Use open-source tools to minimize custom development
- Ensure mobile-friendly responsive design
- Include comprehensive error handling
- Comment code extensively for maintenance

## AI Model Usage
- Use local Llama models via Ollama (no external API dependencies)
- Implement proper GPU acceleration support
- Handle resource-intensive operations gracefully
- Provide fallbacks for systems without GPU support

## Security & Privacy
- Implement end-to-end encryption
- Use OAuth 2.0 for authentication
- Ensure HTTPS for all communications
- No external data transmission without explicit consent
