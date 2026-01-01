import { useState, useEffect, useRef } from 'react';
import { User, Eye, Lock, Lock as LockIcon, X, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/firestoreService';
import { changePassword } from '../services/authService';
import { uploadAvatar, deleteAvatar } from '../services/avatarService';
import { ChangeAvatarModal } from '../components/ChangeAvatarModal';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { toast } from '../utils/toast';
import { getInitials } from '../utils/avatarUtils';
import { getAvatarFromStorage, saveAvatarToStorage, clearAvatarFromStorage } from '../utils/avatarStorage';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';

type Tab = 'profile' | 'privacy' | 'security';

// Sidebar Navigation Item Component
function NavItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-2 text-[13px] transition-colors rounded ${
        active
          ? 'text-white bg-zinc-800/60'
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  );
}

// Settings Row Component for consistent layout
function SettingsRow({ 
  label, 
  description, 
  children 
}: { 
  label: string; 
  description?: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <div className="text-[13px] text-zinc-300">{label}</div>
        {description && (
          <div className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  
  // Profile state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  
  // Privacy state
  const [publicProfile, setPublicProfile] = useState(true);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [showGraphs, setShowGraphs] = useState(true);
  
  // Security state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Avatar state
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  
  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Track original values for change detection
  const originalValuesRef = useRef<{
    username: string;
    email: string;
    bio: string;
    publicProfile: boolean;
    showOnLeaderboard: boolean;
    showGraphs: boolean;
  } | null>(null);

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username || '');
      setEmail(userProfile.email || '');
      setBio(userProfile.bio || '');
      setPublicProfile(userProfile.publicProfile ?? true);
      setShowOnLeaderboard(userProfile.showOnLeaderboard ?? true);
      setShowGraphs(userProfile.showGraphs ?? true);
      
      // Sync avatar between profile and localStorage
      if (userProfile.avatarUrl) {
        saveAvatarToStorage(userProfile.avatarUrl);
      } else {
        const storedAvatar = getAvatarFromStorage();
        if (storedAvatar && currentUser) {
          updateUserProfile(currentUser.uid, { avatarUrl: storedAvatar })
            .then(() => refreshUserProfile())
            .catch((err) => console.warn('Failed to sync stored avatar:', err));
        }
      }
      
      originalValuesRef.current = {
        username: userProfile.username || '',
        email: userProfile.email || '',
        bio: userProfile.bio || '',
        publicProfile: userProfile.publicProfile ?? true,
        showOnLeaderboard: userProfile.showOnLeaderboard ?? true,
        showGraphs: userProfile.showGraphs ?? true,
      };
    }
  }, [userProfile]);

  const hasChanges = () => {
    if (!originalValuesRef.current) return false;
    return (
      username !== originalValuesRef.current.username ||
      bio !== originalValuesRef.current.bio ||
      publicProfile !== originalValuesRef.current.publicProfile ||
      showOnLeaderboard !== originalValuesRef.current.showOnLeaderboard ||
      showGraphs !== originalValuesRef.current.showGraphs
    );
  };

  const handleSave = async () => {
    if (!currentUser) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateUserProfile(currentUser.uid, {
        username,
        bio,
        publicProfile,
        showOnLeaderboard,
        showGraphs,
      });
      await refreshUserProfile();
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentUser) return;

    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarSave = async (file: File | null, defaultUrl?: string) => {
    if (!currentUser) return;

    setAvatarLoading(true);
    try {
      let newAvatarUrl: string | null;

      if (file) {
        newAvatarUrl = await uploadAvatar(currentUser.uid, file);
        
        if (userProfile?.avatarUrl && 
            !userProfile.avatarUrl.startsWith('data:image') && 
            !userProfile.avatarUrl.startsWith('/profile-pics/') &&
            !userProfile.avatarUrl.includes('/src/profile-pics/')) {
          await deleteAvatar(userProfile.avatarUrl).catch(() => {});
        }
        
        saveAvatarToStorage(newAvatarUrl);
      } else if (defaultUrl) {
        newAvatarUrl = defaultUrl;
        
        if (userProfile?.avatarUrl && 
            !userProfile.avatarUrl.startsWith('data:image') && 
            !userProfile.avatarUrl.startsWith('/profile-pics/') &&
            !userProfile.avatarUrl.includes('/src/profile-pics/')) {
          await deleteAvatar(userProfile.avatarUrl).catch(() => {});
        }
        
        saveAvatarToStorage(newAvatarUrl);
      } else {
        newAvatarUrl = null;
        
        if (userProfile?.avatarUrl && 
            !userProfile.avatarUrl.startsWith('data:image') && 
            !userProfile.avatarUrl.startsWith('/profile-pics/') &&
            !userProfile.avatarUrl.includes('/src/profile-pics/')) {
          await deleteAvatar(userProfile.avatarUrl).catch(() => {});
        }
        
        clearAvatarFromStorage();
      }

      await updateUserProfile(currentUser.uid, { avatarUrl: newAvatarUrl });
      await refreshUserProfile();
      toast.success('Profile photo updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile photo');
    } finally {
      setAvatarLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'privacy' as Tab, label: 'Privacy', icon: Eye },
    { id: 'security' as Tab, label: 'Security', icon: Lock },
  ];

  const displayName = username || userProfile?.username || 'User';
  const initials = getInitials(displayName);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Two-panel layout container */}
      <div className="flex max-w-4xl mx-auto">
        {/* Left Sidebar */}
        <aside className="w-48 flex-shrink-0 border-r border-zinc-800/40 min-h-screen">
          <div className="sticky top-0 py-5 px-3">
            {/* Settings Title */}
            <h1 className="text-sm font-medium text-zinc-400 mb-4 px-2">Settings</h1>
            
            {/* Navigation */}
            <nav className="space-y-0.5">
              {tabs.map((tab) => (
                <NavItem
                  key={tab.id}
                  icon={tab.icon}
                  label={tab.label}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </nav>
          </div>
        </aside>

        {/* Right Content Panel */}
        <main className="flex-1 min-w-0 py-5 px-8">
          {/* Section Header */}
          <div className="mb-5">
            <h2 className="text-base font-medium text-white">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>

          {/* Profile Section */}
          {activeTab === 'profile' && (
            <div>
              {/* Avatar Section */}
              <div className="flex items-center gap-3.5 mb-5">
                <button
                  onClick={() => setAvatarModalOpen(true)}
                  className="relative group"
                  disabled={avatarLoading}
                >
                  {userProfile?.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={displayName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <span className="text-lg font-medium text-white">{initials}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </button>
                <div>
                  <div className="text-[13px] font-medium text-white">{displayName}</div>
                  <button
                    onClick={() => setAvatarModalOpen(true)}
                    className="text-[12px] text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    Change photo
                  </button>
                </div>
              </div>
              
              {/* Subtle divider */}
              <div className="border-t border-zinc-800/40 mb-4" />

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-[12px] text-zinc-500 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-9 px-3 bg-zinc-900/80 border border-zinc-800/60 rounded-md text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-[12px] text-zinc-500 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      value={email}
                      readOnly
                      className="w-full h-9 px-3 pr-9 bg-zinc-900/40 border border-zinc-800/40 rounded-md text-[13px] text-zinc-500 cursor-not-allowed"
                      aria-label="Email address (read-only)"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <LockIcon className="w-3.5 h-3.5 text-zinc-600" aria-hidden="true" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-800 border-zinc-700 text-zinc-300 text-[11px]">
                        Email cannot be changed
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-[12px] text-zinc-500 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800/60 rounded-md text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors resize-none"
                  />
                  <p className="text-[11px] text-zinc-600 mt-1">{bio.length}/500</p>
                </div>
              </div>

              {/* Save Button */}
              {hasChanges() && (
                <div className="pt-5">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Privacy Section */}
          {activeTab === 'privacy' && (
            <div className="space-y-0">
              <SettingsRow 
                label="Public profile" 
                description="Allow others to view your profile"
              >
                <Switch 
                  checked={publicProfile} 
                  onCheckedChange={setPublicProfile}
                  className="data-[state=checked]:bg-emerald-600 scale-90"
                />
              </SettingsRow>
              
              <SettingsRow 
                label="Show on leaderboards" 
                description="Appear in rankings"
              >
                <Switch 
                  checked={showOnLeaderboard} 
                  onCheckedChange={setShowOnLeaderboard}
                  className="data-[state=checked]:bg-emerald-600 scale-90"
                />
              </SettingsRow>
              
              <SettingsRow 
                label="Show performance graphs" 
                description="Display graphs on public profile"
              >
                <Switch 
                  checked={showGraphs} 
                  onCheckedChange={setShowGraphs}
                  className="data-[state=checked]:bg-emerald-600 scale-90"
                />
              </SettingsRow>

              {/* Save Button */}
              {hasChanges() && (
                <div className="pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Security Section */}
          {activeTab === 'security' && (
            <div>
              <SettingsRow 
                label="Password" 
                description="Keep your account secure"
              >
                <button
                  onClick={() => setPasswordDialogOpen(true)}
                  className="px-3 py-1.5 text-[12px] text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  Change
                </button>
              </SettingsRow>
            </div>
          )}
        </main>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800/60 text-white sm:max-w-sm [&>button]:text-zinc-500 [&>button]:hover:text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-[15px] font-medium">Change password</DialogTitle>
            <DialogDescription className="text-zinc-500 text-[12px]">
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-[12px]">
              {error}
            </div>
          )}
          
          <div className="space-y-3 py-1">
            <div>
              <label htmlFor="current-password" className="block text-[12px] text-zinc-500 mb-1.5">
                Current password
              </label>
              <input
                type="password"
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-9 px-3 bg-zinc-800/80 border border-zinc-700/50 rounded-md text-[13px] text-white focus:outline-none focus:border-zinc-600 transition-colors"
                placeholder="••••••••"
                disabled={passwordLoading}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-[12px] text-zinc-500 mb-1.5">
                New password
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-9 px-3 bg-zinc-800/80 border border-zinc-700/50 rounded-md text-[13px] text-white focus:outline-none focus:border-zinc-600 transition-colors"
                placeholder="••••••••"
                disabled={passwordLoading}
              />
              <p className="text-[11px] text-zinc-600 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-[12px] text-zinc-500 mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-9 px-3 bg-zinc-800/80 border border-zinc-700/50 rounded-md text-[13px] text-white focus:outline-none focus:border-zinc-600 transition-colors"
                placeholder="••••••••"
                disabled={passwordLoading}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <button
              onClick={() => {
                setPasswordDialogOpen(false);
                setError('');
              }}
              className="px-3 py-1.5 text-zinc-500 hover:text-white transition-colors text-[12px]"
              disabled={passwordLoading}
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[12px] font-medium"
            >
              {passwordLoading ? 'Updating...' : 'Update'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avatar Modal */}
      <ChangeAvatarModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        currentAvatarUrl={userProfile?.avatarUrl || null}
        onSave={handleAvatarSave}
        loading={avatarLoading}
      />
    </div>
  );
}
