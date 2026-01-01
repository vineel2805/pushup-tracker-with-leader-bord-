import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Activity, History, TrendingUp, Users, Settings, LogOut, Menu, X, User, HelpCircle } from 'lucide-react';
import { logOut } from '../services/authService';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from './ui/use-mobile';
import { Sheet, SheetContent, SheetTitle } from './ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { InitialsAvatar } from './InitialsAvatar';
import { subscribeToFriendRequests, FriendRequest } from '../services/firestoreService';
import { useEffect, useState } from 'react';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen, isCollapsed, toggleSidebar, closeSidebar, toggleCollapse } = useSidebar();
  const { currentUser, userProfile } = useAuth();
  const isMobile = useIsMobile();
  const [pendingFriendRequests, setPendingFriendRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToFriendRequests(currentUser.uid, (requests) => {
      setPendingFriendRequests(requests);
    });

    return () => unsubscribe();
  }, [currentUser]);

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
    { to: '/friends', icon: Users, label: 'Friends', badgeCount: pendingFriendRequests.length },
  ];

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;
    const hasBadge = Boolean(item.badgeCount && item.badgeCount > 0);
    
    const content = (
      <Link
        to={item.to}
        onClick={() => isMobile && closeSidebar()}
        className={`flex items-center gap-3 rounded-lg transition-colors relative ${
          isActive
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
        } ${
          isCollapsed && !isMobile
            ? 'justify-center p-3' 
            : 'px-4 py-3'
        }`}
      >
        <div className="relative shrink-0 w-8 h-8 flex items-center justify-center">
          <Icon className="w-5 h-5" />
          {hasBadge && (
            <span 
              className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[10px] h-[10px] bg-emerald-500 rounded-full z-10"
              aria-label="New friend request"
            />
          )}
        </div>
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
              {hasBadge ? `${item.label} (${item.badgeCount} new request${item.badgeCount! > 1 ? 's' : ''})` : item.label}
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

      {/* Account Section - Bottom Anchored */}
      {currentUser && userProfile && (
        <div className={`mt-auto pt-4 border-t border-zinc-800 ${isCollapsed && !isMobile ? 'px-0' : ''}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-3 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors w-full ${
                  isCollapsed && !isMobile
                    ? 'justify-center p-2' 
                    : 'px-3 py-2'
                }`}
              >
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.username || 'User'}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <InitialsAvatar
                    name={userProfile.username || currentUser.email || 'User'}
                    size={32}
                    className="w-8 h-8 rounded-full shrink-0"
                  />
                )}
                {(!isCollapsed || isMobile) && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {userProfile.username || 'User'}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {userProfile.email || currentUser.email || ''}
                    </div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-white">
              <DropdownMenuItem
                onClick={() => {
                  navigate(`/profile/${userProfile.username}`);
                  isMobile && closeSidebar();
                }}
                className="cursor-pointer focus:bg-zinc-800"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate('/settings');
                  isMobile && closeSidebar();
                }}
                className="cursor-pointer focus:bg-zinc-800"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={() => {
                  navigate('/help');
                  isMobile && closeSidebar();
                }}
                className="cursor-pointer focus:bg-zinc-800"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={() => {
                  handleLogout();
                  isMobile && closeSidebar();
                }}
                className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10"
                variant="destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
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
