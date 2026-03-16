import { formatBytes } from "../lib/csvUtils";
import type { ColumnMapping, ParsedRow } from "../lib/csvUtils";
import { BulkImportColumnMappingTable } from "./BulkImportColumnMappingTable";
import { BulkImportPreviewTable } from "./BulkImportPreviewTable";

interface Props {
  file: File;
  csvRows: string[][];
  mappings: ColumnMapping[];
  parsedRows: ParsedRow[];
  dualNameReversed: boolean;
  previewFilter: "all" | "ready" | "duplicates" | "errors";
  previewPage: number;
  previewPageSize: number;
  isCheckingDupes: boolean;
  requiredFieldsMapped: boolean;
  validRows: number;
  dupeCount: number;
  errorCount: number;
  rejectedCount: number;
  missingOptionalCount: number;
  totalRows: number;
  onChangeFile: () => void;
  onUpdateMapping: (i: number, field: string | null) => void;
  onToggleDualNameReversed: () => void;
  onSetPreviewFilter: (f: "all" | "ready" | "duplicates" | "errors") => void;
  onSetPreviewPage: (p: number | ((prev: number) => number)) => void;
  onSetPreviewPageSize: (n: number) => void;
  onToggleReview: (idx: number) => void;
  getMappedFields: () => Set<string>;
}

export function BulkImportMappingStep({
  file, csvRows, mappings, parsedRows, dualNameReversed, previewFilter,
  previewPage, previewPageSize, isCheckingDupes, requiredFieldsMapped,
  validRows, dupeCount, errorCount, rejectedCount, missingOptionalCount, totalRows,
  onChangeFile, onUpdateMapping, onToggleDualNameReversed, onSetPreviewFilter,
  onSetPreviewPage, onSetPreviewPageSize, onToggleReview, getMappedFields,
}: Props) {
  return (
    <div className="space-y-4">
      {/* File summary */}
      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-orange-500/10 text-sm font-bold text-orange-600">
          CSV
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(file.size)} · {csvRows.length} rows · {mappings.length} columns
          </p>
        </div>
        <button onClick={onChangeFile} className="text-xs text-muted-foreground hover:text-destructive">
          Change
        </button>
      </div>

      <BulkImportColumnMappingTable
        csvRows={csvRows}
        mappings={mappings}
        dualNameReversed={dualNameReversed}
        requiredFieldsMapped={requiredFieldsMapped}
        onUpdateMapping={onUpdateMapping}
        onToggleDualNameReversed={onToggleDualNameReversed}
        getMappedFields={getMappedFields}
      />

      {/* Import preview stats */}
      {requiredFieldsMapped && parsedRows.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Import preview
          </p>
          <div className="grid grid-cols-4 gap-2">
            <button type="button" onClick={() => { onSetPreviewFilter("all"); onSetPreviewPage(0); }}
              className={`rounded-md border px-3 py-2 text-center transition-colors ${previewFilter === "all" ? "border-foreground/30 ring-1 ring-foreground/20" : "border-border hover:border-foreground/20"}`}>
              <p className="text-lg font-bold text-foreground">{totalRows}</p>
              <p className="text-[10px] text-muted-foreground">Total rows</p>
            </button>
            <button type="button" onClick={() => { onSetPreviewFilter(previewFilter === "ready" ? "all" : "ready"); onSetPreviewPage(0); }}
              className={`rounded-md border px-3 py-2 text-center transition-colors ${previewFilter === "ready" ? "border-green-500 ring-1 ring-green-500/30 bg-green-500/5" : "border-green-500/30 bg-green-500/5 hover:border-green-500/60"}`}>
              <p className="text-lg font-bold text-green-600">{validRows}</p>
              <p className="text-[10px] text-green-600">Ready to import</p>
            </button>
            <button type="button" onClick={() => { onSetPreviewFilter(previewFilter === "duplicates" ? "all" : "duplicates"); onSetPreviewPage(0); }}
              className={`rounded-md border px-3 py-2 text-center transition-colors ${previewFilter === "duplicates" ? "border-orange-500 ring-1 ring-orange-500/30 bg-orange-500/5" : "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/60"}`}>
              <p className="text-lg font-bold text-orange-600">{isCheckingDupes ? "…" : dupeCount}</p>
              <p className="text-[10px] text-orange-600">Duplicate emails</p>
            </button>
            <button type="button" onClick={() => { onSetPreviewFilter(previewFilter === "errors" ? "all" : "errors"); onSetPreviewPage(0); }}
              className={`rounded-md border px-3 py-2 text-center transition-colors ${previewFilter === "errors" ? "border-destructive ring-1 ring-destructive/30 bg-destructive/5" : "border-destructive/30 bg-destructive/5 hover:border-destructive/60"}`}>
              <p className="text-lg font-bold text-destructive">{errorCount}</p>
              <p className="text-[10px] text-destructive">Errors</p>
            </button>
          </div>
          {missingOptionalCount > 0 && (
            <div className="mt-2 rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-700">
              <span className="font-semibold">{missingOptionalCount} employee{missingOptionalCount > 1 ? "s" : ""}</span>{" "}
              will be imported without department, location, hire type, or work mode and will be
              flagged as needing an update in the directory.
            </div>
          )}
        </div>
      )}

      {requiredFieldsMapped && parsedRows.length > 0 && (
        <BulkImportPreviewTable
          parsedRows={parsedRows}
          previewFilter={previewFilter}
          previewPage={previewPage}
          previewPageSize={previewPageSize}
          rejectedCount={rejectedCount}
          onSetPreviewFilter={onSetPreviewFilter}
          onSetPreviewPage={onSetPreviewPage}
          onSetPreviewPageSize={onSetPreviewPageSize}
          onToggleReview={onToggleReview}
        />
      )}

      {dupeCount > 0 && (
        <div className="rounded-md border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-xs text-orange-700">
          <span className="font-semibold">{dupeCount} duplicate email{dupeCount > 1 ? "s" : ""}</span>{" "}
          will be skipped to prevent overwriting existing accounts.
        </div>
      )}
    </div>
  );
}
