import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Activity, History, TrendingUp, Users, Settings, LogOut, Menu, X } from 'lucide-react';
import { logOut } from '../services/authService';
import { useSidebar } from '../context/SidebarContext';
import { useIsMobile } from './ui/use-mobile';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, isCollapsed, toggleSidebar, closeSidebar, toggleCollapse } = useSidebar();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/track', icon: Activity, label: 'Track' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
    { to: '/friends', icon: Users, label: 'Friends' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;
    
    const content = (
      <Link
        to={item.to}
        onClick={() => isMobile && closeSidebar()}
        className={`flex items-center gap-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
        } ${
          isCollapsed && !isMobile
            ? 'justify-center p-3' 
            : 'px-4 py-3'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {(!isCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
      </Link>
    );

    if (isCollapsed && !isMobile) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  const NavContent = () => (
    <>
      <div className={`flex items-center gap-3 mb-8 ${isCollapsed && !isMobile ? 'justify-center' : ''}`}>
        <button
          onClick={isMobile ? closeSidebar : toggleCollapse}
          className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity shrink-0"
          aria-label={isMobile ? 'Close sidebar' : isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isMobile ? (
            <X className="w-6 h-6 text-white" />
          ) : isCollapsed ? (
            <Activity className="w-6 h-6 text-white" />
          ) : (
            <X className="w-6 h-6 text-white" />
          )}
        </button>
        {(!isCollapsed || isMobile) && (
          <span className="text-xl text-white font-semibold">PushUp Tracker</span>
        )}
      </div>

      <div className="space-y-1 flex-1">
        {navItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </div>

      <button
        onClick={() => {
          handleLogout();
          isMobile && closeSidebar();
        }}
        className={`flex items-center gap-3 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-colors mt-auto ${
          isCollapsed && !isMobile
            ? 'justify-center p-3' 
            : 'px-4 py-3 w-full'
        }`}
      >
        <LogOut className="w-5 h-5 shrink-0" />
        {(!isCollapsed || isMobile) && <span>Logout</span>}
      </button>
    </>
  );

  // Mobile: Use Sheet (drawer)
  if (isMobile) {
    return (
      <>
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:bg-zinc-800 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Sheet open={isOpen} onOpenChange={(open) => {
          if (open) {
            // Sheet is being opened
          } else {
            closeSidebar();
          }
        }}>
          <SheetContent side="left" className="w-64 bg-zinc-900 border-zinc-800 p-6">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <NavContent />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: ChatGPT-style collapsible sidebar (always visible)
  return (
    <TooltipProvider>
      <nav
        className={`fixed left-0 top-0 h-screen bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ease-in-out flex flex-col ${
          isCollapsed 
            ? 'w-16 p-3' 
            : 'w-64 p-6'
        }`}
      >
        <NavContent />
      </nav>
    </TooltipProvider>
  );
}
