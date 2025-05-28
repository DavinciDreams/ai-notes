import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Copy, Save, Trash2, Settings, Volume2, FileText } from 'lucide-react';
import { voiceService, type VoiceCommand } from '../../services/VoiceService';

interface VoiceNotesProps {
  onSave?: (text: string) => void;
  onError?: (error: string) => void;
  commands?: VoiceCommand[];
  enableCommands?: boolean;
  autoSave?: boolean;
  className?: string;
}

interface VoiceNote {
  id: string;
  text: string;
  timestamp: Date;
  confidence?: number;
  language?: string;
}

export const VoiceNotes: React.FC<VoiceNotesProps> = ({
  onSave,
  onError,
  commands = [],
  enableCommands = true,
  autoSave: initialAutoSave = false,
  className = ''
}) => {  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<'notes' | 'commands'>('notes');
  const [showSettings, setShowSettings] = useState(false);
  const [showSavedNotes, setShowSavedNotes] = useState(false);
  const [savedNotesFromStorage, setSavedNotesFromStorage] = useState<any[]>([]);
  
  // Settings
  const [autoCapitalize, setAutoCapitalize] = useState(true);
  const [autoPunctuation, setAutoPunctuation] = useState(true);
  const [realTimeDisplay, setRealTimeDisplay] = useState(true);
  const [autoSave, setAutoSave] = useState(initialAutoSave);
  
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initializeVoiceService();
  }, []);

  useEffect(() => {
    if (enableCommands && commands.length > 0) {
      voiceService.registerCommands(commands);
      if (mode === 'commands') {
        voiceService.enableCommandListening();
      }
    } else {
      voiceService.disableCommandListening();
    }

    return () => {
      voiceService.clearCommands();
    };
  }, [commands, enableCommands, mode]);

  const initializeVoiceService = async () => {
    try {
      await voiceService.initialize();
      setIsInitialized(true);
    } catch (error) {
      onError?.('Failed to initialize voice service');
      console.error('Voice service initialization failed:', error);
    }
  };

  const processTranscriptionText = (text: string): string => {
    let processed = text;
      if (autoCapitalize) {
      // Capitalize first letter and after sentence endings
      processed = processed.replace(/(^|\. )([a-z])/g, (_, prefix, letter) => 
        prefix + letter.toUpperCase()
      );
    }
    
    if (autoPunctuation) {
      // Add basic punctuation for common patterns
      processed = processed.replace(/\b(question|what|how|why|when|where|who)\b.*$/gi, (match) => 
        match.endsWith('?') ? match : match + '?'
      );
    }
    
    return processed;
  };
  const handleStartRecording = async () => {
    try {
      console.log('Starting recording in mode:', mode);
      await voiceService.startRecording();
      setIsRecording(true);
      setIsProcessing(false);
      
      if (mode === 'commands') {
        voiceService.enableCommandListening();
      } else {
        voiceService.disableCommandListening();
      }
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Recording failed:', error);
      onError?.('Failed to start recording: ' + (error as Error).message);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };
  const handleStopRecording = async () => {
    try {
      console.log('Stopping recording...');
      setIsProcessing(true);
      const audioBlob = await voiceService.stopRecording();
      console.log('Audio blob received:', audioBlob.size, 'bytes');
      setIsRecording(false);
        // Transcribe the audio
      console.log('Starting transcription, mode:', mode);
      const result = mode === 'commands' 
        ? await voiceService.transcribeAudio(audioBlob)
        : await voiceService.transcribeAudioForNotes(audioBlob);
      
      console.log('Transcription result:', result);
      
      if (mode === 'commands' && result.isCommand && result.commandAction) {
        await result.commandAction();
        setIsProcessing(false);
        return;
      }
      
      // Process transcription for voice notes
      const processedText = processTranscriptionText(result.text);
      console.log('Processed text:', processedText);
      
      if (realTimeDisplay) {
        setCurrentTranscription(prev => {
          const newText = prev ? `${prev} ${processedText}` : processedText;
          console.log('Updating current transcription:', newText);
          return newText;
        });
      }
      
      // Create voice note
      const voiceNote: VoiceNote = {
        id: Date.now().toString(),
        text: processedText,
        timestamp: new Date(),
        confidence: result.confidence,
        language: result.language
      };
      
      console.log('Adding voice note:', voiceNote);
      setVoiceNotes(prev => [voiceNote, ...prev]);
      
      if (autoSave && onSave) {
        onSave(processedText);
      }
      
      setIsProcessing(false);    } catch (error) {
      setIsRecording(false);
      setIsProcessing(false);
      console.error('Recording processing failed:', error);
      onError?.('Failed to process recording: ' + (error as Error).message);
      alert('Failed to process recording. Check console for details.');
    }
  };  const handleSaveNotes = async () => {
    const allText = voiceNotes.map(note => note.text).join('\n\n');
    const textToSave = currentTranscription || allText;
    
    if (!textToSave.trim()) {
      alert('No voice notes to save. Please record something first.');
      return;
    }
    
    if (onSave) {
      onSave(textToSave);
      alert('Notes saved successfully!');
      return;
    }    // Save as a new document using the API
    setIsSaving(true);
    try {
      const timestamp = new Date().toLocaleString();
      const title = `Voice Notes - ${timestamp}`;
      
      // Import apiService here to avoid circular dependencies
      const { apiService } = await import('../../services/apiService');
      
      // Try to create document
      const response = await apiService.createDocument({
        title: title,
        content: textToSave,
        type: 'voice-note',
        tags: ['voice-notes', 'transcription']
      });
      
      if (response.success) {
        alert(`Voice notes saved as document: "${title}"`);
        // Optionally clear notes after saving
        if (confirm('Clear voice notes after saving?')) {
          handleClearNotes();
        }
      } else {
        throw new Error(response.error || 'Failed to save document');
      }
    } catch (error) {
      console.error('Failed to save voice notes:', error);
      
      // Check if the error is authentication-related
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('401') || errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
        // Save to localStorage as a fallback for unauthenticated users
        try {
          const savedNotes = JSON.parse(localStorage.getItem('voice-notes') || '[]');
          const newNote = {
            id: Date.now().toString(),
            title: `Voice Notes - ${new Date().toLocaleString()}`,
            content: textToSave,
            timestamp: new Date().toISOString(),
            tags: ['voice-notes', 'transcription']
          };
          savedNotes.push(newNote);
          localStorage.setItem('voice-notes', JSON.stringify(savedNotes));
          
          alert(`Voice notes saved locally! You can access them later.\n\nNote: To save to the knowledge base, please log in to your account.`);
          
          // Optionally clear notes after saving
          if (confirm('Clear voice notes after saving?')) {
            handleClearNotes();
          }
        } catch (localError) {
          console.error('Failed to save to localStorage:', localError);
          // Final fallback: copy to clipboard
          handleCopyToClipboard(textToSave);
          alert('Authentication required for saving. Notes copied to clipboard instead.\n\nPlease log in to save to the knowledge base.');
        }
      } else {
        // Other API errors - fallback to clipboard
        handleCopyToClipboard(textToSave);
        alert('Failed to save as document. Notes copied to clipboard instead.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleClearNotes = () => {
    setVoiceNotes([]);
    setCurrentTranscription('');
  };

  const handleDeleteNote = (id: string) => {
    setVoiceNotes(prev => prev.filter(note => note.id !== id));
  };

  if (!isInitialized) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-sm text-gray-500">Initializing voice service...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 p-4 bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Voice Notes
        </h3>
        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value as 'notes' | 'commands')}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="notes">Voice Notes</option>
            <option value="commands">Voice Commands</option>
          </select>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Debug Panel (temporary for troubleshooting) */}
      {showSettings && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
          <div className="text-sm font-medium text-yellow-800 mb-2">Debug Info:</div>
          <div className="text-xs text-yellow-700 space-y-1">
            <div>Is Recording: {isRecording ? 'Yes' : 'No'}</div>
            <div>Is Processing: {isProcessing ? 'Yes' : 'No'}</div>
            <div>Mode: {mode}</div>
            <div>Real-time Display: {realTimeDisplay ? 'On' : 'Off'}</div>
            <div>Current Transcription Length: {currentTranscription?.length || 0}</div>
            <div>Voice Notes Count: {voiceNotes.length}</div>
            <div>Service Initialized: {isInitialized ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 p-3 rounded border">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoCapitalize}
                onChange={(e) => setAutoCapitalize(e.target.checked)}
              />
              Auto-capitalize sentences
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoPunctuation}
                onChange={(e) => setAutoPunctuation(e.target.checked)}
              />
              Smart punctuation
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={realTimeDisplay}
                onChange={(e) => setRealTimeDisplay(e.target.checked)}
              />
              Real-time display
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
              Auto-save notes
            </label>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isProcessing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              {mode === 'notes' ? 'Start Voice Note' : 'Start Voice Command'}
            </>
          )}
        </button>

        {isProcessing && (
          <span className="text-sm text-gray-500">Processing...</span>
        )}
      </div>

      {/* Real-time Transcription Display */}
      {realTimeDisplay && currentTranscription && (
        <div className="bg-blue-50 p-3 rounded border">
          <div className="text-sm font-medium text-blue-800 mb-1">Current Session:</div>
          <textarea
            ref={textAreaRef}
            value={currentTranscription}
            onChange={(e) => setCurrentTranscription(e.target.value)}
            className="w-full p-2 border rounded text-sm min-h-[100px] resize-y"
            placeholder="Your voice transcription will appear here..."
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">        <button
          onClick={handleSaveNotes}
          disabled={isSaving}
          className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded text-sm"
        >
          <Save className="w-3 h-3" />
          {isSaving ? 'Saving...' : 'Save Notes'}
        </button>
          <button
          onClick={() => handleCopyToClipboard(currentTranscription || voiceNotes.map(n => n.text).join('\n\n'))}
          className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
        >
          <Copy className="w-3 h-3" />
          Copy All
        </button>
          <button
          onClick={handleClearNotes}
          className="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
        
        <button
          onClick={() => {
            const saved = JSON.parse(localStorage.getItem('voice-notes') || '[]');
            setSavedNotesFromStorage(saved);
            setShowSavedNotes(!showSavedNotes);
          }}
          className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
        >
          <FileText className="w-3 h-3" />
          Saved Notes ({JSON.parse(localStorage.getItem('voice-notes') || '[]').length})
        </button>
      </div>

      {/* Voice Notes List */}
      {voiceNotes.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Recent Voice Notes:</div>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {voiceNotes.map((note) => (
              <div key={note.id} className="bg-gray-50 p-3 rounded border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">{note.text}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {note.timestamp.toLocaleTimeString()}
                      {note.confidence && ` • ${Math.round(note.confidence * 100)}% confidence`}
                      {note.language && ` • ${note.language}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyToClipboard(note.text)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Copy"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}          </div>
        </div>
      )}
      
      {/* Saved Notes from LocalStorage */}
      {showSavedNotes && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Locally Saved Voice Notes:</div>
            <button
              onClick={() => setShowSavedNotes(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Hide
            </button>
          </div>
          
          {savedNotesFromStorage.length === 0 ? (
            <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
              No saved notes found. Notes will be saved here when authentication is not available.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {savedNotesFromStorage.map((note: any, index: number) => (
                <div key={note.id || index} className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-yellow-600 mb-1">{note.title}</div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</div>
                      <div className="text-xs text-yellow-500 mt-1">
                        Saved: {new Date(note.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(note.content)}
                        className="p-1 text-yellow-400 hover:text-yellow-600"
                        title="Copy"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          const updated = savedNotesFromStorage.filter((_, i) => i !== index);
                          localStorage.setItem('voice-notes', JSON.stringify(updated));
                          setSavedNotesFromStorage(updated);
                        }}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
