import { Server } from '@hocuspocus/server';
import * as path from 'path';
import * as fs from 'fs';

const port = process.env.COLLABORATION_PORT || 1234;
const dataDir = path.join(process.cwd(), 'data', 'collaboration');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create Hocuspocus server for real-time collaboration
const server = new Server({
  port: Number(port),
  
  // Authentication and authorization
  async onConnect(data) {
    console.log(`User connecting to document: ${data.documentName}`);
    
    // TODO: Implement authentication
    // Check if user has permission to access this document
    const { socketId } = data;
    
    // For now, allow all connections
    return {
      user: {
        id: socketId,
        name: `User ${socketId.slice(0, 6)}`,
        color: generateUserColor(socketId)
      }
    };
  },

  async onDisconnect(data) {
    console.log(`User disconnected from document: ${data.documentName}`);
  },
  // Store document updates
  async onStoreDocument(data) {
    console.log(`Storing document: ${data.documentName}`);
    // TODO: Integrate with PostgreSQL to store document updates
    
    // For now, store in file system
    const filePath = path.join(dataDir, `${data.documentName}.yjs`);
    // Use Yjs to encode the document state as an update
    const Y = require('yjs');
    const uint8Array = Y.encodeStateAsUpdate(data.document);
    await fs.promises.writeFile(filePath, Buffer.from(uint8Array));
  },

  // Load document from storage
  async onLoadDocument(data) {
    console.log(`Loading document: ${data.documentName}`);
    // TODO: Integrate with PostgreSQL to fetch document content
    
    // For now, load from file system
    const filePath = path.join(dataDir, `${data.documentName}.yjs`);
    try {
      const buffer = await fs.promises.readFile(filePath);
      return new Uint8Array(buffer);
    } catch (error) {
      // Document doesn't exist yet, return null to create new one
      return null;
    }
  }
});

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

export { server };

// Start the collaboration server if this file is run directly
if (require.main === module) {
  server.listen().then(() => {
    console.log(`Collaboration server running on port ${port}`);
  }).catch((error) => {
    console.error('Failed to start collaboration server:', error);
  });
}
