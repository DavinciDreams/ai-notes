import { useState, useEffect } from 'react';
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
  Brain,
  Blocks,
  Edit3,
  Move,
  MessageSquare
} from 'lucide-react';
// Import our enhanced editors
import SimpleRichEditor from './components/Editor/SimpleRichEditor';
import EnhancedBlockEditor from './components/Editor/EnhancedBlockEditor';
import SlateEditor from './components/Editor/SlateEditor';
import DragDropEditor from './components/Editor/DragDropEditor';
import SimpleDrawingCanvas from './components/Canvas/SimpleDrawingCanvas';
import VoiceControls from './components/Voice/VoiceControls';
import { VoiceNotes } from './components/Voice/VoiceNotes';
import type { VoiceTranscriptionResult } from './services/VoiceService';
import { SearchComponent } from './components/SearchComponent';
import { KnowledgeGraphComponent } from './components/KnowledgeGraphComponent';
import type { Document } from './services/apiService';

const queryClient = new QueryClient();

function App() {
  const activeDocument = 'document-1';
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  const [currentView, setCurrentView] = useState<'editor' | 'block-editor' | 'slate-editor' | 'dnd-editor' | 'canvas' | 'knowledge' | 'search' | 'voice-notes'>('block-editor');
  const [editorData, setEditorData] = useState<any>(null);

  // Log editor data changes for debugging
  useEffect(() => {
    if (editorData) {
      console.log('Editor data updated:', editorData);
    }
  }, [editorData]);

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
            onReady={(editor) => console.log('Simple Editor ready:', editor)}
            className="flex-1"
          />
        );

      case 'block-editor':
        return (
          <EnhancedBlockEditor
            documentId={activeDocument}
            userName="Current User"
            userId="user-1"
            enableDragDrop={true}
            enableMultimedia={true}
            enableCollaboration={true}
            onSave={(data: any) => {
              setEditorData(data);
              console.log('Block Editor saved:', data);
            }}
            onReady={(editor: any) => console.log('Block Editor ready:', editor)}
            className="flex-1"
          />
        );

      case 'slate-editor':
        return (
          <SlateEditor
            documentId={activeDocument}
            userName="Current User"
            userId="user-1"
            onSave={(data: any) => {
              setEditorData(data);
              console.log('Slate Editor saved:', data);
            }}
            onReady={() => console.log('Slate Editor ready')}
            className="flex-1"
          />
        );

      case 'dnd-editor':
        return (
          <DragDropEditor
            documentId={activeDocument}
            userName="Current User"
            enableFileUpload={true}
            onSave={(data: any) => {
              setEditorData(data);
              console.log('DnD Editor saved:', data);
            }}
            onReady={() => console.log('DnD Editor ready')}
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
      
      case 'voice-notes':
        return (
          <div className="flex-1 bg-white rounded-lg border overflow-hidden">
            <VoiceNotes />
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
                onClick={() => setCurrentView('block-editor')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentView === 'block-editor'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Blocks className="w-5 h-5" />
                Block Editor
              </button>

              <button
                onClick={() => setCurrentView('dnd-editor')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentView === 'dnd-editor'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Move className="w-5 h-5" />
                Drag & Drop Editor
              </button>

              <button
                onClick={() => setCurrentView('slate-editor')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentView === 'slate-editor'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Edit3 className="w-5 h-5" />
                Slate Editor
              </button>

              <button
                onClick={() => setCurrentView('editor')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentView === 'editor'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                Simple Editor
              </button>

              <div className="border-t border-gray-200 my-4"></div>

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
                onClick={() => setCurrentView('voice-notes')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  currentView === 'voice-notes'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                Voice Notes
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
                    {currentView === 'block-editor' && 'Block Editor'}
                    {currentView === 'slate-editor' && 'Slate Editor'}
                    {currentView === 'dnd-editor' && 'Drag & Drop Editor'}
                    {currentView === 'canvas' && 'Drawing Canvas'}
                    {currentView === 'knowledge' && 'Knowledge Graph'}
                    {currentView === 'search' && 'Advanced Search'}
                    {currentView === 'voice-notes' && 'Voice Notes'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {currentView === 'editor' && 'Real-time collaborative note-taking with AI assistance'}
                    {currentView === 'block-editor' && 'Block-based editor with multimedia and collaboration'}
                    {currentView === 'slate-editor' && 'Rich-text editor with advanced formatting'}
                    {currentView === 'dnd-editor' && 'Drag and drop editor with file upload support'}
                    {currentView === 'canvas' && 'Create diagrams and visual content'}
                    {currentView === 'knowledge' && 'Explore connections in your knowledge base'}
                    {currentView === 'search' && 'Find and discover content across your knowledge base'}
                    {currentView === 'voice-notes' && 'Capture thoughts with voice transcription and smart processing'}
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
