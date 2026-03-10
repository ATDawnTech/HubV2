import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'staff' | 'hr' | 'finance';
  ats_role: 'ADMIN' | 'TA_ADMIN' | 'HIRING_MANAGER' | 'INTERVIEWER' | null;
}

export const useAuthz = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error in fetchProfile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const isAdmin = useMemo(() => profile?.role === 'admin', [profile]);
  const isStaff = useMemo(() => profile?.role === 'staff', [profile]);
  const isHR = useMemo(() => profile?.role === 'hr', [profile]);
  const isFinance = useMemo(() => profile?.role === 'finance', [profile]);

  return {
    profile,
    isAdmin,
    isStaff,
    isHR,
    isFinance,
    loading,
    user
  };
};