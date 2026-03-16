import type { TestTemplate } from "../types";

const STORAGE_KEY = "adthub_test_templates";

function readAll(): TestTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TestTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeAll(templates: TestTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export const templateStore = {
  list(): TestTemplate[] {
    return readAll().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  },

  getById(id: string): TestTemplate | undefined {
    return readAll().find((t) => t.id === id);
  },

  save(template: TestTemplate): void {
    const all = readAll();
    const idx = all.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      all[idx] = template;
    } else {
      all.push(template);
    }
    writeAll(all);
  },

  remove(id: string): void {
    writeAll(readAll().filter((t) => t.id !== id));
  },

  duplicate(id: string): TestTemplate | null {
    const source = readAll().find((t) => t.id === id);
    if (!source) return null;
    const now = new Date().toISOString();
    const copy: TestTemplate = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      name: `${source.name} (Copy)`,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    const all = readAll();
    all.push(copy);
    writeAll(all);
    return copy;
  },
};
