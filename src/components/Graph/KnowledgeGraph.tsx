import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Search, Filter, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: 'document' | 'concept' | 'person' | 'tag' | 'project';
  size: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  weight: number;
  type: 'reference' | 'similarity' | 'collaboration' | 'tag';
}

interface KnowledgeGraphProps {
  nodes?: Node[];
  links?: Link[];
  width?: number;
  height?: number;
}

const defaultNodes: Node[] = [
  { id: '1', label: 'AI Research', type: 'project', size: 20 },
  { id: '2', label: 'Machine Learning', type: 'concept', size: 15 },
  { id: '3', label: 'Neural Networks', type: 'concept', size: 12 },
  { id: '4', label: 'Data Science', type: 'concept', size: 18 },
  { id: '5', label: 'Project Notes', type: 'document', size: 10 },
  { id: '6', label: 'Research Paper', type: 'document', size: 8 },
  { id: '7', label: 'John Doe', type: 'person', size: 14 },
  { id: '8', label: 'Deep Learning', type: 'tag', size: 16 }
];

const defaultLinks: Link[] = [
  { source: '1', target: '2', weight: 0.8, type: 'reference' },
  { source: '2', target: '3', weight: 0.9, type: 'similarity' },
  { source: '2', target: '4', weight: 0.7, type: 'similarity' },
  { source: '1', target: '5', weight: 0.6, type: 'reference' },
  { source: '5', target: '6', weight: 0.5, type: 'reference' },
  { source: '7', target: '1', weight: 0.8, type: 'collaboration' },
  { source: '8', target: '3', weight: 0.7, type: 'tag' }
];

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  nodes = defaultNodes,
  links = defaultLinks,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeType, setSelectedNodeType] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const container = svg.append('g');

    // Color scale for different node types
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['document', 'concept', 'person', 'tag', 'project'])
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']);

    // Filter nodes and links based on search and type filter
    const filteredNodes = nodes.filter(node => {
      const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedNodeType === 'all' || node.type === selectedNodeType;
      return matchesSearch && matchesType;
    });

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = links.filter(link => 
      filteredNodeIds.has(typeof link.source === 'string' ? link.source : link.source.id) &&
      filteredNodeIds.has(typeof link.target === 'string' ? link.target : link.target.id)
    );    // Create force simulation
    const simulation = d3.forceSimulation<Node>(filteredNodes)
      .force('link', d3.forceLink<Node, Link>(filteredLinks)
        .id(d => d.id)
        .distance(d => 100 / d.weight)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => (d as Node).size + 5));

    // Create links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredLinks)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight * 5));

    // Create nodes
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(filteredNodes)
      .enter().append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => colorScale(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Add labels
    const label = container.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(filteredNodes)
      .enter().append('text')
      .text(d => d.label)
      .attr('font-size', 12)
      .attr('font-family', 'Arial, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .style('pointer-events', 'none')
      .style('fill', '#333');

    // Add tooltips
    node.append('title')
      .text(d => `${d.label} (${d.type})`);    // Add hover effects
    node.on('mouseover', function(_event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', d.size * 1.2);
    })
    .on('mouseout', function(_event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', d.size);
    })
    .on('click', function(_event, d) {
      console.log('Node clicked:', d);
      // TODO: Open document or show node details
    });

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        const { transform } = event;
        container.attr('transform', transform);
        setZoomLevel(transform.k);
      });

    svg.call(zoom);

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      label
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, searchTerm, selectedNodeType, width, height]);

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.5
    );
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1 / 1.5
    );
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Controls */}
      <div className="flex items-center gap-4 p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedNodeType}
            onChange={(e) => setSelectedNodeType(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="document">Documents</option>
            <option value="concept">Concepts</option>
            <option value="person">People</option>
            <option value="tag">Tags</option>
            <option value="project">Projects</option>
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">
            Zoom: {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 p-2 text-xs bg-gray-50 border-b">
        <span className="font-medium">Node Types:</span>
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Documents</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Concepts</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>People</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Tags</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Projects</span>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-full"
          style={{ background: '#fafafa' }}
        />
      </div>
    </div>
  );
};

export default KnowledgeGraph;
