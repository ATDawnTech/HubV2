import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, DollarSign, Trash2, UserX, UserCheck, Upload, Download, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthz } from '@/hooks/useAuthz';
import * as XLSX from 'xlsx';

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string;
  location: string | null;
  is_active: boolean | null;
  photo_path: string | null;
  resume_path: string | null;
  cost_annual: number | null;
  currency_code: string | null;
  margin_pct: number | null;
  rate_hourly: number | null;
}

interface EmployeeRate {
  user_id: string;
  base_rate_usd: number;
  effective_from: string;
  notes: string | null;
}

interface FxRate {
  code: string;
  rate_to_usd: number;
  updated_at: string;
}

export const EmployeesManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [employeeRates, setEmployeeRates] = useState<EmployeeRate[]>([]);
  const [fxRates, setFxRates] = useState<FxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddRateDialogOpen, setIsAddRateDialogOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [newRate, setNewRate] = useState({
    user_id: '',
    base_rate_usd: 0,
    margin_pct: 30,
    notes: ''
  });
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    full_name: '',
    location: 'US',
    cost_annual: 0,
    currency_code: 'USD',
    margin_pct: 30
  });
  
  const { toast } = useToast();
  const { isAdmin } = useAuthz();

  useEffect(() => {
    loadData();
    // Load last used currency from localStorage
    const lastCurrency = localStorage.getItem('lastUsedCurrency');
    if (lastCurrency) {
      setNewEmployee(prev => ({ ...prev, currency_code: lastCurrency }));
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, location, is_active, photo_path, resume_path, cost_annual, currency_code, margin_pct, rate_hourly');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Load employee rates
      const { data: ratesData, error: ratesError } = await supabase
        .from('employee_rates')
        .select('*');

      if (ratesError) throw ratesError;
      setEmployeeRates(ratesData || []);

      // Load FX rates
      const { data: fxData, error: fxError } = await supabase
        .from('fx_rates')
        .select('*');

      if (fxError) throw fxError;
      setFxRates(fxData || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load employee data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.email || !newEmployee.full_name) return;

    try {
      // First create user in auth
      const { data: userData, error: authError } = await supabase.auth.signUp({
        email: newEmployee.email,
        password: 'temporary123!', // User should reset password on first login
        options: {
          data: {
            full_name: newEmployee.full_name
          },
          emailRedirectTo: undefined // Disable email confirmation for admin-created users
        }
      });

      if (authError) throw authError;

      if (userData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: userData.user.id,
            email: newEmployee.email,
            full_name: newEmployee.full_name,
            location: newEmployee.location,
            cost_annual: newEmployee.cost_annual || null,
            currency_code: newEmployee.currency_code,
            margin_pct: newEmployee.margin_pct,
            is_active: true
          });

        if (profileError) throw profileError;

        // Save last used currency to localStorage
        localStorage.setItem('lastUsedCurrency', newEmployee.currency_code);

        // Refresh data
        await loadData();
        
        setNewEmployee({ 
          email: '', 
          full_name: '', 
          location: 'US',
          cost_annual: 0,
          currency_code: newEmployee.currency_code, // Keep the last used currency
          margin_pct: 30
        });
        setIsAddEmployeeDialogOpen(false);
        
        toast({
          title: "Success",
          description: "Employee added successfully. They should reset their password on first login.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add employee",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMargin = async () => {
    if (!newRate.user_id) return;

    try {
      // Update margin in profiles table (rate_hourly is generated by DB)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          margin_pct: newRate.margin_pct
        })
        .eq('user_id', newRate.user_id);

      if (profileError) throw profileError;

      // Update local state so UI reflects new computed rates immediately
      setProfiles(prev => prev.map(profile => 
        profile.user_id === newRate.user_id 
          ? { ...profile, margin_pct: newRate.margin_pct }
          : profile
      ));
      
      setNewRate({ user_id: '', base_rate_usd: 0, margin_pct: 30, notes: '' });
      setIsAddRateDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Employee margin updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update employee margin",
        variant: "destructive",
      });
    }
  };

  const handleToggleEmployeeStatus = async (userId: string, currentStatus: boolean | null) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setProfiles(prev => prev.map(profile => 
        profile.user_id === userId 
          ? { ...profile, is_active: newStatus }
          : profile
      ));
      
      toast({
        title: "Success",
        description: `Employee ${newStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update employee status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmployee = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }

    try {
      // First delete employee rates
      await supabase
        .from('employee_rates')
        .delete()
        .eq('user_id', userId);

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setProfiles(prev => prev.filter(profile => profile.user_id !== userId));
      setEmployeeRates(prev => prev.filter(rate => rate.user_id !== userId));
      
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
    }
  };

  const handleEditEmployee = (employee: Profile) => {
    setEditingEmployee(employee);
    setIsEditEmployeeDialogOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          email: editingEmployee.email,
          full_name: editingEmployee.full_name,
          location: editingEmployee.location,
          cost_annual: editingEmployee.cost_annual,
          currency_code: editingEmployee.currency_code,
          margin_pct: editingEmployee.margin_pct
        })
        .eq('user_id', editingEmployee.user_id);

      if (error) throw error;

      // Update local state
      setProfiles(prev => prev.map(profile => 
        profile.user_id === editingEmployee.user_id 
          ? editingEmployee
          : profile
      ));
      
      setIsEditEmployeeDialogOpen(false);
      setEditingEmployee(null);
      
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Email': 'john.doe@example.com',
        'Full Name': 'John Doe',
        'Location': 'US'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Template');
    XLSX.writeFile(wb, 'employee_bulk_upload_template.xlsx');
    
    toast({
      title: "Template Downloaded",
      description: "Excel template has been downloaded successfully",
    });
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingBulk(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const employees = jsonData.map((row: any) => ({
        email: row['Email'],
        full_name: row['Full Name'],
        location: row['Location'] || 'US'
      }));

      let successCount = 0;
      let errorCount = 0;

      for (const employee of employees) {
        if (!employee.email || !employee.full_name) {
          errorCount++;
          continue;
        }

        try {
          // Create user in auth
          const { data: userData, error: authError } = await supabase.auth.signUp({
            email: employee.email,
            password: 'temporary123!',
            options: {
              data: {
                full_name: employee.full_name
              },
              emailRedirectTo: undefined
            }
          });

          if (authError) {
            errorCount++;
            continue;
          }

          if (userData.user) {
            // Create profile
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                user_id: userData.user.id,
                email: employee.email,
                full_name: employee.full_name,
                location: employee.location,
                cost_annual: null,
                currency_code: 'USD',
                margin_pct: 30,
                is_active: true
              });

            if (profileError) {
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (error) {
          errorCount++;
        }
      }

      await loadData();
      setIsBulkUploadDialogOpen(false);
      
      toast({
        title: "Bulk Upload Complete",
        description: `Successfully added ${successCount} employees. ${errorCount > 0 ? `${errorCount} errors occurred.` : ''}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process Excel file",
        variant: "destructive",
      });
    } finally {
      setUploadingBulk(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const convertCurrency = (usdAmount: number, toCurrency: string) => {
    if (toCurrency === 'USD') return usdAmount;
    const rate = fxRates.find(r => r.code === toCurrency);
    return rate ? usdAmount * rate.rate_to_usd : usdAmount;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculatePreviewRate = () => {
    const cost = newEmployee.cost_annual || 0;
    const margin = newEmployee.margin_pct || 30;
    if (cost <= 0) return 0;
    // Calculate hourly rate in local currency: (annual cost * (1 + margin%)) / working hours per year
    return (cost * (1 + margin / 100)) / (160 * 12);
  };

  const calculateRateInUSD = (localRate: number, currencyCode: string) => {
    if (currencyCode === 'USD') return localRate;
    const rate = fxRates.find(r => r.code === currencyCode);
    return rate && rate.rate_to_usd ? localRate / rate.rate_to_usd : localRate;
  };

  const calculateEmployeeRates = (employee: Profile) => {
    const cost = employee.cost_annual || 0;
    const margin = employee.margin_pct || 30;
    const currency = employee.currency_code || 'USD';
    
    if (cost <= 0) return { localRate: 0, usdRate: 0, baseLocalRate: 0, baseUsdRate: 0 };
    
    // Base rate without margin
    const baseLocalRate = cost / (160 * 12);
    const baseUsdRate = calculateRateInUSD(baseLocalRate, currency);
    
    // Rate with margin
    const localRate = (cost * (1 + margin / 100)) / (160 * 12);
    const usdRate = calculateRateInUSD(localRate, currency);
    
    return { localRate, usdRate, baseLocalRate, baseUsdRate };
  };

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || profile?.email || 'Unknown';
  };

  const employeesWithRates = profiles.map(profile => {
    const rate = employeeRates.find(r => r.user_id === profile.user_id);
    return {
      ...profile,
      rate
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Employee Management</h3>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fxRates.map((rate) => (
                <SelectItem key={rate.code} value={rate.code}>
                  {rate.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Employee Upload</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="text-sm text-muted-foreground">
                    Upload an Excel file with employee data. Download the template below to see the required format.
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={downloadTemplate}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Excel Template
                  </Button>
                  
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleBulkUpload}
                      disabled={uploadingBulk}
                      className="hidden"
                      id="bulk-upload"
                    />
                    <Label htmlFor="bulk-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                        <div className="text-sm font-medium">
                          {uploadingBulk ? 'Processing...' : 'Click to upload Excel file'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Supported formats: .xlsx, .xls
                        </div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <strong>Required columns:</strong> Email, Full Name
                    <br />
                    <strong>Optional columns:</strong> Location (defaults to US)
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="emp_email">Email</Label>
                    <Input
                      id="emp_email"
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter employee email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="emp_name">Full Name</Label>
                    <Input
                      id="emp_name"
                      value={newEmployee.full_name}
                      onChange={(e) => setNewEmployee(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter employee full name"
                    />
                  </div>
                  
                   <div>
                     <Label htmlFor="emp_location">Location</Label>
                     <Select
                       value={newEmployee.location}
                       onValueChange={(value) => setNewEmployee(prev => ({ ...prev, location: value }))}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Select location" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="US">United States</SelectItem>
                         <SelectItem value="IN">India</SelectItem>
                         <SelectItem value="SGP">Singapore</SelectItem>
                         <SelectItem value="VN">Vietnam</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="emp_cost">Annual Cost</Label>
                       <Input
                         id="emp_cost"
                         type="number"
                         min="0"
                         step="1000"
                         value={newEmployee.cost_annual}
                         onChange={(e) => setNewEmployee(prev => ({ ...prev, cost_annual: parseFloat(e.target.value) || 0 }))}
                         placeholder="Annual cost"
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="emp_currency">Currency</Label>
                       <Select
                         value={newEmployee.currency_code}
                         onValueChange={(value) => setNewEmployee(prev => ({ ...prev, currency_code: value }))}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Select currency" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="USD">USD</SelectItem>
                           <SelectItem value="INR">INR</SelectItem>
                           <SelectItem value="VND">VND</SelectItem>
                           <SelectItem value="SGD">SGD</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>

                   <div>
                     <Label htmlFor="emp_margin">Margin % (default: 30%)</Label>
                     <Input
                       id="emp_margin"
                       type="number"
                       min="0"
                       max="100"
                       step="1"
                       value={newEmployee.margin_pct}
                       onChange={(e) => setNewEmployee(prev => ({ ...prev, margin_pct: parseFloat(e.target.value) || 30 }))}
                       placeholder="Margin percentage"
                     />
                   </div>

                   {newEmployee.cost_annual > 0 && (
                     <div className="p-3 bg-muted rounded-lg">
                       <div className="text-sm font-medium">Preview Rate</div>
                        <div className="text-lg font-bold text-primary">
                          {formatCurrency(calculatePreviewRate(), newEmployee.currency_code)}/hr
                          <span className="text-xs text-muted-foreground">({newEmployee.currency_code})</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ≈ {formatCurrency(calculateRateInUSD(calculatePreviewRate(), newEmployee.currency_code), 'USD')}/hr (USD)
                        </div>
                       <div className="text-xs text-muted-foreground mt-1">
                         Based on {newEmployee.currency_code} {newEmployee.cost_annual?.toLocaleString()} annual cost + {newEmployee.margin_pct}% margin
                       </div>
                     </div>
                   )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddEmployeeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEmployee} disabled={!newEmployee.email || !newEmployee.full_name}>
                    Add Employee
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddRateDialogOpen} onOpenChange={setIsAddRateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Add/Update Margin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add/Update Employee Margin</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee-select">Employee</Label>
                    <Select value={newRate.user_id} onValueChange={(value) => setNewRate(prev => ({ ...prev, user_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.full_name || profile.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="margin">Margin Percentage</Label>
                    <Input
                      id="margin"
                      type="number"
                      value={newRate.margin_pct}
                      onChange={(e) => {
                        const marginPct = parseFloat(e.target.value) || 0;
                        setNewRate(prev => ({ ...prev, margin_pct: marginPct }));
                      }}
                      placeholder="Enter margin percentage"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      value={newRate.notes}
                      onChange={(e) => setNewRate(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddRateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateMargin}>
                    Update Margin
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Employee Dialog */}
            <Dialog open={isEditEmployeeDialogOpen} onOpenChange={setIsEditEmployeeDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Employee</DialogTitle>
                </DialogHeader>
                {editingEmployee && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingEmployee.email || ''}
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, email: e.target.value } : null)}
                        placeholder="Enter email address"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
                        id="edit-name"
                        value={editingEmployee.full_name || ''}
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                        placeholder="Enter full name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-location">Location</Label>
                      <Select
                        value={editingEmployee.location || 'US'}
                        onValueChange={(value) => setEditingEmployee(prev => prev ? { ...prev, location: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">US</SelectItem>
                          <SelectItem value="IN">IN</SelectItem>
                          <SelectItem value="SGP">SGP</SelectItem>
                          <SelectItem value="VN">VN</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-cost">Annual Cost</Label>
                      <Input
                        id="edit-cost"
                        type="number"
                        value={editingEmployee.cost_annual || ''}
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, cost_annual: parseFloat(e.target.value) || null } : null)}
                        placeholder="Enter annual cost"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-currency">Currency</Label>
                      <Select
                        value={editingEmployee.currency_code || 'USD'}
                        onValueChange={(value) => setEditingEmployee(prev => prev ? { ...prev, currency_code: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fxRates.map((rate) => (
                            <SelectItem key={rate.code} value={rate.code}>
                              {rate.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-margin">Margin Percentage</Label>
                      <Input
                        id="edit-margin"
                        type="number"
                        value={editingEmployee.margin_pct || ''}
                        onChange={(e) => setEditingEmployee(prev => prev ? { ...prev, margin_pct: parseFloat(e.target.value) || null } : null)}
                        placeholder="Enter margin percentage"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditEmployeeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateEmployee}>
                    Update Employee
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Employee</TableHead>
               <TableHead>Location</TableHead>
               <TableHead>Cost (Annual)</TableHead>
               <TableHead>Margin %</TableHead>
               <TableHead>Rate (Local Currency)</TableHead>
                <TableHead>Base Rate (USD)</TableHead>
                <TableHead>Rate with Margin (USD)</TableHead>
               <TableHead>Status</TableHead>
               {isAdmin && <TableHead>Actions</TableHead>}
             </TableRow>
           </TableHeader>
          <TableBody>
            {employeesWithRates.map((employee) => (
              <TableRow key={employee.user_id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{employee.full_name || 'No name'}</div>
                    <div className="text-sm text-muted-foreground">{employee.email}</div>
                  </div>
                </TableCell>
                 <TableCell>
                   {isAdmin ? (
                     <Select
                       value={employee.location || 'US'}
                       onValueChange={async (value) => {
                         try {
                           const { error } = await supabase
                             .from('profiles')
                             .update({ location: value })
                             .eq('user_id', employee.user_id);
                           
                           if (error) throw error;
                           
                           setProfiles(prev => prev.map(p => 
                             p.user_id === employee.user_id 
                               ? { ...p, location: value }
                               : p
                           ));
                           
                           toast({
                             title: "Success",
                             description: "Location updated successfully",
                           });
                         } catch (error: any) {
                           toast({
                             title: "Error",
                             description: "Failed to update location",
                             variant: "destructive",
                           });
                         }
                       }}
                     >
                       <SelectTrigger className="w-20">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="US">US</SelectItem>
                         <SelectItem value="IN">IN</SelectItem>
                         <SelectItem value="SGP">SGP</SelectItem>
                         <SelectItem value="VN">VN</SelectItem>
                       </SelectContent>
                     </Select>
                   ) : (
                     <Badge variant={employee.location === 'US' ? 'default' : 'secondary'}>
                       {employee.location || 'Not set'}
                     </Badge>
                   )}
                 </TableCell>
                 <TableCell>
                   {employee.cost_annual ? (
                     formatCurrency(employee.cost_annual, employee.currency_code || 'USD')
                   ) : '-'}
                 </TableCell>
                 <TableCell>
                   {employee.margin_pct !== null ? `${employee.margin_pct}%` : '-'}
                 </TableCell>
                 <TableCell>
                   {(() => {
                     const rates = calculateEmployeeRates(employee);
                     return rates.localRate > 0 ? (
                        <div className="flex items-center gap-1">
                          {formatCurrency(rates.localRate, employee.currency_code || 'USD')}/hr
                          <span className="text-xs text-muted-foreground">({employee.currency_code || 'USD'})</span>
                        </div>
                     ) : (
                       <Badge variant="outline">Not set</Badge>
                     );
                   })()}
                 </TableCell>
                  <TableCell>
                    {(() => {
                      const rates = calculateEmployeeRates(employee);
                      return rates.baseUsdRate > 0 ? (
                         <div className="flex items-center gap-1">
                           <DollarSign className="h-4 w-4" />
                           {formatCurrency(rates.baseUsdRate, 'USD')}/hr
                         </div>
                      ) : (
                        <Badge variant="outline">Not set</Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const rates = calculateEmployeeRates(employee);
                      return rates.usdRate > 0 ? (
                         <div className="flex items-center gap-1">
                           <DollarSign className="h-4 w-4" />
                           {formatCurrency(rates.usdRate, 'USD')}/hr
                         </div>
                      ) : (
                        <Badge variant="outline">Not set</Badge>
                      );
                    })()}
                  </TableCell>
                 <TableCell>
                   <Badge variant={employee.is_active !== false ? 'default' : 'secondary'}>
                     {employee.is_active !== false ? 'Active' : 'Inactive'}
                   </Badge>
                 </TableCell>
                 {isAdmin && (
                   <TableCell>
                     <div className="flex gap-2">
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => handleEditEmployee(employee)}
                         className="flex items-center gap-1"
                       >
                         <Edit className="h-3 w-3" />
                         Edit
                       </Button>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => handleToggleEmployeeStatus(employee.user_id, employee.is_active)}
                         className="flex items-center gap-1"
                       >
                         {employee.is_active !== false ? (
                           <>
                             <UserX className="h-3 w-3" />
                             Disable
                           </>
                         ) : (
                           <>
                             <UserCheck className="h-3 w-3" />
                             Enable
                           </>
                         )}
                       </Button>
                       <Button
                         type="button"
                         variant="destructive"
                         size="sm"
                         onClick={() => handleDeleteEmployee(employee.user_id)}
                         className="flex items-center gap-1"
                       >
                         <Trash2 className="h-3 w-3" />
                         Delete
                       </Button>
                     </div>
                   </TableCell>
                 )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {employeesWithRates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No employees found.
          </div>
        )}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Currency Exchange Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-3">
              Conversion: USD rate = Local rate / rate_to_usd (since 1 USD = rate_to_usd units of local currency).
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {fxRates.map((rate) => (
                <div key={rate.code} className="text-center p-3 border rounded-lg">
                  <div className="font-medium">{rate.code}</div>
                  <div className="text-sm text-muted-foreground">
                    1 USD = {rate.rate_to_usd} {rate.code}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};