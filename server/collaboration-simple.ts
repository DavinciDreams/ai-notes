import { Server } from '@hocuspocus/server';
import * as path from 'path';
import * as fs from 'fs';

const port = process.env.COLLABORATION_PORT || 1234;
const dataDir = path.join(process.cwd(), 'data', 'collaboration');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Generate a consistent color for each user based on their socket ID
function generateUserColor(socketId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FF7F50', '#87CEEB', '#98D8C8', '#F7DC6F'
  ];
  
  const hash = socketId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}

// Create Hocuspocus server for real-time collaboration
const server = new Server({
  port: Number(port),
  
  // Authentication and authorization
  async onConnect(data) {
    console.log(`User connecting to document: ${data.documentName}`);
    console.log(`Socket ID: ${data.socketId}`);
    
    // TODO: Implement authentication
    // Check if user has permission to access this document
    
    // For now, allow all connections and return user context
    return {
      user: {
        id: data.socketId,
        name: `User ${data.socketId.slice(0, 6)}`,
        color: generateUserColor(data.socketId)
      }
    };
  },
  async onDisconnect(data) {
    console.log(`User disconnected from document: ${data.documentName}`);
  },
  // Called when a client requests the document
  async onRequest(data) {
    // Use data as the document request property according to Hocuspocus types
    console.log(`Document requested:`, data);
    // TODO: Check permissions here
    return {};
  }
});

export { server };

// Start the collaboration server if this file is run directly
if (require.main === module) {
  server.listen().then(() => {
    console.log(`Collaboration server running on port ${port}`);
  }).catch((error) => {
    console.error('Failed to start collaboration server:', error);
  });
}
