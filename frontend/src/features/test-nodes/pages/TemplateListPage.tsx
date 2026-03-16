import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { templateStore } from "../store/templateStore";
import type { TestTemplate } from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TemplateListPage(): JSX.Element {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TestTemplate[]>(() => templateStore.list());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function refresh(): void {
    setTemplates(templateStore.list());
  }

  function handleCreate(): void {
    navigate("/test-nodes/new");
  }

  function handleDuplicate(id: string): void {
    templateStore.duplicate(id);
    refresh();
  }

  function handleDelete(id: string): void {
    templateStore.remove(id);
    setConfirmDelete(null);
    refresh();
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Template Testing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sandbox for prototyping visual templates and the node-based editor (Epic 6.5 / 6.6)
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-5 py-12 text-center">
          <p className="text-sm text-muted-foreground">No test templates yet.</p>
          <button
            onClick={handleCreate}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex flex-col rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Card header — click to edit */}
              <button
                onClick={() => navigate(`/test-nodes/${t.id}`)}
                className="flex-1 px-5 pt-5 pb-4 text-left"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      t.status === "published"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t.nodes.length} node{t.nodes.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(t.updatedAt)}</p>
              </button>

              {/* Card footer actions */}
              <div className="flex items-center gap-3 border-t border-border px-5 py-3">
                <button
                  onClick={() => navigate(`/test-nodes/${t.id}`)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicate(t.id)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => setConfirmDelete(t.id)}
                  className="ml-auto text-xs text-muted-foreground/50 hover:text-destructive"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-card-foreground">Delete Template</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will permanently remove this test template. This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
