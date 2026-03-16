import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { templateStore } from "../store/templateStore";
import type { AnyNodeData, TestTemplate } from "../types";
import { StartNode, EndNode, TaskNode, WaitForNode, IfElseNode, NotificationNode } from "../components/nodes";
import { NodeToolbar } from "../components/NodeToolbar";
import { NodeConfigPanel } from "../components/NodeConfigPanel";
import { TestToastContainer } from "../components/TestToast";
import { CanvasTopBar } from "../components/CanvasTopBar";
import { ConnectMenu } from "../components/ConnectMenu";
import { useCanvasHistory } from "../hooks/useCanvasHistory";
import { useEdgeCutting } from "../hooks/useEdgeCutting";
import { useConnectionMenu } from "../hooks/useConnectionMenu";
import { useNodeTestActions } from "../hooks/useNodeTestActions";
import {
  createDefaultNodes,
  defaultData,
  makeEdge,
  resolveOverlaps,
  getEdgeEndpoints,
  pointToEdgeDist,
  isTestNodeType,
  INSERTABLE_NODE_TYPES,
  NODE_WIDTH,
  NODE_HEIGHT,
} from "../utils/canvasUtils";

const nodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  taskNode: TaskNode,
  waitForNode: WaitForNode,
  ifElseNode: IfElseNode,
  notificationNode: NotificationNode,
};

/** Threshold (flow units) within which a node handle snaps a dragged node to an edge. */
const SNAP_DIST = 55;

