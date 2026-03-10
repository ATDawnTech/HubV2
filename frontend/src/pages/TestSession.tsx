import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function TestSession() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  console.log('TestSession component mounted with token:', token);
  console.log('Current pathname:', window.location.pathname);
  
  // Decode the token in case it was URL encoded
  const decodedToken = token ? decodeURIComponent(token) : undefined;
  const { data: assignment, error, isLoading } = useQuery({
    queryKey: ['test-assignment', decodedToken],
    queryFn: async () => {
      console.log('Fetching assignment for token:', decodedToken);
      if (!decodedToken) throw new Error('No token provided');
      
      const { data, error } = await supabase
        .from('test_assignments')
        .select(`
          *,
          test_templates (
            name,
            config_json
          ),
          test_sessions (
            id,
            started_at,
            ended_at,
            test_scores (
              overall_pct,
              scored_at
            )
          )
        `)
        .eq('invite_token', decodedToken)
        .maybeSingle();
       
      console.log('Query response:', { data, error });
      if (error) throw error;
      return data;
    },
    enabled: !!decodedToken
  });

  const handleStartTest = async () => {
    if (!assignment) return;

    try {
      // Call the test-start edge function
      const { data, error } = await supabase.functions.invoke('test-start', {
        body: { token: decodedToken }
      });

      if (error) throw error;

      toast.success("Test session started successfully!");
      // Refresh the data to show the updated state
      window.location.reload();
    } catch (error) {
      console.error('Error starting test:', error);
      toast.error("Failed to start test session");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading test...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Test Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The test link is invalid or has expired.
            </p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(assignment.expires_at) < new Date();
  const hasSession = assignment.test_sessions && assignment.test_sessions.length > 0;
  const session = hasSession ? assignment.test_sessions[0] : null;
  const isCompleted = session?.ended_at;
  const score = session?.test_scores;

  if (isExpired && !hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Test Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This test invitation has expired.
            </p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted && score) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-success flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Test Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You have already completed this test.
            </p>
            <div className="bg-muted p-4 rounded-lg mb-4">
              <p className="font-medium">Score: {score.overall_pct}%</p>
              <p className="text-sm text-muted-foreground">
                Completed on {new Date(score.scored_at).toLocaleDateString()}
              </p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{assignment.test_templates?.name || 'Technical Assessment'}</CardTitle>
          <CardDescription>
            You've been invited to take this assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasSession ? (
            <>
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium mb-2">Test Information</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Expires:</strong> {new Date(assignment.expires_at).toLocaleString()}
                </p>
                {assignment.test_templates?.config_json && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Duration:</strong> {
                      (() => {
                        try {
                          const config = typeof assignment.test_templates.config_json === 'string' 
                            ? JSON.parse(assignment.test_templates.config_json)
                            : assignment.test_templates.config_json;
                          return (config as any)?.duration_minutes || 45;
                        } catch {
                          return 45;
                        }
                      })()
                    } minutes
                  </p>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <h3 className="font-medium mb-2 text-amber-800">Important Instructions</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Make sure you have a stable internet connection</li>
                  <li>• Find a quiet environment without distractions</li>
                  <li>• Do not switch tabs or applications during the test</li>
                  <li>• Your webcam may be monitored for security purposes</li>
                </ul>
              </div>
              <Button onClick={handleStartTest} className="w-full" size="lg">
                Start Test
              </Button>
            </>
          ) : session?.ended_at ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-muted-foreground">
                Test completed. Your results will be reviewed by the hiring team.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <Clock className="h-12 w-12 text-warning mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                You have already started this test. Please continue from where you left off.
              </p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Continue Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}