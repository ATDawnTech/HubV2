import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SurveyData {
  roleTitle: string;
  hiringManagerName: string;
  hiringManagerEmail: string;
  client: string;
  departmentFunction: string;
  location: string;
  workModel: string;
  mandatorySkills: string;
  niceToHaveSkills: string;
  minYearsExp: number;
  salaryRangeMin: number;
  salaryRangeMax: number;
  salaryCurrency: string;
  hireType: string;
  preferredStartDate: string;
  numberOfPositions: number;
  budgetApproved: boolean;
  keyPerksBenefits: string;
  preferredInterviewPanelists: string;
  vendorsToInclude: string;
  clientFacing: boolean;
  clientExpectations: string;
  commentsNotes: string;
}

const Survey = () => {
  const [mandatoryError, setMandatoryError] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState<SurveyData>({
    roleTitle: '',
    hiringManagerName: '',
    hiringManagerEmail: '',
    client: '',
    departmentFunction: '',
    location: '',
    workModel: '',
    mandatorySkills: '',
    niceToHaveSkills: '',
    minYearsExp: 0,
    salaryRangeMin: 0,
    salaryRangeMax: 0,
    salaryCurrency: '',
    hireType: '',
    preferredStartDate: '',
    numberOfPositions: 1,
    budgetApproved: false,
    keyPerksBenefits: '',
    preferredInterviewPanelists: '',
    vendorsToInclude: '',
    clientFacing: false,
    clientExpectations: '',
    commentsNotes: '',
  });

  const [departments, setDepartments] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);

  useEffect(() => {
    if (editId && user) {
      loadSurveyForEdit(editId);
    }
    const fetchDropdowns = async () => {
      const { data, error } = await supabase
        .from('hiring_surveys')
        .select('department_function, client');
      if (!error && data) {
        const uniqueDepartments = Array.from(new Set(data.map((d) => d.department_function).filter((v) => typeof v === 'string' && v.trim() !== '')));
        setDepartments(uniqueDepartments);
        const uniqueClients = Array.from(new Set(data.map((d) => d.client).filter((v) => typeof v === 'string' && v.trim() !== '')));
        setClients(uniqueClients);
      }
    };
    fetchDropdowns();
  }, [editId, user]);

  const loadSurveyForEdit = async (surveyId: string) => {
    try {
      const { data, error } = await supabase
        .from('hiring_surveys')
        .select('*')
        .eq('id', surveyId)
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setFormData({
          roleTitle: data.role_title || '',
          hiringManagerName: data.hiring_manager_name || '',
          hiringManagerEmail: data.hiring_manager_email || '',
          client: data.client || '',
          departmentFunction: data.department_function || '',
          location: data.location || '',
          workModel: data.work_model || '',
          mandatorySkills: data.mandatory_skills || '',
          niceToHaveSkills: data.nice_to_have_skills || '',
          minYearsExp: data.min_years_exp || 0,
          salaryRangeMin: data.salary_range_min || 0,
          salaryRangeMax: data.salary_range_max || 0,
          salaryCurrency: data.salary_currency || 'USD',
          hireType: data.hire_type || '',
          preferredStartDate: data.preferred_start_date || '',
          numberOfPositions: data.number_of_positions || 1,
          budgetApproved: data.budget_approved || false,
          keyPerksBenefits: data.key_perks_benefits || '',
          preferredInterviewPanelists: data.preferred_interview_panelists || '',
          vendorsToInclude: data.vendors_to_include || '',
          clientFacing: data.client_facing || false,
          clientExpectations: data.client_expectations || '',
          commentsNotes: data.comments_notes || '',
        });
      }
    } catch (error) {
      console.error('Error loading survey:', error);
      toast({
        title: 'Error',
        description: 'Failed to load survey data.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setInitialLoading(false);
    }
  };

  const updateFormData = (field: keyof SurveyData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    if (!user) return;

    // Check mandatory fields
    const missingFields = [];
    if (!formData.roleTitle?.trim()) missingFields.push('roleTitle');
    if (!formData.hiringManagerName?.trim()) missingFields.push('hiringManagerName');
    if (!formData.hiringManagerEmail?.trim()) missingFields.push('hiringManagerEmail');
    if (!formData.client?.trim()) missingFields.push('client');

    if (missingFields.length > 0) {
      setMandatoryError('Please fill out all mandatory fields before submitting');
      toast({
        title: 'Validation Error',
        description: 'Please fill out all mandatory fields before submitting',
        variant: 'destructive',
      });
      return;
    } else {
      setMandatoryError("");
    }
    setLoading(true);
    try {
      const surveyData = {
        user_id: user.id,
        role_title: formData.roleTitle,
        hiring_manager_name: formData.hiringManagerName,
        hiring_manager_email: formData.hiringManagerEmail,
        client: formData.client,
        department_function: formData.departmentFunction,
        location: formData.location,
        mandatory_skills: formData.mandatorySkills,
        nice_to_have_skills: formData.niceToHaveSkills,
        experience_range_min: typeof formData.minYearsExp === 'number' && !isNaN(formData.minYearsExp) ? formData.minYearsExp : 0,
        experience_range_max: typeof formData.salaryRangeMax === 'number' && !isNaN(formData.salaryRangeMax) ? formData.salaryRangeMax : 0,
        salary_range_min: formData.salaryRangeMin,
        salary_range_max: formData.salaryRangeMax,
        salary_currency: formData.salaryCurrency,
        hire_type: formData.hireType || 'Internal', // Type of hire: Internal, External, Staff Augmentation
        work_model: formData.workModel || 'On-site', // Work model: Remote, On-site, Hybrid
        preferred_start_date: formData.preferredStartDate,
        number_of_positions: formData.numberOfPositions,
        budget_approved: formData.budgetApproved,
        key_perks_benefits: formData.keyPerksBenefits,
        preferred_interview_panelists: formData.preferredInterviewPanelists,
        vendors_to_include: formData.vendorsToInclude,
        client_facing: formData.clientFacing,
        client_expectations: formData.clientExpectations,
        comments_notes: formData.commentsNotes,
      };
      let error;
      if (editId) {
        const { error: updateError } = await supabase
          .from('hiring_surveys')
          .update(surveyData)
          .eq('id', editId)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('hiring_surveys').insert(surveyData);
        error = insertError;
      }
      if (error) throw error;
      toast({
        title: 'Success!',
        description: editId ? 'Survey updated successfully.' : 'Survey response has been saved.',
      });
      navigate('/dashboard');
    } catch (error) {
      // Improved error logging for debugging
      if (typeof error === 'object') {
        console.error('Error saving survey:', error, JSON.stringify(error));
      } else {
        console.error('Error saving survey:', error);
      }
      // Only show toast error if all required fields are filled and submission fails
      if (missingFields.length === 0) {
        toast({
          title: 'Error',
          description: editId
            ? 'Failed to update survey. Please try again.'
            : 'Failed to save survey response. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center">Loading survey data...</div>
      </div>
    );
  }

  return (
    <div className="py-8 px-12">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4"></div>
        <div className="flex items-center gap-4">
          <img
            src="/lovable-uploads/4b60f503-c9c0-4dae-9f1f-07bf354b0457.png"
            alt="AT Dawn Logo"
            className="h-10 w-auto"
          />
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Add New Intake Request</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">Fill in the details to register a new hiring requirement.</p>

        {mandatoryError && (
          <div className="mb-4 text-center text-red-600 font-semibold text-lg">{mandatoryError}</div>
        )}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

            <div className="space-y-2">
              <Label htmlFor="roleTitle" className={submitted && !formData.roleTitle?.trim() ? 'text-red-500 font-bold' : 'font-bold'}>Role Title *</Label>
              <Input id="roleTitle" value={formData.roleTitle} onChange={(e) => updateFormData('roleTitle', e.target.value)} className={submitted && !formData.roleTitle?.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''} placeholder="e.g. Senior Frontend Engineer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hiringManagerName" className={submitted && !formData.hiringManagerName?.trim() ? 'text-red-500 font-bold' : 'font-bold'}>Hiring Manager Name *</Label>
              <Input id="hiringManagerName" value={formData.hiringManagerName} onChange={(e) => updateFormData('hiringManagerName', e.target.value)} className={submitted && !formData.hiringManagerName?.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''} placeholder="Enter full name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hiringManagerEmail" className={submitted && !formData.hiringManagerEmail?.trim() ? 'text-red-500 font-bold' : 'font-bold'}>Hiring Manager Email *</Label>
              <Input id="hiringManagerEmail" value={formData.hiringManagerEmail} onChange={(e) => updateFormData('hiringManagerEmail', e.target.value)} className={submitted && !formData.hiringManagerEmail?.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''} placeholder="manager@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client" className={submitted && !formData.client?.trim() ? 'text-red-500 font-bold' : 'font-bold'}>Client *</Label>
              <div className="relative">
                <Input
                  id="client"
                  value={formData.client}
                  onChange={(e) => updateFormData('client', e.target.value)}
                  list="client-options"
                  placeholder="Select a client"
                  className={submitted && !formData.client?.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                <datalist id="client-options">
                  <option value="HPE" />
                  <option value="VHS" />
                  <option value="Sapient" />
                  <option value="GSK" />
                  <option value="Ollion" />
                  <option value="Koch" />
                  <option value="Gen Digital" />
                  {clients.map((c) => typeof c === 'string' && !["HPE", "VHS", "Sapient", "GSK", "Ollion", "Koch", "Gen Digital"].includes(c) && <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentFunction" className="font-bold">Department</Label>
              <div className="relative">
                <Input
                  id="departmentFunction"
                  value={formData.departmentFunction}
                  onChange={(e) => updateFormData('departmentFunction', e.target.value)}
                  list="department-options"
                  placeholder="Engineering"
                />
                <datalist id="department-options">
                  <option value="Technology" />
                  <option value="Recruitment" />
                  <option value="HR" />
                  <option value="Engineering" />
                  {departments.map((d) => typeof d === 'string' && !["Technology", "Recruitment", "HR", "Engineering"].includes(d) && <option key={d} value={d} />)}
                </datalist>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workModel" className="font-bold">Work Model</Label>
              <Select value={formData.workModel} onValueChange={(value) => updateFormData('workModel', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Remote" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="On-site">On-site</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="font-bold">Location</Label>
              <Select value={formData.location} onValueChange={(value) => updateFormData('location', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="San Francisco, CA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="San Francisco, CA">San Francisco, CA</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Vietnam">Vietnam</SelectItem>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numberOfPositions" className="font-bold">Number of Positions</Label>
              <Input id="numberOfPositions" type="number" min="1" value={formData.numberOfPositions} onChange={(e) => updateFormData('numberOfPositions', parseInt(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mandatorySkills" className="font-bold">Mandatory Skills</Label>
              <Input id="mandatorySkills" value={formData.mandatorySkills} onChange={(e) => updateFormData('mandatorySkills', e.target.value)} placeholder="React, Node.js, TypeScript..." className="w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niceToHaveSkills" className="font-bold">Nice to have skills</Label>
              <Input id="niceToHaveSkills" value={formData.niceToHaveSkills} onChange={(e) => updateFormData('niceToHaveSkills', e.target.value)} placeholder="AWS, Docker, Figma..." className="w-full" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minYearsExp" className="font-bold">Minimum Experience (Years)</Label>
              <Input id="minYearsExp" type="number" min="0" value={formData.minYearsExp || ''} onChange={(e) => updateFormData('minYearsExp', parseInt(e.target.value))} placeholder="e.g. 5" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Salary Range</Label>
              <div className="flex gap-2">
                <Input id="salaryRangeMin" type="number" min="0" value={formData.salaryRangeMin || ''} onChange={(e) => updateFormData('salaryRangeMin', parseFloat(e.target.value))} placeholder="Min" className="flex-1" />
                <Input id="salaryRangeMax" type="number" min="0" value={formData.salaryRangeMax || ''} onChange={(e) => updateFormData('salaryRangeMax', parseFloat(e.target.value))} placeholder="Max" className="flex-1" />
                <Select value={formData.salaryCurrency} onValueChange={(value) => updateFormData('salaryCurrency', value)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="typeOfHire" className="font-bold">Type of Hire</Label>
              <Select value={formData.hireType} onValueChange={(value) => updateFormData('hireType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Full-time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="External">External</SelectItem>
                  <SelectItem value="Staff Augmentation">Staff Augmentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredStartDate" className="font-bold">Preferred Start Date</Label>
              <div className="relative">
                <Input id="preferredStartDate" type="date" value={formData.preferredStartDate} onChange={(e) => updateFormData('preferredStartDate', e.target.value)} placeholder="mm / dd / yyyy" className="pr-10" />
              </div>
            </div>

            <div className="flex items-center justify-start gap-8 col-span-1 md:col-span-2 pt-1 pb-1">
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="budgetApproved" className="w-5 h-5 text-[#fca586] border-gray-300 rounded-full focus:ring-[#fca586] ring-2 ring-transparent checked:ring-[#fca586] cursor-pointer appearance-none checked:bg-[#fca586]" style={{ WebkitAppearance: 'radio', MozAppearance: 'radio', appearance: 'radio' }} checked={formData.budgetApproved} onChange={(e) => updateFormData('budgetApproved', e.target.checked)} />
                <Label htmlFor="budgetApproved" className="font-bold cursor-pointer text-slate-700">Budget Approved</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="clientFacing" className="w-5 h-5 text-[#fca586] border-gray-300 rounded-full focus:ring-[#fca586] ring-2 ring-transparent checked:ring-[#fca586] cursor-pointer appearance-none checked:bg-[#fca586]" style={{ WebkitAppearance: 'radio', MozAppearance: 'radio', appearance: 'radio' }} checked={formData.clientFacing} onChange={(e) => updateFormData('clientFacing', e.target.checked)} />
                <Label htmlFor="clientFacing" className="font-bold cursor-pointer text-slate-700">Client Facing Role</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyPerksBenefits" className="font-bold">Key Perks or Benefits</Label>
              <Textarea id="keyPerksBenefits" value={formData.keyPerksBenefits} onChange={(e) => updateFormData('keyPerksBenefits', e.target.value)} placeholder="List key benefits..." className="h-28 resize-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredInterviewPanelists" className="font-bold">Preferred Interview Panelists</Label>
              <Textarea id="preferredInterviewPanelists" value={formData.preferredInterviewPanelists} onChange={(e) => updateFormData('preferredInterviewPanelists', e.target.value)} placeholder="Enter names or email addresses..." className="h-28 resize-none" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorsToInclude" className="font-bold">Any Vendors to Include</Label>
              <Textarea id="vendorsToInclude" value={formData.vendorsToInclude} onChange={(e) => updateFormData('vendorsToInclude', e.target.value)} placeholder="List specific recruitment agencies..." className="h-28 resize-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientExpectations" className="font-bold">Client Expectations</Label>
              <Textarea id="clientExpectations" value={formData.clientExpectations} onChange={(e) => updateFormData('clientExpectations', e.target.value)} placeholder="Any specific requirements from client side..." className="h-28 resize-none" />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="commentsNotes" className="font-bold">Comments / Notes from intake call</Label>
              <Textarea id="commentsNotes" value={formData.commentsNotes} onChange={(e) => updateFormData('commentsNotes', e.target.value)} placeholder="Additional details discussed during the meeting..." className="h-28 resize-none" />
            </div>
          </div>

          <Button type="submit" className="w-full bg-[#fca586] hover:bg-[#fa916b] text-white font-bold py-6 text-[15px] mt-4" disabled={loading}>
            {loading
              ? editId
                ? 'Updating...'
                : 'Saving...'
              : editId
                ? 'Update Survey'
                : 'Submit Intake'}
          </Button>
        </form>
      </div>
    </div >
  );
};

export default Survey;

