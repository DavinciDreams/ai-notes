import React, { useState, useCallback, useRef } from 'react';
import { 
  DndContext, 
  type DragEndEvent, 
  DragOverlay, 
  type DragStartEvent, 
  PointerSensor, 
  useSensor, 
  useSensors,
  closestCenter,
  KeyboardSensor
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import {
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDropzone } from 'react-dropzone';
import {
  GripVertical,
  FileText,
  ImageIcon,
  Video,
  Music,
  Code2,
  Quote,
  List,
  Table,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Save,
  Download,
  Upload
} from 'lucide-react';

// Block types
interface BlockData {
  id: string;
  type: 'text' | 'heading' | 'image' | 'video' | 'audio' | 'code' | 'quote' | 'list' | 'table';
  content: any;
  metadata?: {
    created: Date;
    modified: Date;
    author?: string;
  };
}

interface DragDropEditorProps {
  documentId?: string;
  initialBlocks?: BlockData[];
  onSave?: (blocks: BlockData[]) => void;
  onReady?: () => void;
  readonly?: boolean;
  className?: string;
  userName?: string;
  enableFileUpload?: boolean;
}

// Sortable Block Component
const SortableBlock: React.FC<{
  block: BlockData;
  onEdit: (id: string, content: any) => void;
  onDelete: (id: string) => void;
  readonly?: boolean;
}> = ({ block, onEdit, onDelete, readonly = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleContentChange = useCallback((newContent: any) => {
    onEdit(block.id, newContent);
  }, [block.id, onEdit]);

  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        return (
          <textarea
            value={block.content.text || ''}
            onChange={(e) => handleContentChange({ text: e.target.value })}
            placeholder="Enter text..."
            className="w-full p-3 border border-gray-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            readOnly={readonly}
          />
        );

      case 'heading':
        return (
          <div className="flex items-center space-x-2">
            <select
              value={block.content.level || 1}
              onChange={(e) => handleContentChange({ 
                ...block.content, 
                level: parseInt(e.target.value) 
              })}
              className="p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readonly}
            >
              {[1, 2, 3, 4, 5, 6].map(level => (
                <option key={level} value={level}>H{level}</option>
              ))}
            </select>
            <input
              type="text"
              value={block.content.text || ''}
              onChange={(e) => handleContentChange({ 
                ...block.content, 
                text: e.target.value 
              })}
              placeholder="Enter heading..."
              className="flex-1 p-3 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly={readonly}
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            {block.content.url ? (
              <img 
                src={block.content.url} 
                alt={block.content.alt || ''} 
                className="max-w-full h-auto rounded border"
              />
            ) : (
              <div className="p-8 border-2 border-dashed border-gray-300 rounded text-center text-gray-500">
                <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                <p>No image selected</p>
              </div>
            )}
            {!readonly && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={block.content.url || ''}
                  onChange={(e) => handleContentChange({ 
                    ...block.content, 
                    url: e.target.value 
                  })}
                  placeholder="Image URL..."
                  className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={block.content.alt || ''}
                  onChange={(e) => handleContentChange({ 
                    ...block.content, 
                    alt: e.target.value 
                  })}
                  placeholder="Alt text..."
                  className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-3">
            {block.content.url ? (
              <video 
                src={block.content.url} 
                controls 
                className="w-full rounded border"
              />
            ) : (
              <div className="p-8 border-2 border-dashed border-gray-300 rounded text-center text-gray-500">
                <Video className="w-8 h-8 mx-auto mb-2" />
                <p>No video selected</p>
              </div>
            )}
            {!readonly && (
              <input
                type="url"
                value={block.content.url || ''}
                onChange={(e) => handleContentChange({ 
                  ...block.content, 
                  url: e.target.value 
                })}
                placeholder="Video URL..."
                className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        );

      case 'code':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Language:</label>
              <input
                type="text"
                value={block.content.language || ''}
                onChange={(e) => handleContentChange({ 
                  ...block.content, 
                  language: e.target.value 
                })}
                placeholder="e.g., javascript"
                className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                readOnly={readonly}
              />
            </div>
            <textarea
              value={block.content.code || ''}
              onChange={(e) => handleContentChange({ 
                ...block.content, 
                code: e.target.value 
              })}
              placeholder="Enter code..."
              className="w-full p-3 border border-gray-200 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              rows={6}
              readOnly={readonly}
            />
          </div>
        );

      case 'quote':
        return (
          <div className="space-y-2">
            <textarea
              value={block.content.text || ''}
              onChange={(e) => handleContentChange({ 
                ...block.content, 
                text: e.target.value 
              })}
              placeholder="Enter quote..."
              className="w-full p-3 border border-gray-200 rounded italic resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              readOnly={readonly}
            />
            <input
              type="text"
              value={block.content.author || ''}
              onChange={(e) => handleContentChange({ 
                ...block.content, 
                author: e.target.value 
              })}
              placeholder="Quote author..."
              className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly={readonly}
            />
          </div>
        );

      case 'list':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name={`list-type-${block.id}`}
                  checked={block.content.type === 'unordered'}
                  onChange={() => handleContentChange({ 
                    ...block.content, 
                    type: 'unordered' 
                  })}
                  className="mr-2"
                  disabled={readonly}
                />
                Unordered
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name={`list-type-${block.id}`}
                  checked={block.content.type === 'ordered'}
                  onChange={() => handleContentChange({ 
                    ...block.content, 
                    type: 'ordered' 
                  })}
                  className="mr-2"
                  disabled={readonly}
                />
                Ordered
              </label>
            </div>
            <textarea
              value={block.content.items?.join('\n') || ''}
              onChange={(e) => handleContentChange({ 
                ...block.content, 
                items: e.target.value.split('\n').filter(item => item.trim()) 
              })}
              placeholder="Enter list items (one per line)..."
              className="w-full p-3 border border-gray-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              readOnly={readonly}
            />
          </div>
        );

      default:
        return (
          <div className="p-4 border border-gray-200 rounded bg-gray-50 text-gray-500">
            Unknown block type: {block.type}
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white border border-gray-200 rounded-lg p-4 ${
        isDragging ? 'opacity-50' : ''
      } ${isDragging ? 'shadow-lg' : 'hover:shadow-md'} transition-shadow`}
    >
      {/* Block Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-move p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm font-medium text-gray-700 capitalize">{block.type}</span>
        </div>
        
        {!readonly && (
          <button
            onClick={() => onDelete(block.id)}
            className="p-1 rounded hover:bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Block Content */}
      {renderBlockContent()}
    </div>
  );
};

// Block Type Selector
const BlockTypeSelector: React.FC<{
  onSelect: (type: BlockData['type']) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
  const blockTypes = [
    { type: 'text' as const, icon: <FileText className="w-5 h-5" />, label: 'Text' },
    { type: 'heading' as const, icon: <FileText className="w-5 h-5" />, label: 'Heading' },
    { type: 'image' as const, icon: <ImageIcon className="w-5 h-5" />, label: 'Image' },
    { type: 'video' as const, icon: <Video className="w-5 h-5" />, label: 'Video' },
    { type: 'audio' as const, icon: <Music className="w-5 h-5" />, label: 'Audio' },
    { type: 'code' as const, icon: <Code2 className="w-5 h-5" />, label: 'Code' },
    { type: 'quote' as const, icon: <Quote className="w-5 h-5" />, label: 'Quote' },
    { type: 'list' as const, icon: <List className="w-5 h-5" />, label: 'List' },
    { type: 'table' as const, icon: <Table className="w-5 h-5" />, label: 'Table' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Select Block Type</h3>
        <div className="grid grid-cols-3 gap-3">
          {blockTypes.map((blockType) => (
            <button
              key={blockType.type}
              onClick={() => {
                onSelect(blockType.type);
                onClose();
              }}
              className="flex flex-col items-center p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              {blockType.icon}
              <span className="text-sm mt-2">{blockType.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export const DragDropEditor: React.FC<DragDropEditorProps> = ({
  documentId = 'dnd-doc',
  initialBlocks = [],
  onSave,
  onReady,
  readonly = false,
  className = '',
  userName = 'Anonymous User',
  enableFileUpload = true
}) => {
  const [blocks, setBlocks] = useState<BlockData[]>(initialBlocks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // File upload with dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const newBlock: BlockData = {
            id: `block-${Date.now()}-${Math.random()}`,
            type: file.type.startsWith('image/') ? 'image' : 
                  file.type.startsWith('video/') ? 'video' : 
                  file.type.startsWith('audio/') ? 'audio' : 'text',
            content: {
              url: reader.result as string,
              name: file.name,
              size: file.size,
              type: file.type
            },
            metadata: {
              created: new Date(),
              modified: new Date(),
              author: userName
            }
          };
          setBlocks(prev => [...prev, newBlock]);
        };
        reader.readAsDataURL(file);
      });
    }, [userName]),
    disabled: readonly || !enableFileUpload
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const addBlock = useCallback((type: BlockData['type']) => {
    const newBlock: BlockData = {
      id: `block-${Date.now()}-${Math.random()}`,
      type,
      content: {},
      metadata: {
        created: new Date(),
        modified: new Date(),
        author: userName
      }
    };
    setBlocks(prev => [...prev, newBlock]);
  }, [userName]);  const editBlock = useCallback((id: string, content: any) => {
    setBlocks(prev => prev.map(block => 
      block.id === id 
        ? { 
            ...block, 
            content, 
            metadata: { 
              created: block.metadata?.created || new Date(),
              author: block.metadata?.author || userName,
              modified: new Date()
            } 
          }
        : block
    ));
  }, [userName]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(block => block.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(blocks);
    }
    console.log('Document saved:', blocks);
  }, [onSave, blocks]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(blocks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd-document-${documentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [blocks, documentId]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        setBlocks(data);
      } catch (error) {
        console.error('Error importing file:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  React.useEffect(() => {
    if (onReady) {
      onReady();
    }
  }, [onReady]);

  const activeBlock = blocks.find(block => block.id === activeId);

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Drag & Drop Editor</h2>
          <span className="text-sm text-gray-500">• {userName}</span>
        </div>

        <div className="flex items-center space-x-2">
          {!readonly && (
            <button
              onClick={() => setShowBlockSelector(true)}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Block</span>
            </button>
          )}

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showPreview ? 'Edit' : 'Preview'}</span>
          </button>

          <button
            onClick={handleImport}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div
          {...getRootProps()}
          className={`p-6 ${isDragActive ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''}`}
        >
          <input {...getInputProps()} />
          
          {blocks.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <FileText className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No blocks yet</h3>
              <p className="text-gray-500 mb-4">
                Add your first block to start creating content
              </p>
              {!readonly && (
                <button
                  onClick={() => setShowBlockSelector(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Add Your First Block
                </button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      onEdit={editBlock}
                      onDelete={deleteBlock}
                      readonly={readonly}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeBlock ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {activeBlock.type}
                      </span>
                    </div>
                    <div className="opacity-75">
                      Dragging {activeBlock.type} block...
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {isDragActive && (
            <div className="text-center py-8 text-blue-600">
              <Upload className="w-8 h-8 mx-auto mb-2" />
              <p>Drop files here to add them as blocks</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-white border-t border-gray-200 text-sm text-gray-500">
        <div className="flex items-center justify-between">
          <div>
            {blocks.length} blocks
          </div>
          <div>
            Drag & Drop Block Editor with Multimedia Support
          </div>
        </div>
      </div>

      {/* Block Type Selector Modal */}
      {showBlockSelector && (
        <BlockTypeSelector
          onSelect={addBlock}
          onClose={() => setShowBlockSelector(false)}
        />
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />
    </div>
  );
};

export default DragDropEditor;
