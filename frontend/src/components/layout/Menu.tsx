import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Menu as AntdMenu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

export default function Menu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAdminAccess();
  const { theme, setTheme } = useTheme();

  // Find the active key based on the pathname
  // We remove the leading slash and match it against our keys
  const currentPath = location.pathname.startsWith('/')
    ? location.pathname.substring(1)
    : location.pathname;
  const activeKey = currentPath || 'dashboard';
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // Keep the parent menu open if a child is selected
  useEffect(() => {
    if (activeKey.includes('/')) {
      const parentKey = activeKey.split('/')[0];
      setOpenKeys([parentKey]);
    }
  }, [activeKey]);

  const toggleDarkMode = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const menuItems = [
    {
      key: 'dashboard',
      label: <span className="font-medium sidebar-label whitespace-nowrap ml-2">Dashboard</span>,
      icon: <span className="material-symbols-outlined flex-shrink-0">dashboard</span>,
    },
    import.meta.env.VITE_HIDE_MENU === 'false' && {
      key: 'intake',
      label: <span className="font-medium sidebar-label whitespace-nowrap ml-2">Intake</span>,
      icon: <span className="material-symbols-outlined flex-shrink-0">assignment</span>,
    },
    import.meta.env.VITE_HIDE_MENU === 'false' && {
      key: 'ats/requisitions',
      label: <span className="font-medium sidebar-label whitespace-nowrap ml-2">ATS Tracking</span>,
      icon: <span className="material-symbols-outlined flex-shrink-0">track_changes</span>,
    },
    import.meta.env.VITE_HIDE_MENU === 'false' && {
      key: 'onboarding',
      label: <span className="font-medium sidebar-label whitespace-nowrap ml-2">Onboarding</span>,
      icon: <span className="material-symbols-outlined flex-shrink-0">group_add</span>,
      children: [
        {
          key: 'onboarding/candidates',
          label: 'New Candidates',
        },
        {
          key: 'onboarding/templates',
          label: 'Templates',
        },
        {
          key: 'onboarding/my-tasks',
          label: 'My Tasks',
        },
        {
          key: 'onboarding/owner-groups',
          label: 'Owner Groups',
        },
      ],
    },
    import.meta.env.VITE_HIDE_MENU === 'false' &&
      isAdmin && {
        key: 'employee-management',
        label: <span className="font-medium sidebar-label whitespace-nowrap ml-2">Employees</span>,
        icon: <span className="material-symbols-outlined flex-shrink-0">badge</span>,
      },
    import.meta.env.VITE_HIDE_MENU === 'false' &&
      isAdmin && {
        key: 'asset',
        label: <span className="font-medium sidebar-label whitespace-nowrap ml-2">Assets</span>,
        icon: <span className="material-symbols-outlined flex-shrink-0">inventory_2</span>,
        children: [
          {
            key: 'asset',
            label: 'Asset Management',
          },
          {
            key: 'asset/category-settings',
            label: 'Category Settings',
          },
        ],
      },
    import.meta.env.VITE_HIDE_MENU === 'false' &&
      isAdmin && {
        key: 'productivity',
        label: (
          <span className="font-medium sidebar-label whitespace-nowrap ml-2">Productivity</span>
        ),
        icon: <span className="material-symbols-outlined flex-shrink-0">rocket_launch</span>,
      },
    {
      key: 'account',
      label: (
        <span className="font-medium sidebar-label whitespace-nowrap ml-2">Account Management</span>
      ),
      icon: <span className="material-symbols-outlined flex-shrink-0">settings</span>,
    },
  ].filter(Boolean);

  const onMenuClick = (e: any) => {
    navigate(`/${e.key}`);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-slate-800 z-50 sidebar-transition flex flex-col overflow-hidden',
        'w-80'
      )}
      id="sidebar"
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 h-16 min-w-[320px]">
        <div className="flex items-center gap-3 overflow-hidden">
          <img alt="ADT Logo" className="h-8 w-auto min-w-[32px] flex-shrink-0" src="/logo.png" />
          <span className="font-bold text-lg sidebar-label whitespace-nowrap text-slate-900 dark:text-white">
            ADT Hub
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-5 px-2 space-y-1 min-w-[320px]">
        <AntdMenu
          items={menuItems as any}
          onClick={onMenuClick}
          mode="inline"
          selectedKeys={[activeKey]}
          openKeys={openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          className="custom-sidebar-menu"
        />
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 min-w-[320px]">
        <button
          className="flex items-center gap-4 w-full px-3 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={toggleDarkMode}
        >
          <span className="material-symbols-outlined flex-shrink-0">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
          <span className="font-medium sidebar-label whitespace-nowrap">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>
    </aside>
  );
}
