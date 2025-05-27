import React from 'react';
import BlockSuiteEditor from './BlockSuiteEditor';

export const BlockSuiteTest: React.FC = () => {
  const handleEditorReady = (editor: any) => {
    console.log('BlockSuite editor is ready:', editor);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">BlockSuite Editor Test</h1>
      <p className="text-gray-600 mb-4">
        Testing the basic BlockSuite editor functionality
      </p>
      
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <BlockSuiteEditor 
          onReady={handleEditorReady}
          className="w-full h-96"
        />
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>This should show a BlockSuite editor with basic functionality.</p>
        <p>If you see this text and an editor above, BlockSuite is working!</p>
      </div>
    </div>
  );
};

export default BlockSuiteTest;
