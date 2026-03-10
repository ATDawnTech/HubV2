# Component Architecture Guide

## 🏗️ Component Structure Overview

### Component Hierarchy

```
App.tsx (Root)
├── AuthProvider (Context)
├── QueryClientProvider (TanStack Query)
├── TooltipProvider
├── Toaster (Toast notifications)
├── Sonner (Toast notifications)
└── BrowserRouter
    └── Routes
        ├── Public Routes
        │   ├── Index (Landing)
        │   └── Auth (Login/Signup)
        └── Protected Routes
            ├── Dashboard
            ├── ATS Module
            ├── Onboarding Module
            ├── Employee Management
            ├── Productivity Module
            └── Asset Management
```

---

## 📦 Module Breakdown

### 1. ATS (Applicant Tracking System) Module

**Location**: `src/pages/ats/` & `src/components/ats/`

#### Pages
```
/ats/requisitions          → AtsRequisitions.tsx
/ats/requisitions/:id      → AtsRequisitionDetail.tsx
/ats/candidates            → AtsCandidates.tsx (Kanban)
/ats/candidates/:id        → AtsCandidateDetail.tsx
/ats/interviews            → AtsInterviews.tsx
/ats/offers                → AtsOffers.tsx
/ats/reports               → AtsReports.tsx
/ats/settings              → AtsSettings.tsx
```

#### Key Components

**KanbanBoard** (`src/components/kanban/KanbanBoard.tsx`)
```typescript
<KanbanBoard>
  ├── FiltersSidebar
  │   ├── Search input
  │   ├── Requisition filter
  │   ├── Source filter
  │   └── Date range filter
  ├── StageColumn (multiple)
  │   ├── Stage header
  │   ├── Candidate count
  │   └── CandidateCard (draggable)
  │       ├── Avatar
  │       ├── Name & email
  │       ├── Current company
  │       ├── Resume score badge
  │       └── Quick actions
  └── AddStageDialog
```

**CandidateDrawer** (`src/components/kanban/CandidateDrawer.tsx`)
```typescript
<CandidateDrawer>
  ├── Tabs
  │   ├── Overview Tab
  │   │   ├── Basic info
  │   │   ├── Resume viewer
  │   │   ├── AI summary
  │   │   └── Proficiencies
  │   ├── Activity Tab
  │   │   └── ActivityTimeline
  │   ├── Interviews Tab
  │   │   └── InterviewManagement
  │   ├── Feedback Tab
  │   │   └── FeedbackTab
  │   └── Comments Tab
  │       └── Comment list with visibility controls
  └── Actions
      ├── Move stage
      ├── Schedule interview
      └── Update status
```

**InterviewManagement** (`src/components/InterviewManagement.tsx`)
```typescript
<InterviewManagement>
  ├── Interview list
  │   └── Interview card
  │       ├── Date/time
  │       ├── Type badge
  │       ├── Interviewer info
  │       ├── Meeting link
  │       └── Status badge
  └── Schedule dialog
      ├── Date picker
      ├── Time picker
      ├── Interview type select
      ├── Interviewer select
      └── Teams meeting toggle
```

---

### 2. Onboarding Module

**Location**: `src/pages/` & `src/components/`

#### Pages
```
/onboarding-section        → OnboardingSection.tsx (Overview)
/onboarding/templates      → OnboardingTemplates.tsx
/onboarding/:candidateId   → OnboardingWorkspace.tsx
/tasks                     → MyTasks.tsx
```

#### Key Components

**OnboardingWorkspace** (`src/pages/OnboardingWorkspace.tsx`)
```typescript
<OnboardingWorkspace>
  ├── Header
  │   ├── Candidate info
  │   ├── Progress bar
  │   └── Journey status
  ├── Tabs
  │   ├── Tasks Tab
  │   │   └── OnboardingTasksGrid
  │   │       └── OnboardingTaskCard (multiple)
  │   └── Timeline Tab
  │       └── TaskGraph (DAG visualization)
  └── Actions
      ├── Add task
      └── Complete journey
```

