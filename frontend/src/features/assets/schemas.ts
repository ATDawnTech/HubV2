import { z } from "zod";

export const assetSchema = z.object({
  id: z.string().uuid(),
  asset_tag: z.string(),
  model: z.string().nullable(),
  manufacturer: z.string().nullable(),
  category_id: z.string().uuid().nullable(),
  serial_number: z.string().nullable(),
  location: z.string().nullable(),
  assigned_to: z.string().uuid().nullable(),
  status: z.string().nullable(),
  condition: z.string().nullable(),
  procurement_date: z.string().nullable(),
  warranty_start_date: z.string().nullable(),
  warranty_end_date: z.string().nullable(),
  warranty_type: z.string().nullable(),
  vendor: z.string().nullable(),
  invoice_verified_status: z.string().nullable(),
  import_source: z.string().nullable(),
  import_date: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const assetCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
