import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { Save, Users, Mic } from 'lucide-react';

interface CollaborativeEditorProps {
  documentId: string;
  userName?: string;
  userColor?: string;
  onSave?: (content: string) => void;
  onVoiceCommand?: () => void;
  className?: string;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  userName = 'Anonymous',
  userColor = '#3b82f6',
  onSave,
  onVoiceCommand,
  className = ''
}) => {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const [ydoc] = useState(() => new Y.Doc());

  useEffect(() => {    // Initialize Hocuspocus provider for real-time collaboration
    const hocuspocusProvider = new HocuspocusProvider({
      url: process.env.VITE_COLLABORATION_SERVER || 'ws://localhost:1234',
      name: documentId,
      document: ydoc,
    });

    // Set user information
    hocuspocusProvider.awareness?.setLocalStateField('user', {
      name: userName,
      color: userColor,
      id: crypto.randomUUID()
    });

    hocuspocusProvider.on('status', ({ status }: { status: string }) => {
      setStatus(status as 'connecting' | 'connected' | 'disconnected');
    });

    hocuspocusProvider.on('awareness', () => {
      if (hocuspocusProvider.awareness) {
        const states = Array.from(hocuspocusProvider.awareness.getStates().values());
        setConnectedUsers(states.length);
      }
    });

    setProvider(hocuspocusProvider);

    return () => {
      hocuspocusProvider.destroy();
    };
  }, [documentId, userName, userColor, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable local history since we use Yjs
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider || undefined,
        user: {
          name: userName,
          color: userColor,
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        'data-placeholder': 'Start typing your notes...',
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  const handleSave = () => {
    if (editor && onSave) {
      const content = editor.getHTML();
      onSave(content);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`flex flex-col bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-500' : 
              status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{connectedUsers} user{connectedUsers !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onVoiceCommand && (
            <button
              onClick={onVoiceCommand}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            >
              <Mic className="w-4 h-4" />
              Voice
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!editor}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-md transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 min-h-[400px]">
        <EditorContent 
          editor={editor} 
          className="h-full w-full"
        />
      </div>

      {/* Status Bar */}
      <div className="px-3 py-2 border-t bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Document ID: {documentId}</span>
          <span>
            {editor?.storage.characterCount?.characters() || 0} characters, {' '}
            {editor?.storage.characterCount?.words() || 0} words
          </span>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
