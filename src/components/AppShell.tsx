'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import BottomNav from './BottomNav';
import ResearchScheduler from './research/ResearchScheduler';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { loaded, surveyorName } = useSettings();
  const pathname = usePathname();
  const router = useRouter();

  const isLogin = pathname === '/login';
  const isOffline = pathname === '/offline';

  useEffect(() => {
    if (!loaded || isOffline) return;
    if (!surveyorName && !isLogin) router.replace('/login');
    if (surveyorName && isLogin) router.replace('/');
  }, [loaded, surveyorName, isLogin, isOffline, router]);

  if (isOffline) return <>{children}</>;

  if (!loaded) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted">
        Loading…
      </div>
    );
  }

  if (!surveyorName || isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex-1 overflow-hidden">{children}</div>
      <BottomNav />
      <ResearchScheduler />
    </div>
  );
}
