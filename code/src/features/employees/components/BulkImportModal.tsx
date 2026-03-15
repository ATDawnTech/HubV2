import { useBulkImport } from "../hooks/useBulkImport";
import { BulkImportUploadStep } from "./BulkImportUploadStep";
import { BulkImportMappingStep } from "./BulkImportMappingStep";
import { BulkImportImportingStep } from "./BulkImportImportingStep";
import { BulkImportDoneStep } from "./BulkImportDoneStep";

interface Props {
  onClose: () => void;
  onImported?: () => void;
}

export function BulkImportModal({ onClose, onImported }: Props) {
  const bulk = useBulkImport(onImported);

  const stepLabel = {
    upload: "Upload a CSV file",
    map: `Mapping columns — ${bulk.file?.name ?? ""}`,
    importing: `Importing ${bulk.importProgress} of ${bulk.importTotal}…`,
    done: `Import complete — ${bulk.importSucceeded} created`,
  }[bulk.step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={bulk.step === "importing" ? undefined : onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-card shadow-xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl bg-orange-500 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Bulk Import Employees</h2>
            <p className="mt-0.5 text-xs text-orange-200">{stepLabel}</p>
          </div>
          {bulk.step !== "importing" && (
            <button onClick={onClose} aria-label="Close" className="text-orange-200 hover:text-white">✕</button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-border">
          {([
            { key: "upload", label: "Upload File" },
            { key: "map", label: "Map & Preview" },
            { key: "importing", label: "Importing" },
          ] as const).map((s, i) => {
            const stepOrder = ["upload", "map", "importing", "done"] as const;
            const currentIdx = stepOrder.indexOf(bulk.step);
            const thisIdx = stepOrder.indexOf(s.key);
            const isActive = bulk.step === s.key || (s.key === "importing" && bulk.step === "done");
            const isPast = thisIdx < currentIdx;
            return (
              <div key={s.key} className={`flex-1 px-4 py-2.5 text-center text-xs font-medium transition-colors ${
                isActive ? "border-b-2 border-orange-500 text-orange-600"
                  : isPast ? "text-green-600"
                  : "text-muted-foreground"
              }`}>
                {isPast ? "✓" : `${i + 1}.`} {s.label}
              </div>
            );
          })}
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
          {bulk.step === "upload" && (
            <BulkImportUploadStep
              fileError={bulk.fileError}
              dragOver={bulk.dragOver}
              inputRef={bulk.inputRef}
              onDragOver={(e) => { e.preventDefault(); bulk.setDragOver(true); }}
              onDragLeave={() => bulk.setDragOver(false)}
              onDrop={bulk.handleDrop}
              onFileInput={bulk.handleFileInput}
            />
          )}

          {bulk.step === "map" && bulk.file && (
            <BulkImportMappingStep
              file={bulk.file}
              csvRows={bulk.csvRows}
              mappings={bulk.mappings}
              parsedRows={bulk.parsedRows}
              dualNameReversed={bulk.dualNameReversed}
              previewFilter={bulk.previewFilter}
              previewPage={bulk.previewPage}
              previewPageSize={bulk.previewPageSize}
              isCheckingDupes={bulk.isCheckingDupes}
              requiredFieldsMapped={bulk.requiredFieldsMapped}
              validRows={bulk.validRows}
              dupeCount={bulk.dupeCount}
              errorCount={bulk.errorCount}
              rejectedCount={bulk.rejectedCount}
              missingOptionalCount={bulk.missingOptionalCount}
              totalRows={bulk.totalRows}
              onChangeFile={bulk.resetToUpload}
              onUpdateMapping={bulk.updateMapping}
              onToggleDualNameReversed={() => bulk.setDualNameReversed((v) => !v)}
              onSetPreviewFilter={bulk.setPreviewFilter}
              onSetPreviewPage={bulk.setPreviewPage}
              onSetPreviewPageSize={bulk.setPreviewPageSize}
              onToggleReview={bulk.toggleReview}
              getMappedFields={bulk.getMappedFields}
            />
          )}

          {bulk.step === "importing" && (
            <BulkImportImportingStep
              importProgress={bulk.importProgress}
              importTotal={bulk.importTotal}
              importSucceeded={bulk.importSucceeded}
              importFailed={bulk.importFailed}
            />
          )}

          {bulk.step === "done" && (
            <BulkImportDoneStep
              importSucceeded={bulk.importSucceeded}
              importFailed={bulk.importFailed}
              missingOptionalCount={bulk.missingOptionalCount}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          {bulk.step === "map" ? (
            <button onClick={() => bulk.resetToUpload()} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              ← Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            {bulk.step === "done" ? (
              <button onClick={onClose} className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
                Close
              </button>
            ) : bulk.step === "importing" ? (
              <button disabled className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed">
                Importing…
              </button>
            ) : (
              <>
                <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary">
                  Cancel
                </button>
                {bulk.step === "map" && (
                  <button
                    disabled={!bulk.requiredFieldsMapped || bulk.validRows === 0 || bulk.isCheckingDupes}
                    onClick={() => { void bulk.handleImport(); }}
                    title={
                      !bulk.requiredFieldsMapped ? "Map all required columns first"
                        : bulk.validRows === 0 ? "No valid rows to import"
                        : bulk.isCheckingDupes ? "Checking for duplicates…"
                        : undefined
                    }
                    className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Import {bulk.validRows > 0 ? `${bulk.validRows} Employee${bulk.validRows > 1 ? "s" : ""}` : "Employees"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