**OnboardingTaskCard** (`src/components/OnboardingTaskCard.tsx`)
```typescript
<OnboardingTaskCard>
  ├── Header
  │   ├── Task title
  │   ├── Status badge
  │   └── Due date
  ├── Body
  │   ├── Description
  │   ├── Owner info
  │   ├── Task type icon
  │   └── Dependencies indicator
  ├── Actions
  │   ├── Mark complete
  │   ├── Add comment
  │   ├── Upload attachment
  │   └── Request approval
  └── Attachments list
```

**TaskGraph** (`src/components/TaskGraph.tsx`)
```typescript
<TaskGraph>
  └── ReactFlow
      ├── Custom nodes (tasks)
      │   ├── Node label
      │   ├── Status indicator
      │   └── Progress badge
      └── Edges (dependencies)
          └── Animated flow
```

---

### 3. Employee Management Module

**Location**: `src/pages/EmployeeManagement.tsx` & `src/components/employee/`

#### Structure
```typescript
<EmployeeManagement>
  ├── Tabs
  │   ├── Employee Records Tab
  │   │   └── EmployeeRecords
  │   │       ├── Data table
  │   │       ├── Search & filters
  │   │       ├── Bulk upload button
  │   │       └── Add employee button
  │   └── Skills & Certifications Tab
  │       └── SkillsAndCertifications
  │           ├── Skills catalog
  │           ├── Employee skills matrix
  │           └── Certifications list
  └── Dialogs
      ├── EmployeeEditDialog
      │   ├── Basic info form
      │   ├── Department select
      │   ├── Location select
      │   └── Rate card input
      └── BulkUploadDialog
          ├── File upload
          ├── Template download
          └── Preview table
```

**EmployeeRecords** (`src/components/employee/EmployeeRecords.tsx`)
```typescript
<EmployeeRecords>
  ├── Toolbar
  │   ├── Search input
  │   ├── Department filter
  │   ├── Location filter
  │   └── Action buttons
  ├── DataTable
  │   ├── Columns
  │   │   ├── Avatar
  │   │   ├── Name
  │   │   ├── Email
  │   │   ├── Department
  │   │   ├── Location
  │   │   ├── Skills count
  │   │   └── Actions
  │   └── Pagination
  └── Row actions
      ├── Edit
      ├── View skills
      └── Manage certifications
```

---

### 4. Productivity Management Module

**Location**: `src/pages/ProductivityManagement.tsx` & `src/components/productivity/`

#### Structure
```typescript
<ProductivityManagement>
  ├── Tabs
  │   ├── Projects Tab
  │   │   └── ProjectsManagement
  │   │       ├── Project list
  │   │       ├── Project card
  │   │       └── ProjectEditDialog
  │   ├── Timesheets Tab
  │   │   └── TimesheetsManagement
  │   │       ├── Calendar view
  │   │       ├── Timesheet entries
  │   │       └── Approval workflow
  │   ├── Project Costing Tab
  │   │   └── ProjectCostingManagement
  │   │       ├── Project members
  │   │       ├── Bill rates
  │   │       └── Allocation percentages
  │   └── Employees Tab
  │       └── EmployeesManagement
  │           ├── Employee list
  │           └── Base rate management
```

**ProjectEditDialog** (`src/components/ProjectEditDialog.tsx`)
```typescript
<ProjectEditDialog>
  ├── Form
  │   ├── Project name
  │   ├── Client
  │   ├── Status select
  │   ├── Date range picker
  │   ├── Budget input
  │   └── Description textarea
  └── Actions
      ├── Save
      └── Cancel
```

**ProjectMembersDrawer** (`src/components/ProjectMembersDrawer.tsx`)
```typescript
<ProjectMembersDrawer>
  ├── Header
  │   ├── Project name
  │   └── Add member button
  ├── Members list
  │   └── Member card
  │       ├── Avatar
  │       ├── Name
  │       ├── Role
  │       ├── Bill rate
  │       ├── Allocation %
  │       └── Remove button
  └── Summary
      ├── Total allocation
      └── Total cost
```

---

### 5. Asset Management Module

**Location**: `src/pages/AssetManagement.tsx` & `src/components/AssetManagement/`

