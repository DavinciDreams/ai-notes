import { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
// import { 
//   FileText, 
//   Palette, 
//   Mic, 
//   Search, 
//   Settings, 
//   Plus,
//   Users,
//   Brain
// } from 'lucide-react';

// Import actual components one by one
import DebugEditor from './components/Editor/DebugEditor';
// import StepByStepEditor from './components/Editor/StepByStepEditor';
// import SimpleEditor from './components/Editor/SimpleEditor';
// import CollaborativeEditor from './components/Editor/CollaborativeEditor';
// import SimpleDrawingCanvas from './components/Canvas/SimpleDrawingCanvas';
// import VoiceControls from './components/Voice/VoiceControls';
// import { SearchComponent } from './components/SearchComponent';
// import { KnowledgeGraphComponent } from './components/KnowledgeGraphComponent';

const queryClient = new QueryClient();

function RealComponentApp() {
  // const [currentView, setCurrentView] = useState<'editor' | 'canvas' | 'knowledge' | 'search'>('editor');
  // const [showVoiceControls, setShowVoiceControls] = useState(false);
  const [testStage, setTestStage] = useState<'layout' | 'editor' | 'canvas' | 'search' | 'knowledge' | 'voice'>('layout');

  const TestComponent = () => {
    if (testStage === 'layout') {
      return (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-blue-600 mb-4">
            🧪 Real Component Testing
          </h3>
          <p className="text-gray-700 mb-6">
            Now we'll load the actual components one by one to find which one is causing issues.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => setTestStage('editor')}
              className="block w-full text-left bg-blue-50 hover:bg-blue-100 p-3 rounded border"
            >
              <span className="font-semibold">Test 1:</span> CollaborativeEditor (Tiptap + Yjs)
            </button>
            <button 
              onClick={() => setTestStage('canvas')}
              className="block w-full text-left bg-green-50 hover:bg-green-100 p-3 rounded border"
            >
              <span className="font-semibold">Test 2:</span> SimpleDrawingCanvas (HTML5 Canvas)
            </button>
            <button 
              onClick={() => setTestStage('search')}
              className="block w-full text-left bg-purple-50 hover:bg-purple-100 p-3 rounded border"
            >
              <span className="font-semibold">Test 3:</span> SearchComponent (API integration)
            </button>
            <button 
              onClick={() => setTestStage('knowledge')}
              className="block w-full text-left bg-orange-50 hover:bg-orange-100 p-3 rounded border"
            >
              <span className="font-semibold">Test 4:</span> KnowledgeGraphComponent (Graph viz)
            </button>
            <button 
              onClick={() => setTestStage('voice')}
              className="block w-full text-left bg-pink-50 hover:bg-pink-100 p-3 rounded border"
            >
              <span className="font-semibold">Test 5:</span> VoiceControls (Speech recognition)
            </button>
          </div>
        </div>
      );
    }

    if (testStage === 'editor') {
      return (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-blue-600">
              🧪 Testing: CollaborativeEditor
            </h3>
            <button 
              onClick={() => setTestStage('layout')}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
            >
              ← Back
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
            <p className="text-sm text-blue-800">
              Loading the real CollaborativeEditor component with Tiptap and Yjs...
            </p>
          </div>          <DebugEditor
            documentId="test-document"
            userName="Test User"
            userColor="#3b82f6"
            onSave={(content: string) => console.log('Saved:', content)}
            onVoiceCommand={() => console.log('Voice command')}
            className="border rounded"
          />
        </div>
      );
    }

    if (testStage === 'canvas') {
      return (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-green-600">
              🧪 Testing: SimpleDrawingCanvas
            </h3>
            <button 
              onClick={() => setTestStage('layout')}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
            >
              ← Back
            </button>
          </div>
          <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
            <p className="text-sm text-green-800">
              Loading the real SimpleDrawingCanvas component...
            </p>
          </div>
          
          {/* Uncomment this to test the real canvas */}
          {/*
          <SimpleDrawingCanvas
            width={800}
            height={400}
            onSave={(canvasData) => console.log('Canvas saved:', canvasData)}
            className="border rounded"
          />
          */}
          
          <div className="bg-gray-100 p-4 rounded h-64">
            <p className="text-sm text-gray-700">
              🎨 Canvas component placeholder - uncomment the import and JSX above to test the real component.
            </p>
          </div>
        </div>
      );
    }

    // Similar structure for other components...
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-600">
            🧪 Testing: {testStage}
          </h3>
          <button 
            onClick={() => setTestStage('layout')}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
          >
            ← Back
          </button>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <p className="text-sm text-gray-700">
            Component placeholder for {testStage} - uncomment imports to test real components.
          </p>
        </div>
      </div>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">AI Notes</h1>
              <p className="text-sm text-gray-600">Component Testing</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              <div className="text-sm text-gray-500 mb-2">Test Status:</div>
              <div className="text-xs text-green-600">✅ Layout: Working</div>
              <div className="text-xs text-green-600">✅ Dependencies: Working</div>
              <div className="text-xs text-blue-600">🧪 Components: Testing...</div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <div className="bg-white border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Real Component Testing
              </h2>
              <p className="text-sm text-gray-600">
                Testing actual components to identify issues
              </p>
            </div>

            <div className="flex-1 p-6">
              <TestComponent />
            </div>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </Router>
    </QueryClientProvider>
  );
}

export default RealComponentApp;
