import { useCallback, useEffect, useRef } from "react";
import type React from "react";
import type { Edge, Node } from "@xyflow/react";

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

interface UseCanvasHistoryReturn {
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
  markDirty: () => void;
  undo: () => void;
  redo: () => void;
}

export function useCanvasHistory(
  nodes: Node[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  setHasChanges: (value: boolean) => void,
): UseCanvasHistoryReturn {
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const historyRef = useRef<HistoryEntry[]>([{ nodes, edges }]);
  const historyIndexRef = useRef(0);
  const isUndoRedoRef = useRef(false);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;
    const curr = { nodes: nodesRef.current, edges: edgesRef.current };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(curr);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyTimerRef.current) { clearTimeout(historyTimerRef.current); historyTimerRef.current = null; }
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    const entry = historyRef.current[historyIndexRef.current];
    if (!entry) return;
    isUndoRedoRef.current = true;
    setNodes(entry.nodes);
    setEdges(entry.edges);
    setHasChanges(true);
    requestAnimationFrame(() => { isUndoRedoRef.current = false; });
  }, [setNodes, setEdges, setHasChanges]);

  const redo = useCallback(() => {
    if (historyTimerRef.current) { clearTimeout(historyTimerRef.current); historyTimerRef.current = null; }
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    historyIndexRef.current = idx + 1;
    const entry = historyRef.current[historyIndexRef.current];
    if (!entry) return;
    isUndoRedoRef.current = true;
    setNodes(entry.nodes);
    setEdges(entry.edges);
    setHasChanges(true);
    requestAnimationFrame(() => { isUndoRedoRef.current = false; });
  }, [setNodes, setEdges, setHasChanges]);

  const markDirty = useCallback(() => {
    setHasChanges(true);
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      pushHistory();
      historyTimerRef.current = null;
    }, 300);
  }, [pushHistory, setHasChanges]);

  return { nodesRef, edgesRef, markDirty, undo, redo };
}
