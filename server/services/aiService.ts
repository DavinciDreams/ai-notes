import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface LLMResponse {
  response: string;
  model: string;
  created_at: string;
  done: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AIService {
  private whisperUrl: string;
  private ollamaUrl: string;  constructor() {
    this.whisperUrl = process.env.WHISPER_URL || 'http://localhost:9002';
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  }
  /**
   * Transcribe audio file using Whisper
   */  async transcribeAudio(audioPath: string): Promise<TranscriptionResult> {
    try {
      console.log('AIService: Starting transcription for file:', audioPath);
      
      // Check if Whisper service is available
      const whisperAvailable = await this.checkWhisperHealth();
      
      if (!whisperAvailable) {
        console.warn('Whisper service not available, returning fallback transcription');
        return {
          text: 'Audio transcription is currently unavailable. Please ensure the Whisper service is running on port 9002.',
          confidence: 0.0,
          language: 'en',
          segments: []
        };
      }      console.log('AIService: Whisper service is available, preparing FormData');
      const formData = new FormData();
      formData.append('audio_file', fs.createReadStream(audioPath));
      formData.append('task', 'transcribe');
      formData.append('language', 'auto');
      formData.append('output', 'json');
      formData.append('encode', 'true');

      console.log('AIService: Sending request to Whisper at:', `${this.whisperUrl}/asr`);
      const response = await axios.post(`${this.whisperUrl}/asr`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000, // 60 second timeout for transcription
      });      console.log('AIService: Whisper raw response:', response.data);
      console.log('AIService: Whisper response type:', typeof response.data);
      console.log('AIService: Whisper response keys:', Object.keys(response.data || {}));
      console.log('AIService: Extracted text:', response.data.text);
      console.log('AIService: Text type:', typeof response.data.text);
      console.log('AIService: Text length:', (response.data.text || '').length);
      
      // Check if response.data is a string (some APIs return plain text)
      let extractedText = '';
      if (typeof response.data === 'string') {
        console.log('AIService: Response is plain text string');
        extractedText = response.data;
      } else if (response.data && typeof response.data.text === 'string') {
        console.log('AIService: Response has text property');
        extractedText = response.data.text;
      } else {
        console.log('AIService: Unknown response format, using empty string');
        extractedText = '';
      }

      return {
        text: extractedText,
        confidence: response.data.confidence || 0.8,
        language: response.data.language || 'en',
        segments: response.data.segments || []
      };
    } catch (error) {
      console.error('Whisper transcription error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      throw new Error('Failed to transcribe audio');
    }
  }

  /**
   * Generate text using local Ollama LLM
   */
  async generateText(prompt: string, model: string = 'llama3.2:latest'): Promise<LLMResponse> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2048
        }
      }, {
        timeout: 120000 // 2 minute timeout for generation
      });

      return {
        response: response.data.response || '',
        model: response.data.model || model,
        created_at: response.data.created_at || new Date().toISOString(),
        done: response.data.done || true
      };
    } catch (error) {
      console.error('Ollama generation error:', error);
      throw new Error('Failed to generate text');
    }
  }

  /**
   * Chat with local Ollama LLM using conversation history
   */
  async chatWithLLM(messages: ChatMessage[], model: string = 'llama3.2:latest'): Promise<LLMResponse> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
        model,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2048
        }
      }, {
        timeout: 120000
      });

      return {
        response: response.data.message?.content || '',
        model: response.data.model || model,
        created_at: response.data.created_at || new Date().toISOString(),
        done: response.data.done || true
      };
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw new Error('Failed to chat with LLM');
    }
  }

  /**
   * Summarize document content
   */
  async summarizeDocument(content: string, maxLength: number = 200): Promise<string> {
    const prompt = `Please provide a concise summary of the following document in approximately ${maxLength} words. Focus on the key points and main ideas:

${content}

Summary:`;

    try {
      const response = await this.generateText(prompt);
      return response.response.trim();
    } catch (error) {
      console.error('Document summarization error:', error);
      throw new Error('Failed to summarize document');
    }
  }

  /**
   * Extract keywords and tags from content
   */
  async extractKeywords(content: string): Promise<string[]> {
    const prompt = `Extract the most important keywords and tags from the following text. Return only a comma-separated list of single words or short phrases (max 3 words each). Limit to 10 most relevant terms:

${content}

Keywords:`;

    try {
      const response = await this.generateText(prompt);
      const keywords = response.response
        .split(',')
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => keyword.length > 2 && keyword.length < 50)
        .slice(0, 10);
      
      return keywords;
    } catch (error) {
      console.error('Keyword extraction error:', error);
      return [];
    }
  }

  /**
   * Generate document title from content
   */
  async generateTitle(content: string): Promise<string> {
    const prompt = `Generate a concise, descriptive title for the following document content. The title should be 3-8 words and capture the main topic:

${content.substring(0, 500)}...

Title:`;

    try {
      const response = await this.generateText(prompt);
      return response.response.trim().replace(/['"]/g, '');
    } catch (error) {
      console.error('Title generation error:', error);
      return 'Untitled Document';
    }
  }

  /**
   * Answer questions about document content
   */
  async answerQuestion(question: string, context: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that answers questions based on the provided context. If the answer cannot be found in the context, say so clearly.'
      },
      {
        role: 'user',
        content: `Context: ${context}\n\nQuestion: ${question}`
      }
    ];

    try {
      const response = await this.chatWithLLM(messages);
      return response.response;
    } catch (error) {
      console.error('Question answering error:', error);
      throw new Error('Failed to answer question');
    }
  }

  /**
   * Check if Ollama service is available
   */
  async checkOllamaHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
  /**
   * Check if Whisper service is available
   */
  async checkWhisperHealth(): Promise<boolean> {
    try {
      // Try the root endpoint since /health returns 404
      const response = await axios.get(`${this.whisperUrl}/`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available Ollama models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      return response.data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }
}

export const aiService = new AIService();
