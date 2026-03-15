import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock fn so the vi.mock factory can reference it
const mockCheckEmail = vi.hoisted(() => vi.fn());

vi.mock("../useCheckEmail", () => ({
  useCheckEmail: () => ({ checkEmail: mockCheckEmail, isChecking: false }),
}));

import { useEmailValidation } from "../useEmailValidation";

describe("useEmailValidation", () => {
  const mockSetValue = vi.fn();
  const noErrors = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Email auto-generation ───────────────────────────────────────────────────

  it("auto-generates email from first and last name", () => {
    renderHook(() => useEmailValidation("Jane", "Smith", noErrors, mockSetValue));

    expect(mockSetValue).toHaveBeenCalledWith(
      "work_email",
      "Jane.Smith@AtDawnTech.com",
      { shouldValidate: false, shouldDirty: false },
    );
  });

  it("generates empty email when name is empty", () => {
    renderHook(() => useEmailValidation("", "", noErrors, mockSetValue));

    expect(mockSetValue).toHaveBeenCalledWith("work_email", "", expect.any(Object));
  });

  it("capitalises first letter and lowercases the rest of each name segment", () => {
    renderHook(() => useEmailValidation("JOHN", "DOE", noErrors, mockSetValue));

    expect(mockSetValue).toHaveBeenCalledWith(
      "work_email",
      "John.Doe@AtDawnTech.com",
      expect.any(Object),
    );
  });

  it("strips non-alpha characters from name when generating email", () => {
    renderHook(() => useEmailValidation("Mary-Jane", "O'Brien", noErrors, mockSetValue));

    expect(mockSetValue).toHaveBeenCalledWith(
      "work_email",
      "Maryjane.Obrien@AtDawnTech.com",
      expect.any(Object),
    );
  });

  it("stops auto-generating after markEmailTouched is called", () => {
    const { result, rerender } = renderHook(
      ({ first, last }: { first: string; last: string }) =>
        useEmailValidation(first, last, noErrors, mockSetValue),
      { initialProps: { first: "Jane", last: "Smith" } },
    );

    act(() => { result.current.markEmailTouched(); });
    mockSetValue.mockClear();

    // Name changes — should NOT trigger another auto-generate
    rerender({ first: "Alice", last: "Johnson" });

    expect(mockSetValue).not.toHaveBeenCalled();
  });

  // ── Email availability check ────────────────────────────────────────────────

  it("handleEmailBlur sets emailTakenError when email is already taken", async () => {
    mockCheckEmail.mockResolvedValue(false);
    const { result } = renderHook(() => useEmailValidation("Jane", "Smith", noErrors, mockSetValue));

    await act(async () => {
      await result.current.handleEmailBlur("Jane.Smith@AtDawnTech.com");
    });

    expect(result.current.emailTakenError).toBe("This email is already in use.");
  });

  it("handleEmailBlur clears emailTakenError when email is available", async () => {
    mockCheckEmail.mockResolvedValue(true);
    const { result } = renderHook(() => useEmailValidation("Jane", "Smith", noErrors, mockSetValue));

    await act(async () => {
      await result.current.handleEmailBlur("Jane.Smith@AtDawnTech.com");
    });

    expect(result.current.emailTakenError).toBeNull();
  });

  it("handleEmailBlur skips availability check for non-AtDawnTech email", async () => {
    const { result } = renderHook(() => useEmailValidation("Jane", "Smith", noErrors, mockSetValue));

    await act(async () => {
      await result.current.handleEmailBlur("jane@gmail.com");
    });

    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it("handleEmailBlur skips check when a Zod validation error already exists", async () => {
    const errorsWithEmail = { work_email: { type: "manual", message: "Invalid email" } };
    const { result } = renderHook(() => useEmailValidation("Jane", "Smith", errorsWithEmail, mockSetValue));

    await act(async () => {
      await result.current.handleEmailBlur("Jane.Smith@AtDawnTech.com");
    });

    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it("handleEmailBlur skips check when email is empty", async () => {
    const { result } = renderHook(() => useEmailValidation("Jane", "Smith", noErrors, mockSetValue));

    await act(async () => {
      await result.current.handleEmailBlur("");
    });

    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it("handleEmailBlur check is case-insensitive for the domain", async () => {
    mockCheckEmail.mockResolvedValue(true);
    const { result } = renderHook(() => useEmailValidation("Jane", "Smith", noErrors, mockSetValue));

    await act(async () => {
      await result.current.handleEmailBlur("jane.smith@ATDAWNTECH.COM");
    });

    expect(mockCheckEmail).toHaveBeenCalled();
  });

  // ── State reset helpers ─────────────────────────────────────────────────────

  it("clearEmailTakenError removes the taken error without affecting other state", async () => {
    mockCheckEmail.mockResolvedValue(false);
    const { result } = renderHook(() => useEmailValidation("Jane", "Smith", noErrors, mockSetValue));

    await act(async () => {
      await result.current.handleEmailBlur("Jane.Smith@AtDawnTech.com");
    });
    expect(result.current.emailTakenError).not.toBeNull();

    act(() => { result.current.clearEmailTakenError(); });

    expect(result.current.emailTakenError).toBeNull();
  });

  it("resetEmail clears taken error and re-enables auto-generation", async () => {
    const { result, rerender } = renderHook(
      ({ first, last }: { first: string; last: string }) =>
        useEmailValidation(first, last, noErrors, mockSetValue),
      { initialProps: { first: "Jane", last: "Smith" } },
    );

    act(() => { result.current.markEmailTouched(); });
    mockSetValue.mockClear();

    act(() => { result.current.resetEmail(); });

    // After reset, a name change should trigger auto-generate again
    rerender({ first: "Alice", last: "Johnson" });

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(
        "work_email",
        "Alice.Johnson@AtDawnTech.com",
        expect.any(Object),
      );
    });
  });
});
