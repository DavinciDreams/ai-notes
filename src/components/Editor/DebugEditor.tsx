import React from 'react';

interface DebugEditorProps {
  documentId: string;
  userName?: string;
  userColor?: string;
  onSave?: (content: string) => void;
  onVoiceCommand?: () => void;
  className?: string;
}

export const DebugEditor: React.FC<DebugEditorProps> = ({
  documentId,
  userName = 'Anonymous',
  userColor = '#3b82f6',
  onSave,
  onVoiceCommand,
  className = ''
}) => {
  console.log('DebugEditor rendering...');

  return (
    <div className={`border rounded-lg bg-white p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-green-600 mb-4">
        ✅ Basic Component Working!
      </h3>
      <div className="space-y-3">
        <p className="text-gray-700">
          This is a minimal React component without any external dependencies.
        </p>
        <div className="bg-gray-100 p-3 rounded">
          <strong>Props received:</strong>
          <ul className="mt-2 text-sm">
            <li>Document ID: {documentId}</li>
            <li>User Name: {userName}</li>
            <li>User Color: {userColor}</li>
          </ul>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onSave?.('test content')}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            Test Save
          </button>
          <button 
            onClick={onVoiceCommand}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Test Voice
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugEditor;
