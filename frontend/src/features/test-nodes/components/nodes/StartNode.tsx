import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StartNodeData } from "../../types";

export function StartNode({ data }: NodeProps) {
  const d = data as StartNodeData;
  return (
    <div className="rounded-lg border-2 border-green-500 bg-green-50 px-4 py-3 shadow-md dark:bg-green-950">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-green-600">
        Start
      </div>
      <div className="text-sm font-medium text-foreground">{d.label || "Start"}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">{d.trigger}</div>
      <Handle type="source" position={Position.Right} className="!bg-green-500" />
    </div>
  );
}
