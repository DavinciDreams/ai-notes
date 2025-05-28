import React, { useCallback, useMemo, useState } from 'react';
import { createEditor, type Descendant, Editor, Element as SlateElement, Transforms, type BaseEditor } from 'slate';
import { Slate, Editable, withReact, useSlate, useFocused, useSelected, type ReactEditor } from 'slate-react';
import { withHistory, type HistoryEditor } from 'slate-history';
import {
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  Quote,
  Type,
  ImageIcon,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
  Download,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';

// Define custom types for our editor
interface CustomElement {
  type: string;
  align?: string;
  url?: string;
  children: CustomText[];
}

interface CustomText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
}

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

interface SlateEditorProps {
  documentId?: string;
  initialValue?: Descendant[];
  onSave?: (value: Descendant[]) => void;
  onReady?: () => void;
  placeholder?: string;
  readonly?: boolean;
  className?: string;
  userName?: string;
  userId?: string;
}

// Custom components
const Element = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };
  
  switch (element.type) {
    case 'heading-one':
      return <h1 style={style} {...attributes}>{children}</h1>;
    case 'heading-two':
      return <h2 style={style} {...attributes}>{children}</h2>;
    case 'heading-three':
      return <h3 style={style} {...attributes}>{children}</h3>;
    case 'block-quote':
      return <blockquote style={style} {...attributes}>{children}</blockquote>;
    case 'bulleted-list':
      return <ul style={style} {...attributes}>{children}</ul>;
    case 'numbered-list':
      return <ol style={style} {...attributes}>{children}</ol>;
    case 'list-item':
      return <li style={style} {...attributes}>{children}</li>;
    case 'link':
      return <LinkComponent {...attributes} element={element}>{children}</LinkComponent>;
    case 'image':
      return <ImageComponent {...attributes} element={element}>{children}</ImageComponent>;
    default:
      return <p style={style} {...attributes}>{children}</p>;
  }
};

const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

