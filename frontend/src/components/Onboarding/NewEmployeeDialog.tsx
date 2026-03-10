import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FormProvider, useForm, useFormContext, Controller } from 'react-hook-form';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { DialogProps } from '@radix-ui/react-dialog';
import { Candidate } from '@/pages/Candidates';
import Autocomplete from '../ui/Autocomplete';
import FileUpload from '../ui/FileUpload';
import { Mail, Phone } from 'lucide-react';

interface NewEmployeeDialogProps extends DialogProps {
  data?: Candidate;
  refetch: () => void;
}

export interface CandidatePayload {
  id?: string;
  first_name: string;
  last_name: string;
  work_email: string;
  phone_number: string;
  email: string;
  address: string;
  location: string;
  hiring_manager: string;
  date_of_joining: string;
  type_of_joining: string;
  survey_id: string;
  resume_file?: File | null;
  resume_url?: string;
}

interface Survey {
  id: string;
  role_title: string;
  hiring_manager_name: string;
  hiring_manager_email?: string;
}

const candidateSchema = yup.object().shape({
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  work_email: yup.string().required('Work email is required'),
  phone_number: yup.string().required('Phone number is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  address: yup.string().required('Address is required'),
  location: yup.string().required('Location is required'),
  hiring_manager: yup.string().required('Hiring manager is required'),
  date_of_joining: yup.string().required('Date of joining is required'),
  type_of_joining: yup.string().required('Type of joining is required'),
  survey_id: yup.string().required('Requisition record is required'),
});

const DEFAULT_VALUES = {
  id: undefined,
  first_name: '',
  last_name: '',
  work_email: '',
  phone_number: '',
  email: '',
  address: '',
  location: '',
  hiring_manager: '',
  date_of_joining: '',
  type_of_joining: '',
  survey_id: '',
  resume_file: null,
  resume_url: '',
};
export default function NewEmployeeDialog({ refetch, data, ...props }: NewEmployeeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [countries, setCountries] = useState<{ value: string; code: string }[]>([
    { value: 'Australia', code: 'AU' },
    { value: 'India', code: 'IN' },
    {
      value: 'Singapore',
      code: 'SG',
    },
    { value: 'United States', code: 'US' },
    { value: 'Vietnam', code: 'VN' },
  ]);
  const [profiles, setProfiles] = useState<{ label: string; value: string }[]>([]);

  const form = useForm<CandidatePayload>({
    resolver: yupResolver(candidateSchema) as any,
    mode: 'onChange',
    defaultValues: DEFAULT_VALUES,
  });

  const firstName = form.watch('first_name');
  const lastName = form.watch('last_name');
  const userDomain = user?.email?.split('@')[1] || 'domain.com';
  const domainSuffix = `@${userDomain}`;

  useEffect(() => {
    if (firstName && lastName) {
      const suggested =
        `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`.replace(/\s+/g, '');
      form.setValue('work_email', `${suggested}`, { shouldValidate: true, shouldDirty: true });
    }
  }, [firstName, lastName]);

  const onSubmit = async (values: CandidatePayload) => {
    if (!user) return;
    setIsSubmitting(true);

    const finalWorkEmail = values.work_email.includes('@')
      ? values.work_email
      : `${values.work_email}${domainSuffix}`;

    let resumeUrl = values.resume_url || '';

    // Handle file upload if present
    if (values.resume_file) {
      try {
        const urlData = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-s3-presigned-url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              bucket: import.meta.env.VITE_DOCUMENTS_S3_BUCKET,
              operation: 'put',
              fileNames: [`candidates/${values.resume_file.name}`],
              expires_in: 3600,
            }),
          }
        );

        const { urls, error: uploadErr } = await urlData.json();
        if (uploadErr || !urls || urls.length === 0) {
          throw new Error(uploadErr || 'Failed to get presigned URL');
        }

        const { url, newFileName } = urls[0];
        const body = new FormData();
        body.append('file', values.resume_file);
        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: body,
          headers: {
            'Content-Type': values.resume_file.type,
            'Access-Control-Allow-Origin': '*',
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload to S3');
        }

        resumeUrl = newFileName;
      } catch (err: any) {
        console.error('File upload failed:', err);
        toast({
          title: 'Upload Error',
          description: 'Failed to upload resume. Please try again.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      work_email: finalWorkEmail,
      phone_number: values.phone_number,
      email: values.email,
      address: values.address,
      location: values.location,
      hiring_manager: values.hiring_manager,
      date_of_joining: values.date_of_joining,
      type_of_joining: values.type_of_joining,
      survey_id: values.survey_id,
      resume_url: resumeUrl,
    };

    try {
      if (data) {
        const { data: candidateData, error: updateError } = await supabase
          .from('candidates')
          .update({
            user_id: user.id,
            ...payload,
          })
          .eq('id', data.id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({
          title: 'Success!',
          description: 'Candidate updated successfully.',
          variant: 'default',
        });
      } else {
        const { data: candidateData, error: insertError } = await supabase
          .from('candidates')
          .insert({
            user_id: user.id,
            ...payload,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({
          title: 'Success!',
          description: 'Candidate added successfully.',
          variant: 'default',
        });

        if (candidateData) {
          navigate(`/onboarding/candidates/${candidateData.id}`);
        }
      }
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast({
        title: 'Error',
        description: 'Failed to add candidate.',
        variant: 'destructive',
      });
    } finally {
      refetch();
      props.onOpenChange(false);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      form.reset(form.formState.defaultValues);
    }
  }, [open]);

  useEffect(() => {
    if (data) {
      form.reset({
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        work_email: data.work_email?.split('@')[0] || '',
        phone_number: data.phone_number,
        email: data.email,
        address: data.address,
        location: data.location,
        hiring_manager: data.hiring_manager ?? '',
        date_of_joining: data.date_of_joining ?? '',
        type_of_joining: data.type_of_joining ?? '',
        survey_id: data.survey_id,
        resume_file: null,
        resume_url: (data as any).resume_url || '',
      });
    } else if (!data) {
      form.reset(DEFAULT_VALUES);
    }
  }, [data]);
  useEffect(() => {
    (async () => {
      const { data: surveysData, error: surveysError } = await supabase
        .from('hiring_surveys')
        .select('*')
        .order('created_at', { ascending: false });
      if (surveysError) throw surveysError;
      setSurveys(surveysData);
    })();

    // Fetch countries
    // (async () => {
    //   try {
    //     const response = await fetch('https://restcountries.com/v3.1/all?fields=name');
    //     const data = await response.json();
    //     const countryOptions = data
    //       .map((country: any) => ({
    //         value: country.name.common,
    //       }))
    //       .sort((a: any, b: any) => a.value.localeCompare(b.value));
    //     setCountries(countryOptions);
    //   } catch (error) {
    //     console.error('Error fetching countries:', error);
    //   }
    // })();

    // Fetch profiles
    (async () => {
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .not('full_name', 'is', null)
          .order('full_name');

        if (profilesError) throw profilesError;

        setProfiles(
          profilesData.map((p) => ({
            label: p.full_name!,
            value: p.user_id,
          }))
        );
      } catch (error) {
        console.error('Error fetching profiles:', error);
      }
    })();
  }, []);

  const handleDownload = async () => {
    const resumeUrl = form.getValues('resume_url');
    if (!resumeUrl) return;

    try {
      const urlData = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-s3-presigned-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            bucket: import.meta.env.VITE_DOCUMENTS_S3_BUCKET,
            operation: 'get',
            fileNames: [resumeUrl],
            expires_in: 3600,
          }),
        }
      );

      const { urls, error: downloadErr } = await urlData.json();
      if (downloadErr || !urls || urls.length === 0) {
        throw new Error(downloadErr || 'Failed to get presigned URL');
      }

      const { url } = urls[0];
      window.open(url, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download Error',
        description: 'Failed to generate download link.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog {...props}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="px-8 pt-8">
          <DialogTitle className="text-xl font-bold">
            {data ? 'Edit Candidate' : 'Add New Candidate'}
          </DialogTitle>
          <DialogDescription>
            Fill in the details to initiate the onboarding process.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-8 py-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="Enter first name"
                  {...form.register('first_name')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  name="last_name"
                  id="last_name"
                  placeholder="Enter last name"
                  {...form.register('last_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_email">Work Email *</Label>
                <Input
                  name="work_email"
                  id="work_email"
                  suffix={domainSuffix}
                  {...form.register('work_email')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_joining">Date of Joining *</Label>
                <Input id="date_of_joining" type="date" {...form.register('date_of_joining')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number *</Label>
                <Input
                  id="phone_number"
                  placeholder="+1 (555) 000-0000"
                  startIcon={<Phone className="h-4 w-4" />}
                  {...form.register('phone_number')}
                />
              </div>

              <div className="space-y-2">
                <Label>Type of Joining *</Label>
                <div className="space-y-2">
                  <Select
                    name="type_of_joining"
                    value={form.watch('type_of_joining')}
                    onValueChange={(value) =>
                      form.setValue('type_of_joining', value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select joining type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In Person">In Person</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Personal Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  startIcon={<Mail className="h-4 w-4" />}
                  {...form.register('email')}
                />
              </div>

              <Autocomplete
                name="hiring_manager"
                label="Hiring Manager *"
                placeholder="Search hiring manager"
                options={profiles}
                filterOption={(inputValue, option) =>
                  String(option?.label ?? '')
                    .toUpperCase()
                    .indexOf(inputValue.toUpperCase()) !== -1
                }
              />

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  placeholder="Enter full postal address"
                  className="min-h-[100px]"
                  {...form.register('address')}
                />
              </div>
              <div className="space-y-2">
                <Controller
                  name="resume_file"
                  control={form.control}
                  render={({ field }) => (
                    <FileUpload
                      label="Upload File"
                      value={field.value}
                      onChange={field.onChange}
                      existingUrl={form.watch('resume_url')}
                      onRemoveExisting={() =>
                        form.setValue('resume_url', '', { shouldDirty: true })
                      }
                      onDownload={handleDownload}
                    />
                  )}
                />
              </div>
              <Autocomplete
                name="location"
                label="Location *"
                placeholder="Select country"
                options={countries}
                filterOption={(inputValue, option) =>
                  String(option?.value ?? '')
                    .toUpperCase()
                    .indexOf(inputValue.toUpperCase()) !== -1
                }
              />

              <Autocomplete
                name="survey_id"
                label="Requisition Record *"
                placeholder="Search job title or hiring manager"
                options={surveys.map((survey) => ({
                  value: survey.id,
                  label: `${survey.role_title} - ${survey.hiring_manager_name}`,
                }))}
                filterOption={(inputValue, option) =>
                  String(option?.label ?? '')
                    .toUpperCase()
                    .includes(inputValue.toUpperCase())
                }
              />
            </div>

            <DialogFooter className="mt-6 px-0 py-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => props.onOpenChange?.(false)}
                className="font-medium"
              >
                Cancel
              </Button>
              <Button
                className="bg-[#EF6831] hover:bg-[#EF6831]/90 text-white px-8"
                disabled={!form.formState.isDirty || isSubmitting}
                type="submit"
              >
                {data ? 'Update Candidate' : 'Add Candidate'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
