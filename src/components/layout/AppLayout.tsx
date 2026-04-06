import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';
import { AIChatAssistant } from '@/components/ai/AIChatAssistant';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto scrollbar-hide">
          <Outlet />
        </main>
      </div>
      <AIChatAssistant />
    </div>
  );
}
