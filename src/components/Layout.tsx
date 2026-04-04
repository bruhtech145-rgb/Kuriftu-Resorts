import React from 'react';
import { LogOut, User, LayoutDashboard, Calendar, MessageSquare, Menu, X } from 'lucide-react';
import { Member } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

interface LayoutProps {
  user: any;
  member: Member | null;
  isAdmin: boolean;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export default function Layout({ user, member, isAdmin, onLogout, activeTab, onTabChange, children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'concierge', label: 'Concierge', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-stone-100 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-serif text-xl">K</span>
          </div>
          <span className="font-serif text-xl text-stone-900">Kuriftu</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                activeTab === item.id
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              )}
            >
              <item.icon size={20} className={clsx(activeTab === item.id ? "" : "group-hover:scale-110 transition-transform")} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-stone-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center text-stone-600 font-bold">
              {(member?.full_name || user?.email || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{member?.full_name || user?.email}</p>
              <p className="text-xs text-stone-500 truncate">{member?.loyalty_tier || 'Explorer'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-100 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-900 rounded flex items-center justify-center">
            <span className="text-white font-serif text-lg">K</span>
          </div>
          <span className="font-serif text-lg text-stone-900">Kuriftu</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-stone-600">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-50 px-2 py-2">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                activeTab === item.id
                  ? "text-stone-900"
                  : "text-stone-400"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[70] p-6 lg:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-serif text-xl">K</span>
                  </div>
                  <span className="font-serif text-xl text-stone-900">Kuriftu</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-stone-600">
                  <X size={24} />
                </button>
              </div>
              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { onTabChange(item.id); setIsSidebarOpen(false); }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      activeTab === item.id
                        ? "bg-stone-900 text-white"
                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                    )}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="mt-auto pt-6 border-t border-stone-100 absolute bottom-6 left-6 right-6">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-stone-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-10 mt-16 lg:mt-0 mb-20 lg:mb-0">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
