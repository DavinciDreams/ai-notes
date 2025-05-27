import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pen, Eraser, Square, Circle, Type, Move, Undo, Redo, Download, Upload, Palette } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  points: Point[];
  color: string;
  width: number;
  tool: string;
}

interface CanvasToolbarProps {
  onToolChange: (tool: string) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  activeTool: string;
  currentColor: string;
  brushSize: number;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onClear,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  activeTool,
  currentColor,
  brushSize
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const tools = [
    { id: 'select', icon: Move, label: 'Select' },
    { id: 'pen', icon: Pen, label: 'Pen' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
  ];

  const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];

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

      <div className="flex items-center gap-2 mr-4">
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-2 p-2 bg-white rounded-lg border hover:bg-gray-50"
            title="Color"
          >
            <Palette className="w-4 h-4" />
            <div 
              className="w-4 h-4 rounded border"
              style={{ backgroundColor: currentColor }}
            />
          </button>
          
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border z-10">
              <div className="grid grid-cols-4 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onColorChange(color);
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-full mt-2 h-8 rounded border"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
            className="w-16"
          />
          <span className="text-sm text-gray-600 w-6">{brushSize}</span>
        </div>
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

interface SimpleDrawingCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  onSave?: (canvasData: string) => void;
}

export const SimpleDrawingCanvas: React.FC<SimpleDrawingCanvasProps> = ({
  width = 800,
  height = 600,
  className = '',
  onSave
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [history, setHistory] = useState<DrawingPath[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);

  const saveState = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...paths]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, paths]);

  const redrawCanvas = useCallback((pathsToRender: DrawingPath[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    pathsToRender.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
    });

    ctx.globalCompositeOperation = 'source-over';
  }, []);

  useEffect(() => {
    redrawCanvas(paths);
  }, [paths, redrawCanvas]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'pen' && activeTool !== 'eraser') return;

    setIsDrawing(true);
    const point = getMousePos(e);
    
    const newPath: DrawingPath = {
      points: [point],
      color: currentColor,
      width: brushSize,
      tool: activeTool,
    };
    
    setCurrentPath(newPath);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath || (activeTool !== 'pen' && activeTool !== 'eraser')) return;

    const point = getMousePos(e);
    const updatedPath = {
      ...currentPath,
      points: [...currentPath.points, point],
    };
    
    setCurrentPath(updatedPath);
    redrawCanvas([...paths, updatedPath]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentPath) return;

    setIsDrawing(false);
    setPaths(prev => [...prev, currentPath]);
    setCurrentPath(null);
    saveState();
  };

  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
  };

  const clearCanvas = () => {
    setPaths([]);
    saveState();
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setPaths(history[prevIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setPaths(history[nextIndex]);
    }
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasData = {
      paths,
      width: canvas.width,
      height: canvas.height,
      timestamp: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(canvasData);
    onSave?.(dataStr);

    // Also trigger download
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadCanvas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const canvasData = JSON.parse(e.target?.result as string);
        if (canvasData.paths) {
          setPaths(canvasData.paths);
          saveState();
        }
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
        currentColor={currentColor}
        brushSize={brushSize}
        onToolChange={handleToolChange}
        onColorChange={setCurrentColor}
        onBrushSizeChange={setBrushSize}
        onClear={clearCanvas}
        onUndo={undo}
        onRedo={redo}
        onSave={saveCanvas}
        onLoad={loadCanvas}
      />
      
      <div className="flex-1 overflow-auto bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border-none cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
};

export default SimpleDrawingCanvas;