#### Structure
```typescript
<AssetManagement>
  ├── Toolbar
  │   ├── Search
  │   ├── Asset type filter
  │   ├── Status filter
  │   └── Create asset button
  ├── DataTable
  │   ├── Columns
  │   │   ├── Asset type
  │   │   ├── Brand/Model
  │   │   ├── Serial number
  │   │   ├── Status badge
  │   │   ├── Assigned to
  │   │   ├── Warranty expiry
  │   │   └── Actions
  │   └── Pagination
  └── Dialogs
      ├── CreateAssetDialog
      │   ├── Asset type select
      │   ├── Brand/Model inputs
      │   ├── Serial number
      │   ├── Purchase date
      │   └── Warranty expiry
      ├── ViewAssetDialog
      │   ├── Asset details
      │   ├── Assignment history
      │   └── Change history
      └── AssetChangeHistory
          └── Timeline of changes
```

---

## 🎨 Shared UI Components

### Base Components (`src/components/ui/`)

All components from shadcn/ui:

**Form Components**
- `Input` - Text input with variants
- `Textarea` - Multi-line text input
- `Select` - Dropdown select
- `Checkbox` - Checkbox input
- `Switch` - Toggle switch
- `RadioGroup` - Radio button group
- `Slider` - Range slider
- `Calendar` - Date picker
- `DatePicker` - Date selection

**Layout Components**
- `Card` - Container with header/content/footer
- `Tabs` - Tabbed interface
- `Accordion` - Collapsible sections
- `Separator` - Divider line
- `ScrollArea` - Scrollable container
- `ResizablePanel` - Resizable layout

**Overlay Components**
- `Dialog` - Modal dialog
- `Sheet` - Slide-out panel
- `Drawer` - Bottom drawer
- `Popover` - Floating popover
- `HoverCard` - Hover tooltip
- `Tooltip` - Simple tooltip
- `ContextMenu` - Right-click menu
- `DropdownMenu` - Dropdown menu

**Feedback Components**
- `Toast` - Toast notification
- `Sonner` - Toast notification (alternative)
- `Alert` - Alert message
- `AlertDialog` - Confirmation dialog
- `Progress` - Progress bar
- `Skeleton` - Loading skeleton

**Data Display**
- `Table` - Data table
- `DataTable` - Advanced data table with sorting/filtering
- `Badge` - Status badge
- `Avatar` - User avatar
- `Chart` - Recharts wrapper

**Navigation**
- `Button` - Button with variants
- `NavigationMenu` - Navigation menu
- `Menubar` - Menu bar
- `Breadcrumb` - Breadcrumb navigation
- `Pagination` - Pagination controls

---

## 🔧 Custom Shared Components

### ActivityTimeline (`src/components/ActivityTimeline.tsx`)
```typescript
<ActivityTimeline candidateId={id}>
  ├── Activity list
  │   └── Activity item
  │       ├── Icon (based on type)
  │       ├── Description
  │       ├── Actor name
  │       ├── Timestamp
  │       └── Seen indicator
  └── Load more button
```

**Props**:
- `candidateId: string` - Candidate UUID
- `showSeenStatus?: boolean` - Show seen/unseen indicators

**Activity Types**:
- `stage_change` - Application stage changed
- `interview_scheduled` - Interview scheduled
- `feedback_submitted` - Feedback submitted
- `comment_added` - Comment added
- `status_updated` - Status updated

---

### FeedbackTab (`src/components/FeedbackTab.tsx`)
```typescript
<FeedbackTab candidateId={id}>
  ├── Feedback list
  │   └── Feedback card
  │       ├── Reviewer info
  │       ├── Overall score
  │       ├── Recommendation badge
  │       ├── Detailed scores
  │       │   └── Score item
  │       │       ├── Criterion
  │       │       ├── Score (1-5)
  │       │       └── Comments
  │       └── Notes
  └── Add feedback button
      └── Feedback form dialog
          ├── Overall score slider
          ├── Recommendation select
          ├── Criteria scores
          └── Notes textarea
```

---

### FileUpload (`src/components/FileUpload.tsx`)
```typescript
<FileUpload
  onUpload={handleUpload}
  accept=".pdf,.doc,.docx"
  maxSize={10 * 1024 * 1024}
>
  ├── Dropzone
  │   ├── Upload icon
  │   ├── Instructions
  │   └── File restrictions
  ├── File preview
  │   ├── File name
  │   ├── File size
  │   └── Remove button
  └── Upload progress
```

