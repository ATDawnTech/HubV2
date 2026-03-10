import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ExternalLink,
  MapPin,
  Building2,
  Clock,
  Users,
  Calendar,
  Eye,
  Edit,
  Archive,
  Home,
  ArrowLeft,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Requisition {
  id: string;
  title: string;
  dept: string;
  location: string;
  employment_type: string;
  description: string;
  status: string;
  hiring_manager_id: string;
  linkedin_job_id: string;
  linkedin_posted_at: string;
  created_at: string;
  updated_at: string;
  min_experience: number;
  max_experience: number;
  hiring_manager?: {
    full_name: string;
    email: string;
  };
}

export const AtsRequisitions = () => {
  const [search, setSearch] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [newReq, setNewReq] = useState({
    title: '',
    dept: '',
    location: '',
    employment_type: 'full_time',
    description: '',
    min_experience: 0,
    max_experience: 10,
    skills: [] as string[],
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: requisitions = [], isLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requisitions')
        .select(
          `
          *,
          hiring_manager:profiles!hiring_manager_id(full_name, email)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((req: any) => ({
        ...req,
        hiring_manager: Array.isArray(req.hiring_manager) ? req.hiring_manager[0] : req.hiring_manager
      })) as Requisition[];
    },
  });

  const createRequisition = useMutation({
    mutationFn: async (requisition: typeof newReq) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('requisitions')
        .insert({
          ...requisition,
          created_by: user.id,
          hiring_manager_id: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      setIsCreateDialogOpen(false);
      setNewReq({
        title: '',
        dept: '',
        location: '',
        employment_type: 'full_time',
        description: '',
        min_experience: 0,
        max_experience: 10,
        skills: [],
      });
      toast({
        title: 'Requisition created',
        description: 'New job requisition has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating requisition',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0';
      case 'draft':
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0';
      case 'on_hold':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0';
      case 'closed':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-0';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0';
    }
  };

  const getEmploymentTypeIcon = (type: string) => {
    switch (type) {
      case 'full_time':
        return <Users className="h-4 w-4" />;
      case 'part_time':
        return <Clock className="h-4 w-4" />;
      case 'contract':
        return <Building2 className="h-4 w-4" />;
      case 'internship':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const filteredRequisitions = requisitions.filter(
    (req: Requisition) =>
      req.title.toLowerCase().includes(search.toLowerCase()) ||
      req.dept?.toLowerCase().includes(search.toLowerCase()) ||
      req.location?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCardClick = (reqId: string) => {
    navigate(`/ats/requisitions/${reqId}`);
  };

  const RequisitionCard = ({ req }: { req: Requisition }) => (
    <Card
      className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
      onClick={() => handleCardClick(req.id)}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2">
              {req.title}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Building2 className="h-4 w-4" />
              {req.dept || 'No Department'}
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Post to LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 text-red-600">
                <Archive className="h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location and Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="h-4 w-4" />
            <span>{req.location || 'Remote'}</span>
          </div>
          <div className="flex items-center gap-1">
            {getEmploymentTypeIcon(req.employment_type)}
            <span className="text-sm font-medium capitalize">
              {req.employment_type?.replace('_', ' ') || 'Full Time'}
            </span>
          </div>
        </div>

        {/* Experience Range */}
        {(req.min_experience || req.max_experience) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>
              {req.min_experience || 0}-{req.max_experience || 10} years experience
            </span>
          </div>
        )}

        {/* Status and LinkedIn */}
        <div className="flex items-center justify-between">
          <Badge className={getStatusColor(req.status)}>{req.status || 'draft'}</Badge>

          {req.linkedin_job_id ? (
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
              <ExternalLink className="mr-1 h-3 w-3" />
              Posted
            </Badge>
          ) : (
            <span className="text-xs text-gray-500">Not posted</span>
          )}
        </div>

        {/* Created Date */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Created {new Date(req.created_at).toLocaleDateString()}</span>
            {req.hiring_manager && (
              <span className="font-medium">{req.hiring_manager.full_name}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="py-8 px-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Job Requisitions
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Manage job openings and track hiring progress
            </p>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <Plus className="mr-2 h-4 w-4" />
              Create Requisition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create New Job Requisition</DialogTitle>
              <DialogDescription>
                Add a new job opening to start the hiring process.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={newReq.title}
                    onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                  />
                </div>
                <div>
                  <Label htmlFor="dept">Department</Label>
                  <Input
                    id="dept"
                    value={newReq.dept}
                    onChange={(e) => setNewReq({ ...newReq, dept: e.target.value })}
                    placeholder="e.g. Engineering"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newReq.location}
                    onChange={(e) => setNewReq({ ...newReq, location: e.target.value })}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
                <div>
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Select
                    value={newReq.employment_type}
                    onValueChange={(value) => setNewReq({ ...newReq, employment_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newReq.description}
                  onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
                  placeholder="Job description and requirements..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_experience">Min Experience (years)</Label>
                  <Input
                    id="min_experience"
                    type="number"
                    value={newReq.min_experience}
                    onChange={(e) =>
                      setNewReq({ ...newReq, min_experience: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="max_experience">Max Experience (years)</Label>
                  <Input
                    id="max_experience"
                    type="number"
                    value={newReq.max_experience}
                    onChange={(e) =>
                      setNewReq({ ...newReq, max_experience: parseInt(e.target.value) || 10 })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createRequisition.mutate(newReq)}
                disabled={!newReq.title || createRequisition.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {createRequisition.isPending ? 'Creating...' : 'Create Requisition'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search requisitions by title, department, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12 text-lg border-0 bg-white dark:bg-gray-800 shadow-md"
              />
            </div>
            <Button variant="outline" size="lg" className="h-12 px-6">
              <Filter className="mr-2 h-5 w-5" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requisitions Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="text-lg text-muted-foreground">Loading requisitions...</p>
          </div>
        </div>
      ) : filteredRequisitions.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4">
              <Building2 className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No requisitions found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              {search
                ? 'No requisitions match your search criteria. Try adjusting your search terms.'
                : 'Create your first job requisition to start building your team.'}
            </p>
            {!search && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Requisition
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRequisitions.map((req: Requisition) => (
            <div key={req.id} className="animate-fade-in">
              <RequisitionCard req={req} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
