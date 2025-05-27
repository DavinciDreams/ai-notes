import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, FileText, Tag } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'note' | 'canvas' | 'concept';
  author: string;
  lastModified: Date;
  tags: string[];
  relevanceScore: number;
}

interface SmartSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  onSearch?: (query: string, filters: SearchFilters) => void;
}

interface SearchFilters {
  type: string;
  author: string;
  dateRange: string;
  tags: string[];
  sortBy: string;
}

// Mock search results for demonstration
const mockResults: SearchResult[] = [
  {
    id: '1',
    title: 'AI Research Methodology',
    content: 'Comprehensive guide to conducting AI research including data collection, model training, and evaluation metrics...',
    type: 'document',
    author: 'John Doe',
    lastModified: new Date('2024-01-15'),
    tags: ['AI', 'Research', 'Machine Learning'],
    relevanceScore: 0.95
  },
  {
    id: '2',
    title: 'Project Planning Canvas',
    content: 'Visual planning canvas for the collaborative knowledge management system project...',
    type: 'canvas',
    author: 'Jane Smith',
    lastModified: new Date('2024-01-14'),
    tags: ['Project', 'Planning', 'Canvas'],
    relevanceScore: 0.88
  },
  {
    id: '3',
    title: 'Neural Network Architecture Notes',
    content: 'Detailed notes on different neural network architectures including CNNs, RNNs, and Transformers...',
    type: 'note',
    author: 'Alex Johnson',
    lastModified: new Date('2024-01-13'),
    tags: ['Neural Networks', 'Deep Learning', 'Architecture'],
    relevanceScore: 0.82
  }
];

const SmartSearch: React.FC<SmartSearchProps> = ({ onResultSelect, onSearch }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    author: 'all',
    dateRange: 'all',
    tags: [],
    sortBy: 'relevance'
  });

  // Simulate search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, filters]);

  const performSearch = async () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      let filteredResults = mockResults.filter(result => 
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.content.toLowerCase().includes(query.toLowerCase()) ||
        result.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      // Apply filters
      if (filters.type !== 'all') {
        filteredResults = filteredResults.filter(result => result.type === filters.type);
      }

      if (filters.author !== 'all') {
        filteredResults = filteredResults.filter(result => result.author === filters.author);
      }

      // Sort results
      filteredResults.sort((a, b) => {
        switch (filters.sortBy) {
          case 'date':
            return b.lastModified.getTime() - a.lastModified.getTime();
          case 'title':
            return a.title.localeCompare(b.title);
          case 'relevance':
          default:
            return b.relevanceScore - a.relevanceScore;
        }
      });

      setResults(filteredResults);
      setIsLoading(false);
      
      // Notify parent component
      onSearch?.(query, filters);
    }, 500);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'note':
        return <FileText className="w-4 h-4" />;
      case 'canvas':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Search Input */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all your knowledge..."
            className="w-full pl-10 pr-20 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-md transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="document">Documents</option>
                <option value="note">Notes</option>
                <option value="canvas">Canvas</option>
                <option value="concept">Concepts</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
              <select
                value={filters.author}
                onChange={(e) => setFilters({ ...filters, author: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Authors</option>
                <option value="John Doe">John Doe</option>
                <option value="Jane Smith">Jane Smith</option>
                <option value="Alex Johnson">Alex Johnson</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date Modified</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="divide-y">
            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => onResultSelect?.(result)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1 text-gray-400">
                    {getTypeIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {highlightText(result.title, query)}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {result.type}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                      {highlightText(result.content, query)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{result.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(result.lastModified)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>{result.tags.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-medium text-gray-600">
                      {Math.round(result.relevanceScore * 100)}%
                    </div>
                    <div className="text-xs text-gray-400">relevance</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="p-8 text-center">
            <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">No results found for "{query}"</p>
            <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms or filters</p>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">Start typing to search your knowledge base</p>
            <p className="text-sm text-gray-400 mt-2">Search across documents, notes, canvas drawings, and more</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartSearch;
