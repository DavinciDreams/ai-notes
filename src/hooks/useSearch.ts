import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/apiService';
import type { SearchResult, SearchStats } from '../services/apiService';

interface UseSearchOptions {
  limit?: number;
  autoSearch?: boolean;
  debounceMs?: number;
}

interface UseSearchReturn {
  // State
  query: string;
  results: SearchResult | null;
  suggestions: string[];
  stats: SearchStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setQuery: (query: string) => void;
  search: (searchQuery?: string) => Promise<void>;
  getSuggestions: (searchQuery?: string) => Promise<void>;
  getStats: () => Promise<void>;
  clearResults: () => void;
  advancedSearch: (params: {
    query: string;
    filters: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) => Promise<void>;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const { limit = 20, autoSearch = false, debounceMs = 300 } = options;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const search = useCallback(async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (!queryToSearch.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.search({
        query: queryToSearch,
        limit,
        offset: 0,
      });

      if (response.success && response.data) {
        setResults(response.data);
      } else {
        setError(response.error || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [query, limit]);

  const getSuggestions = useCallback(async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (!queryToSearch.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await apiService.getSearchSuggestions(queryToSearch);
      if (response.success && response.data) {
        setSuggestions(response.data);
      }
    } catch (err) {
      console.error('Failed to get suggestions:', err);
    }
  }, [query]);

  const getStats = useCallback(async () => {
    try {
      const response = await apiService.getSearchStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to get search stats:', err);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setSuggestions([]);
    setError(null);
    setQuery('');
  }, []);

  const advancedSearch = useCallback(async (params: {
    query: string;
    filters: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.advancedSearch(params);
      
      if (response.success && response.data) {
        setResults(response.data);
      } else {
        setError(response.error || 'Advanced search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Advanced search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle query changes with debouncing
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for auto-search
    if (autoSearch && newQuery.trim()) {
      const timer = setTimeout(() => {
        search(newQuery);
      }, debounceMs);
      setDebounceTimer(timer);
    }

    // Get suggestions immediately (they're less expensive)
    if (newQuery.trim()) {
      getSuggestions(newQuery);
    } else {
      setSuggestions([]);
    }
  }, [autoSearch, debounceMs, search, getSuggestions, debounceTimer]);

  // Load stats on mount
  useEffect(() => {
    getStats();
  }, [getStats]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    // State
    query,
    results,
    suggestions,
    stats,
    isLoading,
    error,
    
    // Actions
    setQuery: handleQueryChange,
    search,
    getSuggestions,
    getStats,
    clearResults,
    advancedSearch,
  };
}
