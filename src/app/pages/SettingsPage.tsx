import { useState, useEffect, useRef } from 'react';
import { User, Eye, Lock, Lock as LockIcon, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/firestoreService';
import { changePassword } from '../services/authService';
import { uploadAvatar, deleteAvatar } from '../services/avatarService';
import { SettingsToggle } from '../components/SettingsToggle';
import { SettingsSectionHeader } from '../components/SettingsSectionHeader';
import { SettingsActionBar } from '../components/SettingsActionBar';
import { ProfileHeader } from '../components/ProfileHeader';
import { ChangeAvatarModal } from '../components/ChangeAvatarModal';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { toast } from '../utils/toast';
import { getInitials, generateInitialsAvatar } from '../utils/avatarUtils';
import { getAvatarFromStorage, saveAvatarToStorage, clearAvatarFromStorage } from '../utils/avatarStorage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';

type Tab = 'profile' | 'privacy' | 'security';

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
        // Sync profile avatar to localStorage
        saveAvatarToStorage(userProfile.avatarUrl);
      } else {
        // Load avatar from localStorage if available and profile doesn't have one
        const storedAvatar = getAvatarFromStorage();
        if (storedAvatar && currentUser) {
          // Sync localStorage avatar to profile if it exists
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
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      setTimeout(() => setError(''), 5000);
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
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordDialogOpen(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
      setTimeout(() => setError(''), 5000);
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
        // Upload new avatar (for file uploads - though we're not using this anymore)
        newAvatarUrl = await uploadAvatar(currentUser.uid, file);
        
        // Delete old avatar if it exists and is not a data URI or local path
        if (userProfile?.avatarUrl && 
            !userProfile.avatarUrl.startsWith('data:image') && 
            !userProfile.avatarUrl.startsWith('/profile-pics/') &&
            !userProfile.avatarUrl.includes('/src/profile-pics/')) {
          await deleteAvatar(userProfile.avatarUrl).catch(() => {
            // Ignore deletion errors
          });
        }
        
        // Save to localStorage
        saveAvatarToStorage(newAvatarUrl);
      } else if (defaultUrl) {
        // Use selected default avatar from gallery (local image)
        newAvatarUrl = defaultUrl;
        
        // Delete old avatar if it exists and is a Firebase URL (not local)
        if (userProfile?.avatarUrl && 
            !userProfile.avatarUrl.startsWith('data:image') && 
            !userProfile.avatarUrl.startsWith('/profile-pics/') &&
            !userProfile.avatarUrl.includes('/src/profile-pics/')) {
          await deleteAvatar(userProfile.avatarUrl).catch(() => {
            // Ignore deletion errors
          });
        }
        
        // Save to localStorage
        saveAvatarToStorage(newAvatarUrl);
      } else {
        // Remove avatar - set to null to show initials
        newAvatarUrl = null;
        
        // Delete old avatar if it exists (only Firebase URLs)
        if (userProfile?.avatarUrl && 
            !userProfile.avatarUrl.startsWith('data:image') && 
            !userProfile.avatarUrl.startsWith('/profile-pics/') &&
            !userProfile.avatarUrl.includes('/src/profile-pics/')) {
          await deleteAvatar(userProfile.avatarUrl).catch(() => {
            // Ignore deletion errors
          });
        }
        
        // Clear from localStorage
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

  return (
    <div className="p-5 max-w-4xl mx-auto pb-24">
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-zinc-400 text-sm">Manage your account and preferences</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-500 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/50 rounded text-emerald-500 text-sm">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-500'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div>
          <SettingsSectionHeader icon={User} title="Profile" />
          
          {/* Profile Header */}
          <ProfileHeader
            avatarUrl={userProfile?.avatarUrl || null}
            displayName={username || userProfile?.username || 'User'}
            username={username || userProfile?.username || 'user'}
            onAvatarClick={() => setAvatarModalOpen(true)}
          />

          {/* Divider */}
          <div className="border-b border-zinc-800/50 my-4" />

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm text-zinc-300 mb-1.5">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm text-zinc-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  readOnly
                  className="w-full h-10 px-3 pr-10 bg-zinc-800/50 border border-zinc-700 rounded-md text-zinc-400 cursor-not-allowed text-sm"
                  aria-label="Email address (read-only)"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <LockIcon className="w-4 h-4 text-zinc-500" aria-hidden="true" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs">
                    Email cannot be changed
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm text-zinc-300 mb-1.5">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={500}
                rows={4}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1">{bio.length}/500</p>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div>
          <SettingsSectionHeader icon={Eye} title="Privacy" />
          
          <div className="space-y-2">
            <SettingsToggle
              label="Public Profile"
              checked={publicProfile}
              onChange={setPublicProfile}
              tooltip="Allow others to view your profile and search for you"
            />
            <SettingsToggle
              label="Show on Leaderboards"
              checked={showOnLeaderboard}
              onChange={setShowOnLeaderboard}
              tooltip="Appear in friend leaderboards and rankings"
            />
            <SettingsToggle
              label="Show Performance Graphs"
              checked={showGraphs}
              onChange={setShowGraphs}
              tooltip="Display your performance graphs on your public profile"
            />
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div>
          <SettingsSectionHeader icon={Lock} title="Security" />
          
          <div>
            <button
              onClick={() => setPasswordDialogOpen(true)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors font-medium text-sm"
            >
              Change Password
            </button>
          </div>
        </div>
      )}

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md [&>button]:text-zinc-400 [&>button]:hover:text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Change Password</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="current-password" className="block text-sm text-zinc-300 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                placeholder="••••••••"
                disabled={passwordLoading}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm text-zinc-300 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                placeholder="••••••••"
                disabled={passwordLoading}
              />
              <p className="text-xs text-zinc-500 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm text-zinc-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                placeholder="••••••••"
                disabled={passwordLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setPasswordDialogOpen(false)}
              className="px-4 py-2 text-zinc-300 hover:text-white transition-colors text-sm"
              disabled={passwordLoading}
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
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

      {/* Sticky Action Bar */}
      <SettingsActionBar
        hasChanges={hasChanges()}
        onSave={handleSave}
        loading={loading}
      />
    </div>
  );
}
