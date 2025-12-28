import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { FITNESS_AVATARS } from '../utils/avatarUtils';

type GenderCategory = 'male' | 'female' | 'neutral';

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
  const [mode, setMode] = useState<'select' | 'upload' | 'camera'>('select');
  const [genderCategory, setGenderCategory] = useState<GenderCategory>('neutral');
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDefaultUrl, setSelectedDefaultUrl] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      setMode('select');
      setGenderCategory('neutral');
      setPreview(null);
      setSelectedFile(null);
      setSelectedDefaultUrl(null);
      stopCamera();
    }
  }, [open]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please select a JPG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setMode('camera');
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = 640;
    canvas.height = 640;

    if (ctx) {
      ctx.drawImage(video, 0, 0, 640, 640);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreview(canvas.toDataURL());
          stopCamera();
          setMode('select');
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleSelectDefault = (url: string) => {
    setPreview(url);
    setSelectedFile(null);
    setSelectedDefaultUrl(url);
  };

  const currentAvatars = FITNESS_AVATARS[genderCategory];

  const handleSave = async () => {
    if (preview) {
      if (selectedFile) {
        await onSave(selectedFile);
      } else if (selectedDefaultUrl) {
        // Default avatar selected from gallery
        await onSave(null, selectedDefaultUrl);
      } else {
        // Fallback (shouldn't happen)
        await onSave(null);
      }
    }
  };

  const handleRemove = async () => {
    await onSave(null);
    setShowRemoveConfirm(false);
  };

  const stripEXIF = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                const newFile = new File([blob], file.name, { type: 'image/jpeg' });
                resolve(newFile);
              } else {
                resolve(file);
              }
            }, 'image/jpeg', 0.9);
          } else {
            resolve(file);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
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
              Change Profile Photo
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Upload a photo, use your camera, or choose a fitness avatar
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {mode === 'select' && (
              <div className="space-y-4">
                {preview && (
                  <div className="flex justify-center">
                    <div className="relative">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-32 h-32 rounded-full object-cover border-2 border-zinc-700"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="flex flex-col items-center gap-2 p-4 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm text-zinc-300">Upload</span>
                  </button>
                  <button
                    onClick={handleCameraCapture}
                    className="flex flex-col items-center gap-2 p-4 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                  >
                    <Camera className="w-5 h-5 text-zinc-400" />
                    <span className="text-sm text-zinc-300">Camera</span>
                  </button>
                </div>

                {/* Gender Category Selection */}
                <div>
                  <p className="text-xs text-zinc-400 mb-2">Select Category</p>
                  <div className="flex gap-2 mb-4">
                    {(['male', 'female', 'neutral'] as GenderCategory[]).map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setGenderCategory(category);
                          setPreview(null);
                          setSelectedFile(null);
                          setSelectedDefaultUrl(null);
                        }}
                        className={`px-3 py-1.5 text-xs rounded transition-colors ${
                          genderCategory === category
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fitness Avatars */}
                <div>
                  <p className="text-xs text-zinc-400 mb-2">Fitness Avatars</p>
                  <div className="grid grid-cols-4 gap-2">
                    {currentAvatars.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectDefault(url)}
                        className={`aspect-square rounded-full overflow-hidden border-2 transition-colors ${
                          selectedDefaultUrl === url
                            ? 'border-emerald-500'
                            : 'border-transparent hover:border-zinc-600'
                        }`}
                      >
                        <img src={url} alt={`${genderCategory} avatar ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {mode === 'camera' && (
              <div className="space-y-4">
                <div className="relative bg-black rounded overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full aspect-square object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                  >
                    Capture
                  </button>
                  <button
                    onClick={() => {
                      stopCamera();
                      setMode('select');
                    }}
                    className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:text-white rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors text-sm"
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 inline mr-1.5" />
              Remove
            </button>
            <div className="flex-1" />
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-zinc-300 hover:text-white transition-colors text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !preview}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Photo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Your profile photo will be removed and replaced with your initials. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-zinc-300 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

