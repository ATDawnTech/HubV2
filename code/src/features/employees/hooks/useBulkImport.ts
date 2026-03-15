import { useEffect, useRef, useState } from "react";
import { employeeService } from "@/services/employee.service";
import type { CreateEmployeeInput } from "../types/employee.types";
import {
  type ColumnMapping,
  type ParsedRow,
  type Step,
  EXPECTED_COLUMNS,
  hasExtraSpaces,
  hasSpecialChars,
  matchHeader,
  normalise,
  parseCsv,
  toTitleCase,
} from "../lib/csvUtils";

export function useBulkImport(onImported?: () => void) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [dualNameReversed, setDualNameReversed] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<"all" | "ready" | "duplicates" | "errors">("all");
  const [previewPage, setPreviewPage] = useState(0);
  const [previewPageSize, setPreviewPageSize] = useState(25);
  const [, setDuplicateEmails] = useState<Set<string>>(new Set());
  const [isCheckingDupes, setIsCheckingDupes] = useState(false);

  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importSucceeded, setImportSucceeded] = useState(0);
  const [importFailed, setImportFailed] = useState<{ name: string; error: string }[]>([]);

  // ── File handling ──────────────────────────────────────────────────────────

  function validateAndSetFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["csv"].includes(ext)) {
      setFileError("Only CSV files are currently supported. Excel support coming soon.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("File is too large. Maximum size is 5 MB.");
      return;
    }
    setFileError(null);
    setFile(f);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0) {
        setFileError("Could not detect any columns. Check the file format.");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);

      const autoMappings: ColumnMapping[] = headers.map((h) => {
        const matched = matchHeader(h);
        return {
          csvHeader: h,
          mappedField: matched,
          confidence: matched ? (normalise(h) === normalise(matched) ? "exact" : "fuzzy") : "none",
        };
      });
      setMappings(autoMappings);
      setStep("map");
    };
    reader.onerror = () => { setFileError("Failed to read file."); };
    reader.readAsText(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
    e.target.value = "";
  }

  function resetToUpload() {
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setMappings([]);
    setParsedRows([]);
    setDuplicateEmails(new Set());
    setStep("upload");
  }

  // ── Review helpers ─────────────────────────────────────────────────────────

  function toggleReview(rowIdx: number) {
    setParsedRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIdx) return r;
        const next = r.reviewStatus === "pending" ? "approved"
          : r.reviewStatus === "approved" ? "rejected"
          : "pending";
        return { ...r, reviewStatus: next as ParsedRow["reviewStatus"] };
      }),
    );
  }

  // ── Mapping helpers ────────────────────────────────────────────────────────

  function updateMapping(index: number, field: string | null) {
    setMappings((prev) => {
      const next = [...prev];
      const m = next[index];
      if (!m) return prev;
      next[index] = { ...m, mappedField: field, confidence: field ? "manual" : "none" };
      return next;
    });
  }

  function getMappedFields(): Set<string> {
    const set = new Set<string>();
    for (const m of mappings) {
      if (!m.mappedField) continue;
      if (m.mappedField === "__dual_name") {
        set.add("first_name");
        set.add("last_name");
        set.add("__dual_name");
      } else {
        set.add(m.mappedField);
      }
    }
    return set;
  }

  // ── Build parsed rows from mappings + CSV data ─────────────────────────────

  useEffect(() => {
    if (csvRows.length === 0 || mappings.length === 0) {
      setParsedRows([]);
      return;
    }

    const rows: ParsedRow[] = csvRows.map((row) => {
      const values: Record<string, string> = {};
      mappings.forEach((m, i) => {
        if (!m.mappedField || row[i] === undefined) return;
        if (m.mappedField === "__dual_name") {
          const raw = row[i]!.trim();
          const spaceIdx = raw.indexOf(" ");
          if (spaceIdx > 0) {
            const partA = toTitleCase(raw.slice(0, spaceIdx).trim());
            const partB = toTitleCase(raw.slice(spaceIdx + 1).trim());
            if (dualNameReversed) {
              values["first_name"] = partB;
              values["last_name"] = partA;
            } else {
              values["first_name"] = partA;
              values["last_name"] = partB;
            }
          } else {
            values["first_name"] = toTitleCase(raw);
          }
        } else {
          values[m.mappedField] = row[i]!;
        }
      });

      const issues: string[] = [];
      for (const col of EXPECTED_COLUMNS) {
        if (col.required && !values[col.field]?.trim()) {
          issues.push(`Missing ${col.label}`);
        }
      }
      const email = values["work_email"];
      if (email && !email.includes("@")) issues.push("Invalid email format");
      if (email && /\.com\.com/i.test(email)) issues.push("Double .com in email");
      const hasExt = Object.values(values).some((v) => /\bEXT\b/.test(v));
      if (hasExt) issues.push("Contains EXT marker");
      for (const field of ["first_name", "last_name", "department", "location", "job_title"] as const) {
        const val = values[field];
        if (val && hasSpecialChars(val)) {
          const label = EXPECTED_COLUMNS.find((c) => c.field === field)?.label ?? field;
          issues.push(`Special chars in ${label}`);
        }
      }
      for (const [field, val] of Object.entries(values)) {
        if (val && hasExtraSpaces(val) && field !== "work_email") {
          const label = EXPECTED_COLUMNS.find((c) => c.field === field)?.label ?? field;
          issues.push(`Extra spaces in ${label}`);
          break;
        }
      }

      return { values, issues, isDuplicate: false, reviewStatus: "pending" as const };
    });

    setParsedRows(rows);
  }, [csvRows, mappings, dualNameReversed]);

  // ── Duplicate email check ──────────────────────────────────────────────────

  useEffect(() => {
    const emails = parsedRows
      .map((r) => r.values["work_email"]?.trim().toLowerCase())
      .filter((e): e is string => !!e);

    if (emails.length === 0) {
      setDuplicateEmails(new Set());
      return;
    }

    let cancelled = false;
    setIsCheckingDupes(true);

    async function checkEmails() {
      const dupes = new Set<string>();
      for (let i = 0; i < emails.length; i += 10) {
        const batch = emails.slice(i, i + 10);
        const results = await Promise.all(
          batch.map(async (email) => {
            try {
              const result = await employeeService.checkEmail(email);
              return { email, available: result.available };
            } catch {
              return { email, available: true };
            }
          }),
        );
        if (cancelled) return;
        for (const r of results) {
          if (!r.available) dupes.add(r.email);
        }
        if (i + 10 < emails.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      if (!cancelled) {
        setDuplicateEmails(dupes);
        setParsedRows((prev) =>
          prev.map((row) => ({
            ...row,
            isDuplicate: dupes.has(row.values["work_email"]?.trim().toLowerCase() ?? ""),
          })),
        );
        setIsCheckingDupes(false);
      }
    }

    void checkEmails();
    return () => { cancelled = true; };
  }, [parsedRows.length, mappings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived stats ──────────────────────────────────────────────────────────

  const hasDualName = mappings.some((m) => m.mappedField === "__dual_name");
  const requiredFieldsMapped = EXPECTED_COLUMNS
    .filter((c) => c.required)
    .every((c) => {
      if (hasDualName && (c.field === "first_name" || c.field === "last_name")) return true;
      return mappings.some((m) => m.mappedField === c.field);
    });

  const totalRows = parsedRows.length;
  const validRows = parsedRows.filter((r) =>
    (r.issues.length === 0 && !r.isDuplicate && r.reviewStatus !== "rejected") ||
    r.reviewStatus === "approved"
  ).length;
  const dupeCount = parsedRows.filter((r) => r.isDuplicate).length;
  const errorCount = parsedRows.filter((r) => r.issues.length > 0 && r.reviewStatus !== "approved").length;
  const rejectedCount = parsedRows.filter((r) => r.reviewStatus === "rejected").length;
  const missingOptionalCount = parsedRows.filter(
    (r) => r.issues.length === 0 && !r.isDuplicate &&
    EXPECTED_COLUMNS.some((c) => !c.required && c.notes?.includes("Update required") && !r.values[c.field]?.trim()),
  ).length;

  // ── Import handler ────────────────────────────────────────────────────────

  async function handleImport() {
    const importable = parsedRows.filter((r) =>
      r.reviewStatus !== "rejected" &&
      ((r.issues.length === 0 && !r.isDuplicate) || r.reviewStatus === "approved")
    );
    if (importable.length === 0) return;

    setStep("importing");
    setImportTotal(importable.length);
    setImportProgress(0);
    setImportSucceeded(0);
    setImportFailed([]);

    let succeeded = 0;
    const failed: { name: string; error: string }[] = [];

    for (let i = 0; i < importable.length; i++) {
      const row = importable[i]!;
      const input: CreateEmployeeInput = {
        first_name: row.values["first_name"]?.trim() ?? "",
        last_name: row.values["last_name"]?.trim() ?? "",
        work_email: row.values["work_email"]?.trim() ?? "",
        department: row.values["department"]?.trim() || undefined,
        location: row.values["location"]?.trim() || undefined,
        hire_type: row.values["hire_type"]?.trim() || undefined,
        work_mode: row.values["work_mode"]?.trim() || undefined,
        job_title: row.values["job_title"]?.trim() || undefined,
        hire_date: row.values["hire_date"]?.trim() || undefined,
        status: "active",
      };

      const name = `${input.first_name} ${input.last_name}`;
      try {
        await employeeService.createEmployee(input);
        succeeded++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        failed.push({ name, error: msg });
      }
      setImportProgress(i + 1);
      setImportSucceeded(succeeded);
      setImportFailed([...failed]);

      if (i < importable.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    setStep("done");
    if (succeeded > 0) onImported?.();
  }

  return {
    step,
    file,
    dragOver,
    setDragOver,
    fileError,
    inputRef,
    csvHeaders,
    csvRows,
    mappings,
    parsedRows,
    dualNameReversed,
    setDualNameReversed,
    previewFilter,
    setPreviewFilter,
    previewPage,
    setPreviewPage,
    previewPageSize,
    setPreviewPageSize,
    isCheckingDupes,
    importProgress,
    importTotal,
    importSucceeded,
    importFailed,
    requiredFieldsMapped,
    totalRows,
    validRows,
    dupeCount,
    errorCount,
    rejectedCount,
    missingOptionalCount,
    handleDrop,
    handleFileInput,
    resetToUpload,
    toggleReview,
    updateMapping,
    getMappedFields,
    handleImport,
  };
}
