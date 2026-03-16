import { useCallback, useRef, useState } from "react";
import type React from "react";
import type { Connection, Edge, Node } from "@xyflow/react";
import { addEdge, reconnectEdge } from "@xyflow/react";
import type { HandleType } from "@xyflow/react";
import type { TestNodeType } from "../types";
import { defaultData, makeEdge, resolveOverlaps } from "../utils/canvasUtils";

export interface ConnectMenuState {
  x: number;
  y: number;
  sourceId: string | null;
  sourceHandle: string | null;
  autoFocus?: true;
}

interface UseConnectionMenuParams {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  markDirty: () => void;
}

interface UseConnectionMenuReturn {
  connectMenu: ConnectMenuState | null;
  closeMenu: () => void;
  menuJustOpenedRef: React.MutableRefObject<boolean>;
  onConnect: (connection: Connection) => void;
  onConnectStart: (
    _event: MouseEvent | TouchEvent,
    params: { nodeId: string | null; handleId: string | null; handleType?: string | null },
  ) => void;
  onConnectEnd: (event: MouseEvent | TouchEvent) => void;
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
  onReconnectStart: (_event: React.MouseEvent, edge: Edge, _handleType: HandleType) => void;
  onReconnectEnd: (event: MouseEvent | TouchEvent, edge: Edge, _handleType: HandleType) => void;
  handleConnectMenuSelect: (type: TestNodeType) => void;
  openQuickAdd: () => void;
}

export function useConnectionMenu({
  wrapperRef,
  screenToFlowPosition,
  setNodes,
  setEdges,
  markDirty,
}: UseConnectionMenuParams): UseConnectionMenuReturn {
  const [connectMenu, setConnectMenu] = useState<ConnectMenuState | null>(null);
  const connectSourceRef = useRef<{ nodeId: string; handleId: string | null } | null>(null);
  const connectionMadeRef = useRef(false);
  const reconnectedRef = useRef(false);
  const menuJustOpenedRef = useRef(false);

  function openMenu(
    x: number,
    y: number,
    sourceId: string | null,
    sourceHandle: string | null,
    autoFocus?: true,
  ): void {
    menuJustOpenedRef.current = true;
    const state: ConnectMenuState = { x, y, sourceId, sourceHandle };
    if (autoFocus) state.autoFocus = true;
    setConnectMenu(state);
    requestAnimationFrame(() => { menuJustOpenedRef.current = false; });
  }

  const closeMenu = useCallback(() => setConnectMenu(null), []);

  const onConnect = useCallback(
    (connection: Connection) => {
      connectionMadeRef.current = true;
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { strokeWidth: 2 } }, eds));
      markDirty();
    },
    [setEdges, markDirty],
  );

  const onConnectStart = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      params: { nodeId: string | null; handleId: string | null; handleType?: string | null },
    ) => {
      if (!params.nodeId) return;
      connectionMadeRef.current = false;

      if (params.handleType === "target") {
        const { nodeId, handleId } = params;
        let originalSource: { nodeId: string; handleId: string | null } | null = null;
        setEdges((eds) => {
          const toRemove = eds.filter(
            (e) =>
              e.target === nodeId &&
              (handleId == null || e.targetHandle === handleId || (e.targetHandle == null && handleId == null)),
          );
          if (toRemove.length === 0) return eds;
          const first = toRemove[0];
          if (first) originalSource = { nodeId: first.source, handleId: first.sourceHandle ?? null };
          return eds.filter((e) => !toRemove.some((r) => r.id === e.id));
        });
        connectSourceRef.current = originalSource;
        markDirty();
      } else {
        connectSourceRef.current = { nodeId: params.nodeId, handleId: params.handleId };
      }
    },
    [setEdges, markDirty],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (connectionMadeRef.current) { connectionMadeRef.current = false; return; }
      const source = connectSourceRef.current;
      if (!source) return;

      let clientX: number;
      let clientY: number;
      if ("changedTouches" in event) {
        const touch = event.changedTouches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const bounds = wrapper.getBoundingClientRect();
      openMenu(clientX - bounds.left, clientY - bounds.top, source.nodeId, source.handleId);
    },
    [wrapperRef],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      reconnectedRef.current = true;
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
      markDirty();
    },
    [setEdges, markDirty],
  );

  const onReconnectStart = useCallback(
    (_event: React.MouseEvent, edge: Edge, _handleType: HandleType) => {
      reconnectedRef.current = false;
      connectSourceRef.current = { nodeId: edge.source, handleId: edge.sourceHandle ?? null };
    },
    [],
  );

  const onReconnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, edge: Edge, _handleType: HandleType) => {
      if (!reconnectedRef.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        markDirty();

        const wrapper = wrapperRef.current;
        if (wrapper) {
          let clientX: number | undefined;
          let clientY: number | undefined;
          if ("changedTouches" in event) {
            clientX = event.changedTouches[0]?.clientX;
            clientY = event.changedTouches[0]?.clientY;
          } else {
            clientX = event.clientX;
            clientY = event.clientY;
          }
          if (clientX != null && clientY != null) {
            const bounds = wrapper.getBoundingClientRect();
            openMenu(clientX - bounds.left, clientY - bounds.top, edge.source, edge.sourceHandle ?? null);
          }
        }
      }
      reconnectedRef.current = false;
    },
    [setEdges, markDirty, wrapperRef],
  );

  const handleConnectMenuSelect = useCallback(
    (type: TestNodeType) => {
      if (!connectMenu) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const bounds = wrapper.getBoundingClientRect();
      const flowPos = screenToFlowPosition({
        x: connectMenu.x + bounds.left,
        y: connectMenu.y + bounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: { x: flowPos.x - 90, y: flowPos.y - 30 },
        data: defaultData(type),
      };

      setNodes((nds) => resolveOverlaps([...nds, newNode], newNode.id));

      const { sourceId, sourceHandle } = connectMenu;
      if (sourceId) {
        setEdges((eds) => [
          ...eds,
          makeEdge(`e-${sourceId}-${newNode.id}`, sourceId, newNode.id, { sourceHandle }),
        ]);
      }
      setConnectMenu(null);
      markDirty();
    },
    [connectMenu, screenToFlowPosition, setNodes, setEdges, markDirty, wrapperRef],
  );

  const openQuickAdd = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    openMenu(wrapper.offsetWidth / 2, wrapper.offsetHeight / 2, null, null, true);
  }, [wrapperRef]);

  return {
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
  };
}
