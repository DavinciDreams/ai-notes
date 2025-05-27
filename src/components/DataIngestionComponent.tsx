import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Play, Pause, RotateCcw } from 'lucide-react';
import { apiService, type IngestionJob, type IngestionOptions } from '../services/apiService';

interface DataIngestionComponentProps {
  onDocumentCreated?: (documentId: number) => void;
  className?: string;
}

export const DataIngestionComponent: React.FC<DataIngestionComponentProps> = ({
  onDocumentCreated,
  className = ""
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [options, setOptions] = useState<IngestionOptions>({
    isPublic: false,
    extractKeywords: true,
    generateTitle: true,
    extractEntities: false,
    buildKnowledgeGraph: false,
    chunkSize: 1000,
    overlapSize: 200,
    enableOCR: false,
    language: 'en',
    tags: []
  });
  const [textContent, setTextContent] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Poll for job updates
  useEffect(() => {
    if (isPolling && jobs.some(job => job.status === 'processing' || job.status === 'pending')) {
      pollingInterval.current = setInterval(updateJobStatuses, 2000);
    } else {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [isPolling, jobs]);

  const updateJobStatuses = async () => {
    try {
      const activeJobs = jobs.filter(job => 
        job.status === 'processing' || job.status === 'pending'
      );

      for (const job of activeJobs) {
        const response = await apiService.getIngestionJobStatus(job.id);
        if (response.data) {
          updateJobStatus(job.id, response.data);
        }
      }
    } catch (error) {
      console.error('Failed to update job statuses:', error);
    }
  };

  const updateJobStatus = (jobId: string, updatedJob: IngestionJob) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updatedJob } : job
    ));

    // Notify when document is created
    if (updatedJob.status === 'completed' && updatedJob.result?.documentId) {
      onDocumentCreated?.(updatedJob.result.documentId);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      await uploadFiles(files);
    }
  }, [options]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsPolling(true);
    
    try {      if (files.length === 1) {
        // Single file upload
        const response = await apiService.uploadFileForIngestion(files[0], options);
        if (response.data) {
          const newJob: IngestionJob = {
            id: response.data.jobId,
            fileName: response.data.fileName || files[0].name,
            fileSize: response.data.fileSize || files[0].size,
            status: (response.data.status as 'pending' | 'processing' | 'completed' | 'failed') || 'pending',
            progress: 0,
            createdAt: new Date().toISOString()
          };
          setJobs(prev => [newJob, ...prev]);
        }      } else {
        // Batch upload
        const response = await apiService.uploadFilesForIngestion(files, options);
        if (response.data?.jobs) {
          const newJobs = response.data.jobs.map((job: any) => ({
            id: job.jobId,
            fileName: job.fileName,
            fileSize: job.fileSize,
            status: 'pending' as const,
            progress: 0,
            createdAt: new Date().toISOString()
          }));
          setJobs(prev => [...newJobs, ...prev]);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) return;

    setIsPolling(true);
    try {
      const response = await apiService.ingestTextContent(textContent, options);
      if (response.data) {
        const newJob: IngestionJob = {
          id: response.data.jobId,
          fileName: 'Text Content',
          fileSize: new Blob([textContent]).size,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString()
        };
        setJobs(prev => [newJob, ...prev]);
        setTextContent('');
        setShowTextInput(false);
      }
    } catch (error) {
      console.error('Text ingestion failed:', error);
    }
  };

  const cancelJob = async (jobId: string) => {
    try {
      await apiService.cancelIngestionJob(jobId);
      setJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const retryJob = async (job: IngestionJob) => {
    // For retry, we'd need to re-upload the file
    // This is a simplified implementation
    setJobs(prev => prev.map(j => 
      j.id === job.id 
        ? { ...j, status: 'pending', progress: 0, error: undefined }
        : j
    ));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Play className="w-4 h-4" />;
      case 'processing': return <Pause className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload Documents for Processing
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or click to select files
        </p>
        
        <div className="flex justify-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Choose Files
          </button>
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Add Text
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept=".txt,.md,.html,.json,.pdf,.docx,.xlsx,.jpg,.jpeg,.png,.gif"
        />
      </div>

      {/* Text Input */}
      {showTextInput && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Add Text Content</h4>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Paste or type your content here..."
            className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setShowTextInput(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleTextSubmit}
              disabled={!textContent.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Process Text
            </button>
          </div>
        </div>
      )}

      {/* Ingestion Options */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Processing Options</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.extractKeywords}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                extractKeywords: e.target.checked
              }))}
              className="rounded"
            />
            <span className="text-sm">Extract Keywords</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.generateTitle}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                generateTitle: e.target.checked
              }))}
              className="rounded"
            />
            <span className="text-sm">Generate Title</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.extractEntities}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                extractEntities: e.target.checked
              }))}
              className="rounded"
            />
            <span className="text-sm">Extract Entities</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.buildKnowledgeGraph}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                buildKnowledgeGraph: e.target.checked
              }))}
              className="rounded"
            />
            <span className="text-sm">Build Knowledge Graph</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.enableOCR}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                enableOCR: e.target.checked
              }))}
              className="rounded"
            />
            <span className="text-sm">Enable OCR</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.isPublic}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                isPublic: e.target.checked
              }))}
              className="rounded"
            />
            <span className="text-sm">Make Public</span>
          </label>
        </div>
      </div>

      {/* Job List */}
      {jobs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h4 className="font-medium text-gray-900">Processing Queue</h4>
          </div>
          
          <div className="divide-y max-h-96 overflow-y-auto">
            {jobs.map((job) => (
              <div key={job.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium text-gray-900">{job.fileName}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(job.fileSize || 0)} • {formatDuration(job.createdAt, job.completedAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    
                    {(job.status === 'pending' || job.status === 'processing') && (
                      <button
                        onClick={() => cancelJob(job.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    
                    {job.status === 'failed' && (
                      <button
                        onClick={() => retryJob(job)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {(job.status === 'processing' && job.progress > 0) && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                )}
                
                {job.error && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {job.error}
                  </p>
                )}
                
                {job.result && job.status === 'completed' && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    <p>✓ Document created: {job.result.title}</p>
                    {job.result.keywords && job.result.keywords.length > 0 && (
                      <p>Keywords: {job.result.keywords.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataIngestionComponent;
