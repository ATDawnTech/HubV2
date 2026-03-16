interface Props {
  importProgress: number;
  importTotal: number;
  importSucceeded: number;
  importFailed: { name: string; error: string }[];
}

export function BulkImportImportingStep({ importProgress, importTotal, importSucceeded, importFailed }: Props) {
  return (
    <div className="space-y-4 py-4">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Importing employees…</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {importProgress} of {importTotal} processed
        </p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-orange-500 transition-all duration-200"
          style={{ width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%` }}
        />
      </div>
      <div className="flex justify-center gap-6 text-xs">
        <span className="text-green-600">{importSucceeded} created</span>
        {importFailed.length > 0 && (
          <span className="text-destructive">{importFailed.length} failed</span>
        )}
      </div>
    </div>
  );
}
