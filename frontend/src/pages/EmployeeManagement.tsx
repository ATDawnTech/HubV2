import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmployeeRecords } from '@/components/employee/EmployeeRecords';
import { SkillsAndCertifications } from '@/components/employee/SkillsAndCertifications';
import { Users, Award, ArrowLeft } from 'lucide-react';

export default function EmployeeManagement() {
  const navigate = useNavigate();

  return (
    <div className="py-8 px-12">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4"></div>
        <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Manage employee records, skills, and certifications
        </p>
      </div>

      <Tabs defaultValue="records" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="records" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Employee Records
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Skills & Certifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Records</CardTitle>
              <CardDescription>
                Manage employee information, departments, and organizational structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeRecords />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skills & Certifications</CardTitle>
              <CardDescription>
                Manage employee skills, expertise levels, and professional certifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SkillsAndCertifications />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
