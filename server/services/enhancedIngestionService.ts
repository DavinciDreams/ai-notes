import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { DatabaseService } from '../database';
import { aiService } from './aiService';
import { knowledgeGraphService } from './knowledgeGraphService';

export interface IngestionJob {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  userId: number;
  options: IngestionOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: IngestionResult;
}

export interface IngestionResult {
  success: boolean;
  documentId?: number;
  documentsCreated?: number;
  title?: string;
  content?: string;
  keywords?: string[];
  entities?: any[];
  relationships?: any[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface IngestionOptions {
  userId: number;
  title?: string;
  isPublic?: boolean;
  extractKeywords?: boolean;
  generateTitle?: boolean;
  extractEntities?: boolean;
  buildKnowledgeGraph?: boolean;
  chunkSize?: number;
  overlapSize?: number;
  enableOCR?: boolean;
  language?: string;
  tags?: string[];
}

export interface BatchIngestionOptions extends IngestionOptions {
  maxConcurrent?: number;
  onProgress?: (job: IngestionJob) => void;
  onComplete?: (job: IngestionJob) => void;
  onError?: (job: IngestionJob, error: Error) => void;
}

export class EnhancedIngestionService extends EventEmitter {
  private activeJobs = new Map<string, IngestionJob>();
  private jobQueue: IngestionJob[] = [];
  private maxConcurrentJobs = 3;
  private isProcessing = false;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Add a single file to the ingestion queue
   */
  async ingestFile(
    filePath: string, 
    options: IngestionOptions
  ): Promise<IngestionJob> {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const mimeType = this.getMimeType(fileName);
    
    const job: IngestionJob = {
      id: this.generateJobId(),
      filePath,
      fileName,
      fileSize: stats.size,
      mimeType,
      userId: options.userId,
      options,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    this.jobQueue.push(job);
    this.emit('jobQueued', job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return job;
  }

  /**
   * Batch ingest multiple files
   */
  async ingestBatch(
    filePaths: string[], 
    options: BatchIngestionOptions
  ): Promise<IngestionJob[]> {
    const jobs: IngestionJob[] = [];
    
    for (const filePath of filePaths) {
      const job = await this.ingestFile(filePath, options);
      jobs.push(job);
    }

    return jobs;
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.jobQueue.length > 0 || this.activeJobs.size > 0) {
      // Start new jobs up to the concurrent limit
      while (
        this.jobQueue.length > 0 && 
        this.activeJobs.size < this.maxConcurrentJobs
      ) {
        const job = this.jobQueue.shift()!;
        this.activeJobs.set(job.id, job);
        this.processJob(job);
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessing = false;
  }

  /**
   * Process a single ingestion job
   */
  private async processJob(job: IngestionJob): Promise<void> {
    try {
      job.status = 'processing';
      job.startedAt = new Date();
      job.progress = 0;
      this.emit('jobStarted', job);

      // Update progress
      const updateProgress = (progress: number) => {
        job.progress = progress;
        this.emit('jobProgress', job);
      };

      updateProgress(10);

      // Step 1: Extract content based on file type
      const content = await this.extractContent(job.filePath, job.mimeType, updateProgress);
      updateProgress(30);

      // Step 2: Process content with AI services
      const result = await this.processContent(content, job.options, updateProgress);
      updateProgress(70);

      // Step 3: Store in database
      const documentId = await this.storeDocument(result, job.options);
      result.documentId = documentId;
      updateProgress(90);

      // Step 4: Build knowledge graph if enabled
      if (job.options.buildKnowledgeGraph && result.entities) {
        await this.buildKnowledgeGraph(documentId, result, job.options);
      }

      job.result = result;
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      
      this.emit('jobCompleted', job);
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      
      this.emit('jobFailed', job, error);
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Extract content from various file types
   */
  private async extractContent(
    filePath: string, 
    mimeType: string, 
    updateProgress: (progress: number) => void
  ): Promise<string> {
    updateProgress(15);

    switch (mimeType) {
      case 'text/plain':
      case 'text/markdown':
        return fs.readFileSync(filePath, 'utf8');
      
      case 'application/json':
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return JSON.stringify(jsonData, null, 2);
      
      case 'text/html':
        return this.extractTextFromHTML(filePath);
      
      case 'application/pdf':
        return await this.extractTextFromPDF(filePath, updateProgress);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await this.extractTextFromDocx(filePath, updateProgress);
      
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return await this.extractTextFromXlsx(filePath, updateProgress);
      
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
        return await this.extractTextFromImage(filePath, updateProgress);
      
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Process extracted content with AI services
   */
  private async processContent(
    content: string, 
    options: IngestionOptions,
    updateProgress: (progress: number) => void
  ): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: true,
      content,
      metadata: {
        contentLength: content.length,
        processedAt: new Date().toISOString()
      }
    };

    updateProgress(40);

    // Generate title
    if (options.generateTitle && content.length > 100) {
      try {
        result.title = await aiService.generateTitle(content.substring(0, 2000));
      } catch (error) {
        console.warn('Failed to generate title:', error);
      }
    }

    updateProgress(50);

    // Extract keywords
    if (options.extractKeywords && content.length > 50) {
      try {
        result.keywords = await aiService.extractKeywords(content.substring(0, 3000));
      } catch (error) {
        console.warn('Failed to extract keywords:', error);
      }
    }

    updateProgress(60);    // Extract entities
    if (options.extractEntities && content.length > 50) {
      try {
        // TODO: Implement entity extraction in AI service
        result.entities = []; // await aiService.extractEntities(content);
      } catch (error) {
        console.warn('Failed to extract entities:', error);
      }
    }

    updateProgress(65);

    return result;
  }
  /**
   * Store document in database
   */
  private async storeDocument(
    result: IngestionResult, 
    options: IngestionOptions
  ): Promise<number> {
    const documentData = {
      title: result.title || 'Untitled Document',
      content: result.content || '',
      content_type: 'text/plain',
      owner_id: options.userId,
      is_public: options.isPublic || false
    };

    const documentId = await DatabaseService.createDocument(documentData);
    return documentId;
  }
  /**
   * Build knowledge graph from extracted entities
   */
  private async buildKnowledgeGraph(
    documentId: number,
    result: IngestionResult,
    options: IngestionOptions
  ): Promise<void> {
    if (!result.entities || result.entities.length === 0) return;

    try {
      // Create document node
      const docNode = await knowledgeGraphService.createNode({
        label: 'Document',
        type: 'document',
        properties: {
          documentId: documentId.toString(),
          title: result.title || 'Untitled'
        },
        documentId: documentId.toString()
      });

      // Create entity nodes and relationships
      for (const entity of result.entities) {
        const entityNode = await knowledgeGraphService.createNode({
          label: entity.name,
          type: entity.type || 'Entity',
          properties: {
            name: entity.name,
            entityType: entity.type,
            confidence: entity.confidence
          },
          documentId: documentId.toString()
        });

        // Create relationship between document and entity
        await knowledgeGraphService.createRelationship({
          fromNodeId: docNode.id,
          toNodeId: entityNode.id,
          type: 'CONTAINS',
          properties: { confidence: entity.confidence }
        });
      }

    } catch (error) {
      console.error('Failed to build knowledge graph:', error);
    }
  }

  /**
   * Extract text from HTML files
   */
  private extractTextFromHTML(filePath: string): string {
    const html = fs.readFileSync(filePath, 'utf8');
    // Simple HTML tag removal - in production, use a proper HTML parser
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract text from PDF files
   */
  private async extractTextFromPDF(
    filePath: string, 
    updateProgress: (progress: number) => void
  ): Promise<string> {
    updateProgress(20);
    // TODO: Implement PDF text extraction using pdf-parse or similar
    throw new Error('PDF extraction not yet implemented');
  }

  /**
   * Extract text from DOCX files
   */
  private async extractTextFromDocx(
    filePath: string, 
    updateProgress: (progress: number) => void
  ): Promise<string> {
    updateProgress(20);
    // TODO: Implement DOCX text extraction using mammoth or similar
    throw new Error('DOCX extraction not yet implemented');
  }

  /**
   * Extract text from XLSX files
   */
  private async extractTextFromXlsx(
    filePath: string, 
    updateProgress: (progress: number) => void
  ): Promise<string> {
    updateProgress(20);
    // TODO: Implement XLSX text extraction using xlsx or similar
    throw new Error('XLSX extraction not yet implemented');
  }

  /**
   * Extract text from images using OCR
   */
  private async extractTextFromImage(
    filePath: string, 
    updateProgress: (progress: number) => void
  ): Promise<string> {
    updateProgress(20);
    // TODO: Implement OCR using Tesseract.js or similar
    throw new Error('OCR extraction not yet implemented');
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.json': 'application/json',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): IngestionJob | undefined {
    return this.activeJobs.get(jobId) || 
           this.jobQueue.find(job => job.id === jobId);
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): IngestionJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get all jobs (active and queued)
   */
  getAllJobs(): IngestionJob[] {
    const activeJobs = Array.from(this.activeJobs.values());
    return [...activeJobs, ...this.jobQueue];
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.getJobStatus(jobId);
    if (!job) return false;

    if (job.status === 'pending') {
      const index = this.jobQueue.findIndex(j => j.id === jobId);
      if (index >= 0) {
        this.jobQueue.splice(index, 1);
        this.emit('jobCancelled', job);
        return true;
      }
    }

    return false;
  }

  /**
   * Set maximum concurrent jobs
   */
  setMaxConcurrentJobs(max: number): void {
    this.maxConcurrentJobs = Math.max(1, max);
  }

  /**
   * Ingest content from URL
   */
  async ingestUrl(url: string, options: IngestionOptions): Promise<IngestionJob> {
    try {
      // Fetch content from URL
      const response = await fetch(url);
      const content = await response.text();
      
      // Create a temporary file with the content
      const tempFileName = `url-${Date.now()}.html`;
      const tempFilePath = path.join('uploads', tempFileName);
      
      // Ensure uploads directory exists
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, content);
      
      const job = await this.ingestFile(tempFilePath, {
        ...options,
        title: url
      });
      
      return job;
    } catch (error) {
      throw new Error(`Failed to ingest URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ingest text content directly
   */
  async ingestText(text: string, options: IngestionOptions): Promise<IngestionJob> {
    try {
      // Create a temporary file with the text content
      const tempFileName = `text-${Date.now()}.txt`;
      const tempFilePath = path.join('uploads', tempFileName);
      
      // Ensure uploads directory exists
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, text);
      
      const job = await this.ingestFile(tempFilePath, options);
      
      return job;
    } catch (error) {
      throw new Error(`Failed to ingest text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const enhancedIngestionService = new EnhancedIngestionService();