---

### ImageCrop (`src/components/ImageCrop.tsx`)
```typescript
<ImageCrop
  src={imageUrl}
  onCropComplete={handleCrop}
  aspect={1}
>
  ├── ReactCrop
  │   └── Image with crop overlay
  ├── Zoom slider
  └── Actions
      ├── Crop & save
      └── Cancel
```

---

### UserMentionTextarea (`src/components/UserMentionTextarea.tsx`)
```typescript
<UserMentionTextarea
  value={comment}
  onChange={setComment}
  placeholder="Add a comment..."
>
  ├── Textarea
  └── Mention dropdown
      └── User list
          └── User item
              ├── Avatar
              ├── Name
              └── Email
```

**Features**:
- Type `@` to trigger mention dropdown
- Search users by name
- Insert mention as `@[Name](user_id)`

---

## 🎯 Component Patterns

### 1. Data Fetching Pattern (TanStack Query)

```typescript
// In component
const { data, isLoading, error } = useQuery({
  queryKey: ['candidates', filters],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('ats_candidates')
      .select('*')
      .eq('status', 'active');
    
    if (error) throw error;
    return data;
  }
});

// Mutation
const mutation = useMutation({
  mutationFn: async (newCandidate) => {
    const { data, error } = await supabase
      .from('ats_candidates')
      .insert(newCandidate)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['candidates']);
    toast.success('Candidate created');
  }
});
```

---

### 2. Form Pattern (React Hook Form + Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
    }
  });

  const onSubmit = (data: FormData) => {
    // Handle submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

---

### 3. Protected Route Pattern

```typescript
// Admin-only route
<Route
  path="/admin"
  element={
    <ProtectedAdminRoute>
      <AdminPage />
    </ProtectedAdminRoute>
  }
/>

// ProtectedAdminRoute component
function ProtectedAdminRoute({ children }) {
  const { isAdmin, loading } = useAdminAccess();

  if (loading) return <LoadingSpinner />;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  
  return children;
}
```

---

### 4. Real-time Subscription Pattern

```typescript
useEffect(() => {
  const subscription = supabase
    .channel('interviews')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ats_interviews',
      filter: `interviewer_id=eq.${user.id}`
    }, (payload) => {
      // Invalidate queries or update state
      queryClient.invalidateQueries(['interviews']);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [user.id]);
```

---

### 5. Drag & Drop Pattern (@hello-pangea/dnd)

```typescript
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function KanbanBoard() {
  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    // Update candidate stage
    updateCandidateStage(
      result.draggableId,
      result.destination.droppableId
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {stages.map(stage => (
        <Droppable key={stage.id} droppableId={stage.id}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {candidates.map((candidate, index) => (
                <Draggable
                  key={candidate.id}
                  draggableId={candidate.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <CandidateCard candidate={candidate} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ))}
    </DragDropContext>
  );
}
```

---

## 🎨 Styling Conventions

### Tailwind CSS Classes
- Use utility-first approach
- Responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Dark mode: `dark:` prefix
- Hover states: `hover:` prefix
- Focus states: `focus:` prefix

### Common Patterns
```typescript
// Card container
<Card className="p-6 space-y-4">

// Flex layout
<div className="flex items-center justify-between gap-4">

// Grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Button variants
<Button variant="default | destructive | outline | secondary | ghost | link">

// Badge variants
<Badge variant="default | secondary | destructive | outline">

// Text styles
<h1 className="text-3xl font-bold">
<p className="text-sm text-muted-foreground">
```

---

## 📱 Responsive Design

### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile-First Approach
```typescript
// Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-4">

// Hide on mobile, show on desktop
<div className="hidden md:block">

// Full width on mobile, fixed width on desktop
<div className="w-full md:w-96">
```

---

## 🧪 Testing Considerations

### Component Testing
- Test user interactions
- Test form validation
- Test API error states
- Test loading states
- Test empty states

### Accessibility
- Use semantic HTML
- Add ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support

---

**Last Updated**: January 2026
