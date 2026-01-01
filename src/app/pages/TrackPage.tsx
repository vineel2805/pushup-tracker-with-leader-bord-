import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Camera, CameraOff, RotateCw, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addSession } from '../services/firestoreService';

type PushUpState = 'get_ready' | 'plank' | 'down' | 'up';

// Constants
const CONSTANTS = {
  MIN_STATE_CHANGE_MS: 300,
  VISIBILITY_THRESHOLD: 0.3,
  POSE_FPS_DESKTOP: 30,
  POSE_FPS_MOBILE: 15,
  UI_SYNC_FPS: 10,
  PLANK_BACK_ANGLE: 140,
  PLANK_ELBOW_ANGLE: 150,
  DOWN_ELBOW_ANGLE: 90,
  UP_ELBOW_ANGLE: 150,
  MAX_ELBOW_FLARE: 70,
  GRACE_PERIOD_MS: 2000,
  SAVE_RETRY_ATTEMPTS: 3,
};

// Detect mobile device for adaptive FPS
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);
};

const getPoseFPS = (): number => {
  return isMobileDevice() ? CONSTANTS.POSE_FPS_MOBILE : CONSTANTS.POSE_FPS_DESKTOP;
};

const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Calculate angle between three points
const calculateAngle = (a: any, b: any, c: any): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
};

// Check if landmark is visible and reliable
const isLandmarkVisible = (landmark: any, minVisibility = 0.5): boolean => {
  return landmark && landmark.visibility !== undefined && landmark.visibility >= minVisibility;
};

