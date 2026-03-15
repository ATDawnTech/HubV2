import type { Node, Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Node data payloads — each node type carries its own config
// ---------------------------------------------------------------------------

export interface StartNodeData {
  label: string;
  trigger: "immediate" | "post-creation" | "time-based";
  [key: string]: unknown;
}

export interface EndNodeData {
  label: string;
  [key: string]: unknown;
}

export interface TaskNodeData {
  label: string;
  description: string;
  assignedRole: string;
  slaHours: number;
  department: string;
  isExternal: boolean;
  [key: string]: unknown;
}

export interface WaitForNodeData {
  label: string;
  waitForNodeIds: string[];
  [key: string]: unknown;
}

export interface IfElseNodeData {
  label: string;
  conditions: Condition[];
  [key: string]: unknown;
}

export interface Condition {
  field: string;
  operator: "equals" | "not_equals" | "contains";
  value: string;
  join: "and" | "or";
}

export interface NotificationNodeData {
  label: string;
  channel: "email" | "role_notification" | "both";
  recipientType: "candidate" | "hiring_manager" | "role";
  subject: string;
  body: string;
  [key: string]: unknown;
}

// Union of all node data types
export type AnyNodeData =
  | StartNodeData
  | EndNodeData
  | TaskNodeData
  | WaitForNodeData
  | IfElseNodeData
  | NotificationNodeData;

// ---------------------------------------------------------------------------
// Node type identifiers
// ---------------------------------------------------------------------------

export type TestNodeType =
  | "startNode"
  | "endNode"
  | "taskNode"
  | "waitForNode"
  | "ifElseNode"
  | "notificationNode";

// ---------------------------------------------------------------------------
// Template — the top-level persisted entity
// ---------------------------------------------------------------------------

export interface TestTemplate {
  id: string;
  name: string;
  status: "draft" | "published";
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}
