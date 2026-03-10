import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { AssetPayload } from './CreateAssetDialog';
import { Button } from '../ui/button';
import { useGetProfileById } from '@/services/useProfiles';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface ViewAssetDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  data: AssetPayload;
}

export function ViewAssetDialog({ open, onOpenChange, data }: ViewAssetDialogProps) {

  const [categoryInfo, setCategoryInfo] = useState<{ name: string, code?: string }>({ name: '' });

  const { data: user } = useGetProfileById(data.assigned_to);

  useEffect(() => {
    const fetchCategory = async () => {
      const { data: categoryData, error } = await supabase
        .from('asset_categories')
        .select('name, code')
        .eq('id', data.category)
        .single();

      if (error) throw error;
      setCategoryInfo({
        name: categoryData?.name ?? '',
        code: categoryData?.code ?? undefined
      });
    };
    if (data.category) {
      fetchCategory();
    }
  }, [data.category]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[60vw] overflow-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>View asset detail</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-baseline gap-2">
            <Label className="text-base" htmlFor="category">
              Does this asset belong to ADT?
            </Label>
            <div>
              {data.owner === 'ADT' ? 'Yes' : 'No'}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <Label className="text-base" htmlFor="category">
              Category:
            </Label>
            <div>
              {categoryInfo.name} {categoryInfo.code && `(${categoryInfo.code})`}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-baseline gap-2">
              <Label className="text-base">
                Manufacturer and model:
              </Label>
              <div>{data.model}</div>
            </div>
            <div className="flex items-baseline gap-2">
              <Label className="text-base">
                Serial Number:
              </Label>
              <div>{data.serial_number || '--'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-baseline gap-2">
              <Label className="text-base">
                Asset Tag:
              </Label>
              <div>{data.asset_tag}</div>
            </div>
            <div className="flex items-baseline gap-2">
              <Label className="text-base">
                Procurement Date:
              </Label>
              <div>{data.procurement_date}</div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <Label className="text-base" htmlFor="vendor">
              Vendor:
            </Label>
            <div>{data.vendor}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-baseline gap-2">
              <Label className="text-base">
                Warranty Start Date:
              </Label>
              <div>{data.warranty_start_date ?? '--'}</div>
            </div>
            <div className="flex items-baseline gap-2">
              <Label className="text-base">
                Warranty End Date:
              </Label>
              <div>{data.warranty_end_date ?? '--'}</div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <Label className="text-base">
              Location:
            </Label>
            <div>{data.location}</div>
          </div>
          <div className="flex items-baseline gap-2">
            <Label className="text-base">
              Assigned To:
            </Label>
            <div>{user?.full_name || user?.email || '-'}</div>
          </div>
          <div className="flex items-baseline gap-2">
            <Label className="text-base">
              Status:
            </Label>
            <div>{data.status}</div>
          </div>
          <div className="flex items-baseline gap-2">
            <Label className="text-base">
              Note:
            </Label>
            <div>{data.notes}</div>
          </div>
          <div className="flex justify-end">
            <Button className="mt-4" onClick={() => onOpenChange?.(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
