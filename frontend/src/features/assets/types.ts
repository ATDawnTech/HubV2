export interface Asset {
  id: string;
  asset_tag: string;
  model: string | null;
  manufacturer: string | null;
  category_id: string | null;
  serial_number: string | null;
  location: string | null;
  assigned_to: string | null;
  status: string | null;
  condition: string | null;
  procurement_date: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  warranty_type: string | null;
  vendor: string | null;
  invoice_verified_status: string | null;
  import_source: string | null;
  import_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AssetCategory {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}
