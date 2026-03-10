import { useState, useEffect } from 'react';
import { useAuthz } from './useAuthz';

export const useAtsAccess = () => {
  const { profile, loading, user } = useAuthz();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      setIsLoading(false);
    }
  }, [loading]);

  const hasAtsRole = (role: string): boolean => {
    if (!profile?.ats_role) return false;
    return profile.ats_role === 'ADMIN' || profile.ats_role === role;
  };

  const isAdmin = hasAtsRole('ADMIN');
  const isTaAdmin = hasAtsRole('TA_ADMIN');
  const isHiringManager = hasAtsRole('HIRING_MANAGER');
  const isInterviewer = hasAtsRole('INTERVIEWER') || profile?.ats_role === 'ADMIN'; // Admins are also interviewers
  
  const hasAnyAtsAccess = !!(profile?.ats_role || profile?.role === 'admin');

  return {
    profile,
    user,
    loading: isLoading,
    hasAtsRole,
    isAdmin,
    isTaAdmin,
    isHiringManager,
    isInterviewer,
    hasAnyAtsAccess,
    atsRole: profile?.ats_role,
  };
};