import React, { useState, useEffect } from 'react';
import { Mic, Volume2, VolumeX, Square, Play } from 'lucide-react';
import { voiceService, type VoiceConfig, type VoiceTranscriptionResult, type VoiceCommand } from '../../services/VoiceService';

interface VoiceControlsProps {
  onTranscription?: (result: VoiceTranscriptionResult) => void;
  onError?: (error: string) => void;
  commands?: VoiceCommand[];
  enableCommands?: boolean;
  className?: string;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  onTranscription,
  onError,
  commands = [],
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechRate, setSpeechRate] = useState(1);
  const [textToSpeak, setTextToSpeak] = useState('');

  useEffect(() => {
    initializeVoiceService();
  }, []);
  useEffect(() => {
    if (commands.length > 0) {
      voiceService.registerCommands(commands);
      voiceService.enableCommandListening();
    } else {
      voiceService.disableCommandListening();
    }

    return () => {
      voiceService.clearCommands();
    };
  }, [commands]);

  const initializeVoiceService = async () => {
    try {
      await voiceService.initialize();
      const voices = await voiceService.getAvailableVoices();
      setAvailableVoices(voices);
      
      // Select default English voice
      const defaultVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      setSelectedVoice(defaultVoice);
      setIsInitialized(true);
    } catch (error) {
      onError?.('Failed to initialize voice service');
      console.error('Voice service initialization failed:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      await voiceService.startRecording();
      setIsRecording(true);
    } catch (error) {
      onError?.('Failed to start recording');
      console.error('Recording failed:', error);
    }
  };
  const handleStopRecording = async () => {
    try {
      const audioBlob = await voiceService.stopRecording();
      setIsRecording(false);
      
      // Transcribe the audio
      const result = await voiceService.transcribeAudio(audioBlob);
      
      if (result.isCommand && result.commandAction) {
        await result.commandAction();
      }
      
      if (onTranscription) {
        onTranscription(result);
      }
    } catch (error) {
      setIsRecording(false);
      onError?.('Failed to process recording');
      console.error('Recording processing failed:', error);
    }
  };

  const handleSpeak = async () => {
    if (!textToSpeak.trim()) return;

    try {
      const config: VoiceConfig = {
        voice: selectedVoice || undefined,
        rate: speechRate,
        pitch: 1,
        volume: 1
      };

      await voiceService.speakWithCallback(
        textToSpeak, 
        config,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
        (error) => {
          setIsSpeaking(false);
          onError?.('Speech synthesis failed');
          console.error('Speech failed:', error);
        }
      );
    } catch (error) {
      setIsSpeaking(false);
      onError?.('Speech synthesis failed');
      console.error('Speech failed:', error);
    }
  };

  const handleStopSpeaking = () => {
    // EasySpeech cancel method
    try {
      voiceService.stopSpeaking();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Failed to stop speaking:', error);
    }
  };

  if (!isInitialized) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="text-sm text-gray-500">Initializing voice service...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 p-4 bg-white rounded-lg border ${className}`}>
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Voice Controls</h3>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
          disabled={isSpeaking}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Start Recording
            </>
          )}
        </button>
        
        {isRecording && (
          <div className="flex items-center gap-2 text-red-500">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm">Recording...</span>
          </div>
        )}
      </div>

      {/* Text-to-Speech Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label htmlFor="voice-select" className="text-sm font-medium text-gray-700">
            Voice:
          </label>
          <select
            id="voice-select"
            value={selectedVoice?.name || ''}
            onChange={(e) => {
              const voice = availableVoices.find(v => v.name === e.target.value);
              setSelectedVoice(voice || null);
            }}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            disabled={isSpeaking}
          >
            {availableVoices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="speech-rate" className="text-sm font-medium text-gray-700">
            Speed:
          </label>
          <input
            id="speech-rate"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="flex-1"
            disabled={isSpeaking}
          />
          <span className="text-sm text-gray-600 w-8">{speechRate}x</span>
        </div>

        <div className="flex gap-2">
          <textarea
            value={textToSpeak}
            onChange={(e) => setTextToSpeak(e.target.value)}
            placeholder="Enter text to speak..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md resize-none"
            rows={2}
            disabled={isSpeaking}
          />
          
          <div className="flex flex-col gap-1">
            <button
              onClick={handleSpeak}
              disabled={!textToSpeak.trim() || isSpeaking || isRecording}
              className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-md transition-colors"
            >
              <Play className="w-4 h-4" />
              Speak
            </button>
            
            {isSpeaking && (
              <button
                onClick={handleStopSpeaking}
                className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              >
                <VolumeX className="w-4 h-4" />
                Stop
              </button>
            )}
          </div>
        </div>

        {isSpeaking && (
          <div className="flex items-center gap-2 text-green-600">
            <Volume2 className="w-4 h-4" />
            <span className="text-sm">Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceControls;
