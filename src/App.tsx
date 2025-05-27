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
import SimpleRichEditor from './components/Editor/SimpleRichEditor';
import SimpleDrawingCanvas from './components/Canvas/SimpleDrawingCanvas';
import VoiceControls from './components/Voice/VoiceControls';
import type { VoiceTranscriptionResult } from './services/VoiceService';
import { SearchComponent } from './components/SearchComponent';
import { KnowledgeGraphComponent } from './components/KnowledgeGraphComponent';
import type { Document } from './services/apiService';

const queryClient = new QueryClient();

function App() {
  const activeDocument = 'document-1';
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  const [currentView, setCurrentView] = useState<'editor' | 'canvas' | 'knowledge' | 'search'>('editor');

  const handleVoiceTranscription = (result: VoiceTranscriptionResult) => {
    console.log('Voice transcription:', result.text);
    // Handle voice commands if present
    if (result.isCommand && result.commandAction) {
      result.commandAction();
    }
    // Here you would typically insert the transcribed text into the editor
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice error:', error);
  };

  const handleDocumentSelect = (document: Document) => {
    console.log('Selected document:', document);
    // Navigate to the selected document
    setCurrentView('editor');
  };

  const MainContent = () => {
    switch (currentView) {
      case 'editor':
        return (
          <SimpleRichEditor
            documentId={activeDocument}
            userName="Current User"
            userId="user-1"
            onReady={(editor) => console.log('Editor ready:', editor)}
            className="flex-1"
          />
        );
      
      case 'canvas':
        return (
          <SimpleDrawingCanvas
            width={1200}
            height={800}
            onSave={(canvasData) => console.log('Canvas saved:', canvasData)}
            className="flex-1"
          />
        );
      
      case 'knowledge':
        return (
          <div className="flex-1 bg-white rounded-lg border overflow-hidden">
            <KnowledgeGraphComponent />
          </div>
        );

      case 'search':
        return (
          <div className="flex-1 bg-white rounded-lg border overflow-hidden">
            <div className="p-6">
              <SearchComponent
                onDocumentSelect={handleDocumentSelect}
                showAdvanced={true}
                autoFocus={true}
                className="w-full"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentView === 'editor'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                Notes & Documents
              </button>

              <button
                onClick={() => setCurrentView('canvas')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentView === 'canvas'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Palette className="w-5 h-5" />
                Drawing Canvas
              </button>

              <button
                onClick={() => setCurrentView('knowledge')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentView === 'knowledge'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Brain className="w-5 h-5" />
                Knowledge Graph
              </button>

              <button
                onClick={() => setShowVoiceControls(!showVoiceControls)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  showVoiceControls
                    ? 'bg-green-50 text-green-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Mic className="w-5 h-5" />
                Voice Controls
              </button>

              <div className="pt-4 border-t border-gray-200">
                <button 
                  onClick={() => setCurrentView('search')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    currentView === 'search'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
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
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentView === 'editor' && 'Collaborative Editor'}
                    {currentView === 'canvas' && 'Drawing Canvas'}
                    {currentView === 'knowledge' && 'Knowledge Graph'}
                    {currentView === 'search' && 'Advanced Search'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {currentView === 'editor' && 'Real-time collaborative note-taking with AI assistance'}
                    {currentView === 'canvas' && 'Create diagrams and visual content'}
                    {currentView === 'knowledge' && 'Explore connections in your knowledge base'}
                    {currentView === 'search' && 'Find and discover content across your knowledge base'}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Connected</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 flex gap-6">
              <MainContent />
              
              {showVoiceControls && (
                <div className="w-80">
                  <VoiceControls
                    onTranscription={handleVoiceTranscription}
                    onError={handleVoiceError}
                    className="sticky top-0"
                  />
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

export default App;
