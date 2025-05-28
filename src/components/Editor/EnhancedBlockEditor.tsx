import React from 'react';

interface EnhancedBlockEditorProps {
  documentId?: string;
  userName?: string;
  userId?: string;
  enableDragDrop?: boolean;
  enableMultimedia?: boolean;
  enableCollaboration?: boolean;
  className?: string;
  onSave?: (data: any) => void;
  onReady?: (editor: any) => void;
}

const EnhancedBlockEditor: React.FC<EnhancedBlockEditorProps> = ({
  documentId = 'default',
  userName = 'Anonymous',
  userId = 'anonymous',
  enableDragDrop = false,
  enableMultimedia = false,
  enableCollaboration = false,
  className = ''
}) => {
  return (
    <div className={`border rounded-lg bg-white p-4 ${className}`}>      <div className="mb-4">
        <h3 className="text-lg font-semibold text-purple-600">Enhanced Block Editor (Placeholder)</h3>
        <p className="text-gray-600 text-sm">
          Enhanced block-based editor for {userName}. Document ID: {documentId}
        </p>
        <div className="mt-2 text-xs text-gray-500">
          User: {userId} | Drag&Drop: {enableDragDrop ? '✓' : '✗'} | 
          Multimedia: {enableMultimedia ? '✓' : '✗'} | 
          Collaboration: {enableCollaboration ? '✓' : '✗'}
        </div>
      </div>
      <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center">
        <p className="text-gray-500">
          Enhanced Block Editor components have been temporarily disabled due to type conflicts.
          <br />
          Use the Drag & Drop Editor or Slate Editor instead.
        </p>
      </div>
    </div>
  );
};

export default EnhancedBlockEditor;
