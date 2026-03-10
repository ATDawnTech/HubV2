import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar, Download, Upload, Clock, Trash2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SupaApi } from '@/lib/supa';
import { startOfWeek, addDays, format, isWeekend } from 'date-fns';

interface Project {
  id: string;
  name: string;
}

interface Timesheet {
  id: string;
  project_id: string;
  user_id: string;
  work_date: string;
  hours: number;
  notes: string | null;
  status: string;
  created_at: string;
  billable?: boolean; // Optional for backward compatibility
  projects?: { name: string };
}

interface WeeklyTimesheetEntry {
  project_id: string;
  work_date: string;
  hours: number;
  notes: string;
  billable: boolean;
}

export const TimesheetsManagement: React.FC = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isWeeklyDialogOpen, setIsWeeklyDialogOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [newTimesheet, setNewTimesheet] = useState({
    project_id: '',
    work_date: '',
    hours: 0,
    notes: '',
    billable: true
  });
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyTimesheetEntry[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  function getCurrentWeek() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  useEffect(() => {
    loadData();
  }, [selectedWeek]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await SupaApi.client
        .from('projects')
        .select('id, name')
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load timesheets for the selected week
      const weekStart = new Date(selectedWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      let query = SupaApi.client
        .from('timesheets')
        .select(`
          *,
          projects(name)
        `)
        .gte('work_date', weekStart.toISOString().split('T')[0])
        .lte('work_date', weekEnd.toISOString().split('T')[0])
        .order('work_date', { ascending: false });

      // Non-admins can only see their own timesheets
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      const { data: timesheetsData, error: timesheetsError } = await query;

      if (timesheetsError) throw timesheetsError;
      setTimesheets((timesheetsData || []).map(t => ({ ...t, billable: t.billable ?? true })));

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load timesheets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!newTimesheet.project_id || !newTimesheet.work_date || newTimesheet.hours <= 0) return;

    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "User authentication required",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await SupaApi.client
        .from('timesheets')
        .insert({
          project_id: newTimesheet.project_id,
          user_id: user.id,
          work_date: newTimesheet.work_date,
          hours: newTimesheet.hours,
          notes: newTimesheet.notes || null,
          billable: newTimesheet.billable,
          status: 'submitted'
        })
        .select(`
          *,
          projects(name)
        `)
        .single();

      if (error) throw error;

      setTimesheets(prev => [{ ...data, billable: data.billable ?? true }, ...prev]);
      setNewTimesheet({
        project_id: '',
        work_date: '',
        hours: 0,
        notes: '',
        billable: true
      });
      setIsSubmitDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Timesheet submitted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit timesheet",
        variant: "destructive",
      });
    }
  };

  const initWeeklyEntries = () => {
    const weekStart = startOfWeek(new Date(selectedWeek), { weekStartsOn: 1 }); // Monday
    const entries: WeeklyTimesheetEntry[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      entries.push({
        project_id: '',
        work_date: format(date, 'yyyy-MM-dd'),
        hours: 0,
        notes: '',
        billable: true
      });
    }
    
    setWeeklyEntries(entries);
  };

  const handleSubmitWeeklyTimesheet = async () => {
    const validEntries = weeklyEntries.filter(entry => 
      entry.project_id && entry.hours > 0 && !isWeekend(new Date(entry.work_date))
    );

    if (validEntries.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one timesheet entry for weekdays",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "User authentication required",
          variant: "destructive",
        });
        return;
      }

      const entries = validEntries.map(entry => ({
        project_id: entry.project_id,
        user_id: user.id,
        work_date: entry.work_date,
        hours: entry.hours,
        notes: entry.notes || null,
        billable: entry.billable,
        status: 'submitted'
      }));

      const { data, error } = await SupaApi.client
        .from('timesheets')
        .insert(entries)
        .select(`
          *,
          projects(name)
        `);

      if (error) throw error;

      setTimesheets(prev => [...(data || []).map(d => ({ ...d, billable: d.billable ?? true })), ...prev]);
      setIsWeeklyDialogOpen(false);
      
      toast({
        title: "Success",
        description: `${validEntries.length} timesheet entries submitted successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit weekly timesheet",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTimesheet = async (timesheetId: string, timesheet: Timesheet) => {
    // Only allow deletion if user owns it and it's not approved, or if admin
    if (!isAdmin && (timesheet.user_id !== user?.id || timesheet.status === 'approved')) {
      toast({
        title: "Error",
        description: "You cannot delete this timesheet",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await SupaApi.client
        .from('timesheets')
        .delete()
        .eq('id', timesheetId);

      if (error) throw error;

      setTimesheets(prev => prev.filter(t => t.id !== timesheetId));
      
      toast({
        title: "Success",
        description: "Timesheet deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete timesheet",
        variant: "destructive",
      });
    }
  };

  const handleRetractTimesheet = async (timesheetId: string) => {
    try {
      const { error } = await SupaApi.client
        .from('timesheets')
        .update({ status: 'draft' })
        .eq('id', timesheetId);

      if (error) throw error;

      setTimesheets(prev => 
        prev.map(t => t.id === timesheetId ? { ...t, status: 'draft' } : t)
      );
      
      toast({
        title: "Success",
        description: "Timesheet retracted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to retract timesheet",
        variant: "destructive",
      });
    }
  };

  const handleApproveTimesheet = async (timesheetId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await SupaApi.client
        .from('timesheets')
        .update({ status })
        .eq('id', timesheetId);

      if (error) throw error;

      setTimesheets(prev => 
        prev.map(t => t.id === timesheetId ? { ...t, status } : t)
      );
      
      toast({
        title: "Success",
        description: `Timesheet ${status} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${status} timesheet`,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canEditTimesheet = (timesheet: Timesheet) => {
    if (isAdmin) return true;
    if (timesheet.user_id !== user?.id) return false;
    return timesheet.status === 'draft' || timesheet.status === 'rejected';
  };

  const canDeleteTimesheet = (timesheet: Timesheet) => {
    if (isAdmin) return true;
    if (timesheet.user_id !== user?.id) return false;
    return timesheet.status !== 'approved';
  };

  const exportTimesheets = () => {
    // Simple CSV export
    const headers = ['Date', 'Project', 'Hours', 'Notes', 'Status', 'Employee'];
    const rows = timesheets.map(t => [
      t.work_date,
      t.projects?.name || 'Unknown',
      t.hours,
      t.notes || '',
      t.status,
      'Employee Name' // Simplified for now
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets-${selectedWeek}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Timesheets</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="week">Week of:</Label>
            <Input
              id="week"
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportTimesheets}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          
          <Dialog open={isWeeklyDialogOpen} onOpenChange={setIsWeeklyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={initWeeklyEntries}>
                <Calendar className="mr-2 h-4 w-4" />
                Submit Week
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit Weekly Timesheet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {weeklyEntries.map((entry, index) => {
                  const date = new Date(entry.work_date);
                  const isWeekendDay = isWeekend(date);
                  const dayName = format(date, 'EEEE');
                  
                  return (
                    <div
                      key={entry.work_date}
                      className={`grid grid-cols-6 gap-4 p-4 border rounded-lg ${
                        isWeekendDay ? 'bg-muted/50 opacity-60' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <Label className="text-sm font-medium">
                          {dayName}
                        </Label>
                        <div className="text-xs text-muted-foreground">
                          {format(date, 'MMM dd')}
                        </div>
                      </div>
                      
                      <div>
                        <Select
                          value={entry.project_id}
                          onValueChange={(value) => {
                            const newEntries = [...weeklyEntries];
                            newEntries[index].project_id = value;
                            setWeeklyEntries(newEntries);
                          }}
                          disabled={isWeekendDay}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Project" />
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
                        <Input
                          type="number"
                          min="0"
                          max="24"
                          step="0.25"
                          value={entry.hours}
                          onChange={(e) => {
                            const newEntries = [...weeklyEntries];
                            newEntries[index].hours = parseFloat(e.target.value) || 0;
                            setWeeklyEntries(newEntries);
                          }}
                          placeholder="8.0"
                          className="h-8"
                          disabled={isWeekendDay}
                        />
                      </div>
                      
                      <div>
                        <Input
                          value={entry.notes}
                          onChange={(e) => {
                            const newEntries = [...weeklyEntries];
                            newEntries[index].notes = e.target.value;
                            setWeeklyEntries(newEntries);
                          }}
                          placeholder="Work description"
                          className="h-8"
                          disabled={isWeekendDay}
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`billable-${index}`}
                          checked={entry.billable}
                          onCheckedChange={(checked) => {
                            const newEntries = [...weeklyEntries];
                            newEntries[index].billable = checked as boolean;
                            setWeeklyEntries(newEntries);
                          }}
                          disabled={isWeekendDay}
                        />
                        <Label htmlFor={`billable-${index}`} className="text-xs">
                          Billable
                        </Label>
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground">
                        {isWeekendDay ? 'Weekend' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsWeeklyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitWeeklyTimesheet}>
                  Submit Week
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Submit Hours
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Timesheet</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="project">Project</Label>
                  <Select
                    value={newTimesheet.project_id}
                    onValueChange={(value) => setNewTimesheet(prev => ({ ...prev, project_id: value }))}
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="work_date">Date</Label>
                    <Input
                      id="work_date"
                      type="date"
                      value={newTimesheet.work_date}
                      onChange={(e) => setNewTimesheet(prev => ({ ...prev, work_date: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="hours">Hours</Label>
                    <Input
                      id="hours"
                      type="number"
                      min="0"
                      max="24"
                      step="0.25"
                      value={newTimesheet.hours}
                      onChange={(e) => setNewTimesheet(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                      placeholder="8.0"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newTimesheet.notes}
                    onChange={(e) => setNewTimesheet(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Work description"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="billable"
                    checked={newTimesheet.billable}
                    onCheckedChange={(checked) => setNewTimesheet(prev => ({ ...prev, billable: checked as boolean }))}
                  />
                  <Label htmlFor="billable">Billable hours</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitTimesheet} 
                  disabled={!newTimesheet.project_id || !newTimesheet.work_date || newTimesheet.hours <= 0}
                >
                  Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Billable</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead>Employee</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timesheets.map((timesheet) => (
              <TableRow key={timesheet.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(timesheet.work_date).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>{timesheet.projects?.name || 'Unknown'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {timesheet.hours}h
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={timesheet.billable !== false ? "default" : "outline"} className="text-xs">
                    {timesheet.billable !== false ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate">
                    {timesheet.notes || '-'}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(timesheet.status)}</TableCell>
                {isAdmin && (
                  <TableCell>
                    User {timesheet.user_id.slice(0, 8)}...
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-1">
                    {/* Admin approval actions */}
                    {isAdmin && timesheet.status === 'submitted' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleApproveTimesheet(timesheet.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleApproveTimesheet(timesheet.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {/* User retract action */}
                    {!isAdmin && timesheet.user_id === user?.id && timesheet.status === 'submitted' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRetractTimesheet(timesheet.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Retract
                      </Button>
                    )}
                    
                    {/* Delete action */}
                    {canDeleteTimesheet(timesheet) && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteTimesheet(timesheet.id, timesheet)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {timesheets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No timesheets found for the selected week.
          </div>
        )}
      </div>
    </div>
  );
};