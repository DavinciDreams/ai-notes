import { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { 
  FileText, 
  Palette, 
  Mic, 
  Search, 
  Settings, 
  Plus,
  Users,
  Brain
} from 'lucide-react';

const queryClient = new QueryClient();

function ProgressiveApp() {
  const [currentView, setCurrentView] = useState<'basic' | 'sidebar' | 'editor' | 'canvas' | 'knowledge' | 'search'>('basic');
  const [showVoiceControls, setShowVoiceControls] = useState(false);

  // Basic layout first
  if (currentView === 'basic') {
    return (
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-8">
                🚀 AI Notes - Progressive App Loading
              </h1>
              
              <div className="bg-white p-6 rounded-lg shadow mb-4">
                <h2 className="text-xl font-semibold text-green-600 mb-4">
                  ✅ Step 1: Basic Layout + Dependencies
                </h2>
                <p className="text-gray-700 mb-4">
                  React Router + React Query + Toaster working!
                </p>
                <button 
                  onClick={() => setCurrentView('sidebar')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Test Sidebar Layout
                </button>
              </div>
            </div>
          </div>
          <Toaster position="bottom-right" />
        </Router>
      </QueryClientProvider>
    );
  }

  // Sidebar layout
  if (currentView === 'sidebar') {
    return (
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-900">AI Notes</h1>
                <p className="text-sm text-gray-600">Collaborative Knowledge Hub</p>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                <button
                  onClick={() => setCurrentView('editor')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <FileText className="w-5 h-5" />
                  Notes & Documents
                </button>

                <button
                  onClick={() => setCurrentView('canvas')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <Palette className="w-5 h-5" />
                  Drawing Canvas
                </button>

                <button
                  onClick={() => setCurrentView('knowledge')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <Brain className="w-5 h-5" />
                  Knowledge Graph
                </button>

                <button
                  onClick={() => setShowVoiceControls(!showVoiceControls)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <Mic className="w-5 h-5" />
                  Voice Controls
                </button>

                <div className="pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => setCurrentView('search')}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-50"
                  >
                    <Search className="w-5 h-5" />
                    Search
                  </button>

                  <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <Users className="w-5 h-5" />
                    Collaboration
                  </button>

                  <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <Settings className="w-5 h-5" />
                    Settings
                  </button>
                </div>
              </nav>

              {/* Create New */}
              <div className="p-4 border-t border-gray-200">
                <button className="w-full flex items-center gap-3 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                  <Plus className="w-5 h-5" />
                  Create New
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Top Bar */}
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Sidebar Layout Test</h2>
                    <p className="text-sm text-gray-600">Testing the main layout structure</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>Layout Working</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-semibold text-green-600 mb-4">
                    ✅ Step 2: Sidebar Layout Working!
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Full layout structure is working. Now click buttons to test individual components.
                  </p>
                  <div className="text-sm text-gray-600">
                    Status: {showVoiceControls ? 'Voice controls would be shown' : 'Voice controls hidden'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Toaster position="bottom-right" />
        </Router>
      </QueryClientProvider>
    );
  }

  // Individual component testing
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50 flex">
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">AI Notes</h1>
              <button 
                onClick={() => setCurrentView('sidebar')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← Back to layout test
              </button>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-600">
                Testing: <span className="font-semibold">{currentView}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Testing: {currentView} Component
              </h2>
              
              {currentView === 'editor' && (
                <div>
                  <p className="text-gray-700 mb-4">Loading CollaborativeEditor component...</p>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                    <p className="text-sm text-yellow-800">
                      This would load the Tiptap editor with Yjs collaboration.
                      If this fails, the issue is with the editor component.
                    </p>
                  </div>
                </div>
              )}

              {currentView === 'canvas' && (
                <div>
                  <p className="text-gray-700 mb-4">Loading SimpleDrawingCanvas component...</p>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                    <p className="text-sm text-yellow-800">
                      This would load the HTML5 Canvas drawing component.
                      If this fails, the issue is with the canvas component.
                    </p>
                  </div>
                </div>
              )}

              {currentView === 'knowledge' && (
                <div>
                  <p className="text-gray-700 mb-4">Loading KnowledgeGraphComponent...</p>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                    <p className="text-sm text-yellow-800">
                      This would load the knowledge graph visualization.
                      If this fails, the issue is with the graph component.
                    </p>
                  </div>
                </div>
              )}

              {currentView === 'search' && (
                <div>
                  <p className="text-gray-700 mb-4">Loading SearchComponent...</p>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                    <p className="text-sm text-yellow-800">
                      This would load the advanced search functionality.
                      If this fails, the issue is with the search component.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </Router>
    </QueryClientProvider>
  );
}

export default ProgressiveApp;
