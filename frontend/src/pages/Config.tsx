import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, Plus, Trash2, ArrowLeft } from 'lucide-react';

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

const Config = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bgInitiators, setBgInitiators] = useState('');
  const [newConfigKey, setNewConfigKey] = useState('');
  const [newConfigValue, setNewConfigValue] = useState('');

  useEffect(() => {
    if (user) {
      loadConfigs();
    }
  }, [user]);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase.from('config').select('*').order('key');

      if (error) throw error;

      setConfigs(data || []);

      // Set BG Initiators if it exists
      const bgInitiatorsConfig = data?.find((config) => config.key === 'bg_initiators');
      if (bgInitiatorsConfig) {
        setBgInitiators(bgInitiatorsConfig.value);
      }
    } catch (error) {
      console.error('Error loading configs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load configuration.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (key: string, value: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('config').upsert({
        user_id: user.id,
        key,
        value,
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Configuration saved successfully.',
      });

      loadConfigs();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveBgInitiators = async () => {
    setSaving(true);
    await saveConfig('bg_initiators', bgInitiators);
    setSaving(false);
  };

  const handleAddNewConfig = async () => {
    if (!newConfigKey || !newConfigValue) {
      toast({
        title: 'Error',
        description: 'Please enter both key and value.',
        variant: 'destructive',
      });
      return;
    }

    await saveConfig(newConfigKey, newConfigValue);
    setNewConfigKey('');
    setNewConfigValue('');
  };

  const handleDeleteConfig = async (configId: string) => {
    try {
      const { error } = await supabase.from('config').delete().eq('id', configId);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Configuration deleted successfully.',
      });

      loadConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete configuration.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateConfig = async (configId: string, value: string) => {
    try {
      const { error } = await supabase.from('config').update({ value }).eq('id', configId);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Configuration updated successfully.',
      });

      loadConfigs();
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: 'Error',
        description: 'Failed to update configuration.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8 px-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header with navigation and logo */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Application Configuration</h1>
              <p className="text-muted-foreground">
                Manage application settings and configurations
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <img
            src="/lovable-uploads/4b60f503-c9c0-4dae-9f1f-07bf354b0457.png"
            alt="AT Dawn Logo"
            className="h-10 w-auto"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {/* BG Initiators Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Background Check Initiators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bg-initiators">Email Addresses (comma-separated)</Label>
              <Textarea
                id="bg-initiators"
                placeholder="john@atdawntech.com, jane@atdawntech.com"
                value={bgInitiators}
                onChange={(e) => setBgInitiators(e.target.value)}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                These email addresses will receive notifications when background checks are
                initiated.
              </p>
            </div>
            <Button onClick={handleSaveBgInitiators} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save BG Initiators'}
            </Button>
          </CardContent>
        </Card>

        {/* Add New Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-key">Configuration Key</Label>
                <Input
                  id="new-key"
                  placeholder="e.g., notification_email"
                  value={newConfigKey}
                  onChange={(e) => setNewConfigKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-value">Configuration Value</Label>
                <Input
                  id="new-value"
                  placeholder="e.g., admin@atdawntech.com"
                  value={newConfigValue}
                  onChange={(e) => setNewConfigValue(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddNewConfig}>
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Existing Configurations */}
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
                        onBlur={(e) => handleUpdateConfig(config.id, e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteConfig(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Common Configuration Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Required Configuration Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>HR Admin:</strong> Email address for HR Admin to receive "Send Goodies"
                notifications
              </div>
              <div>
                <strong>IT Admin:</strong> Email address for IT Admin to receive "Send Laptop"
                notifications
              </div>
              <div>
                <strong>notification_email:</strong> Email for general notifications
              </div>
              <div>
                <strong>hr_email:</strong> HR department email
              </div>
              <div>
                <strong>admin_email:</strong> Administrator email
              </div>
              <div>
                <strong>company_address:</strong> Company address for documents
              </div>
              <div>
                <strong>company_phone:</strong> Company contact number
              </div>
              <div>
                <strong>workflow_timeout_days:</strong> Number of days before workflow timeout
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Config;
