import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TaskNodeData } from "../../types";

export function TaskNode({ data }: NodeProps) {
  const d = data as TaskNodeData;
  return (
    <div className="min-w-[180px] rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-3 shadow-md dark:bg-blue-950">
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
        Task
      </div>
      <div className="text-sm font-medium text-foreground">{d.label || "Untitled Task"}</div>
      {d.assignedRole && (
        <div className="mt-1 text-[10px] text-muted-foreground">{d.assignedRole}</div>
      )}
      {d.slaHours > 0 && (
        <div className="mt-0.5 text-[10px] text-muted-foreground">SLA: {d.slaHours}h</div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </div>
  );
}
