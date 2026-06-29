import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Activity, Users, FileSpreadsheet, 
  Bell, LogOut, ChevronRight, Search, 
  Menu, X, Sparkles 
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  permission?: string;
  roles?: string[];
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Ctrl+K keyboard shortcut listener for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const menuItems: SidebarItem[] = [
    {
      name: 'Analytics Dashboard',
      path: '/dashboard',
      icon: Activity,
      roles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'DATA_ANALYST'],
    },
    {
      name: 'Patient Management',
      path: '/patients',
      icon: Users,
      permission: 'patients:read',
    },
    {
      name: 'Risk Engine',
      path: '/predictions',
      icon: Sparkles,
      permission: 'predictions:read',
    },
    {
      name: 'Audit Trail',
      path: '/audit-logs',
      icon: FileSpreadsheet,
      permission: 'audit_logs:read',
    },
    {
      name: 'Alert Center',
      path: '/notifications',
      icon: Bell,
    },
  ];

  // Filter items user can access
  const allowedItems = menuItems.filter((item) => {
    if (item.permission && !user?.permissions.includes(item.permission) && user?.role !== 'SUPER_ADMIN') {
      return false;
    }
    if (item.roles && !item.roles.includes(user?.role || '')) {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/patients?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-background text-primary flex">
      {/* 1. SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-background-card border-r border-border transform transition-transform lg:translate-x-0 lg:static lg:flex lg:flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-healthcare-cyan/15 p-1.5 rounded text-healthcare-cyan">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-bold text-white tracking-wide">PulseFlow AI</span>
          </Link>
          <button className="lg:hidden text-primary-muted hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {allowedItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all ${
                  isActive 
                    ? 'bg-background-hover text-white font-medium border-l-2 border-healthcare-cyan' 
                    : 'text-primary-muted hover:bg-background-hover/55 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-healthcare-cyan' : 'text-primary-muted'}`} />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
              </Link>
            );
          })}
        </nav>

        {/* User profile footer section */}
        <div className="p-4 border-t border-border bg-background/30 flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-border-accent flex items-center justify-center text-xs font-bold text-healthcare-cyan">
              {user?.firstName[0]}{user?.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-primary-muted uppercase tracking-wider truncate">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center space-x-2 text-xs text-primary-muted hover:text-healthcare-rose transition-colors py-1.5 px-3 rounded hover:bg-healthcare-rose/5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header toolbar */}
        <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-background-card/50 backdrop-blur">
          <div className="flex items-center space-x-4">
            <button className="lg:hidden text-primary-muted hover:text-white" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative max-w-xs w-64">
              <Search className="w-4 h-4 text-primary-muted absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search patient MRN... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-background/50 border border-border rounded-md text-primary focus:outline-none focus:border-border-accent"
              />
            </form>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/notifications" className="relative p-1.5 rounded-lg text-primary-muted hover:text-white hover:bg-background-hover transition-colors">
              <Bell className="w-4.5 h-4.5" />
              {/* Badge dot */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-healthcare-rose rounded-full ring-2 ring-background-card" />
            </Link>
            <div className="w-px h-6 bg-border hidden sm:block" />
            <span className="text-xs text-primary-muted hidden sm:inline-block">Metro General Hospital</span>
          </div>
        </header>

        {/* Viewport page container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* 3. CMD+K COMMAND PALETTE MODAL */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4">
          <div className="bg-background-card border border-border max-w-lg w-full rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border flex items-center space-x-3">
              <Search className="w-4 h-4 text-healthcare-cyan" />
              <input
                type="text"
                placeholder="Search command palette or search patient MRN..."
                className="w-full bg-transparent border-none text-sm text-white focus:outline-none p-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val) {
                      navigate(`/patients?search=${encodeURIComponent(val)}`);
                      setShowCommandPalette(false);
                    }
                  }
                }}
              />
              <span className="text-[10px] bg-border px-1.5 py-0.5 rounded text-primary-muted font-mono">ESC</span>
            </div>
            <div className="p-2 space-y-1 text-xs">
              <p className="text-primary-muted px-3 py-1 uppercase tracking-wider text-[10px] font-semibold">Navigate Shortcuts</p>
              <button 
                onClick={() => { navigate('/dashboard'); setShowCommandPalette(false); }} 
                className="w-full text-left px-3 py-2 rounded-md hover:bg-background-hover text-white flex items-center space-x-2"
              >
                <Activity className="w-3.5 h-3.5 text-healthcare-cyan" />
                <span>Go to Dashboard</span>
              </button>
              <button 
                onClick={() => { navigate('/patients'); setShowCommandPalette(false); }} 
                className="w-full text-left px-3 py-2 rounded-md hover:bg-background-hover text-white flex items-center space-x-2"
              >
                <Users className="w-3.5 h-3.5 text-healthcare-teal" />
                <span>Go to Patients Registry</span>
              </button>
              <button 
                onClick={() => { navigate('/predictions'); setShowCommandPalette(false); }} 
                className="w-full text-left px-3 py-2 rounded-md hover:bg-background-hover text-white flex items-center space-x-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-healthcare-amber" />
                <span>Go to AI Risk Dashboards</span>
              </button>
              <button 
                onClick={() => { navigate('/audit-logs'); setShowCommandPalette(false); }} 
                className="w-full text-left px-3 py-2 rounded-md hover:bg-background-hover text-white flex items-center space-x-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-healthcare-sky" />
                <span>Go to Compliance Audits</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DashboardLayout;
