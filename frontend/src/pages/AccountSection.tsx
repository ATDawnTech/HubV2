import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, LogOut, ArrowLeft, Users } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAtsAccess } from '@/hooks/useAtsAccess';

const AccountSection = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasAnyAtsAccess } = useAtsAccess();

  return (
    <div className="py-8 px-12">
      {/* Header */}

      {/* Account Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Type</label>
              <p className="text-lg">Professional</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Login</label>
              <p className="text-lg">{new Date().toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate('/settings')}
              variant="outline"
              className="w-full flex items-center gap-2 justify-start"
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </Button>
            <Button
              onClick={signOut}
              variant="destructive"
              className="w-full flex items-center gap-2 justify-start"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/settings')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Settings className="h-6 w-6 text-primary" />
              Application Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Configure application preferences, notifications, and system settings.
            </p>
            <Button variant="outline" className="w-full">
              Open Settings
            </Button>
          </CardContent>
        </Card>

        {hasAnyAtsAccess && (
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/ats/settings')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                ATS Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Configure ATS integrations, job boards, and recruitment workflows.
              </p>
              <Button variant="outline" className="w-full">
                Open ATS Settings
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your account is secured with enterprise-grade authentication.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Two-factor authentication enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Email verification complete</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSection;
