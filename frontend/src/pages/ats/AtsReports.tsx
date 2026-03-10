import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, Users, Clock, Target } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AtsReports = () => {
  // Mock data for charts
  const hiringData = [
    { month: 'Jan', hires: 12, applications: 156 },
    { month: 'Feb', hires: 8, applications: 142 },
    { month: 'Mar', hires: 15, applications: 189 },
    { month: 'Apr', hires: 10, applications: 167 },
    { month: 'May', hires: 18, applications: 203 },
    { month: 'Jun', hires: 14, applications: 178 },
  ];

  const sourceData = [
    { name: 'LinkedIn', value: 45, color: '#0066cc' },
    { name: 'Job Boards', value: 30, color: '#00cc66' },
    { name: 'Referrals', value: 20, color: '#ff9900' },
    { name: 'Direct', value: 5, color: '#cc0066' },
  ];

  const stageData = [
    { stage: 'Applied', count: 340 },
    { stage: 'Screened', count: 156 },
    { stage: 'Interview', count: 78 },
    { stage: 'Offer', count: 24 },
    { stage: 'Hired', count: 18 },
  ];

  return (
    <div className="py-8 px-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ATS Reports</h1>
          <p className="text-muted-foreground">Analytics and insights for hiring performance</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="mr-2 h-4 w-4" />
              Total Hires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">77</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12% from last quarter
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Time to Hire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <div className="text-xs text-muted-foreground">days average</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.3%</div>
            <div className="text-xs text-muted-foreground">application to hire</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cost per Hire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,240</div>
            <div className="text-xs text-muted-foreground">including sourcing costs</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hiring Trends</CardTitle>
            <CardDescription>Monthly hires vs applications</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hiringData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Applications"
                />
                <Line
                  type="monotone"
                  dataKey="hires"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Hires"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Candidate Sources</CardTitle>
            <CardDescription>Where candidates are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hiring Funnel</CardTitle>
            <CardDescription>Candidate progression through stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Sources</CardTitle>
            <CardDescription>Best sources by conversion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sourceData.map((source) => (
                <div key={source.name} className="flex items-center justify-between">
                  <span className="font-medium">{source.name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(source.value / 45) * 100}%`,
                          backgroundColor: source.color,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground">{source.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Hiring</CardTitle>
            <CardDescription>Hires by department this quarter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { dept: 'Engineering', hires: 28, budget: 35 },
                { dept: 'Sales', hires: 15, budget: 20 },
                { dept: 'Marketing', hires: 8, budget: 10 },
                { dept: 'Product', hires: 12, budget: 15 },
                { dept: 'Operations', hires: 6, budget: 8 },
              ].map((dept) => (
                <div key={dept.dept} className="flex items-center justify-between">
                  <span className="font-medium">{dept.dept}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">
                      {dept.hires}/{dept.budget}
                    </span>
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(dept.hires / dept.budget) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
