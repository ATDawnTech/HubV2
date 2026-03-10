import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, HeadingLevel } from 'docx';

// Source code export utility
export const exportSourceCodeToTxt = async () => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('export-source-code');

    if (error) {
      throw error;
    }

    // Create and download the file
    const blob = new Blob([data], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adt-hub-complete-source-code-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting source code:', error);
    throw new Error('Failed to export source code. Please try again.');
  }
};

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

export const exportSurveyToPDF = async (survey: Survey) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Hiring Survey Report', 20, 30);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);
  
  // Survey details
  const tableData = [
    ['Role Title', survey.role_title],
    ['Hiring Manager', survey.hiring_manager_name],
    ['Hiring Manager Email', survey.hiring_manager_email || 'N/A'],
    ['Client', survey.client || 'N/A'],
    ['Department', survey.department_function],
    ['Location', survey.location],
    ['Hire Type', survey.hire_type],
    ['Number of Positions', survey.number_of_positions.toString()],
    ['Experience Range', `${survey.experience_range_min} - ${survey.experience_range_max} years`],
    ['Salary Range', survey.salary_range_min && survey.salary_range_max 
      ? `${survey.salary_range_min} - ${survey.salary_range_max} ${survey.salary_currency}`
      : 'Not specified'],
    ['Budget Approved', survey.budget_approved ? 'Yes' : 'No'],
    ['Client Facing', survey.client_facing ? 'Yes' : 'No'],
    ['Mandatory Skills', survey.mandatory_skills],
    ['Nice-to-Have Skills', survey.nice_to_have_skills || 'N/A'],
  ];

  if (survey.key_perks_benefits) {
    tableData.push(['Key Perks & Benefits', survey.key_perks_benefits]);
  }
  if (survey.client_expectations) {
    tableData.push(['Client Expectations', survey.client_expectations]);
  }
  if (survey.preferred_interview_panelists) {
    tableData.push(['Preferred Interview Panelists', survey.preferred_interview_panelists]);
  }
  if (survey.vendors_to_include) {
    tableData.push(['Vendors to Include', survey.vendors_to_include]);
  }
  if (survey.comments_notes) {
    tableData.push(['Comments & Notes', survey.comments_notes]);
  }

  autoTable(doc, {
    startY: 50,
    head: [['Field', 'Value']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [255, 102, 51] }, // Orange color
    styles: { cellPadding: 5, fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 120 }
    }
  });

  doc.save(`hiring-survey-${survey.role_title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};

export const exportSurveyToExcel = async (surveys: Survey[]) => {
  const workbook = XLSX.utils.book_new();
  
  const worksheetData = surveys.map(survey => ({
    'Role Title': survey.role_title,
    'Hiring Manager': survey.hiring_manager_name,
    'Hiring Manager Email': survey.hiring_manager_email || '',
    'Client': survey.client || '',
    'Department': survey.department_function,
    'Location': survey.location,
    'Hire Type': survey.hire_type,
    'Number of Positions': survey.number_of_positions,
    'Experience Min': survey.experience_range_min,
    'Experience Max': survey.experience_range_max,
    'Salary Min': survey.salary_range_min || '',
    'Salary Max': survey.salary_range_max || '',
    'Currency': survey.salary_currency,
    'Budget Approved': survey.budget_approved ? 'Yes' : 'No',
    'Client Facing': survey.client_facing ? 'Yes' : 'No',
    'Mandatory Skills': survey.mandatory_skills,
    'Nice-to-Have Skills': survey.nice_to_have_skills || '',
    'Key Perks': survey.key_perks_benefits || '',
    'Client Expectations': survey.client_expectations || '',
    'Interview Panelists': survey.preferred_interview_panelists || '',
    'Vendors': survey.vendors_to_include || '',
    'Comments': survey.comments_notes || '',
    'Created At': survey.created_at,
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hiring Surveys');
  
  const filename = surveys.length === 1 
    ? `hiring-survey-${surveys[0].role_title.replace(/\s+/g, '-').toLowerCase()}.xlsx`
    : `hiring-surveys-${new Date().toISOString().split('T')[0]}.xlsx`;
    
  XLSX.writeFile(workbook, filename);
};

export const exportSurveyToWord = async (survey: Survey) => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'Hiring Survey Report',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `Generated on: ${new Date().toLocaleDateString()}`,
            spacing: { after: 200 },
          }),
          
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Role Title', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.role_title })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Hiring Manager', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.hiring_manager_name })],
                  }),
                ],
              }),
              ...(survey.hiring_manager_email ? [new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Hiring Manager Email', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.hiring_manager_email })],
                  }),
                ],
              })] : []),
              ...(survey.client ? [new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Client', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.client })],
                  }),
                ],
              })] : []),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Department', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.department_function })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Location', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.location })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Hire Type', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.hire_type })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Number of Positions', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.number_of_positions.toString() })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Experience Range', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: `${survey.experience_range_min} - ${survey.experience_range_max} years` })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Budget Approved', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.budget_approved ? 'Yes' : 'No' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Client Facing', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.client_facing ? 'Yes' : 'No' })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Mandatory Skills', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.mandatory_skills })],
                  }),
                ],
              }),
              ...(survey.nice_to_have_skills ? [new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Nice-to-Have Skills', style: 'Strong' })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: survey.nice_to_have_skills })],
                  }),
                ],
              })] : []),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(buffer);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hiring-survey-${survey.role_title.replace(/\s+/g, '-').toLowerCase()}.docx`;
  link.click();
  window.URL.revokeObjectURL(url);
};