interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any[];
}

interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

interface SearchResult {
  documents: Document[];
  suggestions: string[];
  totalCount: number;
  page: number;
  limit: number;
}

interface SearchStats {
  totalDocuments: number;
  totalSearches: number;
  popularTags: string[];
  recentActivity: any[];
  connectionStatus: {
    postgresql: boolean;
    elasticsearch?: boolean;
  };
}

interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  documentId?: string;
}

interface KnowledgeRelationship {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: string;
  properties: Record<string, any>;
}

interface GraphData {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
}

interface KnowledgeGraphStats {
  totalNodes: number;
  totalRelationships: number;
  nodeTypes: Record<string, number>;
  isConnected: boolean;
}

interface IngestionJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  result?: any;
}

interface SingleIngestionResponse {
  jobId: string;
  fileName?: string;
  fileSize?: number;
  status: string;
  message?: string;
}

interface BatchIngestionResponseItem {
  jobId: string;
  fileName?: string;
  fileSize?: number;
}

interface BatchIngestionResponse {
  jobs: BatchIngestionResponseItem[];
  message?: string;
}

interface IngestionOptions {
  extractEntities?: boolean;
  createKnowledgeGraph?: boolean;
  generateSummary?: boolean;
  detectLanguage?: boolean;
  extractKeywords?: boolean;
  generateTitle?: boolean;
  buildKnowledgeGraph?: boolean;
  enableOCR?: boolean;
  isPublic?: boolean;
  chunkSize?: number;
  title?: string;
  overlapSize?: number;
  language?: string;
  tags?: string[];
}

