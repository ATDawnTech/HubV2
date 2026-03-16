import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { Edge, Node } from "@xyflow/react";
import { getEdgeEndpoints, segmentsIntersect, type Point } from "../utils/canvasUtils";

interface UseEdgeCuttingParams {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  screenToFlowPosition: (pos: Point) => Point;
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  markDirty: () => void;
}

export function useEdgeCutting({
  wrapperRef,
  screenToFlowPosition,
  nodesRef,
  edgesRef,
  setEdges,
  markDirty,
}: UseEdgeCuttingParams): { cutScreenLine: Point[] } {
  const isCutting = useRef(false);
  const cutFlowPath = useRef<Point[]>([]);
  const [cutScreenLine, setCutScreenLine] = useState<Point[]>([]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    function onMouseDown(e: MouseEvent): void {
      if (e.button !== 2) return;
      isCutting.current = true;
      const bounds = wrapper!.getBoundingClientRect();
      cutFlowPath.current = [screenToFlowPosition({ x: e.clientX, y: e.clientY })];
      setCutScreenLine([{ x: e.clientX - bounds.left, y: e.clientY - bounds.top }]);
    }

    function onMouseMove(e: MouseEvent): void {
      if (!isCutting.current) return;
      const bounds = wrapper!.getBoundingClientRect();
      cutFlowPath.current.push(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
      setCutScreenLine((prev) => [...prev, { x: e.clientX - bounds.left, y: e.clientY - bounds.top }]);
    }

    function onMouseUp(e: MouseEvent): void {
      if (e.button !== 2 || !isCutting.current) return;
      isCutting.current = false;

      const path = cutFlowPath.current;
      if (path.length >= 2) {
        const edgesToRemove = new Set<string>();
        for (const edge of edgesRef.current) {
          const endpoints = getEdgeEndpoints(edge, nodesRef.current);
          if (!endpoints) continue;
          const [ea, eb] = endpoints;
          for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            if (p1 !== undefined && p2 !== undefined && segmentsIntersect(p1, p2, ea, eb)) {
              edgesToRemove.add(edge.id);
              break;
            }
          }
        }
        if (edgesToRemove.size > 0) {
          setEdges((eds) => eds.filter((e) => !edgesToRemove.has(e.id)));
          markDirty();
        }
      }

      cutFlowPath.current = [];
      setCutScreenLine([]);
    }

    function onContextMenu(e: MouseEvent): void {
      e.preventDefault();
    }

    wrapper.addEventListener("mousedown", onMouseDown);
    wrapper.addEventListener("mousemove", onMouseMove);
    wrapper.addEventListener("mouseup", onMouseUp);
    wrapper.addEventListener("contextmenu", onContextMenu);
    return () => {
      wrapper.removeEventListener("mousedown", onMouseDown);
      wrapper.removeEventListener("mousemove", onMouseMove);
      wrapper.removeEventListener("mouseup", onMouseUp);
      wrapper.removeEventListener("contextmenu", onContextMenu);
    };
  }, [wrapperRef, screenToFlowPosition, nodesRef, edgesRef, setEdges, markDirty]);

  return { cutScreenLine };
}
