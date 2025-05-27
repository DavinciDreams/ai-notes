import React, { useRef, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { Pen, Eraser, Square, Circle, Type, Move, Undo, Redo, Download, Upload } from 'lucide-react';

interface CanvasToolbarProps {
  onToolChange: (tool: string) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  activeTool: string;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onToolChange,
  onClear,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  activeTool
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'select', icon: Move, label: 'Select' },
    { id: 'pen', icon: Pen, label: 'Pen' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
  ];

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 border-b">
      <div className="flex items-center gap-1 mr-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === tool.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-700'
              }`}
              title={tool.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 mr-4">
        <button
          onClick={onUndo}
          className="p-2 rounded-lg bg-white hover:bg-gray-100 text-gray-700 transition-colors"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          className="p-2 rounded-lg bg-white hover:bg-gray-100 text-gray-700 transition-colors"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Save
        </button>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          Load
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onLoad}
          className="hidden"
        />

        <button
          onClick={onClear}
          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors ml-2"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

interface DrawingCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  onSave?: (canvasData: string) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width = 800,
  height = 600,
  className = '',
  onSave
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: 'white',
    });

    setCanvas(fabricCanvas);
    saveState(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (!canvas) return;

    const handlePathCreated = () => {
      if (isDrawing) {
        saveState(canvas);
      }
    };

    const handleObjectAdded = () => {
      if (!isDrawing) {
        saveState(canvas);
      }
    };

    canvas.on('path:created', handlePathCreated);
    canvas.on('object:added', handleObjectAdded);

    return () => {
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:added', handleObjectAdded);
    };
  }, [canvas, isDrawing]);

  const saveState = (fabricCanvas: fabric.Canvas) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.stringify(fabricCanvas.toJSON()));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      canvas?.loadFromJSON(history[prevIndex], canvas.renderAll.bind(canvas));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      canvas?.loadFromJSON(history[nextIndex], canvas.renderAll.bind(canvas));
    }
  };

  const handleToolChange = (tool: string) => {
    if (!canvas) return;

    setActiveTool(tool);
    setIsDrawing(false);

    // Reset canvas mode
    canvas.isDrawingMode = false;
    canvas.selection = true;

    switch (tool) {
      case 'select':
        canvas.defaultCursor = 'default';
        break;
        case 'pen':
        canvas.isDrawingMode = true;
        const penBrush = canvas.freeDrawingBrush;
        if (penBrush) {
          penBrush.width = 2;
          penBrush.color = '#000000';
        }
        setIsDrawing(true);
        break;
      
      case 'eraser':
        canvas.isDrawingMode = true;
        const eraserBrush = canvas.freeDrawingBrush;
        if (eraserBrush) {
          eraserBrush.width = 10;
          eraserBrush.color = 'white';
        }
        setIsDrawing(true);
        break;
      
      case 'rectangle':
        canvas.defaultCursor = 'crosshair';
        addRectangle();
        break;
      
      case 'circle':
        canvas.defaultCursor = 'crosshair';
        addCircle();
        break;
      
      case 'text':
        canvas.defaultCursor = 'text';
        addText();
        break;
    }
  };

  const addRectangle = () => {
    if (!canvas) return;
    
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 80,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    
    canvas.add(rect);
    canvas.setActiveObject(rect);
  };

  const addCircle = () => {
    if (!canvas) return;
    
    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
    });
    
    canvas.add(circle);
    canvas.setActiveObject(circle);
  };

  const addText = () => {
    if (!canvas) return;
    
    const text = new fabric.IText('Click to edit text', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 16,
      fill: '#000000',
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
  };

  const clearCanvas = () => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = 'white';
    canvas.renderAll();
    saveState(canvas);
  };

  const saveCanvas = () => {
    if (!canvas) return;
    
    const canvasData = JSON.stringify(canvas.toJSON());
    onSave?.(canvasData);
    
    // Also trigger download
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(canvasData);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "canvas.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const loadCanvas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const canvasData = e.target?.result as string;
        canvas.loadFromJSON(canvasData, () => {
          canvas.renderAll();
          saveState(canvas);
        });
      } catch (error) {
        console.error('Failed to load canvas:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`flex flex-col bg-white rounded-lg border shadow-sm ${className}`}>
      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onClear={clearCanvas}
        onUndo={undo}
        onRedo={redo}
        onSave={saveCanvas}
        onLoad={loadCanvas}
      />
      
      <div className="flex-1 overflow-auto">
        <canvas
          ref={canvasRef}
          className="border-none"
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;
