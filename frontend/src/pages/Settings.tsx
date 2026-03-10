import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthz } from '@/hooks/useAuthz';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'hr' | 'finance' | 'staff';
  location: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuthz();

  const countries = [
    { value: 'Australia', code: 'AU' },
    { value: 'India', code: 'IN' },
    { value: 'Singapore', code: 'SG' },
    { value: 'United States', code: 'US' },
    { value: 'Vietnam', code: 'VN' },
  ];

  // User Management State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'staff' as const,
    location: 'United States',
  });

  // Config State
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [newConfigKey, setNewConfigKey] = useState('');
  const [newConfigValue, setNewConfigValue] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Load configs
      const { data: configsData, error: configsError } = await supabase
        .from('config')
        .select('*')
        .order('key');

      if (configsError) throw configsError;
      setConfigs(configsData || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load settings data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name) return;

    try {
      setIsAddingUser(true);
      // Create user in auth
      const { data: userData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: 'temporary123!', // User should reset on first login
        options: {
          data: {
            full_name: newUser.full_name,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      console.log('userData', userData);
      if (authError) throw authError;
      if (userData.user.identities.length > 0) {
        await loadData();
        setNewUser({ email: '', full_name: '', role: 'staff', location: 'United States' });
        setIsAddUserDialogOpen(false);

        toast({
          title: 'Success',
          description: 'User added successfully. They should reset their password on first login.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add user',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user',
        variant: 'destructive',
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('user_id', userId);

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((profile) =>
          profile.user_id === userId ? { ...profile, role: newRole as any } : profile
        )
      );

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean | null) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((profile) =>
          profile.user_id === userId ? { ...profile, is_active: newStatus } : profile
        )
      );

      toast({
        title: 'Success',
        description: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('profiles').delete().eq('user_id', userId);

      if (error) throw error;

      setProfiles((prev) => prev.filter((profile) => profile.user_id !== userId));

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const saveConfig = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('config').upsert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        key,
        value,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
      });

      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  };

  const handleAddConfig = async () => {
    if (!newConfigKey || !newConfigValue) {
      toast({
        title: 'Error',
        description: 'Please enter both key and value',
        variant: 'destructive',
      });
      return;
    }

    await saveConfig(newConfigKey, newConfigValue);
    setNewConfigKey('');
    setNewConfigValue('');
  };

  if (!isAdmin) {
    return (
      <div className="py-8 px-12 max-w-4xl">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You need administrator privileges to access settings.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-8 px-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Application Settings</h1>
              <p className="text-muted-foreground">Manage users, roles, and system configuration</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            System Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* User Management */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">User Management</h2>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="user_email">Email</Label>
                    <Input
                      id="user_email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter user email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="user_name">Full Name</Label>
                    <Input
                      id="user_name"
                      value={newUser.full_name}
                      onChange={(e) =>
                        setNewUser((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      placeholder="Enter user full name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="user_role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) =>
                        setNewUser((prev) => ({ ...prev, role: value as any }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="user_location">Location</Label>
                    <Select
                      value={newUser.location}
                      onValueChange={(value) =>
                        setNewUser((prev) => ({ ...prev, location: value }))
                      }
                    >
                      <SelectTrigger id="user_location">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.value}>
                            {country.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddUser}
                    disabled={!newUser.email || !newUser.full_name || isAddingUser}
                  >
                    {isAddingUser ? 'Adding...' : 'Add User'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{profile.full_name || 'No name'}</div>
                          <div className="text-sm text-muted-foreground">{profile.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={profile.role}
                          onValueChange={(value) => handleUpdateUserRole(profile.user_id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            profile.location === 'US' || profile.location === 'United States'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {profile.location || 'Not set'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={profile.is_active !== false ? 'default' : 'secondary'}>
                          {profile.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleUserStatus(profile.user_id, profile.is_active)
                            }
                          >
                            {profile.is_active !== false ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(profile.user_id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {profiles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No users found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          {/* System Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="config-key">Configuration Key</Label>
                  <Input
                    id="config-key"
                    placeholder="e.g., notification_email"
                    value={newConfigKey}
                    onChange={(e) => setNewConfigKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="config-value">Configuration Value</Label>
                  <Input
                    id="config-value"
                    placeholder="e.g., admin@atdawntech.com"
                    value={newConfigValue}
                    onChange={(e) => setNewConfigValue(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleAddConfig}>Add Configuration</Button>
            </CardContent>
          </Card>

          {configs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Existing Configurations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {configs.map((config) => (
                    <div key={config.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Label className="font-medium">{config.key}</Label>
                        <Input
                          value={config.value}
                          onChange={(e) => {
                            const newConfigs = configs.map((c) =>
                              c.id === config.id ? { ...c, value: e.target.value } : c
                            );
                            setConfigs(newConfigs);
                          }}
                          onBlur={(e) => saveConfig(config.key, e.target.value)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Delete config logic here
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
