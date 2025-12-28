import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { AvatarPicker } from './AvatarPicker';
import { saveAvatarToStorage, clearAvatarFromStorage } from '../utils/avatarStorage';

interface ChangeAvatarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl: string | null;
  onSave: (file: File | null, defaultUrl?: string) => Promise<void>;
  loading?: boolean;
}

export function ChangeAvatarModal({
  open,
  onOpenChange,
  currentAvatarUrl,
  onSave,
  loading = false,
}: ChangeAvatarModalProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatarSelect = async (avatarUrl: string) => {
    setSaving(true);
    try {
      // Save to localStorage immediately
      saveAvatarToStorage(avatarUrl);
      
      // Save to profile (using defaultUrl parameter for pre-existing images)
      await onSave(null, avatarUrl);
      
      // Close modal after successful save
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save avatar:', error);
      // Error handling is done in parent component via toast
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      // Clear from localStorage
      clearAvatarFromStorage();
      
      // Remove from profile
      await onSave(null);
      
      setShowRemoveConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to remove avatar:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-zinc-900 border-zinc-800 text-white sm:max-w-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-modal-title"
        >
          <DialogHeader>
            <DialogTitle id="avatar-modal-title" className="text-white">
              Select Avatar
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Choose an avatar for your profile
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {saving || loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              <AvatarPicker
                currentAvatarUrl={currentAvatarUrl}
                onSelect={handleAvatarSelect}
                onRemove={() => setShowRemoveConfirm(true)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Avatar?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Your avatar will be removed and replaced with your initials. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="text-zinc-300 hover:text-white"
              disabled={saving}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={saving}
            >
              {saving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
