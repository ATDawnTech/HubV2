import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDraftPersistence } from "../useDraftPersistence";

const DRAFT_KEY = "create-employee-draft";

/** Build minimal mocks matching the react-hook-form function signatures. */
function makeMocks() {
  const mockUnsubscribe = vi.fn();
  // watch(callback) returns { unsubscribe }
  const mockWatch = vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe });
  const mockSetValue = vi.fn();
  const mockOnEmailInDraft = vi.fn();
  return { mockWatch, mockSetValue, mockOnEmailInDraft, mockUnsubscribe };
}

describe("useDraftPersistence", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("hasDraft is false when localStorage is empty", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft } = makeMocks();

    const { result } = renderHook(() =>
      useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
    );

    expect(result.current.hasDraft).toBe(false);
    expect(mockSetValue).not.toHaveBeenCalled();
  });

  it("restores draft values into the form on mount", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft } = makeMocks();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ first_name: "Jane", last_name: "Smith" }));

    renderHook(() =>
      useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
    );

    expect(mockSetValue).toHaveBeenCalledWith("first_name", "Jane", { shouldValidate: false, shouldDirty: false });
    expect(mockSetValue).toHaveBeenCalledWith("last_name", "Smith", { shouldValidate: false, shouldDirty: false });
  });

  it("sets hasDraft true when draft contains meaningful content", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft } = makeMocks();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ first_name: "Jane", department: "Engineering" }));

    const { result } = renderHook(() =>
      useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
    );

    expect(result.current.hasDraft).toBe(true);
  });

  it("does not set hasDraft when draft exists but has no meaningful content", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft } = makeMocks();
    // Draft with only empty string fields — no first_name, last_name, department, hire_type
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ job_title: "", hire_date: "" }));

    const { result } = renderHook(() =>
      useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
    );

    expect(result.current.hasDraft).toBe(false);
  });

  it("calls onEmailInDraft when restored draft contains a work_email", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft } = makeMocks();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ work_email: "Jane.Smith@AtDawnTech.com" }));

    renderHook(() =>
      useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
    );

    expect(mockOnEmailInDraft).toHaveBeenCalledOnce();
  });

  it("does not call onEmailInDraft when draft has no work_email", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft } = makeMocks();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ first_name: "Jane" }));

    renderHook(() =>
      useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
    );

    expect(mockOnEmailInDraft).not.toHaveBeenCalled();
  });

  it("skips empty-string fields when restoring draft (does not call setValue with '')", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft } = makeMocks();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ first_name: "Jane", job_title: "" }));

    renderHook(() =>
      useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
    );

    expect(mockSetValue).toHaveBeenCalledWith("first_name", "Jane", expect.any(Object));
    const calls = mockSetValue.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain("job_title"); // empty string skipped
  });

  it("clearDraft removes the key from localStorage and sets hasDraft false", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft } = makeMocks();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ first_name: "Jane" }));

    const { result } = renderHook(() =>
      useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
    );
    expect(result.current.hasDraft).toBe(true);

    act(() => { result.current.clearDraft(); });

    expect(result.current.hasDraft).toBe(false);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("does not throw when localStorage contains corrupt JSON", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft } = makeMocks();
    localStorage.setItem(DRAFT_KEY, "not-valid-json{{{");

    expect(() =>
      renderHook(() =>
        useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
      ),
    ).not.toThrow();
  });

  it("subscribes to form changes via watch and unsubscribes on unmount", () => {
    const { mockWatch, mockSetValue, mockOnEmailInDraft, mockUnsubscribe } = makeMocks();

    const { unmount } = renderHook(() =>
      useDraftPersistence({ setValue: mockSetValue, watch: mockWatch, onEmailInDraft: mockOnEmailInDraft }),
    );

    expect(mockWatch).toHaveBeenCalled();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
