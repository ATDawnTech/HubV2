import { Outlet, Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Menu from './Menu';
import { cn } from '@/lib/utils';
import { BreadcrumbProvider, useBreadcrumbContext } from './BreadcrumbContext';

function HeaderContent() {
  const { signOut, user } = useAuth();
  const { breadcrumbs } = useBreadcrumbContext();

  return (
    <>
      <div className="flex-1 flex items-center gap-2">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />}
            {item.href ? (
              <Link
                to={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  item.active
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'text-sm font-medium',
                  item.active || index === breadcrumbs.length - 1
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
            WELCOME BACK
          </p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-height-none">
            {user?.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="flex items-center border border-slate-200 dark:border-slate-800 gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors h-10 px-4"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-semibold">Sign Out</span>
        </Button>
      </div>
    </>
  );
}

import React from 'react';

export default function MainLayout() {
  return (
    <BreadcrumbProvider>
      <div className="flex min-h-screen bg-white dark:bg-slate-950">
        <Menu />

        <div
          className={cn(
            'flex-1 flex flex-col min-h-screen transition-all duration-300 min-w-0',
            'ml-80'
          )}
        >
          <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white dark:bg-gray-900 px-8">
            <HeaderContent />
          </header>
          <main className="flex-1 p-8 bg-slate-50/50 dark:bg-slate-950">
            <Outlet />
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
