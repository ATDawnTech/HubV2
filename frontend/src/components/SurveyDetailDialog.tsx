import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Download, FileText, FileSpreadsheet, File, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { exportSurveyToPDF, exportSurveyToExcel, exportSurveyToWord } from '@/utils/exportUtils';

interface Survey {
  id: string;
  role_title: string;
  hiring_manager_name: string;
  hiring_manager_email?: string;
  client?: string;
  department_function: string;
  location: string;
  hire_type: string;
  number_of_positions: number;
  budget_approved: boolean;
  mandatory_skills: string;
  nice_to_have_skills?: string;
  experience_range_min: number;
  experience_range_max: number;
  salary_range_min?: number;
  salary_range_max?: number;
  salary_currency: string;
  preferred_start_date?: string;
  client_facing: boolean;
  key_perks_benefits?: string;
  client_expectations?: string;
  preferred_interview_panelists?: string;
  vendors_to_include?: string;
  comments_notes?: string;
  created_at: string;
}

interface SurveyDetailDialogProps {
  survey: Survey;
  trigger?: React.ReactNode;
}

export const SurveyDetailDialog = ({ survey, trigger }: SurveyDetailDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async (format: 'pdf' | 'excel' | 'word') => {
    try {
      switch (format) {
        case 'pdf':
          await exportSurveyToPDF(survey);
          break;
        case 'excel':
          await exportSurveyToExcel([survey]);
          break;
        case 'word':
          await exportSurveyToWord(survey);
          break;
      }
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 border-b flex flex-row items-center justify-between sticky top-0 bg-background z-10">
          <DialogTitle className="text-3xl font-bold mt-0">Intake Details</DialogTitle>
          <div className="flex items-center gap-3 pr-[30px]">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-50 shadow-none"
              onClick={() => handleExport('pdf')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Download as PDF
            </Button>
            <Button
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-50 shadow-none"
              onClick={() => handleExport('excel')}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download as Excel
            </Button>
            <Button
              className="bg-orange-100 text-orange-600 hover:bg-orange-200 border-none shadow-none"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Summary
            </Button>
          </div>
        </DialogHeader>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8 text-[15px]">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="flex gap-2">
                <span className="font-bold min-w-[200px]">Role Title:</span>
                <span className="text-muted-foreground">{survey.role_title}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold min-w-[200px]">Hiring Manager Name:</span>
                <span className="text-muted-foreground">{survey.hiring_manager_name}</span>
              </div>
              {survey.hiring_manager_email && (
                <div className="flex gap-2">
                  <span className="font-bold min-w-[200px]">Hiring Manager Email:</span>
                  <span className="text-muted-foreground">{survey.hiring_manager_email}</span>
                </div>
              )}
              {survey.client && (
                <div className="flex gap-2">
                  <span className="font-bold min-w-[200px]">Client:</span>
                  <span className="text-muted-foreground">{survey.client}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="font-bold min-w-[200px]">Department / Function:</span>
                <span className="text-muted-foreground">{survey.department_function}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold min-w-[200px]">Location:</span>
                <span className="text-muted-foreground">{survey.location}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold min-w-[200px]">Mandatory Skills:</span>
                <span className="text-muted-foreground flex-1 break-words">{survey.mandatory_skills}</span>
              </div>
              {survey.nice_to_have_skills && (
                <div className="flex gap-2">
                  <span className="font-bold min-w-[200px]">Nice to have skills:</span>
                  <span className="text-muted-foreground flex-1 break-words">{survey.nice_to_have_skills}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="font-bold min-w-[200px]">Experience Range (Min/Max):</span>
                <span className="text-muted-foreground">{survey.experience_range_min} - {survey.experience_range_max} Years</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="flex gap-2">
                <span className="font-bold min-w-[230px]">Salary Range (Min/Max):</span>
                <span className="text-muted-foreground">
                  {survey.salary_range_min && survey.salary_range_max
                    ? `${survey.salary_range_min} - ${survey.salary_range_max}`
                    : survey.salary_range_min
                      ? `${survey.salary_range_min}+`
                      : `Up to ${survey.salary_range_max}`
                  }
                </span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold min-w-[230px]">Currency:</span>
                <span className="text-muted-foreground">{survey.salary_currency}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold min-w-[230px]">Type of Hire:</span>
                <span className="text-muted-foreground">{survey.hire_type}</span>
              </div>
              {survey.preferred_start_date && (
                <div className="flex gap-2">
                  <span className="font-bold min-w-[230px]">Preferred Start Date:</span>
                  <span className="text-muted-foreground">{survey.preferred_start_date}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="font-bold min-w-[230px]">Number of Positions:</span>
                <span className="text-muted-foreground">{survey.number_of_positions}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="font-bold min-w-[230px]">Budget Approved:</span>
                <span className="flex items-center text-muted-foreground gap-2">
                  {survey.budget_approved ? (
                    <><CheckCircle2 className="h-5 w-5 fill-orange-500 text-white" /> Yes</>
                  ) : (
                    <><Circle className="h-5 w-5 text-muted-foreground" /> No</>
                  )}
                </span>
              </div>
              {survey.key_perks_benefits && (
                <div className="flex gap-2">
                  <span className="font-bold min-w-[230px]">Key Perks or Benefits:</span>
                  <span className="text-muted-foreground flex-1 break-words">{survey.key_perks_benefits}</span>
                </div>
              )}
              {survey.preferred_interview_panelists && (
                <div className="flex gap-2">
                  <span className="font-bold min-w-[230px]">Preferred Interview Panelists:</span>
                  <span className="text-muted-foreground flex-1 break-words">{survey.preferred_interview_panelists}</span>
                </div>
              )}
              {survey.vendors_to_include && (
                <div className="flex gap-2">
                  <span className="font-bold min-w-[230px]">Any Vendors to Include:</span>
                  <span className="text-muted-foreground flex-1 break-words">{survey.vendors_to_include}</span>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <span className="font-bold min-w-[230px]">Client Facing Role:</span>
                <span className="flex items-center text-muted-foreground gap-2">
                  {survey.client_facing ? (
                    <><CheckCircle2 className="h-5 w-5 fill-orange-500 text-white" /> Yes</>
                  ) : (
                    <><Circle className="h-5 w-5 text-muted-foreground" /> No</>
                  )}
                </span>
              </div>
              {survey.client_expectations && (
                <div className="flex gap-2">
                  <span className="font-bold min-w-[230px]">Client Expectations:</span>
                  <span className="text-muted-foreground italic flex-1 break-words">{survey.client_expectations}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 mb-6">
            <h4 className="font-bold mb-4 text-[15px]">Comments / Notes:</h4>
            <div className="bg-[#f8f9fa] p-6 rounded-xl text-slate-600 border border-slate-100 leading-relaxed min-h-[100px]">
              {survey.comments_notes || "No additional comments or notes provided."}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t flex justify-end">
            <Button className="bg-[#f97316] hover:bg-[#ea580c] text-white min-w-[120px] shadow-sm font-semibold" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};