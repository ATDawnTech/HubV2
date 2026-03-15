import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { InboxButton } from "./InboxButton";
import { UserProfileMenu } from "./UserProfileMenu";
import { RoleTesterMenu } from "./RoleTesterMenu";

export function Layout(): JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Global top bar — visible on every page */}
        <header className="flex h-14 flex-shrink-0 items-center justify-end gap-2 border-b border-border bg-card px-4">
          <RoleTesterMenu />
          <InboxButton />
          <NotificationBell />
          <UserProfileMenu />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
