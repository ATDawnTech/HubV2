import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, ConfirmDialog } from '@/components';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Popover } from 'antd';
import { CreateCategorySettingDialog } from '@/components/AssetManagement/CreateCategorySettingDialog';
import { useGetCategories, useDeleteCategory } from '@/services/useCategory';
import { useToast } from '@/hooks/use-toast';

interface Category {
    id: string;
    name: string;
    description: string;
    code?: string;
}

const MOCK_CATEGORIES: Category[] = [
    {
        id: '1',
        name: 'Laptops',
        description: 'Standard issue company laptops and ultrabooks',
    },
    {
        id: '2',
        name: 'Monitors',
        description: '24" and 27" desktop display units',
    },
    {
        id: '3',
        name: 'Furniture',
        description: 'Ergonomic chairs and standing desks',
    },
];

export default function CategorySettings() {
    const [search, setSearch] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Delete state
    const [isOpenConfirmDelete, setIsOpenConfirmDelete] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { toast } = useToast();
    const { mutate: deleteCategory } = useDeleteCategory();
    const { data, isLoading, refetch } = useGetCategories();
    useEffect(() => {
        if (data) {
            setCategories(data);
        }
    }, [data]);

    const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const filteredCategories = data?.filter(
            (c) => {
                const searchText = e.target.value.trim();
                if (!searchText) return true;
                return c.name.toLowerCase().includes(searchText.toLowerCase()) ||
                    c.description?.toLowerCase().includes(searchText.toLowerCase())
            }
        );
        setCategories(filteredCategories);
    }
    const handleDelete = (id: string) => {
        setDeletingId(id);
        setIsOpenConfirmDelete(true);
    };

    const onDelete = () => {
        if (!deletingId) return;

        deleteCategory(deletingId, {
            onSuccess: () => {
                toast({
                    title: 'Success',
                    description: 'Category deleted successfully',
                });
                refetch();
                setIsOpenConfirmDelete(false);
            },
            onError: (err: any) => {
                toast({
                    title: 'Error',
                    description: err.code === '23503' ? 'Category is used in an asset' : err.message,
                    variant: 'destructive',
                });
            },
        });
    };
    const columns = [
        {
            title: 'ID',
            key: 'index',
            width: 80,
            render: (_: any, __: any, index: number) => (
                <span className="text-slate-600 dark:text-slate-400">{index + 1}</span>
            ),
        },
        {
            title: 'Category Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span className="font-bold">{text}</span>,
        },
        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            render: (text: string) => <span className="text-slate-600 dark:text-slate-400 font-mono">{text || '-'}</span>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (text: string) => <span className="text-slate-600 dark:text-slate-400">{text}</span>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            align: 'right' as const,
            render: (_, record) => (
                <Popover
                    content={
                        <div className="flex flex-col gap-2 min-w-[120px]">
                            <div
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 cursor-pointer rounded transition-colors text-sm"
                                onClick={() => {
                                    setEditingCategory(record);
                                    setIsCreateDialogOpen(true);
                                }}
                            >
                                <Pencil className="h-4 w-4" />
                                Edit
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-red-50 text-red-600 cursor-pointer rounded transition-colors text-sm" onClick={() => handleDelete(record.id)}>
                                <Trash2 className="h-4 w-4" />
                                Delete
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            Category Settings
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Configure and manage asset categories for corporate IT inventory
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setEditingCategory(null);
                        setIsCreateDialogOpen(true);
                    }}
                    className="bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Input
                    placeholder="Search categories or descriptions..."
                    className="pl-12 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-primary shadow-sm"
                    startIcon={<span className="material-symbols-outlined text-lg">search</span>}
                    onChange={onSearch}
                />
            </div>

            {/* Table */}
            <div className="category-table-container">
                <DataTable
                    columns={columns}
                    dataSource={categories}
                    rowKey="id"
                    loading={isLoading}
                    orangeHeader={true}
                />
            </div>

            <CreateCategorySettingDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                    if (!open) setEditingCategory(null);
                }}
                onCreated={() => {
                    refetch();
                    setEditingCategory(null);
                }}
                isEdit={!!editingCategory}
                data={editingCategory || undefined}
            />

            <ConfirmDialog
                title="Delete Category"
                description={
                    <>
                        Are you sure you want to delete this category? <br /> This action cannot be undone.
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