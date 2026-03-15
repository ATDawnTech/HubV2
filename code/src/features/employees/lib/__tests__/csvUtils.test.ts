import { describe, it, expect } from "vitest";
import {
  normalise,
  toTitleCase,
  matchHeader,
  parseCsv,
  hasSpecialChars,
  hasExtraSpaces,
  formatBytes,
} from "../csvUtils";

// ---------------------------------------------------------------------------
// normalise
// ---------------------------------------------------------------------------

describe("normalise", () => {
  it("lowercases and trims", () => {
    expect(normalise("  First Name  ")).toBe("first_name");
  });

  it("collapses spaces to underscores", () => {
    expect(normalise("last name")).toBe("last_name");
  });

  it("collapses dashes to underscores", () => {
    expect(normalise("hire-date")).toBe("hire_date");
  });

  it("collapses mixed whitespace and separators", () => {
    expect(normalise("work  mode")).toBe("work_mode");
  });

  it("handles already-normalised input unchanged", () => {
    expect(normalise("work_email")).toBe("work_email");
  });

  it("handles empty string", () => {
    expect(normalise("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// toTitleCase
// ---------------------------------------------------------------------------

describe("toTitleCase", () => {
  it("capitalises the first letter and lowercases the rest", () => {
    expect(toTitleCase("jane")).toBe("Jane");
    expect(toTitleCase("SMITH")).toBe("Smith");
  });

  it("handles already-titlecased strings", () => {
    expect(toTitleCase("Jane")).toBe("Jane");
  });

  it("handles single-character strings", () => {
    expect(toTitleCase("a")).toBe("A");
  });

  it("handles empty string without throwing", () => {
    expect(toTitleCase("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// matchHeader
// ---------------------------------------------------------------------------

describe("matchHeader", () => {
  it("matches exact field names", () => {
    expect(matchHeader("first_name")).toBe("first_name");
    expect(matchHeader("last_name")).toBe("last_name");
    expect(matchHeader("work_email")).toBe("work_email");
    expect(matchHeader("hire_date")).toBe("hire_date");
  });

  it("matches common Entra ID variants", () => {
    expect(matchHeader("givenName")).toBe("first_name");
    expect(matchHeader("surname")).toBe("last_name");
    expect(matchHeader("userprincipalname")).toBe("work_email");
    expect(matchHeader("employeeHireDate")).toBe("hire_date");
  });

  it("matches with extra whitespace and casing", () => {
    expect(matchHeader("First Name")).toBe("first_name");
    expect(matchHeader("  Last Name  ")).toBe("last_name");
    expect(matchHeader("Work Email")).toBe("work_email");
  });

  it("matches full-name headers to __dual_name", () => {
    expect(matchHeader("name")).toBe("__dual_name");
    expect(matchHeader("Full Name")).toBe("__dual_name");
    expect(matchHeader("displayName")).toBe("__dual_name");
    expect(matchHeader("cn")).toBe("__dual_name");
  });

  it("returns null for unrecognised headers", () => {
    expect(matchHeader("random_column")).toBeNull();
    expect(matchHeader("")).toBeNull();
    expect(matchHeader("unknown_field_xyz")).toBeNull();
  });

  it("matches department aliases", () => {
    expect(matchHeader("dept")).toBe("department");
    expect(matchHeader("orgUnitPath")).toBe("department");
  });

  it("matches location aliases", () => {
    expect(matchHeader("office")).toBe("location");
    expect(matchHeader("city")).toBe("location");
    expect(matchHeader("officeLocation")).toBe("location");
  });

  it("matches job_title aliases", () => {
    expect(matchHeader("title")).toBe("job_title");
    expect(matchHeader("position")).toBe("job_title");
    expect(matchHeader("designation")).toBe("job_title");
  });
});

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

describe("parseCsv", () => {
  it("parses a simple CSV with header row", () => {
    const text = "first_name,last_name,work_email\nJane,Smith,Jane.Smith@AtDawnTech.com";
    const { headers, rows } = parseCsv(text);
    expect(headers).toEqual(["first_name", "last_name", "work_email"]);
    expect(rows).toEqual([["Jane", "Smith", "Jane.Smith@AtDawnTech.com"]]);
  });

  it("returns empty headers and rows for empty input", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
    expect(parseCsv("   \n  ")).toEqual({ headers: [], rows: [] });
  });

  it("handles headers-only CSV (no data rows)", () => {
    const { headers, rows } = parseCsv("first_name,last_name");
    expect(headers).toEqual(["first_name", "last_name"]);
    expect(rows).toEqual([]);
  });

  it("handles multiple data rows", () => {
    const text = "a,b\n1,2\n3,4";
    const { rows } = parseCsv(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(["1", "2"]);
    expect(rows[1]).toEqual(["3", "4"]);
  });

  it("handles quoted fields with commas inside", () => {
    const text = `name,dept\n"Smith, Jane",Engineering`;
    const { rows } = parseCsv(text);
    expect(rows[0]).toEqual(["Smith, Jane", "Engineering"]);
  });

  it("handles escaped double-quotes inside quoted fields", () => {
    const text = `name\n"He said ""hello"""`;
    const { rows } = parseCsv(text);
    expect(rows[0]).toEqual(['He said "hello"']);
  });

  it("strips Windows-style carriage returns (CRLF)", () => {
    const text = "a,b\r\n1,2\r\n3,4";
    const { rows } = parseCsv(text);
    expect(rows).toHaveLength(2);
  });

  it("skips blank lines", () => {
    const text = "a,b\n\n1,2\n\n3,4\n";
    const { rows } = parseCsv(text);
    expect(rows).toHaveLength(2);
  });

  it("trims whitespace from unquoted fields", () => {
    const text = "a, b , c\n 1 , 2 , 3 ";
    const { rows } = parseCsv(text);
    expect(rows[0]).toEqual(["1", "2", "3"]);
  });
});

// ---------------------------------------------------------------------------
// hasSpecialChars
// ---------------------------------------------------------------------------

describe("hasSpecialChars", () => {
  it("returns false for normal names and emails", () => {
    expect(hasSpecialChars("Jane Smith")).toBe(false);
    expect(hasSpecialChars("Jane.Smith@AtDawnTech.com")).toBe(false);
    expect(hasSpecialChars("O'Brien")).toBe(false);
    expect(hasSpecialChars("Smith-Jones")).toBe(false);
  });

  it("returns true for special characters", () => {
    expect(hasSpecialChars("Jane<Smith>")).toBe(true);
    expect(hasSpecialChars("name\x00null")).toBe(true);
    expect(hasSpecialChars("test!name")).toBe(true);
  });

  it("returns false for commas (allowed in the pattern)", () => {
    expect(hasSpecialChars("Smith, Jane")).toBe(false);
  });

  it("returns false for numbers and spaces", () => {
    expect(hasSpecialChars("Floor 42 Building")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasExtraSpaces
// ---------------------------------------------------------------------------

describe("hasExtraSpaces", () => {
  it("returns false for normal strings", () => {
    expect(hasExtraSpaces("Jane Smith")).toBe(false);
    expect(hasExtraSpaces("Engineering")).toBe(false);
  });

  it("returns true when there is leading whitespace", () => {
    expect(hasExtraSpaces(" Jane")).toBe(true);
  });

  it("returns true when there is trailing whitespace", () => {
    expect(hasExtraSpaces("Jane ")).toBe(true);
  });

  it("returns true when there are multiple consecutive spaces", () => {
    expect(hasExtraSpaces("Jane  Smith")).toBe(true);
  });

  it("returns false for empty string (nothing to trim)", () => {
    expect(hasExtraSpaces("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatBytes
// ---------------------------------------------------------------------------

describe("formatBytes", () => {
  it("formats bytes below 1 KB as bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats values between 1 KB and 1 MB as KB", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats values 1 MB and above as MB", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
