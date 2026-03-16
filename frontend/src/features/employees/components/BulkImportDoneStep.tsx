interface Props {
  importSucceeded: number;
  importFailed: { name: string; error: string }[];
  missingOptionalCount: number;
}

export function BulkImportDoneStep({ importSucceeded, importFailed, missingOptionalCount }: Props) {
  return (
    <div className="space-y-4 py-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl text-green-600">
          ✓
        </div>
        <p className="text-sm font-semibold text-foreground">Import Complete</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {importSucceeded} employee{importSucceeded !== 1 ? "s" : ""} created successfully
          {importFailed.length > 0 && `, ${importFailed.length} failed`}
        </p>
      </div>

      {importFailed.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-destructive">Failed imports:</p>
          <div className="max-h-[120px] overflow-auto rounded-md border border-destructive/20 bg-destructive/5">
            {importFailed.map((f, i) => (
              <div key={i} className="flex items-center justify-between border-b border-destructive/10 px-3 py-1.5 last:border-0">
                <span className="text-xs font-medium text-foreground">{f.name}</span>
                <span className="text-xs text-destructive">{f.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {missingOptionalCount > 0 && importSucceeded > 0 && (
        <div className="rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-700">
          Some imported employees are missing department, location, or other fields and will appear
          with an "Update Required" badge in the directory.
        </div>
      )}
    </div>
  );
}
