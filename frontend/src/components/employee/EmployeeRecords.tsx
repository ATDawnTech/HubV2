import React, { useState } from 'react';
import { useEmployees, useUpdateEmployee } from '@/hooks/useEmployees';
import { useAuthz } from '@/hooks/useAuthz';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { EmployeeEditDialog } from './EmployeeEditDialog';
import { BulkUploadDialog } from './BulkUploadDialog';
import { Search, Plus, Upload, User } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Employee } from '@/hooks/useEmployees';

export function EmployeeRecords() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const { isAdmin } = useAuthz();
  
  const { data: employees, isLoading } = useEmployees(searchQuery);

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: 'employee_code',
      header: 'Employee Code',
      cell: ({ row }) => row.getValue('employee_code') || 'N/A',
    },
    {
      accessorKey: 'full_name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {row.getValue('full_name')}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'job_title',
      header: 'Job Title',
      cell: ({ row }) => row.getValue('job_title') || 'N/A',
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => row.getValue('department') || 'N/A',
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('location')}</Badge>
      ),
    },
    {
      accessorKey: 'manager_name',
      header: 'Manager',
      cell: ({ row }) => row.getValue('manager_name') || 'N/A',
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.getValue('is_active') ? 'default' : 'secondary'}>
          {row.getValue('is_active') ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingEmployee(row.original)}
        >
          View/Edit
        </Button>
      ),
    },
  ];

  const handleExport = () => {
    if (!employees) return;
    
    const csvContent = [
      ['Employee Code', 'Name', 'Email', 'Job Title', 'Department', 'Location', 'Manager', 'Status'].join(','),
      ...employees.map(emp => [
        emp.employee_code || '',
        emp.full_name || '',
        emp.email,
        emp.job_title || '',
        emp.department || '',
        emp.location || '',
        emp.manager_name || '',
        emp.is_active ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employees.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8">Loading employees...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-[300px]"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Button>
              <Button
                onClick={() => setEditingEmployee({} as Employee)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={employees || []}
        searchKey="full_name"
        searchPlaceholder="Search employees..."
        onExportCSV={handleExport}
      />

      {editingEmployee && (
        <EmployeeEditDialog
          employee={editingEmployee}
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
        />
      )}

      {showBulkUpload && (
        <BulkUploadDialog
          open={showBulkUpload}
          onOpenChange={setShowBulkUpload}
        />
      )}
    </div>
  );
}