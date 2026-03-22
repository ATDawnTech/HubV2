import { useState } from "react";
import { useAssets, useDeleteAsset } from "../hooks/useAssets";
import { Asset } from "../types";
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
import { CreateAssetModal } from "../components/CreateAssetModal";

export function AssetListPage(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const assetsQuery = useAssets(20);
  const deleteMutation = useDeleteAsset();

  const columns: ColumnDef<Asset>[] = [
    // ...
    {
      header: <div className="flex items-center gap-1">ASSET ID</div>,
      cell: (asset) => (
        <span className="font-bold text-[#1e293b] dark:text-white">
          {asset.asset_tag}
        </span>
      ),
    },
    {
      header: (
        <div className="flex items-center gap-1">MANUFACTURER & MODEL</div>
      ),
      cell: (asset) => (
        <span className="text-slate-600 dark:text-slate-400">
          {asset.manufacturer} {asset.model}
        </span>
      ),
    },
    {
      header: <div className="flex items-center gap-1">LOCATION</div>,
      accessorKey: "location",
    },
    {
      header: <div className="flex items-center gap-1">ASSIGNED</div>,
      cell: (asset) => asset.assigned_to || "Unassigned",
    },
    {
      header: <div className="flex items-center gap-1">STATUS</div>,
      cell: (asset) => {
        const status = asset.status?.toLowerCase();
        let background = "bg-slate-100 dark:bg-slate-800/50";
        let text = "text-slate-500 dark:text-slate-400";

        if (
          status === "available" ||
          status === "active" ||
          status === "deployed"
        ) {
          background = "bg-green-100 dark:bg-green-900/30";
          text = "text-green-700 dark:text-green-400";
        } else if (status === "broken" || status === "out for repair") {
          background = "bg-red-100 dark:bg-red-900/30";
          text = "text-red-700 dark:text-red-400";
        }

        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${background} ${text}`}
          >
            {asset.status || "N/A"}
          </span>
        );
      },
    },
    {
      header: <div className="flex items-center gap-1">WARRANTY END DATE</div>,
      accessorKey: "warranty_end_date",
    },
    {
      header: "ACTIONS",
      cell: (asset) => {
        const actionItems: MenuItem[] = [
          {
            key: "edit",
            label: "Edit",
            icon: (
              <span className="material-symbols-outlined text-lg">edit</span>
            ),
            onClick: () => {
              setEditingAsset(asset);
              setIsModalOpen(true);
            },
          },
          {
            key: "delete",
            label: "Delete",
            icon: (
              <span className="material-symbols-outlined text-lg">delete</span>
            ),
            danger: true,
            onClick: () => setDeleteConfirmId(asset.id),
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
    } catch (e) {
      // toast is already handled in hook
    }
  };

  const total = assetsQuery.data?.meta.total ?? 0;
  const items = assetsQuery.data?.items ?? [];

  return (
    <main className="px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Asset Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage and track your IT inventory efficiently
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAsset(null);
            setIsModalOpen(true);
          }}
          leftIcon={
            <span className="material-symbols-outlined text-lg">add</span>
          }
        >
          Add Asset
        </Button>
      </div>

      {assetsQuery.isLoading && <LoadingSpinner message="Loading assets..." />}
      {assetsQuery.isError && (
        <ErrorMessage
          message="Failed to load assets."
          onRetry={() => assetsQuery.refetch()}
        />
      )}

      {assetsQuery.data && (
        <Table
          columns={columns}
          data={items}
          pagination={{
            currentPage: 1,
            totalPages: Math.ceil(total / 20) || 1,
            onNext: assetsQuery.hasNextPage
              ? assetsQuery.goToNextPage
              : undefined,
            onPrevious: assetsQuery.hasPrevPage
              ? assetsQuery.goToPrevPage
              : undefined,
            showingText: `Showing ${items.length} of ${total} results`,
          }}
        />
      )}

      <CreateAssetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAsset(null);
        }}
        onSuccess={() => {
          assetsQuery.refetch();
          setEditingAsset(null);
        }}
        initialData={editingAsset}
      />

      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Asset"
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
          Are you sure you want to delete this asset? This action cannot be
          undone.
        </p>
      </Modal>
    </main>
  );
}
