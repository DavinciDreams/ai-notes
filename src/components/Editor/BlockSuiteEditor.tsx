import React from 'react';

interface BlockSuiteEditorProps {
  documentId?: string;
  className?: string;
  onReady?: (editor: any) => void;
}

const BlockSuiteEditor: React.FC<BlockSuiteEditorProps> = ({
  documentId = 'default',
  className = ''
}) => {
  return (
    <div className={`border rounded-lg bg-white p-4 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-orange-600">BlockSuite Editor (Placeholder)</h3>
        <p className="text-gray-600 text-sm">
          BlockSuite editor implementation placeholder. Document ID: {documentId}
        </p>
      </div>
      <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center">
        <p className="text-gray-500">
          BlockSuite Editor components have been temporarily disabled due to dependency removal.
          <br />
          Use the Drag & Drop Editor or Slate Editor instead.
        </p>
      </div>
    </div>
  );
};

export default BlockSuiteEditor;
