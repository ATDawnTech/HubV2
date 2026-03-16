import { type ColumnMapping } from "../lib/csvUtils";
import { EXPECTED_COLUMNS } from "../lib/csvUtils";

interface Props {
  csvRows: string[][];
  mappings: ColumnMapping[];
  dualNameReversed: boolean;
  requiredFieldsMapped: boolean;
  onUpdateMapping: (i: number, field: string | null) => void;
  onToggleDualNameReversed: () => void;
  getMappedFields: () => Set<string>;
}

export function BulkImportColumnMappingTable({
  csvRows, mappings, dualNameReversed, requiredFieldsMapped,
  onUpdateMapping, onToggleDualNameReversed, getMappedFields,
}: Props) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Column mapping</p>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full table-fixed text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 text-left font-medium text-foreground">CSV Header</th>
              <th className="px-3 py-2 text-left font-medium text-foreground">Maps To</th>
              <th className="px-3 py-2 text-left font-medium text-foreground">Match</th>
              <th className="px-3 py-2 text-left font-medium text-foreground">Sample</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m, i) => {
              const mappedFields = getMappedFields();
              const sampleValue = csvRows[0]?.[i] ?? "—";
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-3 py-1.5 font-mono text-foreground">{m.csvHeader}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      {m.mappedField === "__dual_name" && (
                        <button
                          type="button"
                          onClick={onToggleDualNameReversed}
                          title={dualNameReversed ? "Order: Last → First (click to reverse)" : "Order: First → Last (click to reverse)"}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-purple-300 bg-purple-50 text-purple-600 transition-colors hover:bg-purple-100"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 2v12m0 0L1 11m3 3l3-3M12 14V2m0 0L9 5m3-3l3 3" />
                          </svg>
                        </button>
                      )}
                      <select
                        value={m.mappedField ?? ""}
                        onChange={(e) => onUpdateMapping(i, e.target.value || null)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                      >
                        <option value="">— Skip —</option>
                        <option value="__dual_name" disabled={mappedFields.has("__dual_name") && m.mappedField !== "__dual_name"}>
                          Dual Name Cell ({dualNameReversed ? "Last + First" : "First + Last"})
                        </option>
                        {EXPECTED_COLUMNS.map((col) => (
                          <option key={col.field} value={col.field} disabled={mappedFields.has(col.field) && m.mappedField !== col.field}>
                            {col.label} {col.required ? "*" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    {m.mappedField === "__dual_name" && m.confidence !== "manual" ? (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">Split</span>
                    ) : m.confidence === "exact" ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Exact</span>
                    ) : m.confidence === "fuzzy" ? (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">Auto</span>
                    ) : m.confidence === "manual" ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">Manual</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Skip</span>
                    )}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-1.5 font-mono text-muted-foreground">{sampleValue}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!requiredFieldsMapped && (
        <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span className="font-semibold">Missing required mappings:</span>{" "}
          {EXPECTED_COLUMNS.filter((c) => c.required && !mappings.some((m) => m.mappedField === c.field)).map((c) => c.label).join(", ")}
        </div>
      )}
    </div>
  );
}
