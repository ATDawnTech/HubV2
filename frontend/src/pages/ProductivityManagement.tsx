import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, Calendar, DollarSign } from 'lucide-react';
import { ProjectsManagement } from '@/components/productivity/ProjectsManagement';
import { EmployeesManagement } from '@/components/productivity/EmployeesManagement';
import { TimesheetsManagement } from '@/components/productivity/TimesheetsManagement';
import { ProjectCostingManagement } from '@/components/productivity/ProjectCostingManagement';
import { useAdminAccess } from '@/hooks/useAdminAccess';

export default function ProductivityManagement() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminAccess();
  // Show loading state while checking authorization
  if (loading) {
    return (
      <div className="py-8 px-12">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Redirect non-admin users
  if (!isAdmin) {
    return (
      <div className="py-8 px-12">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have permission to access the Productivity Management section. This area is
              restricted to administrators only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="py-8 px-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Productivity Management</h1>
              <p className="text-muted-foreground">
                Track projects, employees, and utilization metrics
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="costing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Project P&L
            </TabsTrigger>
            <TabsTrigger value="timesheets" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timesheets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Projects Overview</CardTitle>
                <CardDescription>
                  Manage projects, assign team members, and track profitability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectsManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Management</CardTitle>
                <CardDescription>
                  Manage employee rates and view utilization metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmployeesManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project P&L</CardTitle>
                <CardDescription>
                  Manage project-employee assignments and calculate margins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectCostingManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timesheets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Timesheet Management</CardTitle>
                <CardDescription>Submit, approve, and export timesheets</CardDescription>
              </CardHeader>
              <CardContent>
                <TimesheetsManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
