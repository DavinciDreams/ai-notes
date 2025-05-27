import React, { useState, useRef, useEffect } from 'react';
import { useSearch } from '../hooks/useSearch';
import type { Document } from '../services/apiService';

interface SearchComponentProps {
  onDocumentSelect?: (document: Document) => void;
  placeholder?: string;
  showAdvanced?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const SearchComponent: React.FC<SearchComponentProps> = ({
  onDocumentSelect,
  placeholder = "Search documents...",
  showAdvanced = true,
  autoFocus = false,
  className = "",
}) => {
  const {
    query,
    setQuery,
    results,
    suggestions,
    stats,
    isLoading,
    error,
    search,
    clearResults,
    advancedSearch,
  } = useSearch({ autoSearch: false, debounceMs: 300 });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [advancedFilters, setAdvancedFilters] = useState({
    type: '',
    tags: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'relevance',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowSuggestions(true);
    setSelectedSuggestion(-1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestion(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestion(prev => prev > -1 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
        const selectedQuery = suggestions[selectedSuggestion];
        setQuery(selectedQuery);
        search(selectedQuery);
      } else {
        search(query);
      }
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    search(suggestion);
    setShowSuggestions(false);
  };

  const handleSearch = () => {
    if (showAdvancedForm) {
      handleAdvancedSearch();
    } else {
      search(query);
    }
    setShowSuggestions(false);
  };

  const handleAdvancedSearch = () => {
    const filters: Record<string, any> = {};
    
    if (advancedFilters.type) filters.type = advancedFilters.type;
    if (advancedFilters.tags) filters.tags = advancedFilters.tags.split(',').map(t => t.trim());
    if (advancedFilters.dateFrom) filters.dateFrom = advancedFilters.dateFrom;
    if (advancedFilters.dateTo) filters.dateTo = advancedFilters.dateTo;

    advancedSearch({
      query,
      filters,
      sortBy: advancedFilters.sortBy,
      sortOrder: advancedFilters.sortOrder,
      limit: 20,
      offset: 0,
    });
  };

  const handleDocumentClick = (document: Document) => {
    if (onDocumentSelect) {
      onDocumentSelect(document);
    }
  };

  const handleClear = () => {
    setQuery('');
    clearResults();
    setShowSuggestions(false);
    setShowAdvancedForm(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="w-full px-4 py-2 pl-10 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Action Buttons */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Clear"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {showAdvanced && (
            <button
              onClick={() => setShowAdvancedForm(!showAdvancedForm)}
              className={`p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${showAdvancedForm ? 'text-blue-500' : ''}`}
              title="Advanced Search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>
          )}
          
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isLoading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Advanced Search Form */}
      {showAdvancedForm && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Advanced Search</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Document Type
              </label>
              <select
                value={advancedFilters.type}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="note">Note</option>
                <option value="document">Document</option>
                <option value="webpage">Webpage</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={advancedFilters.tags}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={advancedFilters.sortBy}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="relevance">Relevance</option>
                <option value="createdAt">Date Created</option>
                <option value="updatedAt">Date Modified</option>
                <option value="title">Title</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={advancedFilters.dateFrom}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={advancedFilters.dateTo}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort Order
              </label>
              <select
                value={advancedFilters.sortOrder}
                onChange={(e) => setAdvancedFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-600"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedSuggestion ? 'bg-blue-50 dark:bg-blue-900' : ''
              } ${index === 0 ? 'rounded-t-lg' : ''} ${
                index === suggestions.length - 1 ? 'rounded-b-lg' : ''
              }`}
            >
              <span className="text-sm text-gray-900 dark:text-white">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {results && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Search Results
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {results.totalCount} documents found
            </span>
          </div>

          <div className="space-y-3">
            {results.documents.map((document) => (
              <div
                key={document.id}
                onClick={() => handleDocumentClick(document)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  {document.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {document.content.substring(0, 200)}
                  {document.content.length > 200 ? '...' : ''}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Type: {document.type}</span>
                  <span>Updated: {new Date(document.updatedAt).toLocaleDateString()}</span>
                </div>
                {document.tags && document.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {document.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination would go here if needed */}
        </div>
      )}

      {/* Search Stats */}
      {stats && !results && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Search Statistics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Documents:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{stats.totalDocuments}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Searches:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{stats.totalSearches}</span>
            </div>
          </div>
          {stats.popularTags.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-600 dark:text-gray-400">Popular Tags:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {stats.popularTags.slice(0, 10).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full dark:bg-gray-600 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
