import React, { useState } from 'react';

interface TiptapDebugProps {
  documentId: string;
  userName?: string;
  userColor?: string;
  onSave?: (content: string) => void;
  onVoiceCommand?: () => void;
  className?: string;
}

export const TiptapDebug: React.FC<TiptapDebugProps> = ({
  documentId,
  userName = 'Anonymous',
  userColor = '#3b82f6',
  onSave,
  onVoiceCommand,
  className = ''
}) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  console.log('TiptapDebug rendering, step:', step);

  const testStep = (stepNum: number) => {
    setError(null);
    setStep(stepNum);
    console.log('Testing step:', stepNum);
  };

  if (step === 1) {
    return (
      <div className={`border rounded-lg bg-white p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-blue-600 mb-4">
          🧪 Tiptap Debug - Step 1
        </h3>
        <p className="text-gray-700 mb-4">
          Basic component without any Tiptap imports.
        </p>
        <button 
          onClick={() => testStep(2)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >
          Test Step 2: Import Tiptap
        </button>
      </div>
    );
  }

  if (step === 2) {
    // Test importing Tiptap
    try {
      const { useEditor } = require('@tiptap/react');
      console.log('✅ Tiptap React imported successfully');
      
      return (
        <div className={`border rounded-lg bg-white p-4 ${className}`}>
          <h3 className="text-lg font-semibold text-green-600 mb-4">
            ✅ Step 2: Tiptap Import Success
          </h3>
          <p className="text-gray-700 mb-4">
            @tiptap/react imported without errors.
          </p>
          <button 
            onClick={() => testStep(3)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            Test Step 3: StarterKit
          </button>
        </div>
      );
    } catch (err) {
      console.error('❌ Tiptap import failed:', err);
      setError(`Tiptap import failed: ${err}`);
    }
  }

  if (step === 3) {
    // Test importing StarterKit
    try {
      const StarterKit = require('@tiptap/starter-kit');
      console.log('✅ StarterKit imported successfully');
      
      return (
        <div className={`border rounded-lg bg-white p-4 ${className}`}>
          <h3 className="text-lg font-semibold text-green-600 mb-4">
            ✅ Step 3: StarterKit Import Success
          </h3>
          <p className="text-gray-700 mb-4">
            @tiptap/starter-kit imported without errors.
          </p>
          <button 
            onClick={() => testStep(4)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            Test Step 4: useEditor Hook
          </button>
        </div>
      );
    } catch (err) {
      console.error('❌ StarterKit import failed:', err);
      setError(`StarterKit import failed: ${err}`);
    }
  }

  if (step === 4) {
    // Test useEditor hook
    try {
      const { useEditor } = require('@tiptap/react');
      const StarterKit = require('@tiptap/starter-kit');
      
      console.log('✅ About to call useEditor...');
      
      const editor = useEditor({
        extensions: [StarterKit],
        content: '<p>Test content</p>',
      });
      
      console.log('✅ useEditor completed, editor:', editor);
      
      return (
        <div className={`border rounded-lg bg-white p-4 ${className}`}>
          <h3 className="text-lg font-semibold text-green-600 mb-4">
            ✅ Step 4: useEditor Hook Success
          </h3>
          <p className="text-gray-700 mb-4">
            useEditor hook executed without errors.
          </p>
          <div className="bg-gray-100 p-2 rounded text-sm">
            Editor state: {editor ? 'Initialized' : 'Not ready'}
          </div>
        </div>
      );
    } catch (err) {
      console.error('❌ useEditor failed:', err);
      setError(`useEditor failed: ${err}`);
    }
  }

  // Error state
  if (error) {
    return (
      <div className={`border rounded-lg bg-white p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-red-600 mb-4">
          ❌ Error at Step {step}
        </h3>
        <div className="bg-red-50 border border-red-200 p-3 rounded text-red-800 text-sm">
          {error}
        </div>
        <button 
          onClick={() => testStep(1)}
          className="mt-3 px-3 py-1 bg-gray-600 text-white rounded text-sm"
        >
          Reset to Step 1
        </button>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg bg-white p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-600 mb-4">
        🔄 Loading Step {step}...
      </h3>
    </div>
  );
};

export default TiptapDebug;
