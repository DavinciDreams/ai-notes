import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
// // import { Save, Users, Mic } from 'lucide-react';

interface StepByStepEditorProps {
  documentId: string;
  userName?: string;
  userColor?: string;
  onSave?: (content: string) => void;
  onVoiceCommand?: () => void;
  className?: string;
}

export const StepByStepEditor: React.FC<StepByStepEditorProps> = ({  documentId,
  userName = 'Anonymous',
  userColor = '#3b82f6',
  onSave,
  // onVoiceCommand,
  className = ''
}) => {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  // Step 2: Initialize Yjs document
  useEffect(() => {
    if (step >= 2) {
      try {
        console.log('Step 2: Yjs document initialized', ydoc);
      } catch (err) {
        setError(`Step 2 failed: ${err}`);
      }
    }
  }, [step, ydoc]);

  // Step 3: Initialize Hocuspocus provider
  useEffect(() => {
    if (step >= 3) {
      try {
        console.log('Step 3: Initializing Hocuspocus provider...');
        
        const hocuspocusProvider = new HocuspocusProvider({
          url: 'ws://localhost:1234',
          name: documentId,
          document: ydoc,
          onConnect: () => {
            console.log('✅ WebSocket connected');
            setStatus('connected');
          },          onDisconnect: () => {
            console.log('❌ WebSocket disconnected');
            setStatus('disconnected');
          },
          // onStatus: ({ status }: { status: string }) => {
          //   console.log('Status changed:', status);
          //   setStatus(status as 'connecting' | 'connected' | 'disconnected');
          // },
        });

        setProvider(hocuspocusProvider);

        return () => {
          console.log('Cleaning up provider...');
          hocuspocusProvider.destroy();
        };
      } catch (err) {
        console.error('Step 3 failed:', err);
        setError(`Step 3 failed: ${err}`);
      }
    }
  }, [step, documentId, ydoc]);

  // Step 1: Basic editor
  const editor = useEditor({
    extensions: step >= 4 ? [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      ...(step >= 5 && provider ? [
        CollaborationCursor.configure({
          provider: provider,
          user: {
            name: userName,
            color: userColor,
          },
        })
      ] : [])
    ] : [
      StarterKit
    ],
    content: step >= 4 ? '' : '<p>Basic editor working! Click next step to add collaboration.</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  }, [step, ydoc, provider, userName, userColor]);

  const nextStep = () => {
    if (step < 5) {
      setStep(step + 1);
      setError(null);
    }
  };

  const handleSave = () => {
    if (editor && onSave) {
      const content = editor.getHTML();
      onSave(content);
    }
  };

  if (!editor) {
    return (
      <div className={`border rounded-lg bg-white p-4 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  const getStepColor = (stepNum: number) => {
    if (stepNum < step) return 'bg-green-100 text-green-800';
    if (stepNum === step) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className={`border rounded-lg bg-white ${className}`}>
      {/* Progress */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <h3 className="font-semibold text-gray-700 mb-3">Collaboration Debug Steps</h3>
        <div className="space-y-2 text-sm">
          <div className={`px-2 py-1 rounded ${getStepColor(1)}`}>
            ✅ Step 1: Basic Tiptap Editor
          </div>
          <div className={`px-2 py-1 rounded ${getStepColor(2)}`}>
            {step >= 2 ? '✅' : '⏳'} Step 2: Yjs Document
          </div>
          <div className={`px-2 py-1 rounded ${getStepColor(3)}`}>
            {step >= 3 ? '✅' : '⏳'} Step 3: WebSocket Connection ({status})
          </div>
          <div className={`px-2 py-1 rounded ${getStepColor(4)}`}>
            {step >= 4 ? '✅' : '⏳'} Step 4: Collaboration Extension
          </div>
          <div className={`px-2 py-1 rounded ${getStepColor(5)}`}>
            {step >= 5 ? '✅' : '⏳'} Step 5: Collaboration Cursors
          </div>
        </div>
        
        {error && (
          <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-red-800 text-sm">
            ❌ {error}
          </div>
        )}

        {step < 5 && (
          <button
            onClick={nextStep}
            className="mt-3 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Next Step
          </button>
        )}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="min-h-[300px]" />

      {/* Status */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Step {step}/5 - {step >= 3 ? `WebSocket: ${status}` : 'Local mode'}</span>
          <button
            onClick={handleSave}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepByStepEditor;
