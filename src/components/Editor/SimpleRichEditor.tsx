import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  Quote,
  Code,
  Save,
  Users
} from 'lucide-react';

interface SimpleRichEditorProps {
  documentId?: string;
  userName?: string;
  userId?: string;
  onReady?: (editor: any) => void;
  className?: string;
}

export const SimpleRichEditor: React.FC<SimpleRichEditorProps> = ({
  documentId = 'default-doc',
  userName = 'Anonymous User',
  userId = 'anonymous',
  onReady,
  className = ''
}) => {
  const [content, setContent] = useState('<p>Welcome to your collaborative knowledge base! Start typing to create your first note.</p>');
  const [isConnected, setIsConnected] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate connection
    setIsConnected(true);
    if (onReady) {
      onReady({ getContent: () => content, setContent });
    }
  }, [content, onReady]);

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const formatButtons = [
    { icon: Bold, command: 'bold', title: 'Bold (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Italic (Ctrl+I)' },
    { icon: Underline, command: 'underline', title: 'Underline (Ctrl+U)' },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Quote' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Code Block' },
  ];

  return (
    <div className={`simple-rich-editor ${className}`}>
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-gray-500">
            <Users className="w-4 h-4" />
            <span className="text-sm">{userName}</span>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Document: {documentId}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-1 p-2 bg-white border-b border-gray-200">
        {formatButtons.map(({ icon: Icon, command, value, title }) => (
          <button
            key={command}
            onClick={() => executeCommand(command, value)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title={title}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
        
        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <button
          onClick={() => console.log('Saved:', content)}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save</span>
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: content }}
        className="p-4 min-h-96 focus:outline-none prose prose-gray max-w-none"
        style={{
          height: 'calc(100vh - 140px)',
          overflow: 'auto'
        }}
      />

      {/* Footer */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div>
          Built-in rich text editor • Press Ctrl+B for bold, Ctrl+I for italic
        </div>
        <div>
          Words: {content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length}
        </div>
      </div>
    </div>
  );
};

export default SimpleRichEditor;
