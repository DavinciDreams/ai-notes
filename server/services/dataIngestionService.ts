import fs from 'fs';
import path from 'path';
import { DatabaseService } from '../database';
import { aiService } from './aiService';

export interface IngestionResult {
  success: boolean;
  documentId?: number;
  title?: string;
  content?: string;
  keywords?: string[];
  error?: string;
}

export interface IngestionOptions {
  userId: number;
  isPublic?: boolean;
  extractKeywords?: boolean;
  generateTitle?: boolean;
}

export class DataIngestionService {
  
  /**
   * Process plain text files
   */
  static async ingestTextFile(filePath: string, options: IngestionOptions): Promise<IngestionResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath, path.extname(filePath));
      
      let title = filename;
      let keywords: string[] = [];

      // Generate AI-powered title if enabled
      if (options.generateTitle && content.length > 100) {
        try {
          title = await aiService.generateTitle(content);
        } catch (error) {
          console.warn('Failed to generate title:', error);
        }
      }

      // Extract keywords if enabled
      if (options.extractKeywords && content.length > 50) {
        try {
          keywords = await aiService.extractKeywords(content);
        } catch (error) {
          console.warn('Failed to extract keywords:', error);
        }
      }

      // Create document in database
      const document = await DatabaseService.createDocument({
        title,
        content,
        content_type: 'text',
        owner_id: options.userId,
        is_public: options.isPublic || false
      });

      return {
        success: true,
        documentId: document.id,
        title: document.title,
        content: document.content,
        keywords
      };
    } catch (error) {
      console.error('Text ingestion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process text file'
      };
    }
  }

  /**
   * Process markdown files
   */
  static async ingestMarkdownFile(filePath: string, options: IngestionOptions): Promise<IngestionResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath, path.extname(filePath));
      
      // Extract title from markdown (look for # at the beginning)
      const titleMatch = content.match(/^#\s+(.+)$/m);
      let title = titleMatch ? titleMatch[1].trim() : filename;

      let keywords: string[] = [];

      // Extract keywords if enabled
      if (options.extractKeywords && content.length > 50) {
        try {
          keywords = await aiService.extractKeywords(content);
        } catch (error) {
          console.warn('Failed to extract keywords:', error);
        }
      }

      // Create document in database
      const document = await DatabaseService.createDocument({
        title,
        content,
        content_type: 'markdown',
        owner_id: options.userId,
        is_public: options.isPublic || false
      });

      return {
        success: true,
        documentId: document.id,
        title: document.title,
        content: document.content,
        keywords
      };
    } catch (error) {
      console.error('Markdown ingestion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process markdown file'
      };
    }
  }

  /**
   * Process JSON files (for structured data)
   */
  static async ingestJsonFile(filePath: string, options: IngestionOptions): Promise<IngestionResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      const filename = path.basename(filePath, path.extname(filePath));
      
      // Convert JSON to readable text format
      const readableContent = this.jsonToReadableText(jsonData);
      
      let title = filename;
      let keywords: string[] = [];

      // Generate AI-powered title if enabled
      if (options.generateTitle && readableContent.length > 100) {
        try {
          title = await aiService.generateTitle(readableContent);
        } catch (error) {
          console.warn('Failed to generate title:', error);
        }
      }

      // Extract keywords if enabled
      if (options.extractKeywords && readableContent.length > 50) {
        try {
          keywords = await aiService.extractKeywords(readableContent);
        } catch (error) {
          console.warn('Failed to extract keywords:', error);
        }
      }

      // Create document in database
      const document = await DatabaseService.createDocument({
        title,
        content: readableContent,
        content_type: 'json',
        owner_id: options.userId,
        is_public: options.isPublic || false
      });

      return {
        success: true,
        documentId: document.id,
        title: document.title,
        content: document.content,
        keywords
      };
    } catch (error) {
      console.error('JSON ingestion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process JSON file'
      };
    }
  }

  /**
   * Process web clippings from URLs
   */
  static async ingestWebClipping(url: string, options: IngestionOptions): Promise<IngestionResult> {
    try {
      // This is a placeholder - in production you'd use a web scraping service
      // or integrate with tools like Puppeteer, Playwright, or Mercury Parser
      
      // For now, return a placeholder result
      const title = `Web Clipping: ${url}`;
      const content = `This is a placeholder for web content from: ${url}\n\nTo implement this feature, integrate with a web scraping service.`;

      const document = await DatabaseService.createDocument({
        title,
        content,
        content_type: 'html',
        owner_id: options.userId,
        is_public: options.isPublic || false
      });

      return {
        success: true,
        documentId: document.id,
        title: document.title,
        content: document.content,
        keywords: []
      };
    } catch (error) {
      console.error('Web clipping error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process web clipping'
      };
    }
  }

  /**
   * Process CSV files
   */
  static async ingestCsvFile(filePath: string, options: IngestionOptions): Promise<IngestionResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath, path.extname(filePath));
      
      // Convert CSV to readable format
      const lines = content.split('\n').filter(line => line.trim());
      const headers = lines[0]?.split(',').map(h => h.trim()) || [];
      const dataRows = lines.slice(1);
      
      let readableContent = `CSV Data: ${filename}\n\n`;
      readableContent += `Headers: ${headers.join(', ')}\n\n`;
      readableContent += `Total rows: ${dataRows.length}\n\n`;
      
      // Add sample data (first 10 rows)
      readableContent += 'Sample data:\n';
      dataRows.slice(0, 10).forEach((row, index) => {
        const values = row.split(',').map(v => v.trim());
        readableContent += `Row ${index + 1}: ${values.join(', ')}\n`;
      });

      let title = `CSV: ${filename}`;
      let keywords: string[] = [...headers]; // Use headers as initial keywords

      // Extract additional keywords if enabled
      if (options.extractKeywords && readableContent.length > 50) {
        try {
          const aiKeywords = await aiService.extractKeywords(readableContent);
          keywords = [...new Set([...keywords, ...aiKeywords])]; // Merge and deduplicate
        } catch (error) {
          console.warn('Failed to extract keywords:', error);
        }
      }

      const document = await DatabaseService.createDocument({
        title,
        content: readableContent,
        content_type: 'csv',
        owner_id: options.userId,
        is_public: options.isPublic || false
      });

      return {
        success: true,
        documentId: document.id,
        title: document.title,
        content: document.content,
        keywords
      };
    } catch (error) {
      console.error('CSV ingestion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process CSV file'
      };
    }
  }

  /**
   * Auto-detect file type and process accordingly
   */
  static async ingestFile(filePath: string, options: IngestionOptions): Promise<IngestionResult> {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.txt':
        return this.ingestTextFile(filePath, options);
      case '.md':
      case '.markdown':
        return this.ingestMarkdownFile(filePath, options);
      case '.json':
        return this.ingestJsonFile(filePath, options);
      case '.csv':
        return this.ingestCsvFile(filePath, options);
      case '.pdf':
        // PDF processing would require additional dependencies like pdf-parse
        return {
          success: false,
          error: 'PDF processing not yet implemented. Please install pdf-parse dependency.'
        };
      default:
        // Try to process as text file
        return this.ingestTextFile(filePath, options);
    }
  }

  /**
   * Convert JSON object to readable text
   */
  private static jsonToReadableText(obj: any, prefix = ''): string {
    let result = '';
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        result += `${prefix}Array with ${obj.length} items:\n`;
        obj.slice(0, 5).forEach((item, index) => {
          result += `${prefix}  [${index}]: ${this.jsonToReadableText(item, prefix + '    ')}\n`;
        });
        if (obj.length > 5) {
          result += `${prefix}  ... and ${obj.length - 5} more items\n`;
        }
      } else {
        for (const [key, value] of Object.entries(obj)) {
          result += `${prefix}${key}: ${this.jsonToReadableText(value, prefix + '  ')}\n`;
        }
      }
    } else {
      result = String(obj);
    }
    
    return result;
  }

  /**
   * Batch process multiple files
   */
  static async ingestMultipleFiles(
    filePaths: string[], 
    options: IngestionOptions
  ): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await this.ingestFile(filePath, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: `Failed to process ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
    
    return results;
  }

  /**
   * Clean up temporary files
   */
  static cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to cleanup file:', error);
    }
  }
}

export const dataIngestionService = DataIngestionService;
