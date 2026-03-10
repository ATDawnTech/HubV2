import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  maxYearsExp: number;
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

const EditIntake = () => {
  const [mandatoryError, setMandatoryError] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editId = id;
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
    maxYearsExp: 0,
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
          maxYearsExp: data.experience_range_max || 0,
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
    if (!formData.departmentFunction?.trim()) missingFields.push('departmentFunction');
    if (!formData.location) missingFields.push('location');
    if (!formData.workModel) missingFields.push('workModel');
    if (!formData.mandatorySkills?.trim()) missingFields.push('mandatorySkills');

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
        experience_range_max: typeof formData.maxYearsExp === 'number' && !isNaN(formData.maxYearsExp) ? formData.maxYearsExp : 0,
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
      <div className="max-w-[1200px] mx-auto mt-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Edit Intake Details</h1>
          <Button variant="outline" onClick={() => navigate(-1)} className="rounded-md border-slate-300">
            Cancel
          </Button>
        </div>
        <hr className="mb-10 text-slate-200" />

        {mandatoryError && (
          <div className="mb-4 text-center text-red-600 font-semibold text-lg">{mandatoryError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {/* Row 1 */}
            <div className="space-y-3">
              <Label htmlFor="roleTitle" className={`font-bold ${submitted && !formData.roleTitle?.trim() ? 'text-red-500' : ''}`}>Role Title:</Label>
              <Input id="roleTitle" value={formData.roleTitle} onChange={(e) => updateFormData('roleTitle', e.target.value)} className={submitted && !formData.roleTitle?.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''} placeholder="Senior Product Designer" />
            </div>
            <div className="space-y-3">
              <Label className="font-bold">Salary Range (Min/Max):</Label>
              <div className="flex gap-4">
                <Input id="salaryRangeMin" type="number" min="0" value={formData.salaryRangeMin || ''} onChange={(e) => updateFormData('salaryRangeMin', parseFloat(e.target.value))} placeholder="140000" />
                <Input id="salaryRangeMax" type="number" min="0" value={formData.salaryRangeMax || ''} onChange={(e) => updateFormData('salaryRangeMax', parseFloat(e.target.value))} placeholder="180000" />
              </div>
            </div>

            {/* Row 2 */}
            <div className="space-y-3">
              <Label htmlFor="hiringManagerName" className={`font-bold ${submitted && !formData.hiringManagerName?.trim() ? 'text-red-500' : ''}`}>Hiring Manager Name:</Label>
              <Input id="hiringManagerName" value={formData.hiringManagerName} onChange={(e) => updateFormData('hiringManagerName', e.target.value)} className={submitted && !formData.hiringManagerName?.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''} placeholder="Alex Rivers" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="salaryCurrency" className="font-bold">Currency:</Label>
              <Select value={formData.salaryCurrency} onValueChange={(value) => updateFormData('salaryCurrency', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 3 */}
            <div className="space-y-3">
              <Label htmlFor="hiringManagerEmail" className={`font-bold ${submitted && !formData.hiringManagerEmail?.trim() ? 'text-red-500' : ''}`}>Hiring Manager Email:</Label>
              <Input id="hiringManagerEmail" value={formData.hiringManagerEmail} onChange={(e) => updateFormData('hiringManagerEmail', e.target.value)} className={submitted && !formData.hiringManagerEmail?.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''} placeholder="a.rivers@company.com" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="typeOfHire" className="font-bold">Type of Hire:</Label>
              <Select value={formData.hireType} onValueChange={(value) => updateFormData('hireType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="External" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internal">Internal</SelectItem>
                  <SelectItem value="External">External</SelectItem>
                  <SelectItem value="Staff Augmentation">Staff Augmentation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 4 */}
            <div className="space-y-3">
              <Label htmlFor="client" className="font-bold">Client:</Label>
              <Input id="client" value={formData.client} onChange={(e) => updateFormData('client', e.target.value)} placeholder="Global Tech Solutions" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="preferredStartDate" className="font-bold">Preferred Start Date:</Label>
              <Input id="preferredStartDate" type="date" value={formData.preferredStartDate} onChange={(e) => updateFormData('preferredStartDate', e.target.value)} />
            </div>

            {/* Row 5 */}
            <div className="space-y-3">
              <Label htmlFor="departmentFunction" className={`font-bold ${submitted && !formData.departmentFunction?.trim() ? 'text-red-500' : ''}`}>Department / Function:</Label>
              <Select value={formData.departmentFunction} onValueChange={(value) => updateFormData('departmentFunction', value)}>
                <SelectTrigger className={submitted && !formData.departmentFunction?.trim() ? 'border-red-500 focus:ring-red-500' : ''}>
                  <SelectValue placeholder="Product & UX" />
                </SelectTrigger>
                <SelectContent>
                  {departments.length === 0 ? (
                    <SelectItem value="no_departments" disabled>No departments found</SelectItem>
                  ) : (
                    departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))
                  )}
                  <SelectItem value="Product & UX">Product & UX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label htmlFor="numberOfPositions" className="font-bold">Number of Positions:</Label>
              <Input id="numberOfPositions" type="number" min="1" value={formData.numberOfPositions} onChange={(e) => updateFormData('numberOfPositions', parseInt(e.target.value))} />
            </div>

            {/* Row 6 */}
            <div className="space-y-3">
              <Label htmlFor="workModel" className={`font-bold ${submitted && !formData.workModel ? 'text-red-500' : ''}`}>Work Model:</Label>
              <Select value={formData.workModel} onValueChange={(value) => updateFormData('workModel', value)}>
                <SelectTrigger className={submitted && !formData.workModel ? 'border-red-500 focus:ring-red-500' : ''}>
                  <SelectValue placeholder="Hybrid (3 days onsite)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="On-site">On-site</SelectItem>
                  <SelectItem value="Hybrid (3 days onsite)">Hybrid (3 days onsite)</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md bg-slate-50 border border-transparent p-4 h-14 mt-6">
              <Label htmlFor="budgetApproved" className="font-bold mb-0">Budget Approved:</Label>
              <Switch id="budgetApproved" checked={formData.budgetApproved} onChange={(checked) => updateFormData('budgetApproved', checked)} className="data-[state=checked]:bg-orange-500" />
            </div>

            {/* Row 7 */}
            <div className="space-y-3">
              <Label htmlFor="location" className={`font-bold ${submitted && !formData.location ? 'text-red-500' : ''}`}>Location:</Label>
              <Select value={formData.location} onValueChange={(value) => updateFormData('location', value)}>
                <SelectTrigger className={submitted && !formData.location ? 'border-red-500 focus:ring-red-500' : ''}>
                  <SelectValue placeholder="United States (San Francisco, CA)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="United States (San Francisco, CA)">United States (San Francisco, CA)</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Vietnam">Vietnam</SelectItem>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md bg-slate-50 border border-transparent p-4 h-14 mt-6">
              <Label htmlFor="clientFacing" className="font-bold mb-0">Client Facing Role:</Label>
              <Switch id="clientFacing" checked={formData.clientFacing} onChange={(checked) => updateFormData('clientFacing', checked)} className="data-[state=checked]:bg-orange-500" />
            </div>

            {/* Row 8 */}
            <div className="space-y-3 mb-6">
              <Label className="font-bold">Experience Range (Min/Max Years):</Label>
              <div className="flex gap-4">
                <Input id="minYearsExp" type="number" min="0" value={formData.minYearsExp || ''} onChange={(e) => updateFormData('minYearsExp', parseInt(e.target.value))} placeholder="5" />
                <Input id="maxYearsExp" type="number" min="0" value={formData.maxYearsExp || ''} onChange={(e) => updateFormData('maxYearsExp', parseInt(e.target.value))} placeholder="8" />
              </div>
            </div>

            <div className="space-y-3 row-span-2">
              <Label htmlFor="keyPerksBenefits" className="font-bold">Key Perks or Benefits:</Label>
              <Textarea id="keyPerksBenefits" value={formData.keyPerksBenefits} onChange={(e) => updateFormData('keyPerksBenefits', e.target.value)} placeholder="Unlimited PTO, Health Insurance, 401k Match, Yearly Learning Stipend" className="min-h-[120px] resize-none" />
            </div>

          </div>

          {/* Other sections that were not requested to be modified, let's include them for completeness */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Additional Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-3">
                <Label htmlFor="mandatorySkills" className={`font-bold ${submitted && !formData.mandatorySkills?.trim() ? 'text-red-500' : ''}`}>Mandatory Skills *</Label>
                <Textarea id="mandatorySkills" value={formData.mandatorySkills} onChange={(e) => updateFormData('mandatorySkills', e.target.value)} className={submitted && !formData.mandatorySkills?.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''} placeholder="List key technical and soft skills required..." />
              </div>
              <div className="space-y-3">
                <Label htmlFor="niceToHaveSkills" className="font-bold">Nice to Have Skills</Label>
                <Textarea id="niceToHaveSkills" value={formData.niceToHaveSkills} onChange={(e) => updateFormData('niceToHaveSkills', e.target.value)} placeholder="List skills that would be a bonus..." />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-8">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>

    </div >
  );
};

export default EditIntake;
