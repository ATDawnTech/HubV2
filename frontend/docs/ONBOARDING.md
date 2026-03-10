# AT Dawn Technologies - Talent Hub Onboarding Guide

## 📋 Project Overview

**AT Dawn Technologies Talent Hub** is a comprehensive HR and workforce management platform built with modern web technologies. The platform handles the complete employee lifecycle from recruitment to productivity management.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS + Radix UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: @hello-pangea/dnd
- **Charts**: Recharts
- **Document Processing**: mammoth, docx, jspdf, xlsx

---

## 🏗️ Architecture Overview

### Application Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── ats/            # ATS-specific components
│   ├── employee/       # Employee management components
│   ├── kanban/         # Kanban board components
│   ├── productivity/   # Productivity tracking components
│   └── AssetManagement/# Asset management components
├── pages/              # Route pages
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── integrations/       # External integrations (Supabase)
├── lib/                # Utility libraries
├── schemas/            # Zod validation schemas
└── utils/              # Helper functions

supabase/
├── migrations/         # Database migrations (130+ files)
└── functions/          # Edge functions
```

### Authentication Flow
- **Provider**: Supabase Auth with email/password
- **Domain Restriction**: Only `@atdawntech.com` emails allowed
- **Session Management**: Persistent sessions with auto-refresh
- **Protected Routes**: Role-based access control (RBAC)

**Auth Hook**: `src/hooks/useAuth.tsx`
```typescript
const { user, session, loading, signIn, signUp, signOut } = useAuth();
```

---

## 🗄️ Database Schema

### Core Tables

#### 1. **Profiles** (User Management)
```sql
profiles
├── user_id (PK, FK to auth.users)
├── full_name
├── email
├── role (admin, user, etc.)
├── ats_role (ADMIN, TA_ADMIN, HIRING_MANAGER, INTERVIEWER)
├── department
├── location
└── avatar_url
```

#### 2. **ATS (Applicant Tracking System)**

**Requisitions** (Job Openings)
```sql
requisitions
├── id (PK)
├── title
├── dept
├── location
├── employment_type (full_time, part_time, contract, internship)
├── description
├── min_experience / max_experience
├── skills (text[])
├── status (draft, open, on_hold, closed)
├── hiring_manager_id (FK to profiles)
├── linkedin_job_id
└── timestamps
```

**ATS Candidates**
```sql
ats_candidates
├── id (PK)
├── full_name
├── email (UNIQUE)
├── phone
├── location
├── source (LinkedIn, Referral, Job Board)
├── current_company / current_title
├── resume_url (Supabase Storage)
├── linkedin_profile
├── resume_score (AI-generated)
├── resume_analysis (JSONB)
├── ai_summary
└── timestamps
```

**Applications** (Candidate ↔ Requisition)
```sql
applications
├── id (PK)
├── candidate_id (FK)
├── requisition_id (FK)
├── stage (sourced, screen, manager, panel, offer, hired, rejected)
├── status (active, on_hold, rejected, withdrawn, hired)
├── owner_id (TA owner)
└── timestamps
```

**Interviews**
```sql
ats_interviews
├── id (PK)
├── application_id (FK)
├── candidate_id (FK)
├── requisition_id (FK)
├── interview_type (screen, technical, behavioral, panel, final)
├── interviewer_id (FK to profiles)
├── scheduled_start / scheduled_end
├── meeting_link
├── teams_meeting_id
├── status (scheduled, completed, cancelled, rescheduled)
└── timestamps
```

**Feedback**
```sql
feedback
├── id (PK)
├── candidate_id (FK)
├── author_id (FK)
├── overall_percent
├── recommendation (strong_yes, yes, leaning_yes, no, strong_no)
├── notes
└── status

feedback_scores
├── feedback_id (FK)
├── criterion
├── score
└── comments
```

#### 3. **Onboarding System**

**Onboarding Templates**
```sql
onboarding_templates
├── id (PK)
├── name
├── description
└── is_active

