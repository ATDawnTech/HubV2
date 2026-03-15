import { EXPECTED_COLUMNS } from "../lib/csvUtils";

interface Props {
  fileError: string | null;
  dragOver: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BulkImportUploadStep({ fileError, dragOver, inputRef, onDragOver, onDragLeave, onDrop, onFileInput }: Props) {
  return (
    <div className="space-y-4">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver
            ? "border-orange-500 bg-orange-500/5"
            : "border-border hover:border-orange-500/50 hover:bg-muted/30"
        }`}
      >
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-lg text-orange-500">
          ↑
        </div>
        <p className="text-sm font-medium text-foreground">Drag & drop your file here</p>
        <p className="mt-1 text-xs text-muted-foreground">
          or <span className="text-primary underline underline-offset-2">browse</span> — CSV format
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {fileError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {fileError}
        </p>
      )}

      <div className="rounded-md border border-border bg-muted/20 px-4 py-3">
        <p className="mb-1.5 text-xs font-semibold text-foreground">Supported sources</p>
        <p className="text-xs text-muted-foreground">
          Column headers are automatically matched from <span className="font-medium text-foreground">Microsoft Entra ID</span>,{" "}
          <span className="font-medium text-foreground">Google Workspace</span>,{" "}
          <span className="font-medium text-foreground">AWS IAM / SSO</span>, and most HR/directory exports.
          You can adjust any mappings after upload.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Expected columns
        </p>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium text-foreground">Column name</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Required</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Example</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {EXPECTED_COLUMNS.map((col, i) => (
                <tr key={col.field} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-3 py-1.5 font-mono text-foreground">{col.field}</td>
                  <td className="px-3 py-1.5">
                    {col.required
                      ? <span className="font-medium text-orange-600">Yes</span>
                      : <span className="text-muted-foreground">No</span>}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{col.example}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{col.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-700">
          <span className="font-semibold">Note:</span> Only first_name, last_name, and work_email are required.
          Each imported employee will be assigned a new employee ID automatically.
          Employees imported without department, location, hire_type, or work_mode will be flagged
          as needing an update in the directory.
        </div>
      </div>
    </div>
  );
}
