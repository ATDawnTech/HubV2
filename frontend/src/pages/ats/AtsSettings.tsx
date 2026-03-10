import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
  Linkedin,
  MessageSquare,
  Settings,
  Users,
  Bell,
  Plus,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { TestTemplatesManagement } from '@/components/ats/TestTemplatesManagement';
import { useNavigate } from 'react-router-dom';

export const AtsSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [teamsConnected, setTeamsConnected] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<
    'ADMIN' | 'TA_ADMIN' | 'HIRING_MANAGER' | 'INTERVIEWER'
  >('INTERVIEWER');

  // Fetch all profiles with ATS roles
  const { data: atsUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['atsUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, ats_role')
        .not('ats_role', 'is', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Add user to ATS role
  const addUserRole = useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: 'ADMIN' | 'TA_ADMIN' | 'HIRING_MANAGER' | 'INTERVIEWER';
    }) => {
      // First check if user exists
      const { data: existingUser, error: findError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .eq('email', email)
        .single();

      if (findError) {
        if (findError.code === 'PGRST116') {
          throw new Error(
            `User with email "${email}" not found. Please ensure the user has an account in the system.`
          );
        }
        throw findError;
      }

      // Update the user's ATS role
      const { data, error } = await supabase
        .from('profiles')
        .update({ ats_role: role })
        .eq('email', email)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atsUsers'] });
      setIsAddUserDialogOpen(false);
      setNewUserEmail('');
      setNewUserRole('INTERVIEWER');
      toast({
        title: 'User role updated',
        description: 'User has been assigned the ATS role successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating user role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove user from ATS role
  const removeUserRole = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ats_role: null })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atsUsers'] });
      toast({
        title: 'User role removed',
        description: 'User has been removed from ATS access.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing user role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddUser = () => {
    if (!newUserEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    addUserRole.mutate({ email: newUserEmail.trim(), role: newUserRole });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default';
      case 'TA_ADMIN':
        return 'secondary';
      case 'HIRING_MANAGER':
        return 'outline';
      case 'INTERVIEWER':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="py-8 px-12">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/ats/candidates')}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to ATS
          </Button>
          <h1 className="text-3xl font-bold">ATS Settings</h1>
          <p className="text-muted-foreground">Configure integrations and system preferences</p>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* LinkedIn Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Linkedin className="h-5 w-5 text-blue-600" />
                <CardTitle>LinkedIn Integration</CardTitle>
                {linkedinConnected ? (
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                ) : (
                  <Badge variant="outline">Not Connected</Badge>
                )}
              </div>
              <CardDescription>
                Connect to LinkedIn Job Posting API to automatically post and sync job requisitions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!linkedinConnected ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium mb-2">LinkedIn Talent Solutions Required</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      To use the LinkedIn Job Posting API, your organization needs LinkedIn Talent
                      Solutions access. Contact your LinkedIn representative to get started.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin-client-id">LinkedIn Client ID</Label>
                      <Input id="linkedin-client-id" placeholder="Enter your LinkedIn Client ID" />
                    </div>
                  </div>
                  <Button onClick={() => setLinkedinConnected(true)} className="w-full">
                    Connect LinkedIn Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">AtDawn Technologies</div>
                      <div className="text-sm text-muted-foreground">company@atdawntech.com</div>
                    </div>
                    <Button variant="outline" onClick={() => setLinkedinConnected(false)}>
                      Disconnect
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-post">Auto-post new requisitions</Label>
                      <Switch id="auto-post" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync-status">Sync application status</Label>
                      <Switch id="sync-status" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teams Integration */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                <CardTitle>Microsoft Teams Integration</CardTitle>
                {teamsConnected ? (
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                ) : (
                  <Badge variant="outline">Not Connected</Badge>
                )}
              </div>
              <CardDescription>
                Connect to Microsoft Teams to send notifications and updates to hiring teams
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!teamsConnected ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-purple-50">
                    <h4 className="font-medium mb-2">Teams App Registration Required</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Register your app in Azure AD to enable Teams integration and get the
                      necessary credentials.
                    </p>
                  </div>
                  <Button onClick={() => setTeamsConnected(true)} className="w-full">
                    Connect Teams Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">AtDawn Technologies Teams</div>
                      <div className="text-sm text-muted-foreground">Connected to 5 channels</div>
                    </div>
                    <Button variant="outline" onClick={() => setTeamsConnected(false)}>
                      Disconnect
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="default-channel">Default notification channel</Label>
                      <Input id="default-channel" placeholder="#hiring-updates" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="interview-reminders">Send interview reminders</Label>
                      <Switch id="interview-reminders" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="daily-digest">Daily hiring digest</Label>
                      <Switch id="daily-digest" defaultChecked />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <CardTitle>ATS Role Management</CardTitle>
              </div>
              <CardDescription>
                Configure role-based access control for the ATS system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">ADMIN</h4>
                      <Badge>Full Access</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Complete system access including all ATS and global features
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Manage all requisitions and candidates</li>
                      <li>• Access compensation data</li>
                      <li>• Configure system settings</li>
                      <li>• View all reports and analytics</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">TA_ADMIN</h4>
                      <Badge variant="outline">ATS Admin</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Full ATS access but limited to talent acquisition features
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Manage all ATS requisitions</li>
                      <li>• Access candidate compensation</li>
                      <li>• Configure ATS settings</li>
                      <li>• Cannot access global admin features</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">HIRING_MANAGER</h4>
                      <Badge variant="outline">Limited Access</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Access only to their own requisitions and candidates
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• View/edit own requisitions only</li>
                      <li>• Access candidates for their jobs</li>
                      <li>• Schedule interviews</li>
                      <li>• View compensation for their candidates</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">INTERVIEWER</h4>
                      <Badge variant="outline">Interview Only</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Limited access to assigned interviews only
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• View assigned candidates only</li>
                      <li>• Submit interview feedback</li>
                      <li>• No compensation access</li>
                      <li>• Cannot schedule interviews</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">User Role Management</h4>
                  <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add User to ATS Role</DialogTitle>
                        <DialogDescription>
                          Assign an ATS role to an existing user. The user must already have an
                          account in the system.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="userEmail">User Email</Label>
                          <Input
                            id="userEmail"
                            type="email"
                            placeholder="Enter user email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            User must already have an account in the system
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="userRole">ATS Role</Label>
                          <Select
                            value={newUserRole}
                            onValueChange={(value: any) => setNewUserRole(value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">ADMIN - Full Access</SelectItem>
                              <SelectItem value="TA_ADMIN">TA_ADMIN - ATS Admin</SelectItem>
                              <SelectItem value="HIRING_MANAGER">
                                HIRING_MANAGER - Limited Access
                              </SelectItem>
                              <SelectItem value="INTERVIEWER">
                                INTERVIEWER - Interview Only
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleAddUser}
                          disabled={addUserRole.isPending}
                          className="w-full"
                        >
                          {addUserRole.isPending ? 'Adding...' : 'Add User Role'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {isLoadingUsers ? (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">Loading users...</div>
                    </div>
                  ) : atsUsers && atsUsers.length > 0 ? (
                    atsUsers.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.full_name || 'No name set'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(user.ats_role)}>
                            {user.ats_role}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUserRole.mutate(user.user_id)}
                            disabled={removeUserRole.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">
                        No users with ATS roles found
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Notification Settings</CardTitle>
              </div>
              <CardDescription>
                Configure when and how you receive ATS notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="new-applications">New Applications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when candidates apply
                    </p>
                  </div>
                  <Switch id="new-applications" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="interview-reminders">Interview Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Reminders 1 hour before interviews
                    </p>
                  </div>
                  <Switch id="interview-reminders" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="offer-responses">Offer Responses</Label>
                    <p className="text-sm text-muted-foreground">
                      When candidates accept/reject offers
                    </p>
                  </div>
                  <Switch id="offer-responses" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="overdue-tasks">Overdue Tasks</Label>
                    <p className="text-sm text-muted-foreground">Daily digest of overdue items</p>
                  </div>
                  <Switch id="overdue-tasks" defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Email Templates</CardTitle>
              </div>
              <CardDescription>
                Customize email templates for candidate communications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Application Confirmation</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Sent automatically when candidates apply
                  </p>
                  <Button variant="outline" size="sm">
                    Edit Template
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Interview Invitation</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Sent when scheduling interviews
                  </p>
                  <Button variant="outline" size="sm">
                    Edit Template
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Offer Letter</h4>
                  <p className="text-sm text-muted-foreground mb-3">Template for job offers</p>
                  <Button variant="outline" size="sm">
                    Edit Template
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Rejection Notice</h4>
                  <p className="text-sm text-muted-foreground mb-3">Polite rejection message</p>
                  <Button variant="outline" size="sm">
                    Edit Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests">
          <TestTemplatesManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};
