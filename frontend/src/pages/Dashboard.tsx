import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';

interface Survey {
  id: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { isAdmin: isAdminUser, loading: adminLoading } = useAdminAccess();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSurveys();
    }
  }, [user]);

  // One-time background trigger
  useEffect(() => {
    const key = 'interviewAutoUpdateTriggered';
    if (sessionStorage.getItem(key)) return;

    (async () => {
      try {
        const { error } = await supabase.functions.invoke('schedule-interview-auto-update', {
          body: {},
        });
        if (!error) sessionStorage.setItem(key, '1');
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  const loadSurveys = async () => {
    try {
      const { error } = await supabase.from('hiring_surveys').select('id').limit(1);

      if (error) throw error;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || adminLoading) {
    return <div className="py-8 px-12">Loading...</div>;
  }

  return (
    <div className="pb-8 px-12">
      <div className="py-8">
        <div className="text-3xl font-bold">Management Portal</div>
        <div className="font-normal mt-2 text-muted-foreground">
          Select a module to manage your coporate operations
        </div>
      </div>
      {/* Navigation Cards */}
      <div className="space-y-6">
        {import.meta.env.VITE_HIDE_MENU === 'false' && <Card
          onClick={() => navigate('/intake')}
          className="cursor-pointer hover:shadow-lg transition-shadow"
        >
          <CardHeader>
            <CardTitle className="text-lg flex justify-between">
              📋 Intake Management
              <span className="text-sm font-normal text-muted-foreground">
                Click to view details
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>Manage hiring intakes, surveys, and submissions.</CardContent>
        </Card>}
        {import.meta.env.VITE_HIDE_MENU === 'false' && <Card
          onClick={() => navigate('/ats/requisitions')}
          className="cursor-pointer hover:shadow-lg transition-shadow"
        >
          <CardHeader>
            <CardTitle className="text-lg flex justify-between">
              🎯 ATS - Applicant Tracking
              <span className="text-sm font-normal text-muted-foreground">
                Click to view details
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>Requisitions, candidates, interviews, and offers.</CardContent>
        </Card>}
        {import.meta.env.VITE_HIDE_MENU === 'false' && <Card
          onClick={() => navigate('/onboarding/candidates')}
          className="cursor-pointer hover:shadow-lg transition-shadow"
        >
          <CardHeader>
            <CardTitle className="text-lg flex justify-between">
              👥 Onboarding Management
              <span className="text-sm font-normal text-muted-foreground">
                Click to view details
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>Handle onboarding templates, tasks, and owner groups.</CardContent>
        </Card>}

        {import.meta.env.VITE_HIDE_MENU === 'false' && isAdminUser && (
          <Card
            onClick={() => navigate('/employee-management')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="text-lg flex justify-between">
                👤 Employee Management
                <span className="text-sm font-normal text-muted-foreground">
                  Click to view details
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>Manage employee records, skills, and certifications.</CardContent>
          </Card>
        )}

        {isAdminUser && (
          <Card
            onClick={() => navigate('/asset')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="text-lg flex justify-between">
                🏷️ Assets
                <span className="text-sm font-normal text-muted-foreground">
                  Click to view details
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>Manage and track your IT inventory efficiently</CardContent>
          </Card>
        )}

        {import.meta.env.VITE_HIDE_MENU === 'false' && isAdminUser && (
          <Card
            onClick={() => navigate('/productivity')}
            className="cursor-pointer hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <CardTitle className="text-lg flex justify-between">
                💼 Productivity Management
                <span className="text-sm font-normal text-muted-foreground">
                  Click to view details
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>Projects, timesheets, and costing management.</CardContent>
          </Card>
        )}

        <Card
          onClick={() => navigate('/account')}
          className="cursor-pointer hover:shadow-lg transition-shadow"
        >
          <CardHeader>
            <CardTitle className="text-lg flex justify-between">
              ⚙️ Account Management
              <span className="text-sm font-normal text-muted-foreground">
                Click to view details
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>Account settings, preferences, and access control.</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
