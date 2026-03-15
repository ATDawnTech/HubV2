import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { IfElseNodeData } from "../../types";

export function IfElseNode({ data }: NodeProps) {
  const d = data as IfElseNodeData;
  return (
    <div className="min-w-[180px] rounded-lg border-2 border-purple-500 bg-purple-50 px-4 py-3 shadow-md dark:bg-purple-950">
      <Handle type="target" position={Position.Left} className="!bg-purple-500" />
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-purple-600">
        If / Else
      </div>
      <div className="text-sm font-medium text-foreground">{d.label || "Condition"}</div>
      {d.conditions.length > 0 && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {d.conditions.length} condition{d.conditions.length > 1 ? "s" : ""}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: "30%" }}
        className="!bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: "70%" }}
        className="!bg-red-500"
      />
    </div>
  );
}