export function TrackPage() {
  const { currentUser } = useAuth();
  const [count, setCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [state, setState] = useState<PushUpState>('get_ready');
  const [feedback, setFeedback] = useState('Enable camera to start');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [poseDetected, setPoseDetected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSessionSaved, setIsSessionSaved] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const manualFrameRef = useRef<number | undefined>(undefined);
  
  const stateRef = useRef<PushUpState>('get_ready');
  const countRef = useRef(0);
  const trackingRef = useRef(false);
  const pausedRef = useRef(false);
  const lastStateChangeRef = useRef(0);
  const visibilityGracePeriodRef = useRef(0);

  const poseRef = useRef<any>(null);
  const lastPoseResultsRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  
  // UI buffer refs - updated in real-time loops, synced to React state at fixed interval
  const uiBufferRef = useRef({
    count: 0,
    state: 'get_ready' as PushUpState,
    feedback: 'Enable camera to start',
    poseDetected: false,
    needsSync: false,
  });
  const uiSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    trackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  // Timer for duration
  useEffect(() => {
    if (!isTracking || isPaused) return;
    const interval = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTracking, isPaused]);

  // UI sync effect - syncs ref-based UI buffer to React state at fixed 10 FPS
  // This prevents excessive re-renders from real-time pose processing
  useEffect(() => {
    const syncInterval = 1000 / CONSTANTS.UI_SYNC_FPS;
    
    uiSyncIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      const buffer = uiBufferRef.current;
      if (!buffer.needsSync) return;
      
      // Batch all UI updates together
      setCount(buffer.count);
      setState(buffer.state);
      setFeedback(buffer.feedback);
      setPoseDetected(buffer.poseDetected);
      buffer.needsSync = false;
    }, syncInterval);
    
    return () => {
      if (uiSyncIntervalRef.current) {
        clearInterval(uiSyncIntervalRef.current);
        uiSyncIntervalRef.current = null;
      }
    };
  }, []);

  // Initialize MediaPipe Pose
  // Note: onPoseResults is excluded from deps because:
  // - It's a stable callback that uses refs (isMountedRef, trackingRef, pausedRef)
  // - Re-registering would cause MediaPipe to call the callback multiple times
  // - The callback checks isMountedRef to prevent state updates after unmount
  useEffect(() => {
    const loadPose = async () => {
      try {
        const { Pose } = await import('@mediapipe/pose');
        const { Camera } = await import('@mediapipe/camera_utils');
        
        const pose = new Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
          },
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        // Register callback once - do not re-register on re-renders
        pose.onResults(onPoseResults);
        poseRef.current = { pose, Camera };
        console.log('MediaPipe Pose loaded successfully');
      } catch (error) {
        console.error('Failed to initialize MediaPipe Pose:', error);
        if (isMountedRef.current) {
          setError('Pose detection unavailable - using video only mode');
        }
        poseRef.current = null;
      }
    };

    loadPose();

    // No cleanup here - Pose cleanup happens in component unmount cleanup only
    // This prevents duplicate close() calls
    return () => {
      // Pose instance cleanup is handled in component unmount cleanup
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Camera management
  // Note: startCamera and stopCamera are excluded from deps because:
  // - They are stable functions that use refs and don't depend on props/state
  // - Including them would cause unnecessary re-initialization of camera
  // - The functions check isMountedRef internally to prevent operations after unmount
  useEffect(() => {
    if (cameraEnabled) {
      startCamera();
    } else {
      stopCamera();
    }
    // Cleanup: Always stop camera on unmount or when dependencies change
    return () => {
      stopCamera();
    };
  }, [cameraEnabled, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Component unmount cleanup - centralized cleanup for all resources
  // This is the ONLY place where pose.close() is called to prevent duplicate cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Stop camera (cleans up streams, animation frames, camera instance)
      stopCamera();
      // Close MediaPipe Pose instance - EXACTLY ONCE on unmount
      if (poseRef.current?.pose) {
        try {
          poseRef.current.pose.close();
        } catch (error) {
          console.error('Error closing MediaPipe Pose on unmount:', error);
        }
        poseRef.current = null;
      }
    };
  }, []);

  // Unified render loop
  const startRenderLoop = () => {
    // Cancel any existing render loop
    if (animationRef.current !== undefined) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    
    const render = () => {
      // Stop if component unmounted or resources unavailable
      if (!isMountedRef.current || !canvasRef.current || !videoRef.current || !streamRef.current) {
        animationRef.current = undefined;
        return;
      }
      
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState < 2 || video.videoWidth === 0) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      // Update canvas size if needed
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      // Draw video frame
      ctx.save();
      if (facingMode === 'user') {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Draw pose if available
      if (lastPoseResultsRef.current?.poseLandmarks) {
        drawPose(ctx, lastPoseResultsRef.current.poseLandmarks);
      }
      
      // Schedule next frame only if still mounted and resources available
      if (isMountedRef.current && streamRef.current) {
        animationRef.current = requestAnimationFrame(render);
      } else {
        animationRef.current = undefined;
      }
    };
    
    render();
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          const checkReady = () => {
            if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
              resolve();
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
        
        // Start unified render loop
        startRenderLoop();
        
        // Set up pose detection if available
        if (poseRef.current?.Camera && poseRef.current?.pose) {
          console.log('Using MediaPipe Camera utils');
          const camera = new poseRef.current.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && poseRef.current?.pose) {
                await poseRef.current.pose.send({ image: videoRef.current });
              }
            },
            width: 1280,
            height: 720,
          });
          cameraInstanceRef.current = camera;
          camera.start();
        } else if (poseRef.current?.pose) {
          console.log('Using manual frame sending for pose detection');
          let lastFrameTime = 0;
          const frameInterval = 1000 / getPoseFPS();
          
          // Cancel any existing manual frame loop
          if (manualFrameRef.current !== undefined) {
            cancelAnimationFrame(manualFrameRef.current);
            manualFrameRef.current = undefined;
          }
          
          const sendFrame = async () => {
            // Stop if component unmounted or resources unavailable
            if (!isMountedRef.current || !streamRef.current || !videoRef.current || !poseRef.current?.pose) {
              manualFrameRef.current = undefined;
              return;
            }
            
            const now = Date.now();
            if (videoRef.current.readyState >= 2) {
              if (now - lastFrameTime >= frameInterval) {
                lastFrameTime = now;
                try {
                  await poseRef.current.pose.send({ image: videoRef.current });
                } catch (error) {
                  console.error('Error sending frame to pose detection:', error);
                }
              }
            }
            
            // Schedule next frame only if still mounted and resources available
            if (isMountedRef.current && streamRef.current) {
              manualFrameRef.current = requestAnimationFrame(sendFrame);
            } else {
              manualFrameRef.current = undefined;
            }
          };
          manualFrameRef.current = requestAnimationFrame(sendFrame);
        } else {
          console.log('MediaPipe not available, using video only mode');
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      setError('Camera access denied. Please allow camera permissions.');
      setFeedback('Camera access denied');
    }
  };

  const stopCamera = () => {
    // Cancel render loop animation frame
    if (animationRef.current !== undefined) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    
    // Cancel manual frame sending animation frame
    if (manualFrameRef.current !== undefined) {
      cancelAnimationFrame(manualFrameRef.current);
      manualFrameRef.current = undefined;
    }
    
    // Stop MediaPipe Camera instance
    if (cameraInstanceRef.current) {
      try {
        cameraInstanceRef.current.stop();
      } catch (e) {
        console.error('Error stopping camera instance:', e);
      }
      cameraInstanceRef.current = null;
    }
    
    // Stop all camera stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    
    // Clear pose results to prevent stale data
    lastPoseResultsRef.current = null;
  };

  const onPoseResults = (results: any) => {
    // Ignore results if component is unmounted
    if (!isMountedRef.current) {
      return;
    }
    
    lastPoseResultsRef.current = results;
    
    if (results.poseLandmarks) {
      // Update ref buffer instead of React state directly
      if (uiBufferRef.current.poseDetected !== true) {
        uiBufferRef.current.poseDetected = true;
        uiBufferRef.current.needsSync = true;
      }
      visibilityGracePeriodRef.current = 0;
      
      if (trackingRef.current && !pausedRef.current) {
        detectPushUp(results.poseLandmarks);
      }
    } else {
      // Update ref buffer instead of React state directly
      if (uiBufferRef.current.poseDetected !== false) {
        uiBufferRef.current.poseDetected = false;
        uiBufferRef.current.needsSync = true;
      }
      if (trackingRef.current && uiBufferRef.current.feedback !== 'Position yourself in frame') {
        uiBufferRef.current.feedback = 'Position yourself in frame';
        uiBufferRef.current.needsSync = true;
      }
    }
  };

  const drawPose = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    const connections = [
      [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
      [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
      [LM.LEFT_ELBOW, LM.LEFT_WRIST],
      [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
      [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
      [LM.LEFT_SHOULDER, LM.LEFT_HIP],
      [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
      [LM.LEFT_HIP, LM.RIGHT_HIP],
      [LM.LEFT_HIP, LM.LEFT_KNEE],
      [LM.LEFT_KNEE, LM.LEFT_ANKLE],
      [LM.RIGHT_HIP, LM.RIGHT_KNEE],
      [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
    ];

    ctx.save();
    if (facingMode === 'user') {
      ctx.scale(-1, 1);
      ctx.translate(-ctx.canvas.width, 0);
    }

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;

    connections.forEach(([start, end]) => {
      const startLm = landmarks[start];
      const endLm = landmarks[end];
      if (isLandmarkVisible(startLm, 0.3) && isLandmarkVisible(endLm, 0.3)) {
        ctx.beginPath();
        ctx.moveTo(startLm.x * ctx.canvas.width, startLm.y * ctx.canvas.height);
        ctx.lineTo(endLm.x * ctx.canvas.width, endLm.y * ctx.canvas.height);
        ctx.stroke();
      }
    });

    landmarks.forEach((landmark) => {
      if (isLandmarkVisible(landmark, 0.3)) {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(
          landmark.x * ctx.canvas.width,
          landmark.y * ctx.canvas.height,
          5,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    });

    ctx.restore();
  };

  const detectPushUp = (landmarks: any[]) => {
    const requiredPoints = [
      LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
      LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
      LM.LEFT_WRIST, LM.RIGHT_WRIST,
      LM.LEFT_HIP, LM.RIGHT_HIP,
      LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
    ];

    const allPointsVisible = requiredPoints.every(idx => 
      isLandmarkVisible(landmarks[idx], CONSTANTS.VISIBILITY_THRESHOLD)
    );

    if (!allPointsVisible) {
      const now = Date.now();
      if (visibilityGracePeriodRef.current === 0) {
        visibilityGracePeriodRef.current = now;
      } else if (now - visibilityGracePeriodRef.current > CONSTANTS.GRACE_PERIOD_MS) {
        stateRef.current = 'get_ready';
        // Update buffer only on state transition
        if (uiBufferRef.current.state !== 'get_ready' || uiBufferRef.current.feedback !== 'Full body must be visible - move back') {
          uiBufferRef.current.state = 'get_ready';
          uiBufferRef.current.feedback = 'Full body must be visible - move back';
          uiBufferRef.current.needsSync = true;
        }
      } else {
        // Only update if feedback actually changed
        if (uiBufferRef.current.feedback !== 'Stay in frame...') {
          uiBufferRef.current.feedback = 'Stay in frame...';
          uiBufferRef.current.needsSync = true;
        }
      }
      return;
    }

    visibilityGracePeriodRef.current = 0;

    const leftElbowAngle = calculateAngle(
      landmarks[LM.LEFT_SHOULDER],
      landmarks[LM.LEFT_ELBOW],
      landmarks[LM.LEFT_WRIST]
    );

    const rightElbowAngle = calculateAngle(
      landmarks[LM.RIGHT_SHOULDER],
      landmarks[LM.RIGHT_ELBOW],
      landmarks[LM.RIGHT_WRIST]
    );

    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    const leftBackAngle = calculateAngle(
      landmarks[LM.LEFT_SHOULDER],
      landmarks[LM.LEFT_HIP],
      landmarks[LM.LEFT_ANKLE]
    );

    const rightBackAngle = calculateAngle(
      landmarks[LM.RIGHT_SHOULDER],
      landmarks[LM.RIGHT_HIP],
      landmarks[LM.RIGHT_ANKLE]
    );

    const avgBackAngle = (leftBackAngle + rightBackAngle) / 2;

    const leftElbowFlare = calculateAngle(
      landmarks[LM.LEFT_HIP],
      landmarks[LM.LEFT_SHOULDER],
      landmarks[LM.LEFT_ELBOW]
    );

    const rightElbowFlare = calculateAngle(
      landmarks[LM.RIGHT_HIP],
      landmarks[LM.RIGHT_SHOULDER],
      landmarks[LM.RIGHT_ELBOW]
    );

    let formFeedback = 'Good form';
    if (leftElbowFlare > CONSTANTS.MAX_ELBOW_FLARE || rightElbowFlare > CONSTANTS.MAX_ELBOW_FLARE) {
      formFeedback = 'Tuck your elbows closer';
    }

    const now = Date.now();

    if (stateRef.current === 'get_ready') {
      if (avgBackAngle > CONSTANTS.PLANK_BACK_ANGLE && avgElbowAngle > CONSTANTS.PLANK_ELBOW_ANGLE) {
        if (now - lastStateChangeRef.current > CONSTANTS.MIN_STATE_CHANGE_MS) {
          stateRef.current = 'plank';
          // State transition - update buffer
          uiBufferRef.current.state = 'plank';
          uiBufferRef.current.feedback = 'Perfect! Ready to start';
          uiBufferRef.current.needsSync = true;
          lastStateChangeRef.current = now;
        }
      } else {
        // Only update if feedback changed
        const newFeedback = 'Get into plank position (straight body, arms extended)';
        if (uiBufferRef.current.feedback !== newFeedback) {
          uiBufferRef.current.feedback = newFeedback;
          uiBufferRef.current.needsSync = true;
        }
      }
    } else if (stateRef.current === 'plank' || stateRef.current === 'up') {
      if (avgElbowAngle < CONSTANTS.DOWN_ELBOW_ANGLE) {
        if (now - lastStateChangeRef.current > CONSTANTS.MIN_STATE_CHANGE_MS) {
          stateRef.current = 'down';
          // State transition - update buffer
          uiBufferRef.current.state = 'down';
          uiBufferRef.current.feedback = 'Push up now!';
          uiBufferRef.current.needsSync = true;
          lastStateChangeRef.current = now;
        }
      } else {
        // Only update if formFeedback changed
        if (uiBufferRef.current.feedback !== formFeedback) {
          uiBufferRef.current.feedback = formFeedback;
          uiBufferRef.current.needsSync = true;
        }
      }
    } else if (stateRef.current === 'down') {
      if (avgElbowAngle > CONSTANTS.UP_ELBOW_ANGLE) {
        if (now - lastStateChangeRef.current > CONSTANTS.MIN_STATE_CHANGE_MS) {
          countRef.current++;
          stateRef.current = 'up';
          // State transition - update buffer with new count
          const newFeedback = `Rep ${countRef.current}! ${formFeedback}`;
          uiBufferRef.current.count = countRef.current;
          uiBufferRef.current.state = 'up';
          uiBufferRef.current.feedback = newFeedback;
          uiBufferRef.current.needsSync = true;
          lastStateChangeRef.current = now;
        }
      } else {
        // Only update if feedback changed
        if (uiBufferRef.current.feedback !== 'Keep pushing up') {
          uiBufferRef.current.feedback = 'Keep pushing up';
          uiBufferRef.current.needsSync = true;
        }
      }
    }
  };

  const startTracking = () => {
    setIsTracking(true);
    setIsPaused(false);
    setIsSessionSaved(false);
    setSessionEnded(false);
    countRef.current = 0;
    setCount(0);
    setDuration(0);
    stateRef.current = 'get_ready';
    setState('get_ready');
    setFeedback('Get into plank position');
    // Reset UI buffer
    uiBufferRef.current = {
      count: 0,
      state: 'get_ready',
      feedback: 'Get into plank position',
      poseDetected: uiBufferRef.current.poseDetected,
      needsSync: false,
    };
  };

  const togglePause = () => {
    setIsPaused(p => !p);
    if (!isPaused) {
      setFeedback('Paused');
    } else {
      setFeedback('Resumed - continue your set');
    }
  };

  const saveSessionWithRetry = async (data: any, retries = CONSTANTS.SAVE_RETRY_ATTEMPTS): Promise<boolean> => {
    for (let i = 0; i < retries; i++) {
      try {
        await addSession(data);
        return true;
      } catch (error) {
        console.error(`Save attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return false;
  };

  const endTracking = () => {
    setIsTracking(false);
    setIsPaused(false);
    setSessionEnded(true);
    stateRef.current = 'get_ready';
    setState('get_ready');
    
    if (count === 0) {
      setFeedback('Session ended - no push-ups completed');
    } else if (!currentUser) {
      setFeedback(`Session ended: ${count} push-ups in ${formatTime(duration)}. Login to save progress.`);
    } else {
      setFeedback(`Session ended: ${count} push-ups in ${formatTime(duration)}. Click Save to save this session.`);
    }
  };

  const saveSession = async () => {
    if (!currentUser) {
      setFeedback('Please login to save your session');
      return;
    }

    if (count === 0) {
      setFeedback('Cannot save session with 0 push-ups');
      return;
    }

    if (isSessionSaved) {
      setFeedback('Session already saved!');
      return;
    }

    setIsSaving(true);
    try {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      
      await saveSessionWithRetry({
        userId: currentUser.uid,
        date: dateString,
        pushUps: count,
        duration: duration,
        sets: 1,
      });
      
      setIsSessionSaved(true);
      setFeedback(`✓ Session saved! ${count} push-ups in ${formatTime(duration)}`);
    } catch (error) {
      console.error('Failed to save session:', error);
      setFeedback(`Failed to save session. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode(mode => mode === 'user' ? 'environment' : 'user');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {!cameraEnabled && (
        <div className="z-20 flex flex-col items-center gap-4">
          <button
            onClick={() => setCameraEnabled(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg transition-colors flex items-center gap-3"
          >
            <Camera size={24} />
            Enable Camera
          </button>
          <p className="text-white/70 text-sm">Allow camera access to track your push-ups</p>
        </div>
      )}

      {cameraEnabled && (
        <>
          {/* Top Bar - Feedback and State */}
          <div className="absolute top-4 lg:top-6 left-4 lg:left-6 right-4 lg:right-6 z-10 flex flex-col gap-2 lg:gap-3">
            <div className="bg-black/80 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-xl text-sm lg:text-base font-semibold backdrop-blur-sm">
              {feedback}
            </div>
            
            {error && (
              <div className="bg-red-600/90 text-white px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {isTracking && (
              <div className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl font-bold text-xs lg:text-sm uppercase tracking-wider self-start ${
                state === 'get_ready' ? 'bg-yellow-500/80' :
                state === 'plank' ? 'bg-blue-500/80' :
                state === 'down' ? 'bg-red-500/80' :
                'bg-green-500/80'
              } text-white`}>
                {state.replace('_', ' ')}
              </div>
            )}
          </div>

          {/* Stats - Top Right Corner */}
          <div className="absolute top-4 lg:top-6 right-4 lg:right-6 z-10 flex flex-col items-end gap-2">
            <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 lg:px-6 py-2 lg:py-3 text-right">
              <div className="text-white text-3xl lg:text-5xl font-bold">{count}</div>
              <div className="text-white/70 text-xs lg:text-sm font-medium">Push-ups</div>
            </div>
            
            <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 lg:px-6 py-2 lg:py-3 text-right">
              <div className="text-white text-xl lg:text-2xl font-semibold">{formatTime(duration)}</div>
              <div className="text-white/70 text-[10px] lg:text-xs font-medium">Duration</div>
            </div>
            
            <div className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl ${
              poseDetected ? 'bg-green-600/80' : 'bg-red-600/80'
            } text-white text-xs lg:text-sm font-medium`}>
              {poseDetected ? '✓ Pose Detected' : '✗ No Pose'}
            </div>
          </div>

          {/* Control buttons - Bottom Center */}
          <div className="absolute bottom-20 lg:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 lg:gap-4 z-10">
            {!isTracking && !sessionEnded ? (
              <button
                onClick={startTracking}
                disabled={!poseDetected && poseRef.current !== null}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 lg:px-10 py-3 lg:py-4 rounded-full font-bold text-sm lg:text-lg shadow-lg transition-colors flex items-center gap-2 lg:gap-3"
              >
                <Play size={20} fill="white" />
                Start Tracking
              </button>
            ) : isTracking ? (
              <>
                <button
                  onClick={togglePause}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 lg:px-8 py-3 lg:py-4 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2 text-sm lg:text-base"
                >
                  {isPaused ? (
                    <>
                      <Play size={18} fill="white" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause size={18} fill="white" />
                      Pause
                    </>
                  )}
                </button>
                <button
                  onClick={endTracking}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 lg:px-8 py-3 lg:py-4 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2 text-sm lg:text-base"
                >
                  <Square size={18} fill="white" />
                  End
                </button>
              </>
            ) : sessionEnded && count > 0 && !isSessionSaved ? (
              <button
                onClick={saveSession}
                disabled={isSaving || !currentUser || count === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:opacity-50 text-white px-6 lg:px-10 py-3 lg:py-4 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2 lg:gap-3 text-sm lg:text-base"
              >
                <Save size={20} />
                {isSaving ? 'Saving...' : 'Save Session'}
              </button>
            ) : sessionEnded && isSessionSaved ? (
              <div className="bg-emerald-600 text-white px-6 lg:px-10 py-3 lg:py-4 rounded-full font-bold shadow-lg flex items-center gap-2 lg:gap-3 text-sm lg:text-base">
                <Save size={20} />
                Session Saved!
              </div>
            ) : null}
          </div>

          {/* Camera flip button */}
          <button
            onClick={toggleCamera}
            className="absolute bottom-6 lg:bottom-8 right-4 lg:right-6 z-10 bg-black/60 hover:bg-black/80 text-white p-3 lg:p-4 rounded-full transition-colors shadow-lg"
            title="Flip Camera"
          >
            <RotateCw size={20} />
          </button>

          {/* Camera disable button */}
          <button
            onClick={() => {
              setCameraEnabled(false);
              setIsTracking(false);
            }}
            className="absolute bottom-6 lg:bottom-8 left-4 lg:left-6 z-10 bg-black/60 hover:bg-black/80 text-white p-3 lg:p-4 rounded-full transition-colors shadow-lg"
            title="Disable Camera"
          >
            <CameraOff size={20} />
          </button>
        </>
      )}
    </div>
  );
}