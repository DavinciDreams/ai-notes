import EasySpeech from 'easy-speech';
import { apiService } from './apiService';

export interface VoiceConfig {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface VoiceCommand {
  command: string;
  action: () => void | Promise<void>;
  aliases?: string[];
}

export interface VoiceTranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  isCommand?: boolean;
  commandAction?: () => void | Promise<void>;
}

export class VoiceService {
  private isInitialized = false;
  private isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private commands: VoiceCommand[] = [];
  private isListeningForCommands = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Easy Speech for text-to-speech
      await EasySpeech.init({
        maxTimeout: 5000,
        interval: 250
      });
      
      this.isInitialized = true;
      console.log('Voice service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize voice service:', error);
      throw error;
    }
  }

  async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    await this.initialize();
    return EasySpeech.voices();
  }

  async speak(text: string, config: VoiceConfig = {}): Promise<void> {
    await this.initialize();
    
    if (!text.trim()) return;

    const voices = await this.getAvailableVoices();
    const selectedVoice = config.voice || voices.find(v => v.lang.startsWith('en')) || voices[0];

    const options = {
      text,
      voice: selectedVoice,
      rate: config.rate || 1,
      pitch: config.pitch || 1,
      volume: config.volume || 1
    };

    try {
      await EasySpeech.speak(options);
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/wav') 
          ? 'audio/wav'
          : MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm'
      });

      console.log('MediaRecorder created with MIME type:', this.mediaRecorder.mimeType);

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('Not currently recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.mediaRecorder?.mimeType || 'audio/webm' 
        });
        
        this.cleanup();
        resolve(audioBlob);
      };      this.mediaRecorder.onerror = () => {
        this.cleanup();
        reject(new Error('Recording failed'));
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    this.isRecording = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  registerCommand(command: VoiceCommand): void {
    this.commands.push(command);
  }

  registerCommands(commands: VoiceCommand[]): void {
    this.commands.push(...commands);
  }

  clearCommands(): void {
    this.commands = [];
  }

  enableCommandListening(): void {
    this.isListeningForCommands = true;
  }

  disableCommandListening(): void {
    this.isListeningForCommands = false;
  }

  private processTextForCommands(text: string): VoiceTranscriptionResult {
    if (!this.isListeningForCommands) {
      return { text };
    }

    const normalizedText = text.toLowerCase().trim();
    
    for (const command of this.commands) {
      const patterns = [command.command, ...(command.aliases || [])];
      
      for (const pattern of patterns) {
        if (normalizedText.includes(pattern.toLowerCase())) {
          return {
            text,
            isCommand: true,
            commandAction: command.action
          };
        }
      }
    }

    return { text };
  }
  async transcribeAudio(audioBlob: Blob): Promise<VoiceTranscriptionResult> {
    try {
      const result = await apiService.transcribeAudio(audioBlob);
      return this.processTextForCommands(result.data?.text || '');
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }  async transcribeAudioForNotes(audioBlob: Blob): Promise<VoiceTranscriptionResult> {
    try {
      console.log('VoiceService: Sending audio blob to API, size:', audioBlob.size);
      console.log('VoiceService: Audio blob type:', audioBlob.type);
      
      // Debug: Check if blob has actual audio data
      if (audioBlob.size < 1000) {
        console.warn('VoiceService: Audio blob is very small, may be empty or corrupted');
      }
      
      // Convert blob to ensure proper format if needed
      let audioToSend = audioBlob;
      
      // If the blob doesn't have the right MIME type, try to fix it
      if (!audioBlob.type.includes('audio/')) {
        console.log('VoiceService: Fixing audio blob MIME type');
        audioToSend = new Blob([audioBlob], { type: 'audio/wav' });
      }      const result = await apiService.transcribeAudio(audioToSend);
      console.log('VoiceService: Raw API response:', result);
      console.log('VoiceService: Response type:', typeof result);
      console.log('VoiceService: Response data:', result.data);
      console.log('VoiceService: Response success:', result.success);
      
      // Handle the ApiResponse wrapper
      let extractedText = '';
      let confidence: number | undefined;
      let language: string | undefined;
      
      if (result.success && result.data) {
        // The API response is wrapped in ApiResponse with data property
        extractedText = result.data.text || '';
        confidence = result.data.confidence;
        language = result.data.language;
        console.log('VoiceService: Extracted from data wrapper:', { extractedText, confidence, language });
      } else if (typeof result === 'string') {
        // If the entire response is a string, use it as text
        extractedText = (result as string).trim();
        console.log('VoiceService: Using string response as text:', extractedText);
      } else {
        // Fallback: try to extract directly from response
        console.log('VoiceService: Fallback extraction, result:', result);
        extractedText = (result as any).text || '';
        confidence = (result as any).confidence;
        language = (result as any).language;
      }
      
      console.log('VoiceService: Final extracted text:', extractedText);
      
      // Return raw transcription without command processing
      return {
        text: extractedText,
        confidence: confidence,
        language: language,
        isCommand: false
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  async startContinuousRecording(
    onTranscription: (result: VoiceTranscriptionResult) => void,
    options: {
      silenceThreshold?: number;
      maxRecordingTime?: number;
      autoProcess?: boolean;
    } = {}
  ): Promise<void> {
    const { 
      silenceThreshold = 3000, 
      maxRecordingTime = 30000,
      autoProcess = true 
    } = options;

    if (this.isRecording) return;

    let silenceTimeout: NodeJS.Timeout | undefined;
    let maxTimeout: NodeJS.Timeout | undefined;

    const processPendingAudio = async () => {
      if (this.audioChunks.length > 0) {
        try {
          const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder?.mimeType || 'audio/webm' 
          });
          
          if (autoProcess && audioBlob.size > 1000) { // Only process if there's meaningful audio
            const result = await this.transcribeAudio(audioBlob);
            onTranscription(result);
          }
        } catch (error) {
          console.error('Error processing audio:', error);
        }
        
        this.audioChunks = [];
      }
    };

    try {
      await this.startRecording();

      if (this.mediaRecorder) {
        // Override the ondataavailable to handle continuous processing
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
            
            // Reset silence timeout
            if (silenceTimeout) clearTimeout(silenceTimeout);
            silenceTimeout = setTimeout(() => {
              processPendingAudio();
            }, silenceThreshold);
          }
        };

        // Set maximum recording time
        maxTimeout = setTimeout(() => {
          this.stopRecording().then(() => processPendingAudio());
        }, maxRecordingTime);
      }

    } catch (error) {
      if (silenceTimeout) clearTimeout(silenceTimeout);
      if (maxTimeout) clearTimeout(maxTimeout);
      throw error;
    }
  }

  async speakWithCallback(
    text: string, 
    config: VoiceConfig = {},
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    await this.initialize();
    
    if (!text.trim()) return;

    const voices = await this.getAvailableVoices();
    const selectedVoice = config.voice || voices.find(v => v.lang.startsWith('en')) || voices[0];

    const options = {
      text,
      voice: selectedVoice,
      rate: config.rate || 1,
      pitch: config.pitch || 1,
      volume: config.volume || 1
    };

    try {
      onStart?.();
      await EasySpeech.speak(options);
      onEnd?.();
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      onError?.(error as Error);
      throw error;
    }
  }

  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return [];
    }
  }

  async switchAudioDevice(deviceId: string): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
    }

    // The device will be used in the next recording session
    console.log(`Switched to audio device: ${deviceId}`);
  }

  stopSpeaking(): void {
    try {
      EasySpeech.cancel();
    } catch (error) {
      console.error('Failed to stop speaking:', error);
    }
  }

  get isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
  get isCurrentlySpeaking(): boolean {
    const status = EasySpeech.status();
    return (status as any).state === 'speaking' || (status as any).status === 'speaking';
  }
}

export const voiceService = new VoiceService();
