import { Link, useLocation } from 'react-router-dom';
import { Home, Activity, History, TrendingUp, Users, Settings, LogOut } from 'lucide-react';
import { logout } from '../utils/mockData';
import { useNavigate } from 'react-router-dom';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/track', icon: Activity, label: 'Track' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
    { to: '/friends', icon: Users, label: 'Friends' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 bg-zinc-900 border-r border-zinc-800 p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl text-white">PushUp Tracker</span>
      </div>

      <div className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-colors mt-auto absolute bottom-6 w-52"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>
    </nav>
  );
}
