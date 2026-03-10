import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ConnectionMode,
  MarkerType,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Play, AlertTriangle, User, Calendar } from 'lucide-react';

interface TaskGraphProps {
  tasks: Array<{
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'waiting_for_dependency' | 'skipped';
    block: string;
    assignee?: string;
    due_date?: string;
  }>;
  dependencies: Array<{
    task_id: string;
    depends_on_task_id: string;
  }>;
  onTaskClick?: (taskId: string) => void;
}

const BLOCK_COLORS = {
  HR: '#3b82f6',
  IT: '#10b981',
  Facilities: '#8b5cf6',
  Finance: '#f59e0b',
  Vendor: '#f97316',
} as const;

const STATUS_COLORS = {
  pending: '#6b7280',
  in_progress: '#3b82f6',
  completed: '#10b981',
  blocked: '#ef4444',
  waiting_for_dependency: '#f59e0b',
  skipped: '#6b7280',
} as const;

const TaskNode = ({ data }: { data: any }) => {
  const { task, onClick } = data;
  const blockColor = BLOCK_COLORS[task.block as keyof typeof BLOCK_COLORS] || '#6b7280';
  const statusColor = STATUS_COLORS[task.status as keyof typeof STATUS_COLORS] || '#6b7280';

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'waiting_for_dependency':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && 
                   task.status !== 'completed' && task.status !== 'skipped';

  return (
    <div 
      className={`
        bg-white rounded-lg border-2 shadow-lg p-4 min-w-[250px] max-w-[280px] cursor-pointer
        hover:shadow-xl transition-shadow duration-200
        ${isOverdue ? 'border-red-400' : ''}
      `}
      style={{ borderColor: blockColor }}
      onClick={() => onClick?.(task.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Badge 
          variant="secondary" 
          className="text-xs text-white"
          style={{ backgroundColor: blockColor }}
        >
          {task.block}
        </Badge>
        {getStatusIcon()}
      </div>

      {/* Task Title */}
      <h3 className="font-semibold text-sm mb-2 line-clamp-2 leading-tight">
        {task.title}
      </h3>

      {/* Status Badge */}
      <div className="mb-2">
        <Badge 
          variant="outline" 
          className="text-xs capitalize"
          style={{ 
            borderColor: statusColor,
            color: statusColor 
          }}
        >
          {task.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Assignee */}
      {task.assignee && (
        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
          <User className="h-3 w-3" />
          <span className="truncate">{task.assignee}</span>
        </div>
      )}

      {/* Due Date */}
      {task.due_date && (
        <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
          <Calendar className="h-3 w-3" />
          <span>{new Date(task.due_date).toLocaleDateString()}</span>
          {isOverdue && <span className="text-red-600 font-bold">OVERDUE</span>}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  taskNode: TaskNode,
};

export function TaskGraph({ tasks, dependencies, onTaskClick }: TaskGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Generate layout positions
  const generateLayout = useCallback(() => {
    // Group tasks by block
    const tasksByBlock = tasks.reduce((acc, task) => {
      if (!acc[task.block]) acc[task.block] = [];
      acc[task.block].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);

    const blocks = Object.keys(tasksByBlock);
    const blockWidth = 320; // Width allocated for each block column
    const nodeHeight = 150; // Height allocated for each node
    const blockSpacing = 50; // Spacing between blocks
    
    const newNodes: Node[] = [];

    blocks.forEach((block, blockIndex) => {
      const blockTasks = tasksByBlock[block];
      const xPosition = blockIndex * (blockWidth + blockSpacing);

      blockTasks.forEach((task, taskIndex) => {
        const yPosition = taskIndex * (nodeHeight + 20); // 20px spacing between nodes
        
        newNodes.push({
          id: task.id,
          type: 'taskNode',
          position: { x: xPosition, y: yPosition },
          data: { 
            task,
            onClick: onTaskClick
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      });
    });

    return newNodes;
  }, [tasks, onTaskClick]);

  // Generate edges from dependencies
  const generateEdges = useCallback(() => {
    console.log('Generating edges with dependencies:', dependencies);
    console.log('Available task IDs:', tasks.map(t => t.id));
    
    return dependencies
      .filter(dep => {
        // Ensure both source and target tasks exist
        const sourceExists = tasks.some(t => t.id === dep.depends_on_task_id);
        const targetExists = tasks.some(t => t.id === dep.task_id);
        
        if (!sourceExists) {
          console.warn('Source task not found for dependency:', dep.depends_on_task_id);
        }
        if (!targetExists) {
          console.warn('Target task not found for dependency:', dep.task_id);
        }
        
        return sourceExists && targetExists;
      })
      .map((dep, index) => {
        const edge = {
          id: `edge-${dep.depends_on_task_id}-to-${dep.task_id}`,
          source: dep.depends_on_task_id,
          target: dep.task_id,
          type: 'straight',
          animated: true,
          style: {
            strokeWidth: 4,
            stroke: '#3b82f6',
            strokeDasharray: '8,4',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#3b82f6',
          },
          label: '→',
          labelStyle: {
            fontSize: '16px',
            fill: '#3b82f6',
            fontWeight: 'bold',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 1,
            rx: 4,
            ry: 4,
            stroke: '#3b82f6',
            strokeWidth: 2,
          },
        };
        console.log('Created edge:', edge);
        return edge;
      });
  }, [dependencies, tasks]);

  // Update nodes and edges when tasks or dependencies change
  useEffect(() => {
    const newNodes = generateLayout();
    const newEdges = generateEdges();
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [generateLayout, generateEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Custom minimap node color
  const getNodeColor = (node: Node) => {
    const task = node.data?.task as any;
    if (!task?.block) return '#6b7280';
    return BLOCK_COLORS[task.block as keyof typeof BLOCK_COLORS] || '#6b7280';
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No tasks to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border rounded-lg bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Strict}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        minZoom={0.3}
        maxZoom={1.5}
        attributionPosition="bottom-left"
        elementsSelectable={true}
      >
        <Controls 
          position="top-left"
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />
        <Background 
          variant={'dots' as any}
          gap={20} 
          size={1} 
          color="#e2e8f0"
        />
        <MiniMap 
          nodeColor={getNodeColor}
          position="bottom-right"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}