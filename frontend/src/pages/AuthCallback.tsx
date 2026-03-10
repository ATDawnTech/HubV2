import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        toast({
          title: 'Authentication Error',
          description: error.message,
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      if (data.session) {
        toast({
          title: 'Welcome!',
          description: 'You have been successfully authenticated.',
        });
        navigate('/dashboard');
      } else {
        navigate('/auth');
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          navigate('/dashboard');
        } else if (event === 'PASSWORD_RECOVERY') {
          // Handle password reset flow
          navigate('/auth?mode=reset');
        }
      }
    );

    handleAuthCallback();

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Processing authentication...</p>
      </div>
    </div>
  );
}