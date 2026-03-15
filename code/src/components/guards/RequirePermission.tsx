import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/ui/AccessDenied";

interface RequirePermissionProps {
  module?: string;
  action?: string;
  anyInModule?: string;
  /** Skip the permission check entirely when true (e.g. impersonating test user). */
  bypass?: boolean;
  children: React.ReactNode;
}

export function RequirePermission({
  module,
  action,
  anyInModule,
  bypass = false,
  children,
}: RequirePermissionProps): JSX.Element | null {
  const { hasPermission, hasAnyPermissionInModule, isLoading, isImpersonating } = usePermissions();

  if (bypass) return <>{children}</>;
  // While impersonating, allow navigation so the user can reach the Role Tester
  // to assign themselves roles before permissions take effect.
  if (isImpersonating) return <>{children}</>;
  if (isLoading) return null;

  const allowed =
    module && action
      ? hasPermission(module, action)
      : anyInModule
        ? hasAnyPermissionInModule(anyInModule)
        : true;

  if (!allowed) return <AccessDenied />;

  return <>{children}</>;
}
