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
  private ollamaUrl: string;

  constructor() {
    this.whisperUrl = process.env.WHISPER_URL || 'http://localhost:9000';
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  /**
   * Transcribe audio file using Whisper
   */
  async transcribeAudio(audioPath: string): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      formData.append('audio_file', fs.createReadStream(audioPath));
      formData.append('task', 'transcribe');
      formData.append('language', 'auto');
      formData.append('output', 'json');

      const response = await axios.post(`${this.whisperUrl}/asr`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000, // 60 second timeout for transcription
      });

      return {
        text: response.data.text || '',
        confidence: response.data.confidence || 0.8,
        language: response.data.language || 'en',
        segments: response.data.segments || []
      };
    } catch (error) {
      console.error('Whisper transcription error:', error);
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
      const response = await axios.get(`${this.whisperUrl}/health`, {
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
