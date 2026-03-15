// ── Types ──────────────────────────────────────────────────────────────────────

export type Step = "upload" | "map" | "importing" | "done";

export interface FieldDef {
  field: string;
  label: string;
  required: boolean;
  example: string;
  notes?: string;
}

export interface ColumnMapping {
  csvHeader: string;
  mappedField: string | null; // null = skip
  confidence: "exact" | "fuzzy" | "manual" | "none";
}

export interface ParsedRow {
  values: Record<string, string>;
  issues: string[];
  isDuplicate: boolean;
  reviewStatus: "pending" | "approved" | "rejected";
}

// ── Field definitions ──────────────────────────────────────────────────────────

export const EXPECTED_COLUMNS: FieldDef[] = [
  { field: "first_name",  label: "First Name",  required: true,  example: "Jane" },
  { field: "last_name",   label: "Last Name",   required: true,  example: "Smith" },
  { field: "work_email",  label: "Work Email",  required: true,  example: "Jane.Smith@AtDawnTech.com", notes: "Must be @AtDawnTech.com" },
  { field: "department",  label: "Department",  required: false, example: "Engineering", notes: "Update required if missing" },
  { field: "location",    label: "Location",    required: false, example: "New York", notes: "Update required if missing" },
  { field: "hire_type",   label: "Hire Type",   required: false, example: "full_time", notes: "Update required if missing" },
  { field: "work_mode",   label: "Work Mode",   required: false, example: "hybrid", notes: "Update required if missing" },
  { field: "job_title",   label: "Job Title",   required: false, example: "Software Engineer" },
  { field: "hire_date",   label: "Hire Date",   required: false, example: "2024-01-15", notes: "YYYY-MM-DD" },
];

// ── Smart column matching ──────────────────────────────────────────────────────
// Maps common header names from Entra ID, Google Workspace, AWS SSO, etc.

export const COLUMN_ALIASES: Record<string, string[]> = {
  first_name: [
    "first_name", "firstname", "first name", "given_name", "givenname",
    "given name", "forename", "name.givenname", "name_first",
  ],
  last_name: [
    "last_name", "lastname", "last name", "surname", "family_name",
    "familyname", "family name", "name.familyname", "name_last", "sn",
  ],
  work_email: [
    "work_email", "workemail", "work email", "email", "mail",
    "userprincipalname", "user_principal_name", "primaryemail",
    "primary_email", "primary email", "emailaddress", "email_address",
    "emails.value", "userEmail",
  ],
  department: [
    "department", "dept", "org_department", "organizations.department",
    "orgunitpath", "org_unit",
  ],
  location: [
    "location", "office", "officelocation", "office_location",
    "physicaldeliveryofficename", "city", "addresses.locality",
    "building", "work_location",
  ],
  hire_type: [
    "hire_type", "hiretype", "hire type", "employment_type",
    "employmenttype", "employment type", "employee_type", "employeetype",
    "contract_type",
  ],
  work_mode: [
    "work_mode", "workmode", "work mode", "remote_status",
    "work_arrangement", "working_mode",
  ],
  job_title: [
    "job_title", "jobtitle", "job title", "title", "position",
    "organizations.title", "role", "designation",
  ],
  hire_date: [
    "hire_date", "hiredate", "hire date", "start_date", "startdate",
    "start date", "joining_date", "date_of_joining", "employeehiredate",
  ],
};

// Full-name headers that should auto-map to "Dual Name Cell"
export const FULL_NAME_ALIASES = [
  "name", "full_name", "fullname", "full name", "displayname",
  "display_name", "display name", "employee_name", "employee name",
  "person_name", "cn", "common_name",
];

// ── Pure utility functions ─────────────────────────────────────────────────────

/** Normalise a header string for matching: lowercase, trim, collapse whitespace. */
export function normalise(s: string): string {
  return s.toLowerCase().trim().replace(/[\s_-]+/g, "_");
}

/** Title-case a name: "jane" → "Jane", "SMITH" → "Smith" */
export function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Try to match a CSV header to a HubV2 field. Returns field name, "__dual_name", or null. */
export function matchHeader(header: string): string | null {
  const norm = normalise(header);
  if (FULL_NAME_ALIASES.some((a) => normalise(a) === norm)) return "__dual_name";
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((a) => normalise(a) === norm)) return field;
  }
  return null;
}

/** Parse a CSV string into headers and row arrays. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { fields.push(current.trim()); current = ""; }
        else { current += ch; }
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const headers = parseLine(lines[0]!);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

/** Check if a text field value has special characters. */
export function hasSpecialChars(s: string): boolean {
  return /[^a-zA-Z0-9\s\-'.@,]/.test(s);
}

/** Check if a value has leading/trailing or multiple consecutive spaces. */
export function hasExtraSpaces(s: string): boolean {
  return s !== s.trim() || /\s{2,}/.test(s);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
