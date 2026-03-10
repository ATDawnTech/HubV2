import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, History, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { Popover, Divider, DatePicker } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDeleteAsset } from '@/services/useAsset';
import CreateAssetDialog, { AssetPayload } from '@/components/AssetManagement/CreateAssetDialog';
import { ViewAssetDialog } from '@/components/AssetManagement/ViewAssetDialog';
import { AssetChangeHistory } from '@/components/AssetManagement/AssetChangeHistory';
import { ConfirmDialog, DataTable } from '@/components';
import { format } from 'date-fns'
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { Calendar } from 'lucide-react';
type UserRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

type SearchColumn = 'asset_tag' | 'model' | 'location' | 'status';

const STATUS_COLOR_MAPPING = {
  'Retired': 'bg-gray-100 text-gray-500',
  'Available': 'bg-green-100 text-green-500',
  'Assigned': 'bg-blue-100 text-blue-500',
  'In Repair': 'bg-orange-100 text-orange-500',
  'Lost': 'bg-red-100 text-red-500',
}


export default function AssetManagement(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutate: deleteAsset } = useDeleteAsset();

  const [loading, setLoading] = useState(true);

  /** ✅ SEARCH STATE */
  const [search, setSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState<SearchColumn>('model');

  // Add/Edit modal / form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditId, setIsEditId] = useState<string | null>(null);
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [location, setLocation] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [status, setStatus] = useState('active');
  const [assetData, setAssetData] = useState<AssetPayload | null>({} as AssetPayload);
  const [isOpenViewModal, setIsOpenViewModal] = useState(false);
  const [isViewHistoryModal, setIsViewHistoryModal] = useState(false);
  // Users list
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Delete state
  const [isOpenConfirmDelete, setIsOpenConfirmDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetPayload[]>([]);

  // Generate unique filter options for table columns
  const assetTagFilters = Array.from(new Set(assets.map((a) => a.asset_tag).filter(Boolean))).map(
    (tag) => ({ text: tag, value: tag })
  );
  const nameFilters = Array.from(new Set(assets.map((a) => a.model).filter(Boolean))).map(
    (name) => ({ text: name, value: name })
  );
  const modelFilters = Array.from(new Set(assets.map((a) => a.model).filter(Boolean))).map(
    (model) => ({ text: model, value: model })
  );
  const locationFilters = Array.from(new Set(assets.map((a) => a.location).filter(Boolean))).map(
    (loc) => ({ text: loc, value: loc })
  );
  const statusFilters = [
    { text: 'Available', value: 'Available' },
    { text: 'Assigned', value: 'Assigned' },
    { text: 'In Repair', value: 'In Repair' },
    { text: 'Retired', value: 'Retired' },
    { text: 'Lost', value: 'Lost' },
  ];
  const assignedToFilters = users.map((u) => ({
    text: u.full_name || u.email || u.id,
    value: u.id,
  }));

  // Ant Design Table columns definition
  const columns: ColumnsType<AssetPayload> = [
    {
      title: 'Asset ID',
      dataIndex: 'asset_tag',
      key: 'asset_tag',
      filters: assetTagFilters,
      onFilter: (value, record) =>
        record.asset_tag === value,
      filterSearch: true,
      render: (text: string) => <span className="font-bold">{text}</span>,
    },
    {
      title: 'Manufacturer & model',
      dataIndex: 'model',
      key: 'model',
      filters: nameFilters,
      onFilter: (value, record) => record.model === value,
      filterSearch: true,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      filters: locationFilters,
      onFilter: (value, record) =>
        record.location === value,
      filterSearch: true,
    },
    {
      title: 'Assigned',
      key: 'assigned_to',
      render: (_, record) => getUserDisplay(record.assigned_to),
      filters: assignedToFilters,
      onFilter: (value, record) =>
        record.assigned_to === value,
      filterSearch: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: statusFilters,
      onFilter: (value, record) => record.status === value,
      filterSearch: true,
      render: (text: string) => (
        <span className={`${STATUS_COLOR_MAPPING[text as keyof typeof STATUS_COLOR_MAPPING]} px-3 py-1 rounded-full`}>
          {text}
        </span>
      )
    },
    {
      title: 'Warranty end date',
      dataIndex: 'warranty_end_date',
      key: 'warranty_end_date',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div className="p-2 flex flex-col gap-2 min-w-[300px]">
          <DatePicker.RangePicker
            className="w-full"
            value={selectedKeys[0] as any}
            onChange={(dates) => {
              setSelectedKeys(dates ? [dates as any] : []);
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              className="h-8 text-xs h-7 px-2"
              variant="outline"
              onClick={() => {
                clearFilters?.();
                confirm();
              }}
            >
              Reset
            </Button>
            <Button
              className="h-8 text-xs bg-primary text-white h-7 px-2"
              onClick={() => confirm()}
            >
              Filter
            </Button>
          </div>
        </div>
      ),
      filterIcon: (filtered) => (
        <Calendar className={`h-4 w-4 ${filtered ? 'text-primary' : 'text-slate-400'}`} />
      ),
      onFilter: (value, record) => {
        if (!value) return true;
        const [start, end] = value as unknown as [Dayjs, Dayjs];
        if (!start || !end) return true;

        const date = dayjs(record.warranty_end_date);
        return (date.isAfter(start.startOf('day')) || date.isSame(start.startOf('day'))) &&
          (date.isBefore(end.endOf('day')) || date.isSame(end.endOf('day')));
      },
      render: (text: string) => {
        if (!text) return '-';
        const date = new Date(text);
        const isPast = date < new Date();
        return (
          <span className={isPast ? 'text-red-500 font-medium' : ''}>
            {format(date, 'dd-MM-yyyy')}
          </span>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_, record) => (
        <Popover
          content={
            <div className="flex flex-col gap-2 min-w-[120px]">
              <div
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 cursor-pointer rounded transition-colors text-sm"
                onClick={() => openViewModal(record)}
              >
                <Eye className="h-4 w-4" />
                <span>View detail</span>
              </div>
              <div
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 cursor-pointer rounded transition-colors text-sm"
                onClick={() => openEditModal(record)}
              >
                <Pencil className="h-4 w-4" />
                <span>Edit</span>
              </div>
              <div
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 cursor-pointer rounded transition-colors text-sm"
                onClick={() => {
                  setIsEditId(record.id);
                  setIsViewHistoryModal(true);
                }}
              >
                <History className="h-4 w-4" />
                <span>Activity Log</span>
              </div>
              <Divider className="my-1" />
              <div
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-red-50 text-red-600 cursor-pointer rounded transition-colors text-sm"
                onClick={() => handleDelete(record.id)}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </div>
            </div>
          }
          trigger="click"
          placement="bottomRight"
        >
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </Popover>
      ),
    },
  ];

  useEffect(() => {
    loadAssets();
    loadUsers();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data ?? []);
    } catch (err: any) {
      toast({
        title: 'Failed to load assets',
        description: err?.message ?? String(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      let { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name');

      if (error || !data?.length) {
        const res = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name');
        data = res.data ?? [];
      }

      setUsers(data ?? []);
    } finally {
      setUsersLoading(false);
    }
  };


  /** ✅ COLUMN-AWARE FILTER */
  const filteredAssets = assets.filter((a) => {
    if (!search.trim()) return true;

    const value = a[searchColumn];
    return value?.toString().toLowerCase().includes(search.toLowerCase());
  });

  const resetForm = () => {
    setAssetTag('');
    setModel('');
    setCategory('');
    setLocation('');
    setAssignedTo('');
    setStatus('active');
    setIsEditId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (asset: AssetPayload) => {
    setIsEditId(asset.id);
    setAssetData(asset);
    setIsModalOpen(true);
  };

  const openViewModal = (asset: AssetPayload) => {
    setIsOpenViewModal(true);
    setIsEditId(asset.id);
    setAssetData(asset);
    setStatus(asset.status ?? 'active');
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsOpenConfirmDelete(true);
  };

  const onDelete = () => {
    if (!deletingId) return;

    deleteAsset(deletingId, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Asset deleted successfully',
        });
        loadAssets();
        setIsOpenConfirmDelete(false);
      },
      onError: (err: any) => {
        toast({
          title: 'Error',
          description: err?.message ?? 'Failed to delete asset',
          variant: 'destructive',
        });
      },
    });
  };

  const getUserDisplay = (id?: string | null) => {
    if (!id) return 'Unassigned';
    const u = users.find((x) => x.id === id);
    return u?.full_name ?? u?.email ?? 'Unassigned';
  };

  return (
    <div>
      {/* Header with navigation and logo */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              Asset Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Manage and track your IT inventory efficiently
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            openCreateModal();
          }}
          className="bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Add Asset
        </Button>
      </div>

      {/* ✅ SEARCH + COLUMN SELECT */}

      {/* Ant Design Table for assets */}
      <DataTable
        columns={columns}
        dataSource={filteredAssets}
        rowKey="id"
        loading={loading}
      />
      {isModalOpen && (
        <CreateAssetDialog
          isEdit={!!isEditId}
          data={{
            id: isEditId,
            category: assetData.category,
            model: assetData.model,
            asset_tag: assetData.asset_tag,
            warranty_start_date: assetData.warranty_start_date,
            warranty_end_date: assetData.warranty_end_date,
            procurement_date: assetData.procurement_date,
            vendor: assetData.vendor,
            location: assetData.location,
            assigned_to: assetData.assigned_to,
            status: assetData.status,
            owner: assetData.owner,
            serial_number: assetData.serial_number,
            notes: assetData.notes,
            attachments: JSON.parse(JSON.stringify(assetData.attachments ?? [])),
          }}
          loadAssets={loadAssets}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
      {isOpenViewModal && (
        <ViewAssetDialog
          open={isOpenViewModal}
          onOpenChange={setIsOpenViewModal}
          data={{
            id: isEditId,
            category: assetData.category,
            model: assetData.model,
            asset_tag: assetData.asset_tag,
            warranty_start_date: assetData.warranty_start_date,
            warranty_end_date: assetData.warranty_end_date,
            procurement_date: assetData.procurement_date,
            vendor: assetData.vendor,
            location: assetData.location,
            assigned_to: assetData.assigned_to,
            status: assetData.status,
            owner: assetData.owner,
            serial_number: assetData.serial_number,
            notes: assetData.notes,
            attachments: assetData.attachments,
          }}
        />
      )}
      {isViewHistoryModal && (
        <AssetChangeHistory
          id={isEditId}
          open={isViewHistoryModal}
          onOpenChange={setIsViewHistoryModal}
        />
      )}
      <ConfirmDialog
        title="Delete Asset"
        description={
          <>
            Are you sure you want to delete this asset? <br /> This action cannot be undone.
          </>
        }
        onConfirm={onDelete}
        onCancel={() => setIsOpenConfirmDelete(false)}
        open={isOpenConfirmDelete}
        onOpenChange={setIsOpenConfirmDelete}
      />
    </div>
  );
}
