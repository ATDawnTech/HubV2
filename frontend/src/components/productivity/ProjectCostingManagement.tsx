import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Calculator, Download, Users, DollarSign, Edit, Trash2, FileText, HelpCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useToast } from '@/hooks/use-toast';
import { useAuthz } from '@/hooks/useAuthz';
import { supabase } from '@/integrations/supabase/client';

export const ProjectCostingManagement: React.FC = () => {
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeRates, setEmployeeRates] = useState<Record<string, number>>({});
  const [fxRates, setFxRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [newMember, setNewMember] = useState({
    project_id: '',
    user_id: '',
    role: '',
    bill_rate_usd: 0,
    member_discount_pct: 0,
    effective_from: new Date().toISOString().split('T')[0]
  });
  
  const { toast } = useToast();
  const { isAdmin } = useAuthz();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading project P&L data...');
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client, discount_pct, discount_reason, start_date, end_date')
        .order('name');
      
      if (projectsError) {
        console.error('Projects error:', projectsError);
        throw projectsError;
      }
      
      console.log('Projects loaded:', projectsData);
      
      // Fetch employees (profiles)
      const { data: employeesData, error: employeesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, cost_annual, margin_pct, currency_code')
        .order('full_name');
      
      if (employeesError) {
        console.error('Employees error:', employeesError);
        throw employeesError;
      }
      
      console.log('Employees loaded:', employeesData);
      
      // Fetch FX rates for currency conversion
      const { data: fxData, error: fxError } = await supabase
        .from('fx_rates')
        .select('*');
      
      if (fxError) {
        console.error('FX rates error:', fxError);
      } else {
        setFxRates(fxData || []);
      }
      
      // Calculate employee base rates (without margin) to match Employee Management
      console.log('FX rates available:', fxData);
      const map: Record<string, number> = {};
      for (const employee of employeesData || []) {
        const cost = employee.cost_annual || 0;
        const currency = employee.currency_code || 'USD';
        
        if (cost > 0) {
          // Calculate base hourly rate: annual cost / working hours per year (NO MARGIN)
          const localBaseRate = cost / (160 * 12);
          console.log(`Employee ${employee.full_name}: cost=${cost} ${currency}, localBaseRate=${localBaseRate}`);
          
          // Convert to USD rate
          let usdBaseRate = localBaseRate;
          if (currency !== 'USD' && fxData) {
            const fxRate = fxData.find((r: any) => r.code === currency);
            console.log(`FX rate for ${currency}:`, fxRate);
            if (fxRate && fxRate.rate_to_usd) {
              usdBaseRate = localBaseRate / fxRate.rate_to_usd;
              console.log(`Converted ${localBaseRate} ${currency} to ${usdBaseRate} USD using rate ${fxRate.rate_to_usd}`);
            }
          }
          
          map[employee.user_id] = usdBaseRate;
          console.log(`Final base rate for ${employee.full_name}: $${usdBaseRate.toFixed(2)}`);
        }
      }
      setEmployeeRates(map);
      
      // Fetch project members - using simpler query first to avoid join issues
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (membersError) {
        console.error('Members error:', membersError);
        // Don't throw error for members, just log it and continue with empty array
        setProjectMembers([]);
      } else {
        console.log('Project members loaded:', membersData);
        setProjectMembers(membersData || []);
      }
      
      setProjects(projectsData || []);
      setEmployees(employeesData || []);

    } catch (error: any) {
      console.error('Load data error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load project P&L data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.project_id || !newMember.user_id || newMember.bill_rate_usd <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: any = {
        project_id: newMember.project_id,
        user_id: newMember.user_id,
        role: newMember.role || null,
        bill_rate_usd: Number(newMember.bill_rate_usd),
        member_discount_pct: Number(newMember.member_discount_pct) || 0,
        effective_from: newMember.effective_from || undefined,
        status: 'active',
      };

      const { error } = await supabase
        .from('project_members')
        .insert(payload);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project member added successfully",
      });
      setIsAddDialogOpen(false);
      // Reset
      setNewMember({
        project_id: '',
        user_id: '',
        role: '',
        bill_rate_usd: 0,
        member_discount_pct: 0,
        effective_from: new Date().toISOString().split('T')[0]
      });
      await loadData();
    } catch (error: any) {
      console.error('Add member error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add project member",
        variant: "destructive",
      });
    }
  };

  const handleEditMember = (member: any) => {
    setEditingMember({
      project_id: member.project_id,
      user_id: member.user_id,
      role: member.role || '',
      bill_rate_usd: member.bill_rate_usd || 0,
      member_discount_pct: member.member_discount_pct || 0,
      effective_from: member.effective_from || new Date().toISOString().split('T')[0]
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMember = async () => {
    if (!editingMember?.project_id || !editingMember?.user_id || editingMember.bill_rate_usd <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('project_members')
        .update({
          role: editingMember.role || null,
          bill_rate_usd: Number(editingMember.bill_rate_usd),
          member_discount_pct: Number(editingMember.member_discount_pct) || 0,
          effective_from: editingMember.effective_from,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', editingMember.project_id)
        .eq('user_id', editingMember.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project member updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingMember(null);
      await loadData();
    } catch (error: any) {
      console.error('Update member error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update project member",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMember = async (projectId: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this project member?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project member deleted successfully",
      });
      await loadData();
    } catch (error: any) {
      console.error('Delete member error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete project member",
        variant: "destructive",
      });
    }
  };

  const calculateWorkingDays = (startDate: string, endDate: string | null) => {
    if (!endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
    }
    
    return workingDays;
  };

  const calculateTotalDays = (startDate: string, endDate: string | null) => {
    if (!endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const convertToUSD = (amount: number, currency: string) => {
    if (currency === 'USD' || !fxRates.length) return amount;
    
    const fxRate = fxRates.find(r => r.code === currency);
    if (fxRate && fxRate.rate_to_usd) {
      return amount / fxRate.rate_to_usd;
    }
    
    return amount; // fallback to original if no rate found
  };

  const exportToCSV = () => {
    const headers = [
      'Project', 'Client', 'Employee', 'Role', 'Bill Rate (USD)', 'Base Rate (USD)',
      'Member Discount %', 'Project Discount %', 'Project Margin %', 'Projected Revenue', 'Projected Earnings (before tax)', 'Status',
      'Effective From', 'End Date'
    ];
    
    const rows = projectMembers.map(m => {
      const proj = projects.find((p) => p.id === m.project_id);
      const emp = employees.find((e) => e.user_id === m.user_id);
      const base = employeeRates[m.user_id] ?? 0;
      const bill = Number(m.bill_rate_usd) || 0;
      const memberDisc = m.member_discount_pct ?? 0;
      const projectDisc = proj?.discount_pct ?? 0;
      const discountToUse = memberDisc || projectDisc || 0;
      // Calculate margin % = ((Bill Rate - Base Rate) / Bill Rate) × 100
      const marginPct = bill > 0 ? ((bill - base) / bill) * 100 : 0;
      
      // Calculate status based on end date
      const now = new Date();
      const endDate = proj?.end_date ? new Date(proj.end_date) : null;
      const status = endDate && endDate < now ? 'Inactive' : (m.status || 'active');
      
      // Calculate projected revenue
      const workingDays = calculateWorkingDays(proj?.start_date || new Date().toISOString().split('T')[0], proj?.end_date);
      const projectedRevenue = workingDays * 8 * bill;
      
      // Calculate projected earnings (before tax)
      const totalDays = calculateTotalDays(m.effective_from || proj?.start_date || new Date().toISOString().split('T')[0], proj?.end_date);
      const empProfile = employees.find(e => e.user_id === m.user_id);
      const costAnnualUSD = convertToUSD(empProfile?.cost_annual || 0, empProfile?.currency_code || 'USD');
      const projectedCost = totalDays * (costAnnualUSD / 365);
      const projectedEarnings = projectedRevenue - projectedCost;

      return [
        proj?.name || '—',
        proj?.client || '—',
        emp?.full_name || emp?.email || '—',
        m.role || '—',
        bill.toFixed(2),
        base.toFixed(2),
        memberDisc.toFixed(1),
        projectDisc.toFixed(1),
        bill > 0 ? marginPct.toFixed(2) : '—',
        projectedRevenue.toFixed(2),
        projectedEarnings.toFixed(2),
        status,
        proj?.start_date ? new Date(proj.start_date).toLocaleDateString() : '—',
        proj?.end_date ? new Date(proj.end_date).toLocaleDateString() : '—'
      ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-pl-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add logo at top right with larger size
      const logoImg = new Image();
      logoImg.onload = function() {
        // Draw logo to canvas to create data URL, then add to PDF
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        if (ctx) {
          ctx.drawImage(logoImg, 0, 0);
        }
        const logoDataUrl = canvas.toDataURL('image/png');
        // Add logo (top right position) - increased size
        doc.addImage(logoDataUrl, 'PNG', 140, 8, 60, 30);
        
        // Add title with company colors
        doc.setFillColor(79, 70, 229); // primary color
        doc.rect(14, 35, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text('Projects P&L Report', 16, 41);
        
        // Add date
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 52);
        
        // Add disclaimer about contract end date assumption
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Note: This report assumes contract end date as 31st December for calculation and projection purposes.', 14, 60);
        
        // Add blank line for spacing
        
        // Calculate totals
        let totalProjectedRevenue = 0;
        let totalProjectedEarnings = 0;
        
        // Prepare data for the table
        const tableHeaders = [
          'Project', 'Client', 'Employee', 'Role', 'Bill Rate', 'Base Rate',
          'Discount %', 'Margin %', 'Proj. Revenue', 'Proj. Earnings', 'Status'
        ];
        
        const tableData = projectMembers.map(m => {
          const proj = projects.find((p) => p.id === m.project_id);
          const emp = employees.find((e) => e.user_id === m.user_id);
          const base = employeeRates[m.user_id] ?? 0;
          const bill = Number(m.bill_rate_usd) || 0;
          const memberDisc = m.member_discount_pct ?? 0;
          const projectDisc = proj?.discount_pct ?? 0;
          const discountToUse = memberDisc || projectDisc || 0;
          const marginPct = bill > 0 ? ((bill - base) / bill) * 100 : 0;
          
          // Calculate status based on end date
          const now = new Date();
          const endDate = proj?.end_date ? new Date(proj.end_date) : null;
          const status = endDate && endDate < now ? 'Inactive' : (m.status || 'active');
          
          // Calculate projected revenue
          const workingDays = calculateWorkingDays(proj?.start_date || new Date().toISOString().split('T')[0], proj?.end_date);
          const projectedRevenue = workingDays * 8 * bill;
          
          // Calculate projected earnings (before tax)
          const totalDays = calculateTotalDays(m.effective_from || proj?.start_date || new Date().toISOString().split('T')[0], proj?.end_date);
          const empProfile = employees.find(e => e.user_id === m.user_id);
          const costAnnualUSD = convertToUSD(empProfile?.cost_annual || 0, empProfile?.currency_code || 'USD');
          const projectedCost = totalDays * (costAnnualUSD / 365);
          const projectedEarnings = projectedRevenue - projectedCost;
          
          // Add to totals
          totalProjectedRevenue += projectedRevenue;
          totalProjectedEarnings += projectedEarnings;

          return [
            proj?.name || '—',
            proj?.client || '—',
            emp?.full_name || emp?.email || '—',
            m.role || '—',
            `$${bill.toFixed(2)}`,
            `$${base.toFixed(2)}`,
            `${discountToUse.toFixed(1)}%`,
            bill > 0 ? `${marginPct.toFixed(2)}%` : '—',
            `$${projectedRevenue.toFixed(2)}`,
            `$${projectedEarnings.toFixed(2)}`,
            status
          ];
        });
        
        // Add total row
        tableData.push([
          '', '', '', '', '', '', '', 'TOTAL:',
          `$${totalProjectedRevenue.toFixed(2)}`,
          `$${totalProjectedEarnings.toFixed(2)}`,
          ''
        ]);
        
        // Add table to PDF using autoTable
        autoTable(doc, {
          head: [tableHeaders],
          body: tableData,
          startY: 68,
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [79, 70, 229], // primary color
            textColor: 255,
            fontStyle: 'bold',
          },
          columnStyles: {
            8: { fontStyle: 'bold' }, // Projected Revenue
            9: { fontStyle: 'bold' }, // Projected Earnings (bold)
          },
          didParseCell: function(data) {
            // Style the total row
            if (data.row.index === tableData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [248, 250, 252]; // muted background
              data.cell.styles.textColor = [0, 0, 0];
            }
          },
          theme: 'striped',
          alternateRowStyles: {
            fillColor: [248, 250, 252], // muted color for alternate rows
          }
        });
        
        // Save the PDF
        doc.save(`projects-pl-report-${new Date().toISOString().split('T')[0]}.pdf`);
        
        toast({
          title: "Success",
          description: "PDF exported successfully",
        });
      };
      
      logoImg.onerror = function() {
        // Fallback without logo - generate PDF anyway
        generatePDFContent();
      };
      
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/lovable-uploads/37a83d76-2b27-4cdb-9f19-e86d2399b127.png';
      
      // Fallback function to generate PDF content
      const generatePDFContent = () => {
        // Add title with company colors
        doc.setFillColor(79, 70, 229);
        doc.rect(14, 15, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text('AT Dawn Technologies - Projects P&L Report', 16, 21);
        
        // Continue with rest of the PDF logic...
        doc.save(`projects-pl-report-${new Date().toISOString().split('T')[0]}.pdf`);
        
        toast({
          title: "Success",
          description: "PDF exported successfully",
        });
      };
      
    } catch (error: any) {
      console.error('PDF export error:', error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          <h2 className="text-2xl font-semibold">Project P&L</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelp(!showHelp)}
                  className="h-8 w-8 p-0"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to show/hide help information</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Project Member</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="project">Project</Label>
                      <Select
                        value={newMember.project_id}
                        onValueChange={(value) => setNewMember(prev => ({ ...prev, project_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="employee">Employee</Label>
                      <Select
                        value={newMember.user_id}
                        onValueChange={(value) => setNewMember(prev => ({ ...prev, user_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.user_id} value={employee.user_id}>
                              {employee.full_name || employee.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        value={newMember.role}
                        onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                        placeholder="e.g. Senior Developer"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="effective_from">Effective From</Label>
                      <Input
                        id="effective_from"
                        type="date"
                        value={newMember.effective_from}
                        onChange={(e) => setNewMember(prev => ({ ...prev, effective_from: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bill_rate">Bill Rate (USD)</Label>
                      <Input
                        id="bill_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newMember.bill_rate_usd}
                        onChange={(e) => setNewMember(prev => ({ ...prev, bill_rate_usd: parseFloat(e.target.value) || 0 }))}
                        placeholder="100.00"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="discount">Member Discount (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={newMember.member_discount_pct}
                        onChange={(e) => setNewMember(prev => ({ ...prev, member_discount_pct: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddMember} 
                    disabled={!newMember.project_id || !newMember.user_id || newMember.bill_rate_usd <= 0}
                  >
                    Add Member
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Help Section */}
      <Collapsible open={showHelp} onOpenChange={setShowHelp}>
        <CollapsibleContent className="space-y-0">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-800">📊 Project P&L Help</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">📈 Column Explanations:</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Base Rate (USD):</strong> Annual cost ÷ (160 × 12) converted to USD</li>
                    <li><strong>Bill Rate (USD):</strong> Hourly rate charged to client</li>
                    <li><strong>Project Margin %:</strong> ((Bill Rate - Base Rate) ÷ Bill Rate) × 100</li>
                    <li><strong>Projected Revenue:</strong> Working days × 8 hours × Bill Rate</li>
                    <li><strong>Projected Earnings:</strong> Projected Revenue - Annual Cost (prorated)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🎨 Color Coding:</h4>
                  <ul className="text-sm space-y-1">
                    <li><span className="text-green-600">🟢 Green:</span> Bill Rate &gt; Base Rate</li>
                    <li><span className="text-red-600">🔴 Red:</span> Bill Rate ≤ Base Rate</li>
                    <li><strong>Status:</strong> Inactive if project end date has passed</li>
                    <li><strong>Discount %:</strong> Hover to see discount reason</li>
                  </ul>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">💡 Key Features:</h4>
                <p className="text-sm">
                  • Base rates sync automatically with Employee Management<br/>
                  • Export to CSV/PDF with totals<br/>
                  • Real-time currency conversion<br/>
                  • Project status updates based on end dates
                </p>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Bill Rate (USD)</TableHead>
              <TableHead>Base Rate (USD)</TableHead>
              <TableHead>Discount %</TableHead>
              <TableHead>Project Margin %</TableHead>
              <TableHead>Projected Revenue</TableHead>
              <TableHead className="font-bold">Projected Earnings (before tax)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>End Date</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No project members yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding members to projects to track P&L and margins.
                  </p>
                  {isAdmin && (
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Member
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {projectMembers.map((m) => {
                  const proj = projects.find((p) => p.id === m.project_id);
                  const emp = employees.find((e) => e.user_id === m.user_id);
                  const base = employeeRates[m.user_id] ?? 0;
                  const bill = Number(m.bill_rate_usd) || 0;
                  const memberDisc = m.member_discount_pct ?? 0;
                  const projectDisc = proj?.discount_pct ?? 0;
                  const discountToUse = memberDisc || projectDisc || 0;
                  // Calculate margin % = ((Bill Rate - Base Rate) / Bill Rate) × 100
                  const marginPct = bill > 0 ? ((bill - base) / bill) * 100 : 0;

                  // Calculate status based on start and end dates
                  const now = new Date();
                  const startDate = proj?.start_date ? new Date(proj.start_date) : null;
                  const endDate = proj?.end_date ? new Date(proj.end_date) : null;
                  
                  let status = m.status || 'active';
                  if (endDate && endDate < now) {
                    status = 'Inactive';
                  } else if (startDate && startDate > now) {
                    status = 'Yet to Start';
                  }
                  
                  // Calculate projected revenue
                  const workingDays = calculateWorkingDays(proj?.start_date || new Date().toISOString().split('T')[0], proj?.end_date);
                  const projectedRevenue = workingDays * 8 * bill;
                  
                  // Calculate projected earnings (before tax)
                  const totalDays = calculateTotalDays(m.effective_from || proj?.start_date || new Date().toISOString().split('T')[0], proj?.end_date);
                  const empProfile = employees.find(e => e.user_id === m.user_id);
                  const costAnnualUSD = convertToUSD(empProfile?.cost_annual || 0, empProfile?.currency_code || 'USD');
                  const projectedCost = totalDays * (costAnnualUSD / 365);
                  const projectedEarnings = projectedRevenue - projectedCost;

                  return (
                    <TableRow key={`${m.project_id}-${m.user_id}-${m.effective_from || ''}`}>
                      <TableCell>{proj?.name || '—'}</TableCell>
                      <TableCell>{proj?.client || '—'}</TableCell>
                      <TableCell>{emp?.full_name || emp?.email || '—'}</TableCell>
                      <TableCell>{m.role || '—'}</TableCell>
                      <TableCell className={bill > base ? 'text-green-600' : 'text-red-600'}>
                        ${bill.toFixed(2)}
                      </TableCell>
                      <TableCell className={base > bill ? 'text-green-600' : 'text-red-600'}>
                        ${base.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{discountToUse.toFixed(1)}%</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{proj?.discount_reason || 'No discount reason specified'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className={marginPct > (emp?.margin_pct || 30) ? 'text-green-600' : 'text-red-600'}>
                        {bill > 0 ? `${marginPct.toFixed(2)}%` : '—'}
                      </TableCell>
                      <TableCell>
                        ${projectedRevenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-bold">
                        ${projectedEarnings.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          status === 'Inactive' ? 'destructive' : 
                          status === 'Yet to Start' ? 'outline' : 
                          'secondary'
                        }>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{proj?.start_date ? new Date(proj.start_date).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{proj?.end_date ? new Date(proj.end_date).toLocaleDateString() : '—'}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditMember(m)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteMember(m.project_id, m.user_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                
                {/* Total Row */}
                {projectMembers.length > 0 && (
                  <TableRow className="border-t-2 border-primary bg-muted/50 font-bold">
                    <TableCell colSpan={8} className="text-right font-bold">
                      TOTAL:
                    </TableCell>
                    <TableCell className="font-bold">
                      ${projectMembers.reduce((total, m) => {
                        const proj = projects.find((p) => p.id === m.project_id);
                        const bill = Number(m.bill_rate_usd) || 0;
                        const workingDays = calculateWorkingDays(proj?.start_date || new Date().toISOString().split('T')[0], proj?.end_date);
                        const projectedRevenue = workingDays * 8 * bill;
                        return total + projectedRevenue;
                      }, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-bold">
                      ${projectMembers.reduce((total, m) => {
                        const proj = projects.find((p) => p.id === m.project_id);
                        const bill = Number(m.bill_rate_usd) || 0;
                        const workingDays = calculateWorkingDays(proj?.start_date || new Date().toISOString().split('T')[0], proj?.end_date);
                        const projectedRevenue = workingDays * 8 * bill;
                        
                        const totalDays = calculateTotalDays(m.effective_from || proj?.start_date || new Date().toISOString().split('T')[0], proj?.end_date);
                        const empProfile = employees.find(e => e.user_id === m.user_id);
                        const costAnnualUSD = convertToUSD(empProfile?.cost_annual || 0, empProfile?.currency_code || 'USD');
                        const projectedCost = totalDays * (costAnnualUSD / 365);
                        const projectedEarnings = projectedRevenue - projectedCost;
                        return total + projectedEarnings;
                      }, 0).toFixed(2)}
                    </TableCell>
                    <TableCell colSpan={isAdmin ? 4 : 3}></TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Member Dialog */}
      {isAdmin && editingMember && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Project Member</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-project">Project</Label>
                  <Select
                    value={editingMember?.project_id || ''}
                    onValueChange={(value) => setEditingMember(prev => prev ? { ...prev, project_id: value } : null)}
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-employee">Employee</Label>
                  <Select
                    value={editingMember?.user_id || ''}
                    onValueChange={(value) => setEditingMember(prev => prev ? { ...prev, user_id: value } : null)}
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.user_id} value={employee.user_id}>
                          {employee.full_name || employee.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <Input
                    id="edit-role"
                    value={editingMember?.role || ''}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, role: e.target.value } : null)}
                    placeholder="e.g. Senior Developer"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-effective_from">Effective From</Label>
                  <Input
                    id="edit-effective_from"
                    type="date"
                    value={editingMember?.effective_from || ''}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, effective_from: e.target.value } : null)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-bill_rate">Bill Rate (USD)</Label>
                  <Input
                    id="edit-bill_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingMember?.bill_rate_usd || 0}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, bill_rate_usd: parseFloat(e.target.value) || 0 } : null)}
                    placeholder="100.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-discount">Member Discount (%)</Label>
                  <Input
                    id="edit-discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editingMember?.member_discount_pct || 0}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, member_discount_pct: parseFloat(e.target.value) || 0 } : null)}
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateMember} 
                disabled={!editingMember?.project_id || !editingMember?.user_id || editingMember.bill_rate_usd <= 0}
              >
                Update Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
