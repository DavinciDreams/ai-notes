import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save, Users, Mic } from 'lucide-react';

interface SimpleEditorProps {
  documentId: string;
  userName?: string;
  userColor?: string;
  onSave?: (content: string) => void;
  onVoiceCommand?: () => void;
  className?: string;
}

export const SimpleEditor: React.FC<SimpleEditorProps> = ({
  documentId,
  userName = 'Anonymous',
  userColor = '#3b82f6',
  onSave,
  onVoiceCommand,
  className = ''
}) => {
  const [status] = useState<'connected'>('connected');

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: '<p>Welcome to the AI Notes editor! Start typing...</p>',
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

  if (!editor) {
    return (
      <div className={`border rounded-lg bg-white ${className}`}>
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg bg-white ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 flex items-center justify-between bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-700">Simple Editor</h3>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-green-600">Local Mode</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onVoiceCommand && (
            <button
              onClick={onVoiceCommand}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Voice Controls"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>1 user</span>
          </div>
          
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <EditorContent 
          editor={editor} 
          className="min-h-[300px]"
        />
      </div>
      
      {/* Status Bar */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Document: {documentId}</span>
            <span>User: {userName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Simple text editor (no collaboration)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleEditor;
