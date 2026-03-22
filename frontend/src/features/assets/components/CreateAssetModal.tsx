import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Modal,
  Button,
  Input,
  DatePicker,
  CustomSelect,
} from "@/components/ui";
import { useAssetCategories } from "../hooks/useAssetCategories";
import { useCreateAsset, useUpdateAsset } from "../hooks/useAssets";
import { useEmployees } from "../../employees/hooks/useEmployees";
import { useDropdownOptions } from "../../admin-settings/hooks/useDropdownOptions";
import { assetService } from "@/services/asset.service";
import { Asset } from "../types";

// Temporary schema for asset creation
const assetSchema = z.object({
  asset_tag: z.string().min(1, "Asset ID is required"),
  model: z.string().min(1, "Manufacturer and model is required"),
  location: z.string().min(1, "Location is required"),
  category: z.string().min(1, "Category is required"),
  assigned_to: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  serial_number: z.string().optional(),
  vendor: z.string().optional(),
  warranty_start_date: z.string().optional(),
  warranty_end_date: z.string().optional(),
  procurement_date: z.string().min(1, "Procurement date is required"),
  notes: z.string().optional(),
  belongs_to_adt: z.boolean().default(true),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Asset | null;
}

export function CreateAssetModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CreateAssetModalProps) {
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      belongs_to_adt: true,
      status: "available",
      assigned_to: "Unassigned",
    },
  });

  const belongsToAdt = watch("belongs_to_adt");
  const watchedLocation = watch("location");
  const watchedCategory = watch("category");

  const { data: categoriesData, isLoading: isLoadingCategories } =
    useAssetCategories(100);
  const categories = (categoriesData?.items ?? []).map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees({
    limit: 100,
  });
  const employeesOptions = [
    { label: "Unassigned", value: "Unassigned" },
    ...(employeesData?.employees ?? []).map((e) => ({
    label: `${e.first_name} ${e.last_name}`,
      value: e.id,
    })),
  ];

  const { data: locationOptions, isLoading: isLoadingLocations } =
    useDropdownOptions("assets", "location");
  const locations = (locationOptions ?? []).map((o) => ({
    label: o.value,
    value: o.value,
  }));

  const { data: statusOptions, isLoading: isLoadingStatuses } =
    useDropdownOptions("assets", "asset_status");
  const statuses = (statusOptions ?? []).map((o) => ({
    label: o.value,
    value: o.value,
  }));

  // Auto-generate asset tag when location + category are both filled (create mode only)
  useEffect(() => {
    if (initialData) return; // skip in edit mode
    if (!watchedLocation || !watchedCategory) return;

    assetService
      .getNextAssetTag(watchedLocation, watchedCategory)
      .then((tag) => setValue("asset_tag", tag))
      .catch(() => {}); // silently ignore errors
  }, [watchedLocation, watchedCategory, initialData, setValue]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          asset_tag: initialData.asset_tag || "",
          model: initialData.model || "",
          location: initialData.location || "",
          category: initialData.category_id || "",
          assigned_to: initialData.assigned_to || "Unassigned",
          status: initialData.status || "available",
          serial_number: initialData.serial_number || "",
          vendor: initialData.vendor || "",
          warranty_start_date: initialData.warranty_start_date || "",
          warranty_end_date: initialData.warranty_end_date || "",
          procurement_date: initialData.procurement_date || "",
          notes: initialData.notes || "",
          belongs_to_adt: true,
        });
      } else {
        reset({
          asset_tag: "",
          model: "",
          location: "",
          category: "",
          assigned_to: "Unassigned",
          status: "available",
          serial_number: "",
          vendor: "",
          warranty_start_date: "",
          warranty_end_date: "",
          procurement_date: "",
          notes: "",
          belongs_to_adt: true,
        });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: AssetFormValues) => {
    try {
      const payload = {
        ...data,
        category_id: data.category !== "" ? data.category : null,
        assigned_to:
          data.assigned_to === "Unassigned" ? null : data.assigned_to,
      };

      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess?.();
      onClose();
      reset();
    } catch (error) {
      console.error("Failed to save asset:", error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">
            {initialData ? "Edit Asset" : "Create New Asset"}
          </h2>
          <p className="text-sm font-normal text-slate-500">
            Fill in the details to register/update an asset in the inventory.
          </p>
        </div>
      }
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Belongs to ADT Toggle */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Does this asset belong to ADT? *
          </label>
          <div className="flex w-fit rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setValue("belongs_to_adt", true)}
              className={`px-6 py-1.5 text-sm font-medium rounded-md transition-all ${
                belongsToAdt
                  ? "bg-white dark:bg-slate-700 text-orange-500 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setValue("belongs_to_adt", false)}
              className={`px-6 py-1.5 text-sm font-medium rounded-md transition-all ${
                !belongsToAdt
                  ? "bg-white dark:bg-slate-700 text-orange-500 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              No
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Location */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Location *
                {isLoadingLocations && (
                  <span className="animate-spin material-symbols-outlined text-xs text-primary">
                    progress_activity
                  </span>
                )}
              </label>
              <CustomSelect
                options={locations}
                value={watch("location")}
                onChange={(v) => setValue("location", v)}
                placeholder={
                  isLoadingLocations ? "Loading..." : "Select location"
                }
                hasError={!!errors.location}
              />
              {errors.location && (
                <p className="text-xs text-red-500">
                  {errors.location.message}
                </p>
              )}
            </div>

            {/* Category Name */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Category Name *
                {isLoadingCategories && (
                  <span className="animate-spin material-symbols-outlined text-xs text-primary">
                    progress_activity
                  </span>
                )}
              </label>
              <CustomSelect
                options={categories}
                value={watch("category")}
                onChange={(v) => setValue("category", v)}
                placeholder={
                  isLoadingCategories ? "Loading..." : "Select category"
                }
                hasError={!!errors.category}
              />
              {errors.category && (
                <p className="text-xs text-red-500">
                  {errors.category.message}
                </p>
              )}
            </div>

            {/* Asset ID */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Asset ID *
              </label>
              <Input
                placeholder="Auto-generated"
                {...register("asset_tag")}
                hasError={!!errors.asset_tag}
                disabled
              />
              {errors.asset_tag && (
                <p className="text-xs text-red-500">
                  {errors.asset_tag.message}
                </p>
              )}
            </div>

            {/* Manufacturer and Model */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Manufacturer and model *
              </label>
              <Input
                placeholder="Enter manufacturer and model"
                {...register("model")}
                hasError={!!errors.model}
              />
              {errors.model && (
                <p className="text-xs text-red-500">{errors.model.message}</p>
              )}
            </div>

            {/* Serial Number */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Serial Number
              </label>
              <Input
                placeholder="Enter serial number"
                {...register("serial_number")}
              />
            </div>

            {/* Procurement Date */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Procurement Date *
              </label>
              <DatePicker
                value={watch("procurement_date") || ""}
                onChange={(v) => setValue("procurement_date", v)}
                placeholder="mm/dd/yyyy"
                hasError={!!errors.procurement_date}
              />
              {errors.procurement_date && (
                <p className="text-xs text-red-500">
                  {errors.procurement_date.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Warranty Start Date */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Warranty Start Date
              </label>
              <DatePicker
                value={watch("warranty_start_date") || ""}
                onChange={(v) => setValue("warranty_start_date", v)}
                placeholder="mm/dd/yyyy"
              />
            </div>

            {/* Warranty End Date */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Warranty End Date
              </label>
              <DatePicker
                value={watch("warranty_end_date") || ""}
                onChange={(v) => setValue("warranty_end_date", v)}
                placeholder="mm/dd/yyyy"
              />
            </div>

            {/* Assigned To */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Assigned To
                {isLoadingEmployees && (
                  <span className="animate-spin material-symbols-outlined text-xs text-primary">
                    progress_activity
                  </span>
                )}
              </label>
              <CustomSelect
                options={employeesOptions}
                value={watch("assigned_to") || ""}
                onChange={(v) => setValue("assigned_to", v)}
                placeholder="Unassigned"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Status
                {isLoadingStatuses && (
                  <span className="animate-spin material-symbols-outlined text-xs text-primary">
                    progress_activity
                  </span>
                )}
              </label>
              <CustomSelect
                options={statuses}
                value={watch("status") || ""}
                onChange={(v) => setValue("status", v)}
                placeholder={isLoadingStatuses ? "Loading..." : "Select status"}
                hasError={!!errors.status}
              />
              {errors.status && (
                <p className="text-xs text-red-500">{errors.status.message}</p>
              )}
            </div>

            {/* Vendor */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Vendor
              </label>
              <Input placeholder="Enter vendor" {...register("vendor")} />
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-1 col-span-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Note
          </label>
          <textarea
            {...register("notes")}
            className="w-full min-h-[100px] px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none"
            placeholder="Enter notes"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="submit"
            className="w-full py-3 text-base"
            isLoading={updateMutation.isPending || createMutation.isPending}
          >
            {initialData ? "Update Asset" : "Create Asset"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
