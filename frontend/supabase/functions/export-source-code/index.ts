import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting source code export...');

    // Define all the files to include in the export
    const sourceFiles = [
      // Root configuration files
      'package.json',
      'vite.config.ts',
      'tailwind.config.ts',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
      'eslint.config.js',
      'postcss.config.js',
      'components.json',
      'index.html',
      'README.md',
      
      // Source files
      'src/main.tsx',
      'src/App.tsx',
      'src/App.css',
      'src/index.css',
      'src/vite-env.d.ts',
      
      // Hooks
      'src/hooks/useAuth.tsx',
      'src/hooks/useAuthz.tsx',
      'src/hooks/useAdminAccess.tsx',
      'src/hooks/useEmployees.tsx',
      'src/hooks/use-mobile.tsx',
      'src/hooks/use-toast.ts',
      
      // Pages
      'src/pages/Index.tsx',
      'src/pages/Auth.tsx',
      'src/pages/AuthCallback.tsx',
      'src/pages/Dashboard.tsx',
      'src/pages/AccountSection.tsx',
      'src/pages/IntakeSection.tsx',
      'src/pages/OnboardingSection.tsx',
      'src/pages/OnboardingTemplates.tsx',
      'src/pages/OnboardingWorkspace.tsx',
      'src/pages/Candidates.tsx',
      'src/pages/MyTasks.tsx',
      'src/pages/OfferPreboarding.tsx',
      'src/pages/OwnerGroupsManagement.tsx',
      'src/pages/ProductivityManagement.tsx',
      'src/pages/EmployeeManagement.tsx',
      'src/pages/Settings.tsx',
      'src/pages/Survey.tsx',
      'src/pages/Config.tsx',
      'src/pages/NotFound.tsx',
      
      // Components
      'src/components/FileUpload.tsx',
      'src/components/ImageCrop.tsx',
      'src/components/OnboardingTaskCard.tsx',
      'src/components/OnboardingTasksGrid.tsx',
      'src/components/ProjectEditDialog.tsx',
      'src/components/ProjectMembersDrawer.tsx',
      'src/components/SurveyDetailDialog.tsx',
      'src/components/TaskGraph.tsx',
      'src/components/WorkflowStepCard.tsx',
      'src/components/ThemeProvider.tsx',
      'src/components/ThemeToggle.tsx',
      'src/components/ProtectedAdminRoute.tsx',
      
      // Employee components
      'src/components/employee/BulkUploadDialog.tsx',
      'src/components/employee/EmployeeEditDialog.tsx',
      'src/components/employee/EmployeeRecords.tsx',
      'src/components/employee/SkillsAndCertifications.tsx',
      
      // Productivity components
      'src/components/productivity/EmployeesManagement.tsx',
      'src/components/productivity/ProjectCostingManagement.tsx',
      'src/components/productivity/ProjectsManagement.tsx',
      'src/components/productivity/TimesheetsManagement.tsx',
      
      // UI Components
      'src/components/ui/accordion.tsx',
      'src/components/ui/alert.tsx',
      'src/components/ui/alert-dialog.tsx',
      'src/components/ui/aspect-ratio.tsx',
      'src/components/ui/avatar.tsx',
      'src/components/ui/badge.tsx',
      'src/components/ui/breadcrumb.tsx',
      'src/components/ui/button.tsx',
      'src/components/ui/calendar.tsx',
      'src/components/ui/card.tsx',
      'src/components/ui/carousel.tsx',
      'src/components/ui/chart.tsx',
      'src/components/ui/checkbox.tsx',
      'src/components/ui/collapsible.tsx',
      'src/components/ui/command.tsx',
      'src/components/ui/context-menu.tsx',
      'src/components/ui/data-table.tsx',
      'src/components/ui/dialog.tsx',
      'src/components/ui/drawer.tsx',
      'src/components/ui/dropdown-menu.tsx',
      'src/components/ui/form.tsx',
      'src/components/ui/hover-card.tsx',
      'src/components/ui/input.tsx',
      'src/components/ui/input-otp.tsx',
      'src/components/ui/label.tsx',
      'src/components/ui/menubar.tsx',
      'src/components/ui/navigation-menu.tsx',
      'src/components/ui/pagination.tsx',
      'src/components/ui/popover.tsx',
      'src/components/ui/progress.tsx',
      'src/components/ui/radio-group.tsx',
      'src/components/ui/resizable.tsx',
      'src/components/ui/scroll-area.tsx',
      'src/components/ui/select.tsx',
      'src/components/ui/separator.tsx',
      'src/components/ui/sheet.tsx',
      'src/components/ui/sidebar.tsx',
      'src/components/ui/skeleton.tsx',
      'src/components/ui/slider.tsx',
      'src/components/ui/sonner.tsx',
      'src/components/ui/switch.tsx',
      'src/components/ui/table.tsx',
      'src/components/ui/tabs.tsx',
      'src/components/ui/textarea.tsx',
      'src/components/ui/toast.tsx',
      'src/components/ui/toaster.tsx',
      'src/components/ui/toggle.tsx',
      'src/components/ui/toggle-group.tsx',
      'src/components/ui/tooltip.tsx',
      'src/components/ui/use-toast.ts',
      
      // Utilities and libraries
      'src/lib/utils.ts',
      'src/lib/supa.ts',
      'src/utils/exportUtils.ts',
      'src/schemas/index.ts',
      'src/schemas/employee.ts',
      'src/integrations/supabase/client.ts',
      'src/integrations/supabase/types.ts',
      
      // Supabase configuration
      'supabase/config.toml'
    ];

    let exportContent = '';
    exportContent += `# ADT Hub - Complete Source Code Export\n`;
    exportContent += `Generated on: ${new Date().toISOString()}\n`;
    exportContent += `Project: ADT Hub - Talent Management System\n\n`;
    exportContent += `## Deployment Instructions\n\n`;
    exportContent += `1. Extract all files to your project directory\n`;
    exportContent += `2. Install dependencies: \`npm install\` or \`bun install\`\n`;
    exportContent += `3. Set up Supabase project and update client configuration\n`;
    exportContent += `4. Run database migrations from the exported SQL files\n`;
    exportContent += `5. Deploy edge functions to your Supabase project\n`;
    exportContent += `6. Start development server: \`npm run dev\` or \`bun dev\`\n\n`;
    exportContent += `## Project Structure\n\n`;
    exportContent += `This is a React + TypeScript application with:\n`;
    exportContent += `- Frontend: React, TypeScript, Tailwind CSS, shadcn/ui\n`;
    exportContent += `- Backend: Supabase (PostgreSQL, Auth, Edge Functions)\n`;
    exportContent += `- Build Tool: Vite\n\n`;
    exportContent += `${'='.repeat(80)}\n\n`;

    // Read each file and add it to the export
    for (const filePath of sourceFiles) {
      try {
        const fileContent = await Deno.readTextFile(filePath);
        exportContent += `## File: ${filePath}\n`;
        exportContent += `${'='.repeat(50)}\n`;
        exportContent += fileContent;
        exportContent += `\n\n`;
        console.log(`Successfully read file: ${filePath}`);
      } catch (error) {
        console.log(`Skipping ${filePath}: ${error.message}`);
        exportContent += `## File: ${filePath}\n`;
        exportContent += `${'='.repeat(50)}\n`;
        exportContent += `// File not found or could not be read\n\n`;
      }
    }

    // Add database schema export
    exportContent += `## Database Schema & Migrations\n`;
    exportContent += `${'='.repeat(50)}\n`;
    exportContent += `// To get the complete database schema and migrations:\n`;
    exportContent += `// 1. Export your Supabase database schema using: supabase db dump\n`;
    exportContent += `// 2. Copy all migration files from supabase/migrations/\n`;
    exportContent += `// 3. Export edge functions from supabase/functions/\n\n`;

    // Try to read migration files
    try {
      const migrationFiles = [];
      for await (const dirEntry of Deno.readDir('supabase/migrations')) {
        if (dirEntry.isFile && dirEntry.name.endsWith('.sql')) {
          migrationFiles.push(dirEntry.name);
        }
      }
      
      for (const migrationFile of migrationFiles) {
        try {
          const migrationContent = await Deno.readTextFile(`supabase/migrations/${migrationFile}`);
          exportContent += `### Migration: ${migrationFile}\n`;
          exportContent += `${'-'.repeat(30)}\n`;
          exportContent += migrationContent;
          exportContent += `\n\n`;
        } catch (error) {
          console.log(`Could not read migration file ${migrationFile}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`Could not read migrations directory: ${error.message}`);
    }

    // Try to read edge functions
    try {
      const functionDirs = [];
      for await (const dirEntry of Deno.readDir('supabase/functions')) {
        if (dirEntry.isDirectory) {
          functionDirs.push(dirEntry.name);
        }
      }
      
      for (const functionDir of functionDirs) {
        try {
          const functionContent = await Deno.readTextFile(`supabase/functions/${functionDir}/index.ts`);
          exportContent += `### Edge Function: ${functionDir}\n`;
          exportContent += `${'-'.repeat(30)}\n`;
          exportContent += functionContent;
          exportContent += `\n\n`;
        } catch (error) {
          console.log(`Could not read function ${functionDir}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`Could not read functions directory: ${error.message}`);
    }

    console.log('Source code export completed successfully');

    return new Response(exportContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="adt-hub-source-code-${new Date().toISOString().split('T')[0]}.txt"`
      },
    });

  } catch (error) {
    console.error('Error in export-source-code function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to export source code',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});