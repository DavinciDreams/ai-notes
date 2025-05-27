import React, { useEffect, useRef, useState } from 'react';
import { createEmptyDoc, PageEditor } from '@blocksuite/presets';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface CollaborativeBlockSuiteEditorProps {
  documentId?: string;
  userId?: string;
  userName?: string;
  onReady?: (editor: PageEditor) => void;
  className?: string;
}

export const CollaborativeBlockSuiteEditor: React.FC<CollaborativeBlockSuiteEditorProps> = ({ 
  documentId = 'default-doc',
  userId = 'anonymous',
  userName = 'Anonymous User',
  onReady, 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<PageEditor | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      console.log('Initializing collaborative BlockSuite editor...');

      // Create empty document
      const doc = createEmptyDoc().init();

      // Create Yjs document for collaboration
      const ydoc = new Y.Doc();

      // Create WebSocket provider for collaboration
      const provider = new WebsocketProvider(
        'ws://localhost:1234', // Our collaboration server
        documentId,
        ydoc,
        {
          connect: true,
          awareness: {
            user: {
              name: userName,
              id: userId,
              color: '#' + Math.floor(Math.random()*16777215).toString(16), // Random color
            },
          },
        }
      );

      providerRef.current = provider;

      // Handle connection status
      provider.on('status', (event: { status: string }) => {
        console.log('WebSocket status:', event.status);
        setConnectionStatus(event.status as any);
      });

      provider.on('connection-error', (error: any) => {
        console.error('WebSocket connection error:', error);
        setConnectionStatus('disconnected');
      });

      // Create and mount the editor
      const editor = new PageEditor();
      editor.doc = doc;
      
      // Mount to container
      containerRef.current.appendChild(editor);
      editorRef.current = editor;

      // Callback when ready
      if (onReady) {
        onReady(editor);
      }

      console.log('Collaborative BlockSuite editor initialized successfully');

    } catch (error) {
      console.error('Failed to initialize collaborative BlockSuite editor:', error);
      setConnectionStatus('disconnected');
    }

    // Cleanup
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      
      if (editorRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(editorRef.current);
        } catch (e) {
          // Element might already be removed
        }
        editorRef.current = null;
      }
    };
  }, [documentId, userId, userName, onReady]);

  return (
    <div className={`collaborative-blocksuite-container ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 
            'bg-red-500'
          }`} />
          <span className="text-sm text-gray-600">
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 
             'Disconnected'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          Document: {documentId}
        </div>
      </div>

      {/* Editor Container */}
      <div 
        ref={containerRef} 
        className="blocksuite-editor-container"
        style={{ 
          width: '100%', 
          height: 'calc(100% - 45px)', // Account for status bar
          minHeight: '400px',
          overflow: 'auto'
        }}
      />
    </div>
  );
};

export default CollaborativeBlockSuiteEditor;
