import { Outlet } from 'react-router-dom';

import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-24 md:pb-0">
        <div className="px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </div>
      <BottomNav />
    </div>
  );
};
