import { useState } from "react";

/**
 * Manages the pending file list for the attachment upload area.
 * P3: extracted from CreateEmployeeModal.
 */
export function useAttachmentUpload() {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearFiles() {
    setPendingFiles([]);
  }

  return { pendingFiles, dragOver, setDragOver, addFiles, removeFile, clearFiles };
}
