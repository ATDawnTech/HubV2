import type { ParsedRow } from "../lib/csvUtils";

interface Props {
  parsedRows: ParsedRow[];
  previewFilter: "all" | "ready" | "duplicates" | "errors";
  previewPage: number;
  previewPageSize: number;
  rejectedCount: number;
  onSetPreviewFilter: (f: "all" | "ready" | "duplicates" | "errors") => void;
  onSetPreviewPage: (p: number | ((prev: number) => number)) => void;
  onSetPreviewPageSize: (n: number) => void;
  onToggleReview: (idx: number) => void;
}

export function BulkImportPreviewTable({
  parsedRows, previewFilter, previewPage, previewPageSize, rejectedCount,
  onSetPreviewFilter, onSetPreviewPage, onSetPreviewPageSize, onToggleReview,
}: Props) {
  const filteredRows = parsedRows
    .map((row, idx) => ({ row, originalIdx: idx }))
    .filter(({ row }) => {
      if (previewFilter === "ready") return (row.issues.length === 0 && !row.isDuplicate && row.reviewStatus !== "rejected") || row.reviewStatus === "approved";
      if (previewFilter === "duplicates") return row.isDuplicate;
      if (previewFilter === "errors") return row.issues.length > 0;
      return true;
    });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / previewPageSize));
  const safePage = Math.min(previewPage, totalPages - 1);
  const displayRows = filteredRows.slice(safePage * previewPageSize, (safePage + 1) * previewPageSize);
  const filterLabel = previewFilter === "all" ? "Row" : previewFilter === "ready" ? "Ready" : previewFilter === "duplicates" ? "Duplicate" : "Error";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {filterLabel} preview<span className="font-normal"> ({filteredRows.length} row{filteredRows.length !== 1 ? "s" : ""})</span>
        </p>
        <div className="flex items-center gap-2">
          {rejectedCount > 0 && <span className="text-[10px] text-muted-foreground">{rejectedCount} rejected</span>}
          {previewFilter !== "all" && (
            <button type="button" onClick={() => { onSetPreviewFilter("all"); onSetPreviewPage(0); }}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground">
              Show all
            </button>
          )}
        </div>
      </div>
      {displayRows.length === 0 ? (
        <p className="rounded-md border border-border bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
          No {previewFilter === "ready" ? "ready" : previewFilter === "duplicates" ? "duplicate" : "error"} rows found.
        </p>
      ) : (
        <div className="rounded-md border border-border">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-2 py-1.5 text-left font-medium text-foreground">#</th>
                <th className="px-2 py-1.5 text-left font-medium text-foreground">Name</th>
                <th className="px-2 py-1.5 text-left font-medium text-foreground">Email</th>
                <th className="px-2 py-1.5 text-left font-medium text-foreground">Status</th>
                <th className="px-2 py-1.5 text-left font-medium text-foreground">Validation</th>
                <th className="px-2 py-1.5 text-center font-medium text-foreground">Review</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map(({ row, originalIdx }, i) => (
                <tr key={originalIdx} className={
                  row.reviewStatus === "rejected" ? "bg-destructive/5 line-through opacity-60"
                    : row.reviewStatus === "approved" ? "bg-green-500/5"
                    : row.isDuplicate ? "bg-orange-500/10"
                    : row.issues.length > 0 ? "bg-destructive/5"
                    : i % 2 === 0 ? "bg-background" : "bg-muted/20"
                }>
                  <td className="px-2 py-1 text-muted-foreground">{originalIdx + 1}</td>
                  <td className="px-2 py-1 text-foreground">{row.values["first_name"] ?? "—"} {row.values["last_name"] ?? "—"}</td>
                  <td className="max-w-[160px] truncate px-2 py-1 font-mono text-muted-foreground">{row.values["work_email"] ?? "—"}</td>
                  <td className="px-2 py-1">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Active</span>
                  </td>
                  <td className="px-2 py-1">
                    {row.isDuplicate && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">Duplicate</span>
                    )}
                    {row.issues.length > 0 && (
                      <span className="group relative cursor-help">
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          {row.issues.length} error{row.issues.length > 1 ? "s" : ""}
                        </span>
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-max max-w-[220px] -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 shadow-lg group-hover:block">
                          <span className="mb-1 block text-[10px] font-semibold text-foreground">Issues:</span>
                          {row.issues.map((issue, j) => <span key={j} className="block text-[10px] text-destructive">• {issue}</span>)}
                        </span>
                      </span>
                    )}
                    {row.issues.length === 0 && !row.isDuplicate && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">Ready</span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button type="button" onClick={() => onToggleReview(originalIdx)}
                      title={row.reviewStatus === "approved" ? "Approved — click to reject" : row.reviewStatus === "rejected" ? "Rejected — click to reset" : "Pending — click to approve"}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                        row.reviewStatus === "approved" ? "bg-green-500 text-white hover:bg-green-600"
                          : row.reviewStatus === "rejected" ? "bg-destructive text-white hover:bg-destructive/80"
                          : "border border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}>
                      {row.reviewStatus === "approved" ? "Approved" : row.reviewStatus === "rejected" ? "Rejected" : "Pending"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
            <button type="button" disabled={safePage === 0} onClick={() => onSetPreviewPage((p) => Math.max(0, p - 1))}
              className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
              <span>←</span> Prev
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Page {safePage + 1} of {totalPages}</span>
              <span className="text-[10px] text-muted-foreground">· Rows:</span>
              {[10, 25, 50, 100].map((n) => (
                <button key={n} type="button" onClick={() => { onSetPreviewPageSize(n); onSetPreviewPage(0); }}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${previewPageSize === n ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
                  {n}
                </button>
              ))}
            </div>
            <button type="button" disabled={safePage >= totalPages - 1} onClick={() => onSetPreviewPage((p) => Math.min(totalPages - 1, p + 1))}
              className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
              Next <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
