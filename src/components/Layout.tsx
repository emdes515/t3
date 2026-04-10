import React from 'react';
import { User, FileText, LayoutDashboard, Radar, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { t } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  setView: (view: any) => void;
  onLogout: () => void;
  user: any;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, onLogout, user }) => {
  const { appLanguage } = useStore();

  const navItems = [
    { id: 'profile', label: t('masterProfile', appLanguage), icon: User },
    { id: 'radar', label: 'Radar Ofert', icon: Radar },
    { id: 'creator', label: t('cvCreator', appLanguage), icon: FileText },
    { id: 'tracker', label: t('tracker', appLanguage), icon: LayoutDashboard },
    { id: 'settings', label: t('settings', appLanguage), icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-black/5 bg-white flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <h1 className="text-2xl font-display font-bold text-accent tracking-tighter uppercase">
            TailorCV
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-accent text-white shadow-md'
                  : 'text-black/60 hover:text-black hover:bg-black/5'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-black/5">
          <div className="flex items-center space-x-3 px-4 py-3 mb-4">
            <img src={user?.photoURL} alt="" className="w-8 h-8 rounded-full border border-black/10" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName}</p>
              <p className="text-xs text-black/40 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">{t('logout', appLanguage)}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-8 w-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};