onboarding_task_templates
├── id (PK)
├── template_id (FK)
├── title
├── description
├── task_type (form, approval, document, system)
├── owner_type (user, group)
├── sequence_order
└── estimated_days
```

**Onboarding Journeys** (Instances)
```sql
onboarding_journeys
├── id (PK)
├── candidate_id (FK)
├── template_id (FK)
├── status (not_started, in_progress, completed)
└── timestamps

onboarding_tasks
├── id (PK)
├── journey_id (FK)
├── title
├── description
├── task_type
├── status (pending, in_progress, completed, blocked)
├── owner_user_id / owner_group_id
├── due_date
└── completion_data (JSONB)
```

#### 4. **Employee Management**

**Employee Skills**
```sql
skills_catalog
├── id (PK)
├── name (UNIQUE)
├── category
└── description

employee_skills
├── user_id (FK)
├── skill_id (FK)
├── level (1-5)
└── years
```

**Employee Certifications**
```sql
employee_certifications
├── id (PK)
├── user_id (FK)
├── name
├── authority
├── credential_id
├── issued_on / expires_on
└── timestamps
```

#### 5. **Productivity Management**

**Projects**
```sql
projects
├── id (PK)
├── name
├── client
├── status (active, on_hold, completed)
├── start_date / end_date
├── budget
└── timestamps

project_members
├── project_id (FK)
├── user_id (FK)
├── role
├── bill_rate_usd
└── allocation_percent
```

**Timesheets**
```sql
timesheets
├── id (PK)
├── project_id (FK)
├── user_id (FK)
├── date
├── hours
├── description
└── status (draft, submitted, approved)
```

#### 6. **Asset Management**

**Assets**
```sql
assets
├── id (PK)
├── asset_type (laptop, phone, monitor, etc.)
├── brand / model
├── serial_number (UNIQUE)
├── status (available, assigned, maintenance, retired)
├── assigned_to (FK to profiles)
├── purchase_date / warranty_expiry
└── timestamps
```

---

## 🔐 Row Level Security (RLS)

Supabase RLS policies enforce data access control:

### ATS Role Hierarchy
```typescript
enum ats_role {
  ADMIN,        // Full access
  TA_ADMIN,     // Talent Acquisition admin
  HIRING_MANAGER, // Access to own requisitions
  INTERVIEWER   // Access to assigned interviews only
}
```

### Key RLS Patterns
- **Admins**: Full access to all tables
- **TA_ADMIN**: Manage all ATS operations
- **HIRING_MANAGER**: Access only to their requisitions and related data
- **INTERVIEWER**: View assigned interviews and candidates only
- **Compensation Data**: Restricted to ADMIN, TA_ADMIN, and HIRING_MANAGER only

---

## 🛣️ Application Routes

### Public Routes
- `/` - Landing page
- `/auth` - Login/Signup

### Protected Routes (Require Authentication)
- `/dashboard` - Main dashboard
- `/survey` - Hiring survey
- `/intake` - Intake section
- `/onboarding-section` - Onboarding overview
- `/account` - User account settings
- `/candidates` - Candidate list
- `/candidates/:id/offer` - Offer & preboarding
- `/onboarding/templates` - Onboarding templates
- `/onboarding/:candidateId` - Onboarding workspace
- `/tasks` - My tasks
- `/settings` - Application settings
- `/groups` - Owner groups management

### Admin-Only Routes
- `/employee-management` - Employee records & skills
- `/asset-management` - IT asset tracking
- `/productivity` - Project & timesheet management

### ATS Routes
- `/ats/requisitions` - Job requisitions
- `/ats/requisitions/:id` - Requisition detail
- `/ats/candidates` - ATS candidates (Kanban view)
- `/ats/candidates/:id` - Candidate detail
- `/ats/interviews` - Interview scheduling
- `/ats/offers` - Offer management
- `/ats/reports` - ATS analytics
- `/ats/settings` - ATS configuration

### Test Routes
- `/test/:token` - External test session
- `/test/preview/:templateId` - Test preview

---

## 📡 API Integration (Supabase)

### Client Setup
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

### Common Query Patterns

**Fetch with Relations**
```typescript
const { data, error } = await supabase
  .from('applications')
  .select(`
    *,
    candidate:ats_candidates(*),
    requisition:requisitions(*),
    owner:profiles(*)
  `)
  .eq('status', 'active');
