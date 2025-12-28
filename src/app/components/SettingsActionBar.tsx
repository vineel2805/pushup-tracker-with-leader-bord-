import { Save } from 'lucide-react';

interface SettingsActionBarProps {
  hasChanges: boolean;
  onSave: () => void;
  loading: boolean;
}

export function SettingsActionBar({ hasChanges, onSave, loading }: SettingsActionBarProps) {
  if (!hasChanges) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          You have unsaved changes
        </div>
        <button
          onClick={onSave}
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

