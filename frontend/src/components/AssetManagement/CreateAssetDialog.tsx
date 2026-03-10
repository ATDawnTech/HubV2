import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FormProvider, useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { useCreateNewAsset, useUpdateAsset } from '@/services/useAsset';
import { useGetProfiles } from '@/services/useProfiles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useToast } from '@/hooks/use-toast';
import { useGetCategories } from '@/services/useCategory';
import Autocomplete from '../ui/Autocomplete';
import { supabase } from '@/integrations/supabase/client';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

interface CreateAssetDialogProps {
  isEdit: boolean;
  data?: AssetPayload;
  loadAssets: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface AssetPayload {
  id: string;
  category: string;
  model: string;
  asset_tag: string;
  procurement_date: string;
  vendor?: string;
  warranty_start_date: string | null;
  warranty_end_date: string;
  location: string;
  assigned_to: string | null;
  status: string;
  owner: string;
  serial_number?: string;
  notes?: string;
  attachments?: string[];
}

const assetSchema = yup.object().shape({
  category: yup.string().required('Category is required'),
  model: yup.string().required('Model is required'),
  asset_tag: yup.string().required('Asset ID is required'),
  procurement_date: yup.string().required('Procurement date is required'),
  vendor: yup.string().nullable(),
  warranty_start_date: yup.string().nullable(),
  warranty_end_date: yup.string()
    .required('Warranty end date is required')
    .test('warranty-date-check', 'Warranty end date cannot be before start date', function (value) {
      const { warranty_start_date } = this.parent;
      if (!warranty_start_date || !value) return true;
      return new Date(value) >= new Date(warranty_start_date);
    }),
  location: yup.string().required('Location is required'),
  assigned_to: yup.string().nullable(),
  status: yup.string().nullable(),
  owner: yup.string().required('Owner is required'),
  serial_number: yup.string().nullable(),
  notes: yup.string().nullable(),
  attachments: yup.array().of(yup.string()),
});

export default function CreateAssetDialog({
  isEdit = false,
  data,
  open,
  onOpenChange,
  loadAssets,
}: CreateAssetDialogProps) {


  const { toast } = useToast();
  const { mutate: createAsset, isPending: isLoadingCreate } = useCreateNewAsset();
  const { mutate: updateAsset, isPending: isLoadingUpdate } = useUpdateAsset();
  const { data: users } = useGetProfiles();
  const [countries, setCountries] = useState<{ value: string; code: string }[]>([{ value: 'Australia', code: 'AU' },
  {
    value: 'India',
    code: 'IN'
  },
  {
    value: 'Singapore',
    code: 'SG'
  },
  {
    value: 'United States',
    code: 'US'
  }, {
    value: 'Vietnam',
    code: 'VN'
  }
  ]);
  const form = useForm<AssetPayload>({
    resolver: yupResolver(assetSchema) as any,
    mode: 'onChange',
    defaultValues: {
      category: '',
      model: '',
      asset_tag: '',
      procurement_date: '',
      vendor: '',
      warranty_start_date: null,
      warranty_end_date: null,
      location: '',
      assigned_to: '',
      status: '',
      owner: 'ADT',
      serial_number: '',
      notes: '',
      attachments: [],
    },
  });

  const { data: categories } = useGetCategories();
  const onSubmit = (values) => {
    let payload = { ...values };
    
    if (
      !payload.assigned_to ||
      payload.assigned_to === '' ||
      payload.assigned_to === undefined ||
      payload.assigned_to === 'unassigned'
    ) {
      payload.assigned_to = null;
      // Do not change status when unassigning
    } else if (
      payload.status === 'Available' ||
      payload.status === '' ||
      payload.status === undefined
    ) {
      payload.status = 'Assigned';
    }
    if (isEdit) {
      return updateAsset(
        { id: data.id, updatedAsset: payload },
        {
          onSuccess: () => {
            loadAssets();
            onOpenChange?.(false);
            toast({
              title: 'Success',
              description: 'Updated asset successfully',
            });
          },
        }
      );
    } else {
      createAsset(payload, {
        onSuccess: () => {
          loadAssets();
          onOpenChange?.(false);
          toast({
            title: 'Success',
            description: 'Created new asset successfully',
          });
        },
      });
    }
  };

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open]);

  useEffect(() => {
    if (isEdit && data) {
      form.reset({
        category: data.category,
        model: data.model,
        asset_tag: data.asset_tag,
        procurement_date: data.procurement_date,
        vendor: data.vendor,
        warranty_start_date: data.warranty_start_date,
        warranty_end_date: data.warranty_end_date,
        location: data.location,
        assigned_to: data.assigned_to,
        status: data.status,
        owner: (data as any).owner || 'ADT',
        serial_number: (data as any).serial_number || '',
        notes: data.notes,
        attachments: data.attachments,
      });
    }
  }, [isEdit, data]);

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
  //       const data = await response.json();
  //       const countryOptions = data
  //         .map((country: any) => ({
  //           value: country.name.common,
  //           code: country.cca2,
  //         }))
  //         .sort((a: any, b: any) => a.value.localeCompare(b.value));
  //       setCountries(countryOptions);
  //     } catch (error) {
  //       console.error('Error fetching countries:', error);
  //     }
  //   })();
  // }, []);

  useEffect(() => {
    const setGeneratedAssetId = async () => {
      const location = form.getValues('location');
      const categoryId = form.getValues('category');
      if (location && categoryId && categories && countries.length > 0) {
        const categoryCode = categories?.find((category) => category.id === categoryId)?.code;
        const locationCode = countries?.find((country) => country.value === location)?.code;
        if (categoryCode && locationCode) {
          const prefixAssetId = `${locationCode}-${categoryCode}`;

          const { data: assetId } = await supabase
            .from('assets')
            .select('asset_tag')
            .like('asset_tag', `${prefixAssetId}%`)
            .order('created_at', { ascending: false })
            .limit(1);

          console.log('assetId', assetId);

          if (assetId?.[0]?.asset_tag) {
            const lastAssetId = assetId?.[0]?.asset_tag;
            const parts = lastAssetId?.split('-');
            const lastAssetIdNumber = parts?.[parts.length - 1];
            const newAssetIdNumber = parseInt(lastAssetIdNumber) + 1;
            const paddedNumber = String(newAssetIdNumber).padStart(lastAssetIdNumber.length, '0');
            form.setValue('asset_tag', `${prefixAssetId}-${paddedNumber}`);
          } else {
            form.setValue('asset_tag', `${prefixAssetId}-0001`);
          }
        }
      }
    };

    setGeneratedAssetId();
  }, [form.watch('location'), form.watch('category'), categories, countries]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[60vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Asset</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fill in the details to register/update an asset in the inventory.</p>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col py-4 gap-4">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="flex flex-col gap-2">
                <Label>Does this asset belong to ADT? *</Label>
                <ToggleGroup
                  type="single"
                  variant="switcher"
                  value={form.watch('owner')}
                  onValueChange={(value) => {
                    if (value) form.setValue('owner', value, { shouldDirty: true });
                  }}
                  className="justify-start w-[150px]"
                >
                  <ToggleGroupItem value="ADT" className="flex-1 ">Yes</ToggleGroupItem>
                  <ToggleGroupItem value="Other" className="flex-1 ">No</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Autocomplete
                name="location"
                label="Location *"
                placeholder="Select country"
                options={countries}
                filterOption={(inputValue, option) =>
                  String(option?.value ?? '')
                    .toUpperCase()
                    .indexOf(inputValue.toUpperCase()) !== -1
                }
              />
              <div>
                <Label htmlFor="warranty_start_date">Warranty Start Date</Label>
                <Input type="date" {...form.register('warranty_start_date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category Name *</Label>
                <Select
                  name="category"
                  value={form.watch('category')}
                  onValueChange={(value) => form.setValue('category', value, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="warranty_end_date">Warranty End Date*</Label>
                <Input type="date" {...form.register('warranty_end_date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="asset_tag">Asset ID*</Label>
                <Input
                  disabled={true}
                  placeholder="Enter asset ID"
                  {...form.register('asset_tag')}
                />
              </div>
              <div>
                <Label htmlFor="assigned_to">Assigned To</Label>
                <Select
                  name="assigned_to"
                  value={form.watch('assigned_to') || 'unassigned'}
                  onValueChange={(value) =>
                    form.setValue('assigned_to', value === 'unassigned' ? '' : value, { shouldDirty: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="model">Manufacturer and model*</Label>
                <Input placeholder="Enter manufacturer and model" {...form.register('model')} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  name="status"
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="In Repair">In Repair</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input placeholder="Enter serial number" {...form.register('serial_number')} />
              </div>
              <div className="flex flex-col gap-2">  <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Input placeholder='Enter vendor' {...form.register('vendor')} />
              </div>
              </div>
              <div>
                <Label htmlFor="procurement_date">Procurement Date*</Label>
                <Input type="date" placeholder='Select procurement date' {...form.register('procurement_date')} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Note</Label>
              <Textarea placeholder="Enter notes" {...form.register('notes')} />
            </div>
            {/* <div className='flex items-center gap-2'>
              <Label htmlFor='attachments'>Attachments</Label>
              <S3Upload
                name='attachments'
                onRemove={(file) => {
                  const currentAttachments = form.getValues('attachments') || [];
                  form.setValue(
                    'attachments',
                    currentAttachments.filter((f) => f !== file),
                    { shouldDirty: true },
                  );
                }}
                beforeUpload={(file) => {
                  const currentAttachments = form.getValues('attachments') || [];
                  form.setValue('attachments', [...currentAttachments, file], {
                    shouldDirty: true,
                  });
                  return false;
                }}
                fileList={form.watch('attachments') || []}
                multiple
              />
            </div> */}
            <Button
              className="mt-4"
              disabled={!form.formState.isDirty || isLoadingCreate || isLoadingUpdate}
              type="submit"
            >
              {isEdit ? 'Update Asset' : 'Create Asset'}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
