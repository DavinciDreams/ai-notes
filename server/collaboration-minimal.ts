import { Server } from '@hocuspocus/server';

const port = process.env.COLLABORATION_PORT || 1234;

// Create a simple Hocuspocus server for real-time collaboration
const server = new Server({
  port: Number(port),
  
  // Log connection events
  onConnect: async (data) => {
    console.log(`User connected to document: ${data.documentName} (Socket: ${data.socketId})`);
  },

  onDisconnect: async (data) => {
    console.log(`User disconnected from document: ${data.documentName} (Socket: ${data.socketId})`);
  }
});

export { server };

// Start the collaboration server if this file is run directly
// Note: Always start in development mode with tsx
server.listen()
  .then(() => {
    console.log(`🚀 Collaboration server running on ws://localhost:${port}`);
    console.log('Ready for real-time document collaboration');
  })
  .catch((error) => {
    console.error('❌ Failed to start collaboration server:', error);
    process.exit(1);
  });
