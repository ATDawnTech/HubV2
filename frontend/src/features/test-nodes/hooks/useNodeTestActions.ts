import { useCallback, useState } from "react";
import type React from "react";
import type { Edge } from "@xyflow/react";
import type { TestNodeType } from "../types";
import type { Toast } from "../components/TestToast";

function asString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" ? v : fallback;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

interface UseNodeTestActionsParams {
  edgesRef: React.MutableRefObject<Edge[]>;
  selectedNodeId: string | null;
}

interface UseNodeTestActionsReturn {
  toasts: Toast[];
  dismissToast: (id: string) => void;
  handleTestAction: (nodeType: TestNodeType, data: Record<string, unknown>) => void;
}

export function useNodeTestActions({
  edgesRef,
  selectedNodeId,
}: UseNodeTestActionsParams): UseNodeTestActionsReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id" | "timestamp">) => {
    setToasts((prev) => [
      ...prev,
      {
        ...toast,
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleTestAction = useCallback(
    (nodeType: TestNodeType, data: Record<string, unknown>) => {
      switch (nodeType) {
        case "notificationNode": {
          const channel = asString(data.channel, "email");
          const recipient = asString(data.recipientType, "candidate");
          const subject = asString(data.subject, "(no subject)");
          const body = asString(data.body, "(no body)");
          if (channel === "email" || channel === "both") {
            addToast({ type: "email", title: `Email: ${subject}`, body: `To: ${recipient}\n${body}` });
          }
          if (channel === "role_notification" || channel === "both") {
            addToast({
              type: "notification",
              title: `In-App: ${subject}`,
              body: `Role notification to ${recipient}: ${body}`,
            });
          }
          break;
        }
        case "taskNode": {
          const label = asString(data.label, "Untitled Task");
          const role = asString(data.assignedRole, "unassigned");
          const dept = asString(data.department, "no department");
          const sla = asNumber(data.slaHours, 0);
          addToast({
            type: "info",
            title: `Task Created: ${label}`,
            body: `Assigned to ${role} (${dept})${sla > 0 ? ` — SLA: ${sla}h` : ""}${data.isExternal === true ? " [External]" : ""}`,
          });
          break;
        }
        case "ifElseNode": {
          const result = Math.random() > 0.5;
          addToast({
            type: result ? "success" : "warning",
            title: `Condition: ${asString(data.label, "Condition")}`,
            body: `Evaluated to ${result ? "TRUE" : "FALSE"} — flow follows the ${result ? "green (top)" : "red (bottom)"} path.`,
          });
          break;
        }
        case "waitForNode": {
          const deps = asStringArray(data.waitForNodeIds);
          const incomingCount = edgesRef.current.filter((e) => e.target === selectedNodeId).length;
          addToast({
            type: incomingCount > 0 ? "success" : "warning",
            title: `Wait: ${asString(data.label, "Wait")}`,
            body:
              incomingCount > 0
                ? `${incomingCount} upstream connection(s) detected. ${deps.length > 0 ? `${deps.length} explicit dep(s).` : ""} All dependencies met.`
                : "No upstream connections found. This node has nothing to wait for.",
          });
          break;
        }
      }
    },
    [addToast, edgesRef, selectedNodeId],
  );

  return { toasts, dismissToast, handleTestAction };
}
