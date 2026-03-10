import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/DataTable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Plus, FileSpreadsheet, FileText, FileType, ArrowLeft, Edit, Sheet, MoreVertical, Eye } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { SurveyDetailDialog } from '@/components/SurveyDetailDialog';
import { exportSurveyToPDF, exportSurveyToExcel, exportSurveyToWord } from '@/utils/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Survey {
  id: string;
  role_title: string;
  hiring_manager_name: string;
  hiring_manager_email?: string;
  client?: string;
  department_function: string;
  location: string;
  hire_type: string;
  number_of_positions: number;
  budget_approved: boolean;
  mandatory_skills: string;
  nice_to_have_skills?: string;
  experience_range_min: number;
  experience_range_max: number;
  salary_range_min?: number;
  salary_range_max?: number;
  salary_currency: string;
  preferred_start_date?: string;
  client_facing: boolean;
  key_perks_benefits?: string;
  client_expectations?: string;
  preferred_interview_panelists?: string;
  vendors_to_include?: string;
  comments_notes?: string;
  created_at: string;
  is_deleted?: boolean | null;
}

const IntakeSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurveys, setSelectedSurveys] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');

  useEffect(() => {
    if (user) {
      loadSurveys();
    }
  }, [user]);

  const loadSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('hiring_surveys')
        .select(
          `
          id,
          role_title,
          hiring_manager_name,
          hiring_manager_email,
          client,
          department_function,
          location,
          hire_type,
          number_of_positions,
          budget_approved,
          mandatory_skills,
          nice_to_have_skills,
          experience_range_min,
          experience_range_max,
          salary_range_min,
          salary_range_max,
          salary_currency,
          preferred_start_date,
          client_facing,
          key_perks_benefits,
          client_expectations,
          preferred_interview_panelists,
          vendors_to_include,
          comments_notes,
          created_at,
          is_deleted
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error) {
      console.error('Error loading surveys:', error);
      toast({
        title: 'Error',
        description: 'Failed to load survey data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this intake?')) return;
    try {
      const { error } = await supabase.from('hiring_surveys').update({ is_deleted: true }).eq('id', id);
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Intake deleted successfully.',
      });
      loadSurveys();
    } catch (error: any) {
      console.error('Error deleting survey:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the intake. Make sure the database schema is updated.',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase.from('hiring_surveys').update({ is_deleted: false }).eq('id', id);
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Intake restored successfully.',
      });
      loadSurveys();
    } catch (error: any) {
      console.error('Error restoring survey:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore the intake.',
        variant: 'destructive',
      });
    }
  };

  const exportData = async () => {
    try {
      const { data, error } = await supabase
        .from('hiring_surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              // Handle values that might contain commas or quotes
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',')
        ),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hiring_surveys_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success!',
        description: 'Survey data exported successfully.',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="mx-auto py-8 px-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen py-8 px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Intake Management
          </h1>
          <p className="text-muted-foreground">
            Manage hiring intakes and surveys
          </p>
        </div>
        <Button onClick={() => navigate('/survey')} className="flex items-center gap-2" variant="default" size="sm">
          <Plus className="h-4 w-4" />
          Add Intake
        </Button>
      </div>

      {/* Intake Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Intake Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{surveys.length}</div>
              <div className="text-sm text-muted-foreground">Total Intakes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{surveys.filter((s) => s.budget_approved).length}</div>
              <div className="text-sm text-muted-foreground">Budget Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{surveys.reduce((sum, s) => sum + s.number_of_positions, 0)}</div>
              <div className="text-sm text-muted-foreground">Total Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{new Set(surveys.map((s) => s.department_function)).size}</div>
              <div className="text-sm text-muted-foreground">Departments</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intake Table using DataTable */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Intakes</CardTitle>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'active'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              Active Intakes
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'deleted'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              Deleted Intakes
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                title: 'Role Title',
                dataIndex: 'role_title',
                key: 'role_title',
                render: (_: any, record: Survey) => (
                  <span className="font-medium">{record.role_title}</span>
                ),
              },
              {
                title: 'Hiring Manager',
                dataIndex: 'hiring_manager_name',
                key: 'hiring_manager_name',
              },
              {
                title: 'Hiring Type',
                dataIndex: 'hire_type',
                key: 'hire_type',
              },
              {
                title: 'Department',
                dataIndex: 'department_function',
                key: 'department_function',
              },
              {
                title: 'Location',
                dataIndex: 'location',
                key: 'location',
              },
              {
                title: 'Positions',
                dataIndex: 'number_of_positions',
                key: 'number_of_positions',
              },
              {
                title: 'Status',
                key: 'status',
                render: (_: any, record: Survey) =>
                  record.budget_approved ? (
                    <span className="inline-block rounded-md px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Budget Approved
                    </span>
                  ) : (
                    <span className="inline-block rounded-md px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Pending Approval
                    </span>
                  ),
              },
              {
                title: 'Created',
                dataIndex: 'created_at',
                key: 'created_at',
                render: (value: string) => format(new Date(value), 'dd/MM/yyyy'),
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_: any, record: Survey) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {activeTab === 'active' ? (
                        <>
                          <SurveyDetailDialog
                            survey={record}
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuItem onClick={() => navigate(`/edit-intake/${record.id}`)} className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(record.id)} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950">
                            Delete
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => handleRestore(record.id)} className="cursor-pointer text-green-600 focus:text-green-700">
                          Restore
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ),
              },
            ]}
            dataSource={surveys.filter((s) => activeTab === 'active' ? !s.is_deleted : s.is_deleted)}
            rowKey="id"
            loading={loading}
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default IntakeSection;
