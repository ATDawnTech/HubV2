import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { read, utils, writeFile } from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { EmployeeRecord } from '@/schemas/employee';

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedEmployee extends EmployeeRecord {
  _rowIndex: number;
  _errors: string[];
}

export function BulkUploadDialog({ open, onOpenChange }: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = utils.sheet_to_json(worksheet);

        const parsed = jsonData.map((row: any, index: number) => {
          const errors: string[] = [];
          
          // Validate required fields
          if (!row['Full Name']) errors.push('Full Name is required');
          if (!row['Email']) errors.push('Email is required');
          if (row['Email'] && !row['Email'].endsWith('@atdawntech.com')) {
            errors.push('Email must be from @atdawntech.com domain');
          }

          return {
            _rowIndex: index + 2, // +2 for header row and 0-based index
            _errors: errors,
            employee_code: row['Employee Code'] || '',
            full_name: row['Full Name'] || '',
            email: row['Email'] || '',
            job_title: row['Job Title'] || '',
            department: row['Department'] || '',
            location: row['Location'] || 'IN',
            manager_id: '', // Will need to be mapped separately
            joined_on: row['Date of Joining'] || '',
            is_active: row['Active'] !== 'No' && row['Active'] !== 'false',
          } as ParsedEmployee;
        });

        setParsedData(parsed);
        setIsProcessing(false);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to parse file. Please check the format.',
          variant: 'destructive',
        });
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const handleUpload = async () => {
    setIsProcessing(true);
    
    // Filter out rows with errors
    const validRows = parsedData.filter(row => row._errors.length === 0);
    
    try {
      // TODO: Implement bulk employee creation
      console.log('Uploading employees:', validRows);
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate upload
      
      toast({
        title: 'Success',
        description: `${validRows.length} employees uploaded successfully`,
      });
      
      setUploadComplete(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload employees',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Employee Code': 'EMP001',
        'Full Name': 'John Doe',
        'Email': 'john.doe@atdawntech.com',
        'Job Title': 'Software Engineer',
        'Department': 'Engineering',
        'Location': 'IN',
        'Date of Joining': '2024-01-15',
        'Active': 'Yes',
      },
    ];

    const ws = utils.json_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Employees');
    
    // Create and download file
    writeFile(wb, 'employee_template.xlsx');
    // File is automatically downloaded
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setUploadComplete(false);
    setIsProcessing(false);
  };

  const validRows = parsedData.filter(row => row._errors.length === 0);
  const errorRows = parsedData.filter(row => row._errors.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Employees</DialogTitle>
          <DialogDescription>
            Upload employee data from CSV or Excel file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!file && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {isDragActive
                    ? 'Drop the file here...'
                    : 'Drag & drop a file here, or click to select'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Supports CSV, XLS, and XLSX files
                </p>
              </div>

              <div className="text-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>
          )}

          {file && !uploadComplete && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    {file.name}
                  </CardTitle>
                  <CardDescription>
                    {parsedData.length} rows found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {validRows.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Valid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {errorRows.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {parsedData.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {errorRows.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-5 w-5" />
                      Validation Errors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {errorRows.map((row) => (
                        <div key={row._rowIndex} className="text-sm">
                          <Badge variant="destructive" className="mr-2">
                            Row {row._rowIndex}
                          </Badge>
                          {row._errors.join(', ')}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={reset}>
                  Start Over
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={validRows.length === 0 || isProcessing}
                >
                  {isProcessing ? 'Uploading...' : `Upload ${validRows.length} Employees`}
                </Button>
              </div>
            </div>
          )}

          {uploadComplete && (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Complete!</h3>
              <p className="text-muted-foreground mb-4">
                {validRows.length} employees have been successfully uploaded.
              </p>
              <div className="space-x-2">
                <Button variant="outline" onClick={reset}>
                  Upload More
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}