interface IngestionStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  processingJobs: number;
  totalFilesProcessed: number;
  totalDocumentsCreated: number;
  supportedFormats: string[];
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          data: null as T
        };
      }

      // Wrap successful response in ApiResponse format
      return {
        success: true,
        data: data as T,
        error: undefined
      };
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        data: null as T
      };
    }
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }
  async register(username: string, email: string, password: string, displayName?: string): Promise<ApiResponse<{ token: string; user: any }>> {
    const body: any = { username, email, password };
    if (displayName) {
      body.displayName = displayName;
    }
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe(): Promise<ApiResponse<any>> {
    return this.request('/auth/me');
  }

  // Document endpoints
  async getDocuments(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Document[]>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request(`/documents${query ? `?${query}` : ''}`);
  }

  async getDocument(id: string): Promise<ApiResponse<Document>> {
    return this.request(`/documents/${id}`);
  }

  async createDocument(document: Partial<Document>): Promise<ApiResponse<Document>> {
    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    });
  }

  async updateDocument(id: string, document: Partial<Document>): Promise<ApiResponse<Document>> {
    return this.request(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(document),
    });
  }

  async deleteDocument(id: string): Promise<ApiResponse> {
    return this.request(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // Search endpoints
  async search(params: {
    query: string;
    filters?: Record<string, any>;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<SearchResult>> {
    const queryParams = new URLSearchParams();
    queryParams.append('query', params.query);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        queryParams.append(key, value.toString());
      });
    }

    return this.request(`/search?${queryParams.toString()}`);
  }

  async getSearchSuggestions(query: string): Promise<ApiResponse<string[]>> {
    return this.request(`/search/suggest?query=${encodeURIComponent(query)}`);
  }

  async getSearchStats(): Promise<ApiResponse<SearchStats>> {
    return this.request('/search/stats');
  }

  async advancedSearch(params: {
    query: string;
    filters: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<SearchResult>> {
    return this.request('/search/advanced', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Knowledge Graph endpoints
  async getKnowledgeGraphStatus(): Promise<ApiResponse<{ connected: boolean; service: string }>> {
    return this.request('/knowledge-graph/status');
  }

  async getKnowledgeGraphStats(): Promise<ApiResponse<KnowledgeGraphStats>> {
    return this.request('/knowledge-graph/stats');
  }

  async createKnowledgeNode(node: {
    label: string;
    type: string;
    properties?: Record<string, any>;
    documentId?: string;
  }): Promise<ApiResponse<KnowledgeNode>> {
    return this.request('/knowledge-graph/nodes', {
      method: 'POST',
      body: JSON.stringify(node),
    });
  }

  async createKnowledgeRelationship(relationship: {
    fromNodeId: string;
    toNodeId: string;
    type: string;
    properties?: Record<string, any>;
  }): Promise<ApiResponse<KnowledgeRelationship>> {
    return this.request('/knowledge-graph/relationships', {
      method: 'POST',
      body: JSON.stringify(relationship),
    });
  }

  async getKnowledgeGraph(params?: {
    nodeTypes?: string[];
    relationshipTypes?: string[];
    limit?: number;
    documentId?: string;
  }): Promise<ApiResponse<GraphData>> {
    const queryParams = new URLSearchParams();
    if (params?.nodeTypes?.length) {
      queryParams.append('nodeTypes', params.nodeTypes.join(','));
    }
    if (params?.relationshipTypes?.length) {
      queryParams.append('relationshipTypes', params.relationshipTypes.join(','));
    }
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.documentId) queryParams.append('documentId', params.documentId);

    const query = queryParams.toString();
    return this.request(`/knowledge-graph/graph${query ? `?${query}` : ''}`);
  }

  async findShortestPath(
    startNodeId: string,
    endNodeId: string
  ): Promise<ApiResponse<{ path: KnowledgeNode[]; relationships: KnowledgeRelationship[]; length: number }>> {
    const queryParams = new URLSearchParams();
    queryParams.append('startNodeId', startNodeId);
    queryParams.append('endNodeId', endNodeId);

    return this.request(`/knowledge-graph/path?${queryParams.toString()}`);
  }

  async findSimilarNodes(
    nodeId: string,
    limit?: number
  ): Promise<ApiResponse<KnowledgeNode[]>> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());

    const query = queryParams.toString();
    return this.request(`/knowledge-graph/similar/${nodeId}${query ? `?${query}` : ''}`);
  }

  async deleteKnowledgeNode(nodeId: string): Promise<ApiResponse> {
    return this.request(`/knowledge-graph/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  }  // AI endpoints
  async transcribeAudio(audioBlob: Blob): Promise<ApiResponse<{ 
    text: string; 
    confidence?: number; 
    language?: string; 
    segments?: Array<{start: number; end: number; text: string}> 
  }>> {
    console.log('ApiService: Preparing audio for transcription, size:', audioBlob.size, 'type:', audioBlob.type);
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    console.log('ApiService: Sending request to:', `${this.baseURL}/ai/transcribe`);
    return fetch(`${this.baseURL}/ai/transcribe`, {
      method: 'POST',
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    }).then(async res => {
      console.log('ApiService: Response status:', res.status);
      const data = await res.json();
      console.log('ApiService: Response data:', data);
      return data;
    });
  }

  async generateText(prompt: string, model?: string): Promise<ApiResponse<{ text: string }>> {
    return this.request('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, model }),
    });
  }

  async chatWithDocument(
    documentId: string,
    message: string
  ): Promise<ApiResponse<{ response: string }>> {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ documentId, message }),
    });
  }

  // Data ingestion endpoints
  async uploadFile(file: File, options?: {
    extractText?: boolean;
    createKnowledgeGraph?: boolean;
  }): Promise<ApiResponse<{ document: Document; processedData?: any }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.extractText !== undefined) {
      formData.append('extractText', options.extractText.toString());
    }
    if (options?.createKnowledgeGraph !== undefined) {
      formData.append('createKnowledgeGraph', options.createKnowledgeGraph.toString());
    }

    return fetch(`${this.baseURL}/ingestion/upload`, {
      method: 'POST',
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    }).then(res => res.json());
  }

  async ingestFromUrl(
    url: string,
    options?: {
      type?: 'webpage' | 'rss' | 'api';
      extractText?: boolean;
      createKnowledgeGraph?: boolean;
    }
  ): Promise<ApiResponse<{ document: Document; processedData?: any }>> {
    return this.request('/ingestion/url', {
      method: 'POST',
      body: JSON.stringify({ url, ...options }),
    });
  }

  async processText(
    text: string,
    options?: {
      title?: string;
      createKnowledgeGraph?: boolean;
    }
  ): Promise<ApiResponse<{ document: Document; processedData?: any }>> {
    return this.request('/ingestion/text', {
      method: 'POST',
      body: JSON.stringify({ text, ...options }),
    });
  }  // Enhanced Data Ingestion endpoints
  async createIngestionJob(file: File, options?: IngestionOptions): Promise<ApiResponse<SingleIngestionResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
    }

    return fetch(`${this.baseURL}/enhanced-ingestion/upload`, {
      method: 'POST',
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    }).then(res => res.json());
  }

  async uploadFileForIngestion(file: File, options?: IngestionOptions): Promise<ApiResponse<SingleIngestionResponse>> {
    return this.createIngestionJob(file, options);
  }

  async uploadFilesForIngestion(files: File[], options?: IngestionOptions): Promise<ApiResponse<BatchIngestionResponse>> {
    return this.createBatchIngestionJob(files, options);
  }

  async ingestTextContent(text: string, options?: IngestionOptions): Promise<ApiResponse<SingleIngestionResponse>> {
    return this.processTextContent(text, options);
  }

  async cancelIngestionJob(jobId: string): Promise<ApiResponse> {
    return this.deleteIngestionJob(jobId);
  }

  async getIngestionJobStatus(jobId: string): Promise<ApiResponse<IngestionJob>> {
    return this.request(`/enhanced-ingestion/jobs/${jobId}`);
  }

  async processTextContent(text: string, options?: IngestionOptions): Promise<ApiResponse<SingleIngestionResponse>> {
    return this.request('/enhanced-ingestion/text', {
      method: 'POST',
      body: JSON.stringify({ text, options }),
    });
  }

  async createBatchIngestionJob(files: File[], options?: IngestionOptions): Promise<ApiResponse<BatchIngestionResponse>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
    }

    return fetch(`${this.baseURL}/enhanced-ingestion/batch`, {
      method: 'POST',
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    }).then(res => res.json());
  }

  async deleteIngestionJob(jobId: string): Promise<ApiResponse> {
    return this.request(`/enhanced-ingestion/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  async listIngestionJobs(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<IngestionJob[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request(`/enhanced-ingestion/jobs${query ? `?${query}` : ''}`);
  }

  async getIngestionStats(): Promise<ApiResponse<IngestionStats>> {
    return this.request('/enhanced-ingestion/stats');
  }
}

export const apiService = new ApiService();
export default apiService;
export type {
  ApiResponse,
  Document,
  SearchResult,
  SearchStats,
  KnowledgeNode,
  KnowledgeRelationship,
  GraphData,
  KnowledgeGraphStats,
  IngestionJob,
  IngestionOptions,
  IngestionStats,
};
