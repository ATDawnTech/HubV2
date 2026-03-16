interface Props {
  pendingFiles: File[];
  dragOver: boolean;
  setDragOver: (value: boolean) => void;
  addFiles: (files: FileList | null) => void;
  removeFile: (index: number) => void;
}

/**
 * Drag-and-drop file attachment area.
 * Files are queued locally pending upload endpoint connection.
 *
 * P3: extracted from CreateEmployeeModal.
 */
export function AttachmentsField({ pendingFiles, dragOver, setDragOver, addFiles, removeFile }: Props) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">Attachments</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={`rounded-md border-2 border-dashed px-4 py-5 text-center transition-colors ${
          dragOver ? "border-orange-500 bg-orange-500/5" : "border-border"
        }`}
      >
        <p className="text-sm text-muted-foreground">
          Drag files here or{" "}
          <label className="cursor-pointer text-primary underline underline-offset-2 hover:text-primary/80">
            browse
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
          </label>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Files will be attached once the upload endpoint is connected.
        </p>
      </div>
      {pendingFiles.length > 0 && (
        <ul className="mt-2 space-y-1">
          {pendingFiles.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs">
              <span className="min-w-0 flex-1 truncate text-foreground">{f.name}</span>
              <span className="flex-shrink-0 text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
