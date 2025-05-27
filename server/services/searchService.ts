import { DatabaseService } from '../database';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  contentType: string;
  relevanceScore: number;
  highlights?: {
    title?: string[];
    content?: string[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    keywords?: string[];
  };
}

interface SearchOptions {
  query: string;
  type?: 'all' | 'documents' | 'notes' | 'files';
  limit?: number;
  offset?: number;
  userId?: number;
  filters?: {
    contentType?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    owner?: string;
  };
}

class SearchService {
  private isElasticsearchAvailable: boolean = false;

  constructor() {
    // For now, we'll use database search only
    // TODO: Add Elasticsearch integration when cluster is ready
    this.isElasticsearchAvailable = false;
  }

  async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    totalResults: number;
    searchTime: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Use database search with full-text search capabilities
      const documents = await DatabaseService.searchDocuments(options.query, options.userId);

      let results: SearchResult[] = documents.map(doc => ({
        id: doc.id.toString(),
        title: doc.title,
        content: doc.content,
        contentType: doc.content_type,
        relevanceScore: doc.relevance_score || 1.0,
        metadata: {
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          ownerId: doc.owner_id.toString(),
          keywords: doc.keywords || []
        }
      }));

      // Apply client-side filters
      if (options.type && options.type !== 'all') {
        results = results.filter(doc => doc.contentType === options.type);
      }

      if (options.filters?.contentType?.length) {
        results = results.filter(doc => 
          options.filters!.contentType!.includes(doc.contentType)
        );
      }

      if (options.filters?.dateRange) {
        const startDate = new Date(options.filters.dateRange.start);
        const endDate = new Date(options.filters.dateRange.end);
        results = results.filter(doc => {
          const docDate = new Date(doc.metadata.createdAt);
          return docDate >= startDate && docDate <= endDate;
        });
      }

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || 20;
      const paginatedResults = results.slice(offset, offset + limit);

      const searchTime = `${Date.now() - startTime}ms`;

      return {
        results: paginatedResults,
        totalResults: results.length,
        searchTime
      };

    } catch (error) {
      console.error('Search error:', error);
      return {
        results: [],
        totalResults: 0,
        searchTime: `${Date.now() - startTime}ms`
      };
    }
  }

  async suggest(query: string, limit: number = 5): Promise<string[]> {
    try {
      // Simple suggestion based on existing document titles and keywords
      const documents = await DatabaseService.searchDocuments(query);
      
      const suggestions = new Set<string>();
      
      documents.forEach(doc => {
        // Add partial matches from titles
        if (doc.title.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(doc.title);
        }
        
        // Add keywords that match
        if (doc.keywords) {
          doc.keywords.forEach((keyword: string) => {
            if (keyword.toLowerCase().includes(query.toLowerCase())) {
              suggestions.add(keyword);
            }
          });
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Suggestion error:', error);
      return [];
    }
  }
  async getStats(): Promise<{
    totalDocuments: number;
    searchMethod: string;
    isConnected: boolean;
  }> {
    try {
      // Use search with wildcard to get total count
      const documents = await DatabaseService.searchDocuments('*');
      
      return {
        totalDocuments: documents.length,
        searchMethod: 'PostgreSQL Full-Text Search',
        isConnected: true
      };
    } catch (error) {
      console.error('Error getting search stats:', error);
      return {
        totalDocuments: 0,
        searchMethod: 'Database unavailable',
        isConnected: false
      };
    }
  }

  // Placeholder for future Elasticsearch integration
  async indexDocument(doc: {
    id: string;
    title: string;
    content: string;
    contentType: string;
    ownerId: string;
    isPublic: boolean;
    keywords?: string[];
    metadata?: any;
  }): Promise<void> {
    // TODO: Implement when Elasticsearch is available
    console.log('Document indexing placeholder:', doc.id);
  }

  async updateDocument(id: string, updates: Partial<{
    title: string;
    content: string;
    contentType: string;
    keywords: string[];
    metadata: any;
  }>): Promise<void> {
    // TODO: Implement when Elasticsearch is available
    console.log('Document update placeholder:', id);
  }

  async deleteDocument(id: string): Promise<void> {
    // TODO: Implement when Elasticsearch is available
    console.log('Document deletion placeholder:', id);
  }
}

export const searchService = new SearchService();
export { SearchService };
export type { SearchResult, SearchOptions };
