import type { Edge, Node } from "@xyflow/react";
import type { AnyNodeData, TestNodeType } from "../types";

// ── Node size constants ──────────────────────────────────────────────────
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 70;
export const NODE_GAP = 40;

// ── Insertable node definitions ──────────────────────────────────────────
export const INSERTABLE_NODE_TYPES: { type: TestNodeType; label: string; color: string }[] = [
  { type: "taskNode", label: "Task", color: "text-blue-600" },
  { type: "waitForNode", label: "Wait For", color: "text-amber-600" },
  { type: "ifElseNode", label: "If / Else", color: "text-purple-600" },
  { type: "notificationNode", label: "Notification", color: "text-orange-600" },
  { type: "endNode", label: "End", color: "text-red-600" },
];

const INSERTABLE_TYPES_SET = new Set(INSERTABLE_NODE_TYPES.map((t) => t.type));

export function isTestNodeType(value: string): value is TestNodeType {
  return INSERTABLE_TYPES_SET.has(value as TestNodeType);
}

// ── Geometry ─────────────────────────────────────────────────────────────
export type Point = { x: number; y: number };

export function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / cross;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function getNodeCenter(node: Node): Point {
  const w = (node.measured?.width ?? NODE_WIDTH) / 2;
  const h = (node.measured?.height ?? NODE_HEIGHT) / 2;
  return { x: node.position.x + w, y: node.position.y + h };
}

export function getEdgeEndpoints(edge: Edge, nodes: Node[]): [Point, Point] | null {
  const src = nodes.find((n) => n.id === edge.source);
  const tgt = nodes.find((n) => n.id === edge.target);
  if (!src || !tgt) return null;
  return [getNodeCenter(src), getNodeCenter(tgt)];
}

export function pointToEdgeDist(pt: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((pt.x - a.x) ** 2 + (pt.y - a.y) ** 2);
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq));
  return Math.sqrt((pt.x - (a.x + t * dx)) ** 2 + (pt.y - (a.y + t * dy)) ** 2);
}

// ── Node / Edge factories ────────────────────────────────────────────────
export function defaultData(type: TestNodeType): AnyNodeData {
  switch (type) {
    case "startNode":
      return { label: "Start", trigger: "immediate" };
    case "endNode":
      return { label: "End" };
    case "taskNode":
      return { label: "New Task", description: "", assignedRole: "", slaHours: 0, department: "", isExternal: false };
    case "waitForNode":
      return { label: "Wait", waitForNodeIds: [] };
    case "ifElseNode":
      return { label: "Condition", conditions: [] };
    case "notificationNode":
      return { label: "Notify", channel: "email", recipientType: "candidate", subject: "", body: "" };
  }
}

export function makeEdge(
  id: string,
  source: string,
  target: string,
  opts?: { sourceHandle?: string | null | undefined; targetHandle?: string | null | undefined },
): Edge {
  const edge: Edge = { id, source, target, animated: true, style: { strokeWidth: 2 } };
  if (opts?.sourceHandle != null) edge.sourceHandle = opts.sourceHandle;
  if (opts?.targetHandle != null) edge.targetHandle = opts.targetHandle;
  return edge;
}

export function createDefaultNodes(): Node[] {
  return [
    { id: "start-1", type: "startNode", position: { x: 200, y: 480 }, data: defaultData("startNode") },
    { id: "end-1", type: "endNode", position: { x: 800, y: 480 }, data: defaultData("endNode") },
  ];
}

// ── Overlap resolver ─────────────────────────────────────────────────────
export function resolveOverlaps(nodes: Node[], newNodeId: string): Node[] {
  const newNode = nodes.find((n) => n.id === newNodeId);
  if (!newNode) return nodes;

  const nw = newNode.measured?.width ?? NODE_WIDTH;
  const nh = newNode.measured?.height ?? NODE_HEIGHT;

  return nodes.map((n) => {
    if (n.id === newNodeId) return n;
    const ow = n.measured?.width ?? NODE_WIDTH;
    const oh = n.measured?.height ?? NODE_HEIGHT;

    const overlapX =
      newNode.position.x < n.position.x + ow + NODE_GAP &&
      newNode.position.x + nw + NODE_GAP > n.position.x;
    const overlapY =
      newNode.position.y < n.position.y + oh + NODE_GAP &&
      newNode.position.y + nh + NODE_GAP > n.position.y;

    if (overlapX && overlapY) {
      const dx = n.position.x + ow / 2 - (newNode.position.x + nw / 2);
      const dy = n.position.y + oh / 2 - (newNode.position.y + nh / 2);
      if (Math.abs(dx) > Math.abs(dy)) {
        const shiftX =
          dx >= 0
            ? newNode.position.x + nw + NODE_GAP - n.position.x
            : -(n.position.x + ow + NODE_GAP - newNode.position.x);
        return { ...n, position: { x: n.position.x + shiftX, y: n.position.y } };
      } else {
        const shiftY =
          dy >= 0
            ? newNode.position.y + nh + NODE_GAP - n.position.y
            : -(n.position.y + oh + NODE_GAP - newNode.position.y);
        return { ...n, position: { x: n.position.x, y: n.position.y + shiftY } };
      }
    }
    return n;
  });
}
