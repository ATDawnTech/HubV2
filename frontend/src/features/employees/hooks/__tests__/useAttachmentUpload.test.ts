import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useAttachmentUpload } from "../useAttachmentUpload";

/** Helper: builds a FileList-compatible object from an array of Files. */
function makeFileList(files: File[]): FileList {
  return Object.assign(files, {
    item: (i: number) => files[i] ?? null,
  }) as unknown as FileList;
}

function makeFile(name: string, content = "x"): File {
  return new File([content], name, { type: "text/plain" });
}

describe("useAttachmentUpload", () => {
  it("starts with no pending files and dragOver false", () => {
    const { result } = renderHook(() => useAttachmentUpload());

    expect(result.current.pendingFiles).toHaveLength(0);
    expect(result.current.dragOver).toBe(false);
  });

  it("addFiles appends files to pendingFiles", () => {
    const { result } = renderHook(() => useAttachmentUpload());
    const fileList = makeFileList([makeFile("a.pdf"), makeFile("b.png")]);

    act(() => { result.current.addFiles(fileList); });

    expect(result.current.pendingFiles).toHaveLength(2);
    expect(result.current.pendingFiles[0]!.name).toBe("a.pdf");
    expect(result.current.pendingFiles[1]!.name).toBe("b.png");
  });

  it("addFiles accumulates across multiple calls", () => {
    const { result } = renderHook(() => useAttachmentUpload());

    act(() => { result.current.addFiles(makeFileList([makeFile("a.pdf")])); });
    act(() => { result.current.addFiles(makeFileList([makeFile("b.png")])); });

    expect(result.current.pendingFiles).toHaveLength(2);
  });

  it("addFiles does nothing when called with null", () => {
    const { result } = renderHook(() => useAttachmentUpload());

    act(() => { result.current.addFiles(null); });

    expect(result.current.pendingFiles).toHaveLength(0);
  });

  it("removeFile removes the file at the given index leaving others intact", () => {
    const { result } = renderHook(() => useAttachmentUpload());
    act(() => {
      result.current.addFiles(makeFileList([makeFile("a.txt"), makeFile("b.txt"), makeFile("c.txt")]));
    });

    act(() => { result.current.removeFile(1); }); // remove b.txt

    expect(result.current.pendingFiles).toHaveLength(2);
    expect(result.current.pendingFiles[0]!.name).toBe("a.txt");
    expect(result.current.pendingFiles[1]!.name).toBe("c.txt");
  });

  it("removeFile at index 0 removes only the first file", () => {
    const { result } = renderHook(() => useAttachmentUpload());
    act(() => {
      result.current.addFiles(makeFileList([makeFile("first.txt"), makeFile("second.txt")]));
    });

    act(() => { result.current.removeFile(0); });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0]!.name).toBe("second.txt");
  });

  it("clearFiles empties all pending files", () => {
    const { result } = renderHook(() => useAttachmentUpload());
    act(() => {
      result.current.addFiles(makeFileList([makeFile("a.txt"), makeFile("b.txt")]));
    });

    act(() => { result.current.clearFiles(); });

    expect(result.current.pendingFiles).toHaveLength(0);
  });

  it("setDragOver updates dragOver state", () => {
    const { result } = renderHook(() => useAttachmentUpload());

    act(() => { result.current.setDragOver(true); });
    expect(result.current.dragOver).toBe(true);

    act(() => { result.current.setDragOver(false); });
    expect(result.current.dragOver).toBe(false);
  });
});
