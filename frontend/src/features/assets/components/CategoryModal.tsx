import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal, Button, Input } from "@/components/ui";
import {
  useCreateCategory,
  useUpdateCategory,
} from "../hooks/useAssetCategories";
import { AssetCategory } from "../types";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: AssetCategory | null;
}

export function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CategoryModalProps) {
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name || "",
          code: initialData.code || "",
          description: initialData.description || "",
        });
      } else {
        reset({ name: "", code: "", description: "" });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onSuccess?.();
      onClose();
      reset();
    } catch {
      // handled by hooks
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">
            {initialData ? "Edit Category" : "Create New Category"}
          </h2>
          <p className="text-sm font-normal text-slate-500">
            Fill in the details for this asset category.
          </p>
        </div>
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Category Name *
          </label>
          <Input
            placeholder="Enter category name"
            {...register("name")}
            hasError={!!errors.name}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Code *
          </label>
          <Input
            placeholder="e.g. LAPTOP, PRINT"
            {...register("code")}
            hasError={!!errors.code}
          />
          {errors.code && (
            <p className="text-xs text-red-500">{errors.code.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Description
          </label>
          <textarea
            {...register("description")}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
            placeholder="Enter description"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="submit"
            className="w-full py-3 text-base"
            isLoading={isPending}
          >
            {initialData ? "Update Category" : "Create Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
