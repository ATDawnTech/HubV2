from ..base import Base
from .assets import Asset, AssetAssignmentHistory, AssetAttachment
from .ats import (
    Application,
    AtsCandidate,
    CandidateActivity,
    Interview,
    InterviewAssignment,
    InterviewFeedback,
    Requisition,
    RequisitionSkill,
)
from .audit import AuditEvent
from .auth import OAuthState, OneTimeCode
from .config_tables import (
    AssetCategory,
    ConfigDropdown,
    EntraGroupRoleMapping,
    GroupMember,
    NotificationModuleToggle,
    NotificationSettings,
    OwnerGroup,
    Permission,
    Role,
    RoleAssignment,
    RoleGrantPermission,
    SkillsCatalog,
    SystemSetting,
)
from .employees import (
    Employee,
    EmployeeAttachment,
    EmployeeCertification,
    EmployeeEmergencyContact,
    EmployeeProjectHistory,
    EmployeeRate,
    EmployeeSkill,
    OffboardingTask,
)
from .intake import IntakeApproval, IntakeAudit, IntakeRecord, IntakeSkill
from .onboarding import (
    Approval,
    OnboardingJourney,
    OnboardingTask,
    OnboardingTaskDependency,
    OnboardingTaskTemplate,
    OnboardingTaskTemplateDependency,
    OnboardingTemplate,
    TaskAttachment,
    TaskSlaEvent,
)
from .projects import Project, ProjectMember
from .tasks import DashboardTask
from .timesheets import FxRate, Holiday, Leave, Timesheet

__all__ = [
    "Base",
    "Employee", "EmployeeSkill", "EmployeeCertification", "EmployeeRate",
    "EmployeeEmergencyContact", "EmployeeAttachment", "EmployeeProjectHistory", "OffboardingTask",
    "SkillsCatalog", "AssetCategory", "Role", "Permission", "RoleAssignment", "RoleGrantPermission",
    "ConfigDropdown", "SystemSetting", "OwnerGroup", "GroupMember",
    "NotificationSettings", "NotificationModuleToggle", "EntraGroupRoleMapping",
    "IntakeRecord", "IntakeSkill", "IntakeApproval", "IntakeAudit",
    "OnboardingTemplate", "OnboardingTaskTemplate", "OnboardingTaskTemplateDependency",
    "OnboardingJourney", "OnboardingTask", "OnboardingTaskDependency",
    "TaskSlaEvent", "TaskAttachment", "Approval",
    "Asset", "AssetAttachment", "AssetAssignmentHistory",
    "Project", "ProjectMember",
    "Timesheet", "FxRate", "Holiday", "Leave",
    "AtsCandidate", "Requisition", "RequisitionSkill", "Application",
    "Interview", "InterviewAssignment", "InterviewFeedback", "CandidateActivity",
    "AuditEvent",
    "DashboardTask",
    "OAuthState", "OneTimeCode",
]
