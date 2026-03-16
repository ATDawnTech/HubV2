import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import type { AnyNodeData, Condition, TestNodeType } from "../types";

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (id: string, data: AnyNodeData) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onTest: (nodeType: TestNodeType, data: Record<string, unknown>) => void;
}

const ROLES = ["HR", "IT", "Admin", "Facilities", "Finance", "Hiring Manager"];
const DEPARTMENTS = ["HR", "IT", "Facilities", "Finance", "Vendor", "Operations"];

const TESTABLE_TYPES: TestNodeType[] = ["notificationNode", "taskNode", "ifElseNode", "waitForNode"];

export function NodeConfigPanel({ node, onUpdate, onDelete, onClose, onTest }: NodeConfigPanelProps): JSX.Element {
  const [data, setData] = useState<Record<string, unknown>>({ ...(node.data as Record<string, unknown>) });
  const nodeType = node.type as TestNodeType;

  useEffect(() => {
    setData({ ...(node.data as Record<string, unknown>) });
  }, [node.id, node.data]);

  function update(field: string, value: unknown): void {
    const next = { ...data, [field]: value };
    setData(next);
    onUpdate(node.id, next as AnyNodeData);
  }

  function inputCls(): string {
    return "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
  }

  function labelCls(): string {
    return "mb-1 block text-xs font-medium text-muted-foreground";
  }

  const isSpecial = nodeType === "startNode" || nodeType === "endNode";
  const isTestable = TESTABLE_TYPES.includes(nodeType);

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-l border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Configure Node</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Label — all nodes */}
        <div>
          <label className={labelCls()}>Label</label>
          <input
            className={inputCls()}
            value={(data.label as string) || ""}
            onChange={(e) => update("label", e.target.value)}
          />
        </div>

        {/* Start Node */}
        {nodeType === "startNode" && (
          <div>
            <label className={labelCls()}>Trigger</label>
            <select
              className={inputCls()}
              value={(data.trigger as string) || "immediate"}
              onChange={(e) => update("trigger", e.target.value)}
            >
              <option value="immediate">Immediate</option>
              <option value="post-creation">Post-Creation</option>
              <option value="time-based">Time-Based</option>
            </select>
          </div>
        )}

        {/* Task Node */}
        {nodeType === "taskNode" && (
          <>
            <div>
              <label className={labelCls()}>Description</label>
              <textarea
                className={inputCls() + " min-h-[60px] resize-y"}
                value={(data.description as string) || ""}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls()}>Assigned Role</label>
              <select
                className={inputCls()}
                value={(data.assignedRole as string) || ""}
                onChange={(e) => update("assignedRole", e.target.value)}
              >
                <option value="">Select role…</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls()}>SLA (hours)</label>
              <input
                type="number"
                min={0}
                className={inputCls()}
                value={(data.slaHours as number) || 0}
                onChange={(e) => update("slaHours", Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelCls()}>Department</label>
              <select
                className={inputCls()}
                value={(data.department as string) || ""}
                onChange={(e) => update("department", e.target.value)}
              >
                <option value="">Select department…</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={Boolean(data.isExternal)}
                onChange={(e) => update("isExternal", e.target.checked)}
                className="rounded border-border"
              />
              External Task
            </label>
          </>
        )}

        {/* If/Else Node */}
        {nodeType === "ifElseNode" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className={labelCls()}>Conditions</label>
              <button
                type="button"
                onClick={() => {
                  const conditions = [
                    ...((data.conditions as Condition[]) ?? []),
                    { field: "", operator: "equals" as const, value: "", join: "and" as const },
                  ];
                  update("conditions", conditions);
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                + Add
              </button>
            </div>
            <p className="mb-2 text-[10px] text-muted-foreground">
              ✅ True → green handle (top) &nbsp;·&nbsp; ❌ False → red handle (bottom)
            </p>
            {((data.conditions as Condition[]) ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                No conditions — all inputs will exit via the False (red) handle.
              </p>
            ) : (
              <div className="space-y-2">
                {((data.conditions as Condition[]) ?? []).map((cond, i) => (
                  <div key={i} className="rounded-md border border-border bg-muted/20 p-2 space-y-1.5">
                    {i > 0 && (
                      <select
                        className={inputCls()}
                        value={cond.join}
                        onChange={(e) => {
                          const next = [...(data.conditions as Condition[])];
                          next[i] = { ...next[i]!, join: e.target.value as "and" | "or" };
                          update("conditions", next);
                        }}
                      >
                        <option value="and">AND</option>
                        <option value="or">OR</option>
                      </select>
                    )}
                    <input
                      className={inputCls()}
                      placeholder="Field (e.g. status, department)"
                      value={cond.field}
                      onChange={(e) => {
                        const next = [...(data.conditions as Condition[])];
                        next[i] = { ...next[i]!, field: e.target.value };
                        update("conditions", next);
                      }}
                    />
                    <select
                      className={inputCls()}
                      value={cond.operator}
                      onChange={(e) => {
                        const next = [...(data.conditions as Condition[])];
                        next[i] = { ...next[i]!, operator: e.target.value as Condition["operator"] };
                        update("conditions", next);
                      }}
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">not equals</option>
                      <option value="contains">contains</option>
                    </select>
                    <div className="flex items-center gap-1.5">
                      <input
                        className={inputCls()}
                        placeholder="Value"
                        value={cond.value}
                        onChange={(e) => {
                          const next = [...(data.conditions as Condition[])];
                          next[i] = { ...next[i]!, value: e.target.value };
                          update("conditions", next);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (data.conditions as Condition[]).filter((_, idx) => idx !== i);
                          update("conditions", next);
                        }}
                        className="flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Remove condition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Wait For Node */}
        {nodeType === "waitForNode" && (
          <div>
            <label className={labelCls()}>Upstream Dependencies</label>
            <p className="text-xs text-muted-foreground">
              Connect incoming edges to define what this node waits for.
            </p>
          </div>
        )}

        {/* Notification Node */}
        {nodeType === "notificationNode" && (
          <>
            <div>
              <label className={labelCls()}>Channel</label>
              <select
                className={inputCls()}
                value={(data.channel as string) || "email"}
                onChange={(e) => update("channel", e.target.value)}
              >
                <option value="email">Email</option>
                <option value="role_notification">Role Notification</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className={labelCls()}>Recipient</label>
              <select
                className={inputCls()}
                value={(data.recipientType as string) || "candidate"}
                onChange={(e) => update("recipientType", e.target.value)}
              >
                <option value="candidate">Candidate</option>
                <option value="hiring_manager">Hiring Manager</option>
                <option value="role">Role</option>
              </select>
            </div>
            <div>
              <label className={labelCls()}>Subject</label>
              <input
                className={inputCls()}
                value={(data.subject as string) || ""}
                onChange={(e) => update("subject", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls()}>Body</label>
              <textarea
                className={inputCls() + " min-h-[80px] resize-y"}
                value={(data.body as string) || ""}
                onChange={(e) => update("body", e.target.value)}
              />
            </div>
          </>
        )}

        {/* Test Action Button */}
        {isTestable && (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">
              Test Action
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              {nodeType === "notificationNode" && "Simulate sending this notification as an in-app toast."}
              {nodeType === "taskNode" && "Simulate creating this task assignment."}
              {nodeType === "ifElseNode" && "Simulate evaluating this condition."}
              {nodeType === "waitForNode" && "Simulate the wait dependency check."}
            </p>
            <button
              onClick={() => onTest(nodeType, data)}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {nodeType === "notificationNode" && "Send Test Notification"}
              {nodeType === "taskNode" && "Simulate Task Creation"}
              {nodeType === "ifElseNode" && "Run Condition Test"}
              {nodeType === "waitForNode" && "Check Dependencies"}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {!isSpecial && (
        <div className="border-t border-border px-4 py-3">
          <button
            onClick={() => onDelete(node.id)}
            className="w-full rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
          >
            Delete Node
          </button>
        </div>
      )}
    </div>
  );
}
