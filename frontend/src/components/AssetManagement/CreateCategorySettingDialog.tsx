import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useToast } from '@/hooks/use-toast';
import { useCreateCategory, useUpdateCategory } from '@/services/useCategory';

interface CreateCategorySettingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
    isEdit?: boolean;
    data?: CategoryPayload & { id?: string };
}

interface CategoryPayload {
    name: string;
    description?: string;
    code?: string;
}

const categorySchema = yup.object().shape({
    name: yup.string().required('Category name is required'),
    code: yup.string().max(5, 'Code must be maximum 5 characters').required('Category code is required'),
    description: yup.string(),
});

export const CreateCategorySettingDialog: React.FC<CreateCategorySettingDialogProps> = ({
    open,
    onOpenChange,
    onCreated,
    isEdit = false,
    data
}) => {
    const { toast } = useToast();
    const { mutate: createCategory, isPending: isLoadingCreate } = useCreateCategory();
    const { mutate: updateCategory, isPending: isLoadingUpdate } = useUpdateCategory();

    const isLoading = isLoadingCreate || isLoadingUpdate;

    const form = useForm<CategoryPayload>({
        resolver: yupResolver(categorySchema) as any,
        mode: 'onChange',
        defaultValues: {
            name: '',
            code: '',
            description: '',
        },
    });

    useEffect(() => {
        if (!open) {
            form.reset({
                name: '',
                code: '',
                description: '',
            });
        } else if (isEdit && data) {
            form.reset({
                name: data.name,
                code: data.code || '',
                description: data.description || '',
            });
        }
    }, [open, isEdit, data]);

    const onSubmit = (values: CategoryPayload) => {
        const payload = {
            name: values.name.trim(),
            code: values.code?.trim() || undefined,
            description: values.description?.trim() || undefined,
        };

        if (isEdit && data?.id) {
            updateCategory({
                id: data.id,
                updatedCategory: payload
            }, {
                onSuccess: () => {
                    toast({
                        title: 'Success',
                        description: 'Category updated successfully.',
                    });
                    onOpenChange(false);
                    onCreated();
                },
                onError: (error) => {
                    console.error('Error updating category:', error);
                    toast({
                        title: 'Error',
                        description: error.message || 'Failed to update category.',
                        variant: 'destructive',
                    });
                }
            });
        } else {
            createCategory(payload, {
                onSuccess: () => {
                    toast({
                        title: 'Success',
                        description: 'Category created successfully.',
                    });
                    onOpenChange(false);
                    onCreated();
                },
                onError: (error) => {
                    console.error('Error creating category:', error);
                    toast({
                        title: 'Error',
                        description: error.message || 'Failed to create category.',
                        variant: 'destructive',
                    });
                }
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900 rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isEdit ? 'Edit Category' : 'Create New Category'}
                    </DialogTitle>
                </DialogHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
                                Category Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="Enter category name"
                                className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-primary"
                                {...form.register('name')}
                            />
                            {form.formState.errors.name && (
                                <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="code" className="text-slate-700 dark:text-slate-300">
                                Category Code <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="code"
                                placeholder="This is for Asset ID, max 5 letters"
                                className="h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-primary"
                                {...form.register('code')}
                                maxLength={5}
                            />
                            {form.formState.errors.code && (
                                <p className="text-red-500 text-sm mt-1">{form.formState.errors.code.message}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">
                                Description
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Enter category description (optional)"
                                className="min-h-[100px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-primary"
                                {...form.register('description')}
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading || !form.formState.isValid}
                                className="rounded-xl bg-primary hover:bg-primary/90 text-white"
                            >
                                {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update' : 'Create')}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
};