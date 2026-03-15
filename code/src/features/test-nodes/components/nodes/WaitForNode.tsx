import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { WaitForNodeData } from "../../types";

export function WaitForNode({ data }: NodeProps) {
  const d = data as WaitForNodeData;
  return (
    <div className="rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 shadow-md dark:bg-amber-950">
      <Handle type="target" position={Position.Left} className="!bg-amber-500" />
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
        Wait For
      </div>
      <div className="text-sm font-medium text-foreground">{d.label || "Wait"}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {d.waitForNodeIds.length > 0
          ? `Waiting on ${d.waitForNodeIds.length} node(s)`
          : "No dependencies set"}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-amber-500" />
    </div>
  );
}
