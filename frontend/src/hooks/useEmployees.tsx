import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Employee {
  user_id: string;
  id: string;
  email: string;
  full_name: string | null;
  employee_code: string | null;
  job_title: string | null;
  department: string | null;
  location: string | null;
  manager_id: string | null;
  joined_on: string | null;
  is_active: boolean | null;
  blocked: boolean | null;
  cost_annual: number | null;
  margin_pct: number | null;
  rate_hourly: number | null;
  photo_path: string | null;
  resume_path: string | null;
  currency_code: string | null;
  role: 'admin' | 'staff' | null;
  created_at: string;
  updated_at: string;
  manager_name: string | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
}

export interface EmployeeSkill {
  user_id: string;
  skill_id: string;
  level: number;
  years: number | null;
  skill?: Skill;
}

export interface Certification {
  id: string;
  user_id: string;
  name: string;
  authority: string | null;
  credential_id: string | null;
  issued_on: string | null;
  expires_on: string | null;
}

// Hook to get all employees (admin view) or current user (staff view)
export const useEmployees = (searchQuery?: string) => {
  return useQuery({
    queryKey: ['employees', searchQuery],
    queryFn: async () => {
      let query = supabase.from('profiles').select(`
        *,
        manager:profiles!profiles_manager_id_fkey(full_name, email)
      `).eq('is_active', true);
      
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query.order('full_name');
      
      if (error) throw error;
      return data.map(profile => ({
        ...profile,
        manager_name: (profile.manager as any)?.full_name || null
      })) as Employee[];
    },
  });
};

// Hook to get single employee
export const useEmployee = (userId: string) => {
  return useQuery({
    queryKey: ['employee', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          manager:profiles!profiles_manager_id_fkey(full_name, email)
        `)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        manager_name: (data.manager as any)?.full_name || null
      } as Employee;
    },
    enabled: !!userId,
  });
};

// Hook to get skills catalog
export const useSkillsCatalog = () => {
  return useQuery({
    queryKey: ['skills-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills_catalog')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Skill[];
    },
  });
};

// Hook to get employee skills
export const useEmployeeSkills = (userId?: string) => {
  return useQuery({
    queryKey: ['employee-skills', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_skills')
        .select(`
          *,
          skill:skills_catalog(*)
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as (EmployeeSkill & { skill: Skill })[];
    },
    enabled: !!userId,
  });
};

// Hook to get employee certifications
export const useEmployeeCertifications = (userId?: string) => {
  return useQuery({
    queryKey: ['employee-certifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_certifications')
        .select('*')
        .eq('user_id', userId)
        .order('issued_on', { ascending: false });
      
      if (error) throw error;
      return data as Certification[];
    },
    enabled: !!userId,
  });
};

// Search employees by skill - returns only matching employee-skill combinations
export const useEmployeesBySkill = (skillNames?: string[], minLevel?: number) => {
  return useQuery({
    queryKey: ['employees-by-skill', skillNames, minLevel],
    queryFn: async () => {
      if (!skillNames || skillNames.length === 0) return [];
      
      // Get skill matches for all requested skills - only return exact matches
      const allSkillMatches = [];
      
      for (const skillName of skillNames) {
        const trimmedSkill = skillName.trim();
        if (!trimmedSkill) continue;
        
        const { data: skillMatches, error: skillError } = await supabase
          .from('employee_skills')
          .select(`
            user_id,
            level,
            years,
            skills_catalog!inner(
              id,
              name
            )
          `)
          .ilike('skills_catalog.name', `%${trimmedSkill}%`)
          .gte('level', minLevel || 0);
        
        if (skillError) throw skillError;
        
        // Only include records where we have a skill match
        if (skillMatches) {
          skillMatches.forEach(match => {
            if (match.skills_catalog) {
              allSkillMatches.push({
                user_id: match.user_id,
                level: match.level,
                years: match.years,
                skill_id: match.skills_catalog.id,
                skill_name: match.skills_catalog.name
              });
            }
          });
        }
      }
      
      if (allSkillMatches.length === 0) return [];
      
      // Get unique user IDs and fetch employee data
      const userIds = [...new Set(allSkillMatches.map(match => match.user_id))];
      
      const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, location, department')
        .in('user_id', userIds);
      
      if (empError) throw empError;
      
      // Return only the specific skill matches with employee data
      return allSkillMatches
        .map(skillMatch => ({
          ...skillMatch,
          user: employees?.find(emp => emp.user_id === skillMatch.user_id)
        }))
        .filter(result => result.user); // Only include results where we found employee data
    },
    enabled: !!skillNames && skillNames.length > 0,
  });
};

// Mutations
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<Employee> & { user_id: string }) => {
      const { user_id, ...profileUpdates } = updates;
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      toast({
        title: 'Success',
        description: 'Employee updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update employee: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useAddSkill = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (skill: Omit<Skill, 'id'>) => {
      const { data, error } = await supabase
        .from('skills_catalog')
        .insert([skill])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills-catalog'] });
      toast({
        title: 'Success',
        description: 'Skill added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add skill: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useAddEmployeeSkill = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (employeeSkill: Omit<EmployeeSkill, 'skill'>) => {
      const { data, error } = await supabase
        .from('employee_skills')
        .upsert([employeeSkill])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-skills', variables.user_id] });
      toast({
        title: 'Success',
        description: 'Skill updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update skill: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveEmployeeSkill = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, skillId }: { userId: string; skillId: string }) => {
      const { error } = await supabase
        .from('employee_skills')
        .delete()
        .eq('user_id', userId)
        .eq('skill_id', skillId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-skills', variables.userId] });
      toast({
        title: 'Success',
        description: 'Skill removed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to remove skill: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useAddCertification = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (certification: Omit<Certification, 'id'>) => {
      const { data, error } = await supabase
        .from('employee_certifications')
        .insert([certification])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-certifications', variables.user_id] });
      toast({
        title: 'Success',
        description: 'Certification added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add certification: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateCertification = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (certification: Certification) => {
      const { data, error } = await supabase
        .from('employee_certifications')
        .update(certification)
        .eq('id', certification.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-certifications', data.user_id] });
      toast({
        title: 'Success',
        description: 'Certification updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update certification: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteCertification = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('employee_certifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-certifications', data.userId] });
      toast({
        title: 'Success',
        description: 'Certification deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete certification: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};