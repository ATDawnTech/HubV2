import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { projectMemberSchema, type ProjectMemberFormData } from '@/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface ProjectMember {
  project_id: string;
  user_id: string;
  bill_rate_usd: number;
  member_discount_pct: number | null;
  role: string | null;
  status: string | null;
  profile?: Profile;
}

interface ProjectMembersDrawerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectMembersDrawer: React.FC<ProjectMembersDrawerProps> = ({
  projectId,
  open,
  onOpenChange
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProjectMemberFormData>({
    resolver: zodResolver(projectMemberSchema),
    defaultValues: {
      user_id: '',
      bill_rate_usd: 0,
      member_discount_pct: 0,
      role: '',
    }
  });

  useEffect(() => {
    if (open) {
      loadMembers();
      loadProfiles();
    }
  }, [open, projectId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      
      // First get project members
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active');

      if (memberError) throw memberError;

      // Then get profiles for those members
      if (memberData && memberData.length > 0) {
        const userIds = memberData.map(m => m.user_id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        const membersWithProfiles = memberData.map(member => ({
          ...member,
          profile: profileData?.find(p => p.user_id === member.user_id)
        }));
        
        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load project members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('is_active', true);

      if (error) throw error;
      setAvailableProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profiles",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: ProjectMemberFormData) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: data.user_id,
          bill_rate_usd: data.bill_rate_usd,
          member_discount_pct: data.member_discount_pct || null,
          role: data.role || null,
          status: 'active',
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member added successfully",
      });
      
      form.reset();
      setIsAddDialogOpen(false);
      loadMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabase
        .from('project_members')
        .update({ status: 'inactive' })
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed successfully",
      });
      
      loadMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const getAvailableProfiles = () => {
    const memberUserIds = members.map(m => m.user_id);
    return availableProfiles.filter(p => !memberUserIds.includes(p.user_id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle>Project Members</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Current Members</h4>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Project Member</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableProfiles().map((profile) => (
                                  <SelectItem key={profile.user_id} value={profile.user_id}>
                                    {profile.full_name || profile.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bill_rate_usd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bill Rate (USD/hour)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="member_discount_pct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member Discount (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Developer, Designer" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Add Member</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Bill Rate</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        {member.profile?.full_name || member.profile?.email || 'Unknown'}
                      </TableCell>
                      <TableCell>{member.role || 'N/A'}</TableCell>
                      <TableCell>${member.bill_rate_usd}/hr</TableCell>
                      <TableCell>{member.member_discount_pct || 0}%</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {members.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No members assigned to this project yet.
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};