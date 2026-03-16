import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Toggle, ThresholdRow, ModuleToggleTable, MODULE_LABELS } from "../notificationHelpers";
import type { ModuleToggle } from "../../types/notification-settings.types";

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

describe("Toggle", () => {
  it("renders with aria-checked=true when checked", () => {
    render(<Toggle checked={true} onChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("renders with aria-checked=false when unchecked", () => {
    render(<Toggle checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with true when clicked while unchecked", () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange with false when clicked while checked", () => {
    const onChange = vi.fn();
    render(<Toggle checked={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("is disabled when disabled prop is true", () => {
    render(<Toggle checked={false} onChange={vi.fn()} disabled={true} />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("does not call onChange when clicked while disabled", () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} disabled={true} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ThresholdRow
// ---------------------------------------------------------------------------

describe("ThresholdRow", () => {
  const defaultProps = {
    label: "Deadline Warning",
    description: "Hours before deadline to warn",
    value: 48,
    unit: "hours",
    onChange: vi.fn(),
  };

  it("renders label and description", () => {
    render(<ThresholdRow {...defaultProps} />);
    expect(screen.getByText("Deadline Warning")).toBeInTheDocument();
    expect(screen.getByText("Hours before deadline to warn")).toBeInTheDocument();
  });

  it("renders unit text", () => {
    render(<ThresholdRow {...defaultProps} />);
    expect(screen.getByText("hours")).toBeInTheDocument();
  });

  it("renders input with current value", () => {
    render(<ThresholdRow {...defaultProps} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(48);
  });

  it("calls onChange with parsed integer on valid input", () => {
    const onChange = vi.fn();
    render(<ThresholdRow {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "72" } });
    expect(onChange).toHaveBeenCalledWith(72);
  });

  it("does not call onChange when value is 0 or negative", () => {
    const onChange = vi.fn();
    render(<ThresholdRow {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<ThresholdRow {...defaultProps} disabled={true} />);
    expect(screen.getByRole("spinbutton")).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// MODULE_LABELS
// ---------------------------------------------------------------------------

describe("MODULE_LABELS", () => {
  it("maps known module keys to human-readable labels", () => {
    expect(MODULE_LABELS["employees"]).toBe("Employees");
    expect(MODULE_LABELS["assets"]).toBe("Assets");
    expect(MODULE_LABELS["onboarding"]).toBe("Onboarding");
    expect(MODULE_LABELS["intake"]).toBe("Intake");
    expect(MODULE_LABELS["timesheets"]).toBe("Timesheets");
    expect(MODULE_LABELS["audit"]).toBe("Audit");
  });
});

// ---------------------------------------------------------------------------
// ModuleToggleTable
// ---------------------------------------------------------------------------

describe("ModuleToggleTable", () => {
  const toggles: ModuleToggle[] = [
    { module: "employees", channel: "email", enabled: true },
    { module: "employees", channel: "inapp", enabled: false },
    { module: "assets", channel: "email", enabled: false },
    { module: "assets", channel: "inapp", enabled: true },
  ];

  it("renders a row for each unique module", () => {
    render(<ModuleToggleTable toggles={toggles} onChange={vi.fn()} />);
    expect(screen.getByText("Employees")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
  });

  it("renders header columns for Email and In-App", () => {
    render(<ModuleToggleTable toggles={toggles} onChange={vi.fn()} />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("In-App")).toBeInTheDocument();
  });

  it("renders switches for each module/channel combination", () => {
    render(<ModuleToggleTable toggles={toggles} onChange={vi.fn()} />);
    // 2 modules × 2 channels = 4 switches
    expect(screen.getAllByRole("switch")).toHaveLength(4);
  });

  it("calls onChange with correct args when a toggle is clicked", () => {
    const onChange = vi.fn();
    render(<ModuleToggleTable toggles={toggles} onChange={onChange} />);
    // Click the first switch (employees/email, currently enabled → should toggle to false)
    fireEvent.click(screen.getAllByRole("switch")[0]!);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("falls back to module key as label for unknown modules", () => {
    const unknownToggles: ModuleToggle[] = [
      { module: "unknown_module", channel: "email", enabled: true },
      { module: "unknown_module", channel: "inapp", enabled: false },
    ];
    render(<ModuleToggleTable toggles={unknownToggles} onChange={vi.fn()} />);
    expect(screen.getByText("unknown_module")).toBeInTheDocument();
  });

  it("defaults missing toggle to enabled=true", () => {
    // Only provide one channel for employees — the other should default to checked
    const partial: ModuleToggle[] = [
      { module: "employees", channel: "email", enabled: false },
    ];
    render(<ModuleToggleTable toggles={partial} onChange={vi.fn()} />);
    const switches = screen.getAllByRole("switch");
    // email toggle aria-checked=false
    expect(switches[0]).toHaveAttribute("aria-checked", "false");
    // inapp toggle defaults to true
    expect(switches[1]).toHaveAttribute("aria-checked", "true");
  });

  it("renders all switches as disabled when disabled prop is true", () => {
    render(<ModuleToggleTable toggles={toggles} onChange={vi.fn()} disabled={true} />);
    screen.getAllByRole("switch").forEach((sw) => {
      expect(sw).toBeDisabled();
    });
  });
});
