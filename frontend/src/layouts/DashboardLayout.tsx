import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Clock, Send, LogOut, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { ComposePanel } from '../components/ComposePanel';
import { api } from '../lib/api';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const { data: scheduledData } = useQuery({
    queryKey: ['emails', 'scheduled', 'count'],
    queryFn: async () => {
      const res = await api.get('/emails?status=scheduled&limit=1');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const { data: sentData } = useQuery({
    queryKey: ['emails', 'sent', 'count'],
    queryFn: async () => {
      const res = await api.get('/emails?status=sent&limit=1');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const scheduledCount = scheduledData?.total;
  const sentCount = sentData?.total;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-full bg-[#f9fafb]">
      {/* Sidebar */}
      <aside className="w-[280px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-gray-100">
          <span className="text-xl font-bold tracking-tight text-gray-900">ReachInbox</span>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-[#4CAF50] font-bold text-lg shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900">{user?.name}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Compose Button */}
        <div className="px-6 pb-6">
          <Button
            variant="secondary"
            fullWidth
            className="justify-center gap-2 font-semibold shadow-sm"
            onClick={() => setIsComposeOpen(true)}
          >
            <Edit className="h-4 w-4" />
            Compose
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4">
          <p className="px-2 pb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
            Core
          </p>
          <nav className="flex flex-col gap-1">
            <NavLink
              to="/dashboard?tab=scheduled"
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive || window.location.search.includes('scheduled') || !window.location.search
                  ? 'bg-[#E8F5E9] text-[#4CAF50]'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4" />
                Scheduled
              </div>
              {scheduledCount !== undefined && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  {scheduledCount}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/dashboard?tab=sent"
              className={() =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${window.location.search.includes('sent')
                  ? 'bg-[#E8F5E9] text-[#4CAF50]'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Send className="h-4 w-4" />
                Sent
              </div>
              {sentCount !== undefined && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                  {sentCount}
                </span>
              )}
            </NavLink>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Outlet />
      </main>

      <ComposePanel isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} />
    </div>
  );
};
