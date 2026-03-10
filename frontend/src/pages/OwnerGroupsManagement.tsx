import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Users, Crown, UserMinus, Settings, ArrowBigLeftDash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

interface OwnerGroup {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface Profile {
  user_id: string;
  email: string;
  full_name: string;
}

export default function OwnerGroupsManagement() {
  // State for create group dialog (using shared form logic)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  // Edit group dialog state and handler
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OwnerGroup | null>(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);

  const schema = yup.object().shape({
    name: yup.string().required('Owner group name is required'),
    description: yup.string(),
  });

  const form = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '', description: '' },
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<OwnerGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<OwnerGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load owner groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('owner_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;
      setGroups(groupsData || []);

      // Load all profiles for member selection
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .order('full_name');

      if (profilesError) throw profilesError;
      setAllProfiles(profilesData || []);

      // Select first group if available
      if (groupsData && groupsData.length > 0) {
        setSelectedGroup(groupsData[0]);
        loadGroupMembers(groupsData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load groups and members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      // First get group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('id, user_id, role, created_at')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      // Then get profile info for each member
      const membersWithProfiles = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', member.user_id)
            .single();

          return {
            ...member,
            profile: profileData || undefined,
          };
        })
      );

      setGroupMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error loading group members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group members',
        variant: 'destructive',
      });
    }
  };

  const handleEditGroup = async (values: { name: string; description: string }) => {
    if (!editingGroup) return;
    setUpdatingGroup(true);
    try {
      const { error } = await supabase.from('owner_groups').update({
        name: values.name.trim(),
        description: values.description.trim(),
      }).eq('id', editingGroup.id);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Owner group updated successfully',
      });
      setShowEditGroupDialog(false);
      form.reset();
      setGroups((prev) => prev.map(g => g.id === editingGroup.id ? { ...g, name: values.name.trim(), description: values.description.trim() } : g));
      setSelectedGroup((prev) => prev && prev.id === editingGroup.id ? { ...prev, name: values.name.trim(), description: values.description.trim() } : prev);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update owner group',
        variant: 'destructive',
      });
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleCreateGroup = async (values: { name: string; description: string }) => {
    setCreatingGroup(true);
    try {
      const { data, error } = await supabase.from('owner_groups').insert({
        name: values.name.trim(),
        description: values.description.trim(),
      }).select();
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Owner group created successfully',
      });
      setShowCreateGroupDialog(false);
      form.reset();
      await loadData();
      if (data && data[0]) {
        setSelectedGroup(data[0]);
        loadGroupMembers(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create owner group',
        variant: 'destructive',
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  const addMember = async () => {
    if (!selectedGroup || !selectedUserId) return;
    setAddingMember(true);
    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: selectedGroup.id,
        user_id: selectedUserId,
        role: selectedRole,
      });
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Member added to group successfully',
      });
      setShowAddMemberDialog(false);
      setSelectedUserId('');
      setSelectedRole('member');
      loadGroupMembers(selectedGroup.id);
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member to group',
        variant: 'destructive',
      });
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('group_members').delete().eq('id', memberId);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Member removed from group successfully',
      });
      if (selectedGroup) {
        loadGroupMembers(selectedGroup.id);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member from group',
        variant: 'destructive',
      });
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberId);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
      if (selectedGroup) {
        loadGroupMembers(selectedGroup.id);
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
    }
  };

  const availableProfiles = allProfiles.filter(
    (profile) => !groupMembers.some((member) => member.user_id === profile.user_id)
  );

  return (
    <div className="min-h-screen">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                Owner Groups Management
              </h1>
              <p className="text-muted-foreground">
                Manage team members and their roles in owner groups
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3 my-6">
                {/* Groups List */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Owner Groups
                      </CardTitle>
                      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                        <DialogTrigger asChild>
                          <Button className="flex items-center gap-2" variant="default" size="sm">
                            <Plus className="h-4 w-4" />
                            Create
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Owner Group</DialogTitle>
                            <DialogDescription>
                              Fill in the details to create a new owner group.
                            </DialogDescription>
                          </DialogHeader>
                          <FormProvider {...form}>
                            <form onSubmit={form.handleSubmit(handleCreateGroup)} className="space-y-4">
                              <div>
                                <Label htmlFor="name">Owner Group Name *</Label>
                                <Input
                                  id="name"
                                  placeholder="IT Team, Finance Team, Management Team"
                                  {...form.register('name')}
                                  required
                                />
                                {/* Error message removed to avoid duplication; Input's built-in error handling will be used */}
                              </div>
                              <div>
                                <Label htmlFor="description">Description</Label>
                                <Input
                                  id="description"
                                  placeholder="describe what functionality of the group"
                                  {...form.register('description')}
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={() => setShowCreateGroupDialog(false)} disabled={creatingGroup}>
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={creatingGroup || !form.watch('name').trim()}>
                                  {creatingGroup ? 'Creating...' : 'Create'}
                                </Button>
                              </div>
                            </form>
                          </FormProvider>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className={`relative w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between group ${
                          selectedGroup?.id === group.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedGroup(group);
                            loadGroupMembers(group.id);
                          }}
                        >
                          <div className="font-medium flex items-center">
                            {group.name}
                            <button
                              className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={e => {
                                e.stopPropagation();
                                setEditingGroup(group);
                                form.setValue('name', group.name);
                                form.setValue('description', group.description);
                                setShowEditGroupDialog(true);
                              }}
                              aria-label="Edit group"
                              type="button"
                            >
                              <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.3 2.3a1.003 1.003 0 0 1 1.4 1.4l-8.5 8.5-2.1.7.7-2.1 8.5-8.5Zm-1.6 1.6L3.5 11.1l-.3.9.9-.3 7.2-7.2-1-1Z" fill="currentColor"/></svg>
                            </button>
                          </div>
                          <div className="text-sm text-muted-foreground">{group.description}</div>
                        </div>
                      </div>
                    ))}
                    {/* Edit Group Dialog - moved outside the map and CardContent */}
                    <Dialog open={showEditGroupDialog} onOpenChange={setShowEditGroupDialog}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Owner Group</DialogTitle>
                          <DialogDescription>
                            Fill in the details to update the owner group.
                          </DialogDescription>
                        </DialogHeader>
                        <FormProvider {...form}>
                          <form onSubmit={form.handleSubmit(handleEditGroup)} className="space-y-4">
                            <div>
                              <Label htmlFor="edit-name">Owner Group Name *</Label>
                              <Input
                                id="edit-name"
                                placeholder="IT Team, Finance Team, Management Team"
                                {...form.register('name')}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-description">Description</Label>
                              <Input
                                id="edit-description"
                                placeholder="describe what functionality of the group"
                                {...form.register('description')}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button type="button" variant="outline" onClick={() => setShowEditGroupDialog(false)} disabled={updatingGroup}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={updatingGroup || !form.watch('name').trim()}>
                                {updatingGroup ? 'Updating...' : 'Update'}
                              </Button>
                            </div>
                          </form>
                        </FormProvider>
                      </DialogContent>
                    </Dialog>
                    {groups.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No groups found</p>
                    )}
                  </CardContent>
                </Card>

                {/* Group Members */}
                <div className="lg:col-span-2 space-y-6">
                  {selectedGroup ? (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{selectedGroup.name} Members</CardTitle>
                            <CardDescription>
                              Manage team members and their roles in this group
                            </CardDescription>
                          </div>
                          <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Member
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Member to {selectedGroup.name}</DialogTitle>
                                <DialogDescription>
                                  Select a user and assign them a role in this group
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Select User</Label>
                                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a user" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableProfiles.map((profile) => (
                                        <SelectItem key={profile.user_id} value={profile.user_id}>
                                          {profile.full_name} ({profile.email})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>Role</Label>
                                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="member">Member</SelectItem>
                                      <SelectItem value="lead">Lead</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex gap-2">
                                  <Button onClick={addMember} disabled={addingMember || !selectedUserId}>
                                    {addingMember ? 'Adding...' : 'Add Member'}
                                  </Button>
                                  <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {groupMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="font-medium">
                                    {member.profile?.full_name || 'Unknown User'}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {member.profile?.email}
                                  </div>
                                </div>
                                <Badge variant={member.role === 'lead' ? 'default' : 'secondary'}>
                                  {member.role === 'lead' && <Crown className="h-3 w-3 mr-1" />}
                                  {member.role}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2">
                                <Select
                                  value={member.role}
                                  onValueChange={(value) => updateMemberRole(member.id, value)}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="lead">Lead</SelectItem>
                                  </SelectContent>
                                </Select>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove {member.profile?.full_name} from{' '}
                                        {selectedGroup.name}?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() => removeMember(member.id)}
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}

                          {groupMembers.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              No members in this group yet. Add the first member!
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Select a group to manage its members</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