function CanvasEditorInner(): JSX.Element {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { setCenter, screenToFlowPosition } = useReactFlow();

  const existing = templateId ? templateStore.getById(templateId) : null;
  const isNew = !existing;
  const [templateName, setTemplateName] = useState(existing?.name ?? "Untitled Template");
  // New templates start dirty so the Save button is enabled immediately.
  const [hasChanges, setHasChanges] = useState(isNew);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(existing?.nodes ?? createDefaultNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(existing?.edges ?? []);

  const { nodesRef, edgesRef, markDirty, undo, redo } = useCanvasHistory(
    nodes, edges, setNodes, setEdges, setHasChanges,
  );

  const { cutScreenLine } = useEdgeCutting({
    wrapperRef: reactFlowWrapper,
    screenToFlowPosition,
    nodesRef,
    edgesRef,
    setEdges,
    markDirty,
  });

  const {
    connectMenu,
    closeMenu,
    menuJustOpenedRef,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onReconnect,
    onReconnectStart,
    onReconnectEnd,
    handleConnectMenuSelect,
    openQuickAdd,
  } = useConnectionMenu({ wrapperRef: reactFlowWrapper, screenToFlowPosition, setNodes, setEdges, markDirty });

  const { toasts, dismissToast, handleTestAction } = useNodeTestActions({
    edgesRef,
    selectedNodeId: selectedNode?.id ?? null,
  });

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((mod && e.key === "z" && e.shiftKey) || (mod && e.key === "y")) { e.preventDefault(); redo(); }
      else if (e.shiftKey && e.key === "A") { e.preventDefault(); openQuickAdd(); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, openQuickAdd]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    if (!menuJustOpenedRef.current) closeMenu();
  }, [closeMenu, menuJustOpenedRef]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    closeMenu();
  }, [closeMenu]);

  const updateNodeData = useCallback(
    (id: string, data: AnyNodeData) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data } : n)));
      markDirty();
    },
    [setNodes, markDirty],
  );

  const deleteNode = useCallback(
    (id: string) => {
      const incoming = edgesRef.current.filter((e) => e.target === id);
      const outgoing = edgesRef.current.filter((e) => e.source === id);
      const bridges: Edge[] = incoming.flatMap((ie) =>
        outgoing.map((oe) =>
          makeEdge(`e-${ie.source}-${oe.target}-${Date.now()}`, ie.source, oe.target, {
            sourceHandle: ie.sourceHandle,
            targetHandle: oe.targetHandle,
          }),
        ),
      );
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => [...eds.filter((e) => e.source !== id && e.target !== id), ...bridges]);
      setSelectedNode(null);
      markDirty();
    },
    [edgesRef, setNodes, setEdges, markDirty],
  );

  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedIds = new Set(deletedNodes.map((n) => n.id));
      const bridges: Edge[] = deletedNodes
        .filter((n) => n.type !== "startNode" && n.type !== "endNode")
        .flatMap((node) => {
          const incoming = edgesRef.current.filter((e) => e.target === node.id && !deletedIds.has(e.source));
          const outgoing = edgesRef.current.filter((e) => e.source === node.id && !deletedIds.has(e.target));
          return incoming.flatMap((ie) =>
            outgoing.map((oe) =>
              makeEdge(
                `e-${ie.source}-${oe.target}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                ie.source, oe.target,
                { sourceHandle: ie.sourceHandle, targetHandle: oe.targetHandle },
              ),
            ),
          );
        });
      if (bridges.length > 0) setEdges((eds) => [...eds, ...bridges]);
      markDirty();
    },
    [edgesRef, setEdges, markDirty],
  );

  // ----- Drag existing node onto a handle to auto-connect -----
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      const dw = draggedNode.measured?.width ?? NODE_WIDTH;
      const dh = draggedNode.measured?.height ?? NODE_HEIGHT;

      // Right-side (source) handle position of the dragged node
      const draggedRight = { x: draggedNode.position.x + dw, y: draggedNode.position.y + dh / 2 };
      // Left-side (target) handle position of the dragged node
      const draggedLeft = { x: draggedNode.position.x, y: draggedNode.position.y + dh / 2 };

      for (const node of nodesRef.current) {
        if (node.id === draggedNode.id) continue;
        const nw = node.measured?.width ?? NODE_WIDTH;
        const nh = node.measured?.height ?? NODE_HEIGHT;

        const nodeRight = { x: node.position.x + nw, y: node.position.y + nh / 2 };
        const nodeLeft = { x: node.position.x, y: node.position.y + nh / 2 };

        const dx1 = draggedLeft.x - nodeRight.x;
        const dy1 = draggedLeft.y - nodeRight.y;
        const distLeft = Math.sqrt(dx1 * dx1 + dy1 * dy1);

        if (distLeft < SNAP_DIST) {
          const alreadyLinked = edgesRef.current.some(
            (e) => e.source === node.id && e.target === draggedNode.id,
          );
          if (!alreadyLinked) {
            setEdges((eds) => [
              ...eds,
              makeEdge(`e-${node.id}-${draggedNode.id}-snap-${Date.now()}`, node.id, draggedNode.id),
            ]);
            markDirty();
          }
          break;
        }

        const dx2 = draggedRight.x - nodeLeft.x;
        const dy2 = draggedRight.y - nodeLeft.y;
        const distRight = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (distRight < SNAP_DIST) {
          const alreadyLinked = edgesRef.current.some(
            (e) => e.source === draggedNode.id && e.target === node.id,
          );
          if (!alreadyLinked) {
            setEdges((eds) => [
              ...eds,
              makeEdge(`e-${draggedNode.id}-${node.id}-snap-${Date.now()}`, draggedNode.id, node.id),
            ]);
            markDirty();
          }
          break;
        }
      }
    },
    [nodesRef, edgesRef, setEdges, markDirty],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const rawType = e.dataTransfer.getData("application/reactflow");
      if (!rawType || !isTestNodeType(rawType)) return;
      const type = rawType;

      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: { x: flowPos.x - 90, y: flowPos.y - 30 },
        data: defaultData(type),
      };

      let hitEdge: Edge | undefined;
      for (const edge of edgesRef.current) {
        const endpoints = getEdgeEndpoints(edge, nodesRef.current);
        if (!endpoints) continue;
        if (pointToEdgeDist(flowPos, endpoints[0], endpoints[1]) <= 40) { hitEdge = edge; break; }
      }

      if (hitEdge) {
        const { source, target, sourceHandle, targetHandle, id: removedId } = hitEdge;
        setEdges((eds) => [
          ...eds.filter((e) => e.id !== removedId),
          makeEdge(`e-${source}-${newNode.id}`, source, newNode.id, { sourceHandle }),
          makeEdge(`e-${newNode.id}-${target}`, newNode.id, target, { targetHandle }),
        ]);
      }
      setNodes((nds) => resolveOverlaps([...nds, newNode], newNode.id));
      markDirty();
    },
    [screenToFlowPosition, nodesRef, edgesRef, setNodes, setEdges, markDirty],
  );

  function zoomTo(nodeType: string): void {
    const node = nodes.find((n) => n.type === nodeType);
    if (node) setCenter(node.position.x + 90, node.position.y + 30, { zoom: 1.2, duration: 500 });
  }

  const startIds = new Set(nodes.filter((n) => n.type === "startNode").map((n) => n.id));
  const endIds = new Set(nodes.filter((n) => n.type === "endNode").map((n) => n.id));
  const isDirectConnect = edges.some((e) => startIds.has(e.source) && endIds.has(e.target));
  // Also block if there are no edges at all (nothing connected)
  const noEdges = edges.length === 0;
  const cannotSave = isDirectConnect || noEdges;

  function handleSave(): void {
    if (cannotSave || !hasChanges) return;
    const now = new Date().toISOString();
    const template: TestTemplate = {
      id: existing?.id ?? crypto.randomUUID(),
      name: templateName,
      status: "draft",
      nodes,
      edges,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    templateStore.save(template);
    setHasChanges(false);

    // Show "Saved ✓" badge briefly
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedJustNow(true);
    savedTimerRef.current = setTimeout(() => setSavedJustNow(false), 2500);

    if (isNew) navigate(`/test-nodes/${template.id}`, { replace: true });
  }

  function handleDiscard(): void {
    if (existing) {
      setNodes(existing.nodes);
      setEdges(existing.edges);
      setTemplateName(existing.name);
    } else {
      setNodes(createDefaultNodes());
      setEdges([]);
      setTemplateName("Untitled Template");
    }
    setSelectedNode(null);
    setHasChanges(false);
  }

  return (
    <div className="flex h-full flex-col">
      <TestToastContainer toasts={toasts} onDismiss={dismissToast} />
      <CanvasTopBar
        templateName={templateName}
        hasChanges={hasChanges}
        cannotSave={cannotSave}
        savedJustNow={savedJustNow}
        onNameChange={(name) => { setTemplateName(name); markDirty(); }}
        onBack={() => navigate("/test-nodes")}
        onUndo={undo}
        onRedo={redo}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />

      {cannotSave && (
        <div className="flex items-center gap-2 border-b border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs font-medium text-orange-600 dark:text-orange-400">
          <span>⚠</span>
          {isDirectConnect
            ? <span>No Assignment — Start is connected directly to End. Add at least one node in between to save.</span>
            : <span>Nothing Connected — connect at least one node between Start and End to save.</span>
          }
        </div>
      )}

      <div ref={reactFlowWrapper} className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            const safe = changes.filter(
              (c) => !(c.type === "remove" && nodes.find((n) => n.id === c.id && (n.type === "startNode" || n.type === "endNode"))),
            );
            onNodesChange(safe);
            if (safe.some((c) => c.type !== "select")) markDirty();
          }}
          onEdgesChange={(changes) => { onEdgesChange(changes); markDirty(); }}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeClick={onNodeClick}
          onNodesDelete={onNodesDelete}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          nodeTypes={nodeTypes}
          edgesReconnectable
          reconnectRadius={12}
          nodeExtent={[[-200, -200], [1200, 1200]]}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          deleteKeyCode={["Backspace", "Delete"]}
          className="bg-background [&_.react-flow__handle]:h-3 [&_.react-flow__handle]:w-3 [&_.react-flow__handle]:min-h-0 [&_.react-flow__handle]:min-w-0 [&_.react-flow__handle]:border-2 [&_.react-flow__handle]:border-white [&_.react-flow__handle]:shadow-sm"
        >
          <Controls className="!border-border !bg-card !shadow-md [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground" />
          <MiniMap
            className="!border-border !bg-card !aspect-square"
            style={{ width: 150, height: 150 }}
            nodeColor={(node) => {
              switch (node.type) {
                case "startNode": return "#22c55e";
                case "endNode": return "#ef4444";
                case "taskNode": return "#3b82f6";
                case "waitForNode": return "#f59e0b";
                case "ifElseNode": return "#a855f7";
                case "notificationNode": return "#f97316";
                default: return "#6b7280";
              }
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.75} color="hsl(16 94% 57%)" />
        </ReactFlow>

        {cutScreenLine.length >= 2 && (
          <svg className="pointer-events-none absolute inset-0 z-50 h-full w-full">
            <polyline
              points={cutScreenLine.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeDasharray="6 3"
              strokeLinecap="round"
            />
          </svg>
        )}

        {connectMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <ConnectMenu
              x={connectMenu.x}
              y={connectMenu.y}
              wrapperEl={reactFlowWrapper.current}
              items={INSERTABLE_NODE_TYPES}
              onSelect={handleConnectMenuSelect}
              {...(connectMenu.autoFocus ? { autoFocus: true } : {})}
            />
          </>
        )}

        <NodeToolbar
          onZoomToStart={() => zoomTo("startNode")}
          onZoomToEnd={() => zoomTo("endNode")}
        />

        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
            onClose={() => setSelectedNode(null)}
            onTest={handleTestAction}
          />
        )}
      </div>
    </div>
  );
}

export function CanvasEditorPage(): JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  );
}