const LinkComponent = ({ attributes, children, element }: any) => {
  const selected = useSelected();
  const focused = useFocused();
  
  return (
    <a
      {...attributes}
      href={element.url}
      className={`text-blue-600 underline ${selected && focused ? 'bg-blue-100' : ''}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};

const ImageComponent = ({ attributes, children, element }: any) => {
  const selected = useSelected();
  const focused = useFocused();
  
  return (
    <div {...attributes} className="my-4">
      <div contentEditable={false} className="relative">
        <img
          src={element.url}
          alt=""
          className={`max-w-full h-auto rounded ${selected && focused ? 'ring-2 ring-blue-500' : ''}`}
        />
      </div>
      {children}
    </div>
  );
};

// Helper functions
const isBlockActive = (editor: Editor, format: string, blockType = 'type') => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n[blockType as keyof typeof n] === format,
    })
  );

  return !!match;
};

const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format as keyof typeof marks] === true : false;
};

const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
  );
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  });

  let newProperties: Partial<SlateElement>;
  if (TEXT_ALIGN_TYPES.includes(format)) {
    newProperties = {
      align: isActive ? undefined : format,
    };
  } else {
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    };
  }
  
  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

// Toolbar components
const BlockButton = ({ format, icon }: { format: string; icon: React.ReactNode }) => {
  const editor = useSlate();
  return (
    <button
      type="button"
      className={`p-2 rounded hover:bg-gray-100 ${
        isBlockActive(
          editor,
          format,
          TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
        )
          ? 'bg-gray-200'
          : ''
      }`}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      {icon}
    </button>
  );
};

const MarkButton = ({ format, icon }: { format: string; icon: React.ReactNode }) => {
  const editor = useSlate();
  return (
    <button
      type="button"
      className={`p-2 rounded hover:bg-gray-100 ${
        isMarkActive(editor, format) ? 'bg-gray-200' : ''
      }`}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      {icon}
    </button>
  );
};

// Default initial value
const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'Start writing your content here...' }],
  },
];

export const SlateEditor: React.FC<SlateEditorProps> = ({
  documentId = 'slate-doc',
  initialValue: propInitialValue,
  onSave,
  onReady,
  placeholder = 'Start writing...',
  readonly = false,  className = '',
  userName = 'Anonymous User',
  // userId = 'anonymous'
}) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>(propInitialValue || initialValue);
  const [showPreview, setShowPreview] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  // Calculate word count
  const calculateWordCount = useCallback((nodes: Descendant[]) => {
    let count = 0;
    const getText = (node: any): string => {
      if (typeof node === 'string') return node;
      if (node.text) return node.text;
      if (node.children) {
        return node.children.map(getText).join('');
      }
      return '';
    };
    
    const text = nodes.map(getText).join(' ');
    count = text.split(/\s+/).filter(word => word.length > 0).length;
    return count;
  }, []);

  // Handle value changes
  const handleChange = useCallback((newValue: Descendant[]) => {
    setValue(newValue);
    const count = calculateWordCount(newValue);
    setWordCount(count);
    
    if (onSave) {
      onSave(newValue);
    }
  }, [onSave, calculateWordCount]);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(value);
    }
    console.log('Document saved:', value);
  }, [onSave, value]);

  // Handle export
  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slate-document-${documentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [value, documentId]);

  // Handle import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        setValue(data);
      } catch (error) {
        console.error('Error importing document:', error);
      }
    };
    input.click();
  }, []);

  // Insert image
  const insertImage = useCallback((url: string) => {
    const image = { type: 'image', url, children: [{ text: '' }] };
    Transforms.insertNodes(editor, image);
  }, [editor]);

  // Insert link
  const insertLink = useCallback((url: string) => {
    if (editor.selection) {
      const link = { type: 'link', url, children: [{ text: url }] };
      Transforms.insertNodes(editor, link);
    }
  }, [editor]);

  // Render element function
  const renderElement = useCallback((props: any) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);

  // Effect for onReady
  React.useEffect(() => {
    if (onReady) {
      onReady();
    }
  }, [onReady]);

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Slate Editor</span>
          <span className="text-sm text-gray-500">• {userName}</span>
        </div>

        <div className="flex items-center space-x-2">
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
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      <Slate editor={editor} initialValue={value} onChange={handleChange}>
        {/* Toolbar */}
        {!readonly && (
          <div className="flex items-center space-x-1 p-4 bg-gray-50 border-b border-gray-200 flex-wrap gap-2">
            {/* Text formatting */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
              <MarkButton format="bold" icon={<Bold className="w-4 h-4" />} />
              <MarkButton format="italic" icon={<Italic className="w-4 h-4" />} />
              <MarkButton format="underline" icon={<Underline className="w-4 h-4" />} />
              <MarkButton format="code" icon={<Code className="w-4 h-4" />} />
            </div>

            {/* Block types */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
              <BlockButton format="heading-one" icon={<Type className="w-4 h-4" />} />
              <BlockButton format="heading-two" icon={<Type className="w-4 h-4" />} />
              <BlockButton format="block-quote" icon={<Quote className="w-4 h-4" />} />
            </div>

            {/* Lists */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
              <BlockButton format="numbered-list" icon={<ListOrdered className="w-4 h-4" />} />
              <BlockButton format="bulleted-list" icon={<List className="w-4 h-4" />} />
            </div>

            {/* Alignment */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-2">
              <BlockButton format="left" icon={<AlignLeft className="w-4 h-4" />} />
              <BlockButton format="center" icon={<AlignCenter className="w-4 h-4" />} />
              <BlockButton format="right" icon={<AlignRight className="w-4 h-4" />} />
            </div>

            {/* Media */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                className="p-2 rounded hover:bg-gray-100"
                onClick={() => {
                  const url = window.prompt('Enter image URL:');
                  if (url) insertImage(url);
                }}
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 rounded hover:bg-gray-100"
                onClick={() => {
                  const url = window.prompt('Enter link URL:');
                  if (url) insertLink(url);
                }}
              >
                <Link className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <Editable
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              placeholder={placeholder}
              readOnly={readonly}
              className="outline-none min-h-96"
              style={{ minHeight: '400px' }}
            />
          </div>
        </div>
      </Slate>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
        <div>
          {wordCount} words
        </div>
        <div>
          Rich text editor powered by Slate.js
        </div>
      </div>
    </div>
  );
};

export default SlateEditor;
