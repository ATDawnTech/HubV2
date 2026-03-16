import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { EndNodeData } from "../../types";

export function EndNode({ data }: NodeProps) {
  const d = data as EndNodeData;
  return (
    <div className="rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 shadow-md dark:bg-red-950">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
        End
      </div>
      <div className="text-sm font-medium text-foreground">{d.label || "End"}</div>
      <Handle type="target" position={Position.Left} className="!bg-red-500" />
    </div>
  );
}