```

**Insert with RLS**
```typescript
const { data, error } = await supabase
  .from('ats_candidates')
  .insert({
    full_name: 'John Doe',
    email: 'john@example.com',
    source: 'LinkedIn'
  })
  .select()
  .single();
```

**Real-time Subscriptions**
```typescript
const subscription = supabase
  .channel('interviews')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'ats_interviews'
  }, (payload) => {
    console.log('Interview updated:', payload);
  })
  .subscribe();
```

### Storage (File Uploads)
```typescript
// Upload resume
const { data, error } = await supabase.storage
  .from('resumes')
  .upload(`${candidateId}/resume.pdf`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('resumes')
  .getPublicUrl(path);
```

---

## 🎨 UI Components

### shadcn/ui Components
The project uses shadcn/ui for base components:
- Button, Input, Select, Checkbox, Switch
- Dialog, Sheet, Drawer, Popover
- Table, DataTable, Pagination
- Card, Badge, Avatar
- Toast, Sonner (notifications)
- Form (with React Hook Form integration)

### Custom Components

**Kanban Board** (`src/components/kanban/`)
- Drag-and-drop candidate pipeline
- Stage management
- Filters sidebar

**Activity Timeline** (`src/components/ActivityTimeline.tsx`)
- Real-time activity feed
- Seen/unseen tracking

**Interview Management** (`src/components/InterviewManagement.tsx`)
- Schedule interviews
- Teams meeting integration
- Interviewer assignment

**Task Graph** (`src/components/TaskGraph.tsx`)
- DAG visualization for task dependencies
- Built with @xyflow/react

---

## 🔧 Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Variables
Create `.env` file:
```env
VITE_SUPABASE_URL=https://wfxpuzgtqbmobfyakcrg.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Migrations
```bash
# Run migrations (via Supabase CLI)
supabase db push

# Reset database
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## 📊 Key Features by Module

### 1. ATS (Applicant Tracking System)
- ✅ Requisition management with LinkedIn integration
- ✅ Candidate sourcing and tracking
- ✅ Kanban board for pipeline visualization
- ✅ Interview scheduling with Teams integration
- ✅ Feedback collection and scoring
- ✅ AI-powered resume analysis
- ✅ Role-based access control
- ✅ Activity timeline and audit logs

### 2. Onboarding
- ✅ Template-based onboarding workflows
- ✅ Task assignment (user/group owners)
- ✅ Approval workflows
- ✅ Document uploads
- ✅ External completion links
- ✅ Progress tracking
- ✅ DAG visualization for dependencies

### 3. Employee Management
- ✅ Employee records with profiles
- ✅ Skills catalog and proficiency tracking
- ✅ Certifications management
- ✅ Bulk upload via Excel
- ✅ Rate card management

### 4. Productivity Management
- ✅ Project tracking
- ✅ Timesheet submission and approval
- ✅ Project costing and billing rates
- ✅ Multi-currency support (FX rates)
- ✅ Holiday calendar
- ✅ Leave management

### 5. Asset Management
- ✅ IT asset inventory
- ✅ Assignment tracking
- ✅ Change history
- ✅ Warranty management
- ✅ Status tracking (available, assigned, maintenance, retired)

---

## 🔍 Common Queries & Patterns

### Get Current User Profile
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();
```

### Check Admin Access
```typescript
// Hook: src/hooks/useAdminAccess.tsx
const { isAdmin, loading } = useAdminAccess();
```

### Check ATS Role
```typescript
// Hook: src/hooks/useAtsAccess.tsx
const { hasAtsRole, isAdmin, isTaAdmin } = useAtsAccess();
```

### Fetch Employees with Skills
```typescript
const { data } = await supabase
  .from('profiles')
  .select(`
    *,
    employee_skills(
      *,
      skill:skills_catalog(*)
    ),
    employee_certifications(*)
  `);
```

### Create Onboarding Journey from Template
```typescript
// 1. Create journey
const { data: journey } = await supabase
  .from('onboarding_journeys')
  .insert({
    candidate_id,
    template_id,
    status: 'not_started'
  })
  .select()
  .single();

// 2. Copy tasks from template
const { data: templateTasks } = await supabase
  .from('onboarding_task_templates')
  .select('*')
  .eq('template_id', template_id);

const tasks = templateTasks.map(t => ({
  journey_id: journey.id,
  title: t.title,
  description: t.description,
  task_type: t.task_type,
  owner_user_id: t.owner_user_id,
  owner_group_id: t.owner_group_id,
  sequence_order: t.sequence_order,
  status: 'pending'
}));

await supabase.from('onboarding_tasks').insert(tasks);
```

---

## 📈 Sequence Diagrams

### 1. Candidate Application Flow
```
User → Create Requisition
  ↓
TA Admin → Source Candidate
  ↓
System → Create Application (candidate + requisition)
  ↓
TA Admin → Move through stages (sourced → screen → manager → panel)
  ↓
Hiring Manager → Schedule Interviews
  ↓
Interviewers → Submit Feedback
  ↓
Hiring Manager → Make Offer
  ↓
System → Trigger Onboarding
```

### 2. Onboarding Workflow
```
HR → Create Onboarding Template
  ↓
HR → Define Tasks (form, approval, document, system)
  ↓
System → Candidate Hired (trigger)
  ↓
System → Create Journey from Template
  ↓
System → Assign Tasks to Owners (users/groups)
  ↓
Owners → Complete Tasks
  ↓
System → Track Progress
  ↓
System → Mark Journey Complete
```

### 3. Interview Scheduling
```
Hiring Manager → Create Interview
  ↓
System → Assign Interviewer(s)
  ↓
System → Generate Teams Meeting (optional)
  ↓
System → Send Notifications
  ↓
Interviewer → Conduct Interview
  ↓
Interviewer → Submit Feedback & Scores
  ↓
Hiring Manager → Review Feedback
  ↓
System → Update Application Stage
```

---

## 🚀 Roadmap (Future Enhancements)

See `docs/roadmap.md` for detailed roadmap.

### High Priority
- Leave & Holiday Calendar (multi-region)
- Organizational Chart (interactive hierarchy)
- Notifications Center (centralized task management)

### Medium Priority
- Learning & Training tracking
- Security & Compliance (policy acknowledgment, SOC2)
- Bench & Allocation Management

### Low Priority
- OKRs & Performance Management
- Vendor & Contractor Management
- Advanced Integrations (Slack, Jira, Google Drive, SSO)

---

## 📚 Additional Resources

### Key Files to Review
1. `src/App.tsx` - Application routing
2. `src/hooks/useAuth.tsx` - Authentication logic
3. `src/integrations/supabase/types.ts` - Database types (2886 lines)
4. `supabase/migrations/20250904072849_*.sql` - ATS schema
5. `src/components/kanban/KanbanBoard.tsx` - Kanban implementation

### Useful Commands
```bash
# Generate Supabase types
npx supabase gen types typescript --project-id wfxpuzgtqbmobfyakcrg > src/integrations/supabase/types.ts

# Run specific migration
supabase migration up <migration_file>

# View database schema
supabase db dump --schema public
```

---

## 🤝 Getting Help

- **Documentation**: Check `docs/` folder
- **Database Schema**: Review migration files in `supabase/migrations/`
- **Component Examples**: Browse `src/components/` for patterns
- **Type Definitions**: Refer to `src/integrations/supabase/types.ts`

---

**Last Updated**: January 2026
**Version**: 0.0.0
**Maintainer**: AT Dawn Technologies
