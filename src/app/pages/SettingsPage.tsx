import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/firestoreService';
import { changePassword } from '../services/authService';

export function SettingsPage() {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [publicProfile, setPublicProfile] = useState(true);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [showGraphs, setShowGraphs] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username);
      setEmail(userProfile.email);
      setPublicProfile(userProfile.publicProfile);
      setShowOnLeaderboard(userProfile.showOnLeaderboard);
      setShowGraphs(userProfile.showGraphs);
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!currentUser) return;
    
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateUserProfile(currentUser.uid, {
        username,
        email,
        publicProfile,
        showOnLeaderboard,
        showGraphs,
      });
      await refreshUserProfile();
      setSuccess('Settings saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
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

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl text-white mb-2">Settings</h1>
        <p className="text-zinc-400">Manage your account and privacy</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-500 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl text-white">Profile Settings</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-zinc-400 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-zinc-400 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-lg">
              <img
                src={userProfile?.avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full"
              />
              <div className="flex-1">
                <p className="text-white mb-1">Profile Picture</p>
                <p className="text-sm text-zinc-400">Generated from your username</p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl text-white">Privacy & Visibility</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
              <div>
                <p className="text-white mb-1">Public Profile</p>
                <p className="text-sm text-zinc-400">
                  Allow others to view your profile
                </p>
              </div>
              <input
                type="checkbox"
                checked={publicProfile}
                onChange={(e) => setPublicProfile(e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
              <div>
                <p className="text-white mb-1">Show on Leaderboards</p>
                <p className="text-sm text-zinc-400">
                  Appear in friend leaderboards
                </p>
              </div>
              <input
                type="checkbox"
                checked={showOnLeaderboard}
                onChange={(e) => setShowOnLeaderboard(e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
              <div>
                <p className="text-white mb-1">Show Performance Graphs</p>
                <p className="text-sm text-zinc-400">
                  Display your graphs on public profile
                </p>
              </div>
              <input
                type="checkbox"
                checked={showGraphs}
                onChange={(e) => setShowGraphs(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>
        </div>

        {/* Password Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl text-white">Password & Security</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-zinc-400 mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-zinc-400 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-zinc-400 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              onClick={handlePasswordChange}
              disabled={loading}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Password
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
