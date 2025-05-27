import React, { useEffect, useRef } from 'react';
import { createEmptyDoc, PageEditor } from '@blocksuite/presets';

interface BlockSuiteEditorProps {
  onReady?: (editor: PageEditor) => void;
  className?: string;
}

export const BlockSuiteEditor: React.FC<BlockSuiteEditorProps> = ({ 
  onReady, 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<PageEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      console.log('Initializing BlockSuite editor...');

      // Create empty document with BlockSuite helper
      const doc = createEmptyDoc().init();

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

      console.log('BlockSuite editor initialized successfully');

    } catch (error) {
      console.error('Failed to initialize BlockSuite editor:', error);
    }

    // Cleanup
    return () => {
      if (editorRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(editorRef.current);
        } catch (e) {
          // Element might already be removed
        }
        editorRef.current = null;
      }
    };
  }, [onReady]);

  return (
    <div 
      ref={containerRef} 
      className={`blocksuite-editor-container ${className}`}
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '400px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'auto'
      }}
    />
  );
};

export default BlockSuiteEditor;
