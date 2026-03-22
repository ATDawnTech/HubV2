import { useState } from "react";
import {
  useAssetCategories,
  useDeleteCategory,
} from "../hooks/useAssetCategories";
import { AssetCategory } from "../types";
import {
  LoadingSpinner,
  ErrorMessage,
  Table,
  ColumnDef,
  Menu,
  MenuItem,
  Button,
  Modal,
} from "@/components/ui";
import { CategoryModal } from "../components/CategoryModal";

export function AssetCategoryListPage(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const categoriesQuery = useAssetCategories(20);
  const deleteMutation = useDeleteCategory();

  const columns: ColumnDef<AssetCategory>[] = [
    {
      header: "Category Name",
      accessorKey: "name",
      className: "font-medium text-slate-900 dark:text-white",
    },
    {
      header: "Code",
      accessorKey: "code",
    },
    {
      header: "Description",
      accessorKey: "description",
    },
    {
      header: "Created At",
      cell: (cat) =>
        cat.created_at
          ? new Date(cat.created_at).toLocaleDateString()
          : "N/A",
    },
    {
      header: "ACTIONS",
      cell: (cat) => {
        const actionItems: MenuItem[] = [
          {
            key: "edit",
            label: "Edit",
            icon: (
              <span className="material-symbols-outlined text-lg">edit</span>
            ),
            onClick: () => {
              setEditingCategory(cat);
              setIsModalOpen(true);
            },
          },
          {
            key: "delete",
            label: "Delete",
            icon: (
              <span className="material-symbols-outlined text-lg">
                delete
              </span>
            ),
            danger: true,
            onClick: () => setDeleteConfirmId(cat.id),
          },
        ];

        return (
          <Menu items={actionItems}>
            <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </Menu>
        );
      },
    },
  ];

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch {
      // toast handled in hook
    }
  };

  const categories = categoriesQuery.data?.items ?? [];
  const total = categoriesQuery.data?.meta.total ?? 0;

  return (
    <main className="px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Asset Categories
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} total categories found.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          leftIcon={
            <span className="material-symbols-outlined text-lg">category</span>
          }
        >
          Add Category
        </Button>
      </div>

      {categoriesQuery.isError && (
        <ErrorMessage
          message="Failed to load categories."
          onRetry={() => categoriesQuery.refetch()}
        />
      )}

      {categoriesQuery.isLoading && !categoriesQuery.data && (
        <LoadingSpinner message="Loading categories..." />
      )}

      {categoriesQuery.data && (
        <div
          className={`relative transition-opacity ${categoriesQuery.isFetching ? "opacity-60" : "opacity-100"}`}
        >
          {categoriesQuery.isFetching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/30 dark:bg-gray-800/30 backdrop-blur-[1px]">
              <LoadingSpinner message="" className="py-0" />
            </div>
          )}
          <Table
            columns={columns}
            data={categories}
            pagination={{
              currentPage: 1,
              totalPages: Math.ceil(total / 20) || 1,
              onNext: categoriesQuery.hasNextPage
                ? categoriesQuery.goToNextPage
                : undefined,
              onPrevious: categoriesQuery.hasPrevPage
                ? categoriesQuery.goToPrevPage
                : undefined,
              showingText: `Showing ${categories.length} of ${total} results`,
            }}
          />
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={() => {
          categoriesQuery.refetch();
          setEditingCategory(null);
        }}
        initialData={editingCategory}
      />

      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Category"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-400">
          Are you sure you want to delete this category? This action cannot be
          undone.
        </p>
      </Modal>
    </main>
  );
}
