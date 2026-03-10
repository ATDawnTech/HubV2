import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Survey from '@/pages/Survey';
import EditIntake from '@/pages/EditIntake';
import Dashboard from '@/pages/Dashboard';
import IntakeSection from '@/pages/IntakeSection';
import AccountSection from '@/pages/AccountSection';
import Candidates from '@/pages/Candidates';
import OnboardingTemplates from '@/pages/OnboardingTemplates';
import OnboardingWorkspace from '@/pages/OnboardingWorkspace';
import OfferPreboarding from '@/pages/OfferPreboarding';
import Settings from '@/pages/Settings';
import OwnerGroupsManagement from '@/pages/OwnerGroupsManagement';
import ProductivityManagement from '@/pages/ProductivityManagement';
import EmployeeManagement from '@/pages/EmployeeManagement';
import AssetManagement from '@/pages/Asset/AssetManagement';
import CategorySettings from '@/pages/Asset/CategorySettings';
import NotFound from '@/pages/NotFound';
import { ProtectedAdminRoute } from '@/components/ProtectedAdminRoute';
import { AtsRequisitions } from '@/pages/ats/AtsRequisitions';
import { AtsRequisitionDetail } from '@/pages/ats/AtsRequisitionDetail';
import { AtsCandidates } from '@/pages/ats/AtsCandidates';
import { AtsCandidateDetail } from '@/pages/ats/AtsCandidateDetail';
import { AtsInterviews } from '@/pages/ats/AtsInterviews';
import { AtsOffers } from '@/pages/ats/AtsOffers';
import { AtsReports } from '@/pages/ats/AtsReports';
import { AtsSettings } from '@/pages/ats/AtsSettings';
import TestSession from '@/pages/TestSession';
import TestPreview from '@/pages/TestPreview';
import MainLayout from '@/components/layout/MainLayout';
import CandidateDetail from './pages/Onboarding/CandidateDetail';
import MyTasks from './pages/Onboarding/MyTasks';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/test/:token" element={<TestSession />} />

            {/* Protected Routes with Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/survey" element={<Survey />} />
              <Route path="/edit-intake/:id" element={<EditIntake />} />
              <Route path="/intake" element={<IntakeSection />} />
              <Route path="/account" element={<AccountSection />} />
              <Route path="/onboarding/candidates" element={<Candidates />} />
              <Route path="/onboarding/candidates/:id" element={<CandidateDetail />} />
              <Route path="/onboarding/templates" element={<OnboardingTemplates />} />
              <Route path="/onboarding/my-tasks" element={<MyTasks />} />
              <Route path="/onboarding/owner-groups" element={<OwnerGroupsManagement />} />
              <Route path="/onboarding/:candidateId" element={<OnboardingWorkspace />} />
              <Route path="/onboarding/:candidateId/offer" element={<OfferPreboarding />} />
              <Route path="/settings" element={<Settings />} />

              {/* Admin Routes */}
              <Route
                path="/employee-management"
                element={
                  <ProtectedAdminRoute>
                    <EmployeeManagement />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/asset"
                element={
                  <ProtectedAdminRoute>
                    <Outlet />
                  </ProtectedAdminRoute>
                }
              >
                <Route index element={<AssetManagement />} />
                <Route path="category-settings" element={<CategorySettings />} />
              </Route>
              <Route
                path="/productivity"
                element={
                  <ProtectedAdminRoute>
                    <ProductivityManagement />
                  </ProtectedAdminRoute>
                }
              />

              {/* ATS Routes */}
              <Route path="/ats/requisitions" element={<AtsRequisitions />} />
              <Route path="/ats/requisitions/:id" element={<AtsRequisitionDetail />} />
              <Route path="/ats/candidates" element={<AtsCandidates />} />
              <Route path="/ats/candidates/:id" element={<AtsCandidateDetail />} />
              <Route path="/ats/interviews" element={<AtsInterviews />} />
              <Route path="/ats/offers" element={<AtsOffers />} />
              <Route path="/ats/reports" element={<AtsReports />} />
              <Route path="/ats/settings" element={<AtsSettings />} />

              <Route path="/test/preview/:templateId" element={<TestPreview />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
