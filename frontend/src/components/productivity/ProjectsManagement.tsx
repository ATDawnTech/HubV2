import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Users, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthz } from '@/hooks/useAuthz';
import { ProjectEditDialog } from '@/components/ProjectEditDialog';
import { ProjectMembersDrawer } from '@/components/ProjectMembersDrawer';

interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  project_manager: string | null;
  sales_manager: string | null;
  discount_pct: number;
  discount_reason: string | null;
  created_by: string;
  created_at: string;
  client: string | null;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string;
}

export const ProjectsManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    project_manager: '',
    sales_manager: '',
    discount_pct: 0,
    discount_reason: '',
    client: ''
  });
  
  const { toast } = useToast();
  const { isAdmin, user } = useAuthz();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load profiles for managers
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    try {
      const projectData = {
        ...newProject,
        start_date: newProject.start_date || null,
        end_date: newProject.end_date || null,
        project_manager: newProject.project_manager || null,
        sales_manager: newProject.sales_manager || null,
        created_by: user?.id
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [data, ...prev]);
      setNewProject({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        project_manager: '',
        sales_manager: '',
        discount_pct: 0,
        discount_reason: '',
        client: ''
      });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || profile?.email || 'Unknown';
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsEditDialogOpen(true);
  };

  const handleMembersClick = (project: Project) => {
    setSelectedProject(project);
    setIsMembersDrawerOpen(true);
  };

  const handleEditSuccess = () => {
    loadData();
    setIsEditDialogOpen(false);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Projects</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <Label htmlFor="client">Client</Label>
                  <Input
                    id="client"
                    value={newProject.client}
                    onChange={(e) => setNewProject(prev => ({ ...prev, client: e.target.value }))}
                    placeholder="Enter client name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={newProject.discount_pct}
                    onChange={(e) => setNewProject(prev => ({ ...prev, discount_pct: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              
               <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Project description"
                />
              </div>

              <div>
                <Label htmlFor="discount_reason">Discount Reason</Label>
                <Textarea
                  id="discount_reason"
                  value={newProject.discount_reason}
                  onChange={(e) => setNewProject(prev => ({ ...prev, discount_reason: e.target.value }))}
                  placeholder="Reason for discount (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newProject.end_date}
                    onChange={(e) => setNewProject(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project_manager">Project Manager</Label>
                  <Select
                    value={newProject.project_manager}
                    onValueChange={(value) => setNewProject(prev => ({ ...prev, project_manager: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name || profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sales_manager">Sales Manager</Label>
                  <Select
                    value={newProject.sales_manager}
                    onValueChange={(value) => setNewProject(prev => ({ ...prev, sales_manager: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name || profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProject.name.trim()}>
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Project Manager</TableHead>
              <TableHead>Sales Manager</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{project.name}</div>
                    {project.description && (
                      <div className="text-sm text-muted-foreground">{project.description}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{project.client || 'Not specified'}</TableCell>
                <TableCell>
                  {project.start_date && project.end_date 
                    ? `${new Date(project.start_date).toLocaleDateString()} - ${new Date(project.end_date).toLocaleDateString()}`
                    : 'Not set'
                  }
                </TableCell>
                <TableCell>{getProfileName(project.project_manager)}</TableCell>
                <TableCell>{getProfileName(project.sales_manager)}</TableCell>
                <TableCell>{project.discount_pct}%</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleMembersClick(project)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Members
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditProject(project)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {projects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No projects yet. Create your first project to get started.
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {selectedProject && (
        <ProjectEditDialog
          project={selectedProject}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Members Drawer */}
      {selectedProject && (
        <ProjectMembersDrawer
          projectId={selectedProject.id}
          open={isMembersDrawerOpen}
          onOpenChange={setIsMembersDrawerOpen}
        />
      )}
    </div>
  );
};