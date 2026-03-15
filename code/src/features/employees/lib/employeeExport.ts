import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Employee } from "../types/employee.types";

export const EXPORT_HEADERS = [
  "Employee Code", "First Name", "Last Name", "Work Email",
  "Job Title", "Department", "Location", "Hire Type", "Work Mode",
  "Hire Date", "Status",
];

export function rowValues(e: Employee): (string | null | undefined)[] {
  return [
    e.employee_code, e.first_name, e.last_name, e.work_email,
    e.job_title, e.department, e.location, e.hire_type, e.work_mode,
    e.hire_date, e.status,
  ];
}

export function exportCsv(rows: Employee[], filename: string) {
  const escape = (v: string | null | undefined) => {
    const s = v ?? "";
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    EXPORT_HEADERS.join(","),
    ...rows.map((e) => rowValues(e).map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPdf(rows: Employee[]) {
  const today = new Date().toISOString().slice(0, 10);
  const filename = `ADT Employees ${today}.pdf`;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(13);
  doc.text("ADT Employees", 14, 14);
  doc.setFontSize(9);
  doc.text(today, 14, 20);
  autoTable(doc, {
    startY: 25,
    head: [EXPORT_HEADERS],
    body: rows.map((e) => rowValues(e).map((v) => v ?? "—")),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [249, 115, 22] },
  });
  doc.save(filename);
}
