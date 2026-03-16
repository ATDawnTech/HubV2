import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NotificationNodeData } from "../../types";

export function NotificationNode({ data }: NodeProps) {
  const d = data as NotificationNodeData;
  return (
    <div className="min-w-[180px] rounded-lg border-2 border-orange-500 bg-orange-50 px-4 py-3 shadow-md dark:bg-orange-950">
      <Handle type="target" position={Position.Left} className="!bg-orange-500" />
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-orange-600">
        Notification
      </div>
      <div className="text-sm font-medium text-foreground">{d.label || "Notify"}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {d.channel === "both" ? "Email + Role" : d.channel === "email" ? "Email" : "Role"}
        {d.recipientType && ` → ${d.recipientType}`}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-orange-500" />
    </div>
  );
}
