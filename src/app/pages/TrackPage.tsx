import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Camera, CameraOff, RotateCw, AlertCircle, Save, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addSession } from '../services/firestoreService';

type PushUpState = 'get_ready' | 'plank' | 'down' | 'up';
type ViewMode = 'front' | 'left_side' | 'right_side' | 'unknown';

// Constants - Optimized for accuracy
const CONSTANTS = {
  // Timing - faster response
  MIN_STATE_CHANGE_MS: 150,
  MIN_REP_DURATION_MS: 500,
  GRACE_PERIOD_MS: 1500,
  SAVE_RETRY_ATTEMPTS: 3,
  
  // Visibility thresholds
  VISIBILITY_THRESHOLD: 0.35,
  VISIBILITY_HIGH: 0.65,
  VISIBILITY_LOW: 0.45,
  VISIBILITY_FRONT_MIN: 0.55,
  
  // FPS settings
  POSE_FPS_DESKTOP: 30,
  POSE_FPS_MOBILE: 20,
  UI_SYNC_FPS: 12,
  
  // Front-view angles - refined
  PLANK_BACK_ANGLE: 135,
  PLANK_ELBOW_ANGLE: 140,
  DOWN_ELBOW_ANGLE: 85,
  UP_ELBOW_ANGLE: 140,
  ELBOW_FLARE_THRESHOLD: 50,
  BACK_ALIGNMENT_MIN: 125,
  
  // Side-view thresholds - more sensitive
  SIDE_PLANK_ELBOW_ANGLE: 135,
  SIDE_DOWN_ELBOW_ANGLE: 85,
  SIDE_UP_ELBOW_ANGLE: 135,
  SHOULDER_DROP_RATIO: 0.075,
  SHOULDER_STABLE_TOLERANCE: 0.035,
  
  // Depth detection
  FRONT_VIEW_Z_DIFF_MAX: 0.6,
  SIDE_VIEW_Z_DIFF_MIN: 0.15,
};

// Camera constraints
const getCameraConstraints = (facingMode: 'user' | 'environment') => {
  const isMobile = isMobileDevice();
  return {
    video: {
      facingMode: facingMode,
      width: { ideal: isMobile ? 720 : 1280 },
      height: { ideal: isMobile ? 540 : 720 },
      frameRate: { ideal: isMobile ? 20 : 30 },
      aspectRatio: isMobile ? { ideal: 4 / 3 } : { ideal: 16 / 9 },
    },
  };
};

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

// Check if landmark is visible
const isLandmarkVisible = (landmark: any, minVisibility = 0.5): boolean => {
  return landmark && landmark.visibility !== undefined && landmark.visibility >= minVisibility;
};

// Enhanced view detection with multiple checks
const detectViewMode = (landmarks: any[]): ViewMode => {
  const leftShoulder = landmarks[LM.LEFT_SHOULDER];
  const rightShoulder = landmarks[LM.RIGHT_SHOULDER];
  const leftHip = landmarks[LM.LEFT_HIP];
  const rightHip = landmarks[LM.RIGHT_HIP];
  
  if (!leftShoulder || !rightShoulder) return 'unknown';
  
  const leftVis = leftShoulder.visibility ?? 0;
  const rightVis = rightShoulder.visibility ?? 0;
  const leftZ = leftShoulder.z ?? 0;
  const rightZ = rightShoulder.z ?? 0;
  const zDiff = Math.abs(leftZ - rightZ);
  
  // Front view: both shoulders visible AND at similar depth
  if (leftVis >= CONSTANTS.VISIBILITY_FRONT_MIN && rightVis >= CONSTANTS.VISIBILITY_FRONT_MIN) {
    if (zDiff < CONSTANTS.FRONT_VIEW_Z_DIFF_MAX) {
      // Additional check: hips should also be visible
      if (leftHip && rightHip && 
          (leftHip.visibility ?? 0) > 0.4 && 
          (rightHip.visibility ?? 0) > 0.4) {
        return 'front';
      }
    }
  }
  
  // Side view: clear asymmetry in visibility
  if (leftVis >= CONSTANTS.VISIBILITY_HIGH && rightVis <= CONSTANTS.VISIBILITY_LOW) {
    if (zDiff >= CONSTANTS.SIDE_VIEW_Z_DIFF_MIN) {
      return 'left_side';
    }
  }
  if (rightVis >= CONSTANTS.VISIBILITY_HIGH && leftVis <= CONSTANTS.VISIBILITY_LOW) {
    if (zDiff >= CONSTANTS.SIDE_VIEW_Z_DIFF_MIN) {
      return 'right_side';
    }
  }
  
  return 'unknown';
};

// Get side landmarks
const getVisibleSideLandmarks = (landmarks: any[], viewMode: ViewMode) => {
  const isLeft = viewMode === 'left_side';
  return {
    shoulder: landmarks[isLeft ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER],
    elbow: landmarks[isLeft ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW],
    wrist: landmarks[isLeft ? LM.LEFT_WRIST : LM.RIGHT_WRIST],
    hip: landmarks[isLeft ? LM.LEFT_HIP : LM.RIGHT_HIP],
    knee: landmarks[isLeft ? LM.LEFT_KNEE : LM.RIGHT_KNEE],
    ankle: landmarks[isLeft ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE],
  };
};

// Check side landmark visibility
const areSideLandmarksVisible = (landmarks: any[], viewMode: ViewMode): boolean => {
  const side = getVisibleSideLandmarks(landmarks, viewMode);
  return (
    isLandmarkVisible(side.shoulder, CONSTANTS.VISIBILITY_THRESHOLD) &&
    isLandmarkVisible(side.elbow, CONSTANTS.VISIBILITY_THRESHOLD) &&
    isLandmarkVisible(side.wrist, CONSTANTS.VISIBILITY_THRESHOLD) &&
    isLandmarkVisible(side.hip, CONSTANTS.VISIBILITY_THRESHOLD) &&
    isLandmarkVisible(side.ankle, CONSTANTS.VISIBILITY_THRESHOLD)
  );
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
  const [viewMode, setViewMode] = useState<ViewMode>('unknown');
  const [viewLocked, setViewLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSessionSaved, setIsSessionSaved] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formQuality, setFormQuality] = useState<'good' | 'warning' | 'poor'>('good');

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
  
  // View detection refs
  const viewModeRef = useRef<ViewMode>('unknown');
  const viewLockedRef = useRef(false);
  const lastRepTimeRef = useRef(0);
  const baselineShoulderYRef = useRef<number | null>(null);
  const viewConfidenceRef = useRef(0);

  const poseRef = useRef<any>(null);
  const lastPoseResultsRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  
  // UI buffer
  const uiBufferRef = useRef({
    count: 0,
    state: 'get_ready' as PushUpState,
    feedback: 'Enable camera to start',
    poseDetected: false,
    viewMode: 'unknown' as ViewMode,
    viewLocked: false,
    formQuality: 'good' as 'good' | 'warning' | 'poor',
    needsSync: false,
  });
  const uiSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    trackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  // Timer
  useEffect(() => {
    if (!isTracking || isPaused) return;
    const interval = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTracking, isPaused]);

  // UI sync
  useEffect(() => {
    const syncInterval = 1000 / CONSTANTS.UI_SYNC_FPS;
    
    uiSyncIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      const buffer = uiBufferRef.current;
      if (!buffer.needsSync) return;
      
      setCount(buffer.count);
      setState(buffer.state);
      setFeedback(buffer.feedback);
      setPoseDetected(buffer.poseDetected);
      setViewMode(buffer.viewMode);
      setViewLocked(buffer.viewLocked);
      setFormQuality(buffer.formQuality);
      buffer.needsSync = false;
    }, syncInterval);
    
    return () => {
      if (uiSyncIntervalRef.current) {
        clearInterval(uiSyncIntervalRef.current);
        uiSyncIntervalRef.current = null;
      }
    };
  }, []);

  // Initialize MediaPipe
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
    return () => {};
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Camera management
  useEffect(() => {
    if (cameraEnabled) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraEnabled, facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Component unmount cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
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
    if (animationRef.current !== undefined) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    
    const render = () => {
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

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      ctx.save();
      if (facingMode === 'user') {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      if (lastPoseResultsRef.current?.poseLandmarks) {
        drawPose(ctx, lastPoseResultsRef.current.poseLandmarks);
      }
      
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
      const constraints = getCameraConstraints(facingMode);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
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
        
        startRenderLoop();
        
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
          console.log('Using manual frame sending');
          let lastFrameTime = 0;
          const frameInterval = 1000 / getPoseFPS();
          
          if (manualFrameRef.current !== undefined) {
            cancelAnimationFrame(manualFrameRef.current);
            manualFrameRef.current = undefined;
          }
          
          const sendFrame = async () => {
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
                  console.error('Error sending frame:', error);
                }
              }
            }
            
            if (isMountedRef.current && streamRef.current) {
              manualFrameRef.current = requestAnimationFrame(sendFrame);
            } else {
              manualFrameRef.current = undefined;
            }
          };
          manualFrameRef.current = requestAnimationFrame(sendFrame);
        } else {
          console.log('MediaPipe not available');
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      setError('Camera access denied. Please allow camera permissions.');
      setFeedback('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (animationRef.current !== undefined) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    
    if (manualFrameRef.current !== undefined) {
      cancelAnimationFrame(manualFrameRef.current);
      manualFrameRef.current = undefined;
    }
    
    if (cameraInstanceRef.current) {
      try {
        cameraInstanceRef.current.stop();
      } catch (e) {
        console.error('Error stopping camera:', e);
      }
      cameraInstanceRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
    
    lastPoseResultsRef.current = null;
  };

  const onPoseResults = (results: any) => {
    if (!isMountedRef.current) return;
    
    lastPoseResultsRef.current = results;
    
    if (results.poseLandmarks) {
      if (uiBufferRef.current.poseDetected !== true) {
        uiBufferRef.current.poseDetected = true;
        uiBufferRef.current.needsSync = true;
      }
      visibilityGracePeriodRef.current = 0;
      
      if (!trackingRef.current) {
        const detectedView = detectViewMode(results.poseLandmarks);
        if (detectedView !== 'unknown' && uiBufferRef.current.viewMode !== detectedView) {
          uiBufferRef.current.viewMode = detectedView;
          uiBufferRef.current.needsSync = true;
        }
      }
      
      if (trackingRef.current && !pausedRef.current) {
        detectPushUp(results.poseLandmarks);
      }
    } else {
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

    // Draw connections with gradient
    connections.forEach(([start, end]) => {
      const startLm = landmarks[start];
      const endLm = landmarks[end];
      if (isLandmarkVisible(startLm, 0.3) && isLandmarkVisible(endLm, 0.3)) {
        const gradient = ctx.createLinearGradient(
          startLm.x * ctx.canvas.width, 
          startLm.y * ctx.canvas.height,
          endLm.x * ctx.canvas.width, 
          endLm.y * ctx.canvas.height
        );
        gradient.addColorStop(0, '#00ff88');
        gradient.addColorStop(1, '#00ccff');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(startLm.x * ctx.canvas.width, startLm.y * ctx.canvas.height);
        ctx.lineTo(endLm.x * ctx.canvas.width, endLm.y * ctx.canvas.height);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // Draw landmarks
    landmarks.forEach((landmark, idx) => {
      if (isLandmarkVisible(landmark, 0.3)) {
        const isKeyPoint = [
          LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
          LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
          LM.LEFT_WRIST, LM.RIGHT_WRIST,
          LM.LEFT_HIP, LM.RIGHT_HIP
        ].includes(idx);
        
        ctx.fillStyle = isKeyPoint ? '#ff3366' : '#ffdd00';
        ctx.shadowColor = isKeyPoint ? 'rgba(255, 51, 102, 0.8)' : 'rgba(255, 221, 0, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(
          landmark.x * ctx.canvas.width,
          landmark.y * ctx.canvas.height,
          isKeyPoint ? 6 : 4,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    ctx.restore();
  };

  const detectPushUp = (landmarks: any[]) => {
    const now = Date.now();
    
    // View detection with confidence building
    if (!viewLockedRef.current) {
      const detectedView = detectViewMode(landmarks);
      if (detectedView !== 'unknown') {
        if (viewModeRef.current === detectedView) {
          viewConfidenceRef.current++;
        } else {
          viewModeRef.current = detectedView;
          viewConfidenceRef.current = 1;
        }
        
        if (viewConfidenceRef.current >= 3 || stateRef.current === 'get_ready') {
          uiBufferRef.current.viewMode = detectedView;
          uiBufferRef.current.needsSync = true;
        }
      }
    }
    
    const currentView = viewModeRef.current;
    
    // Check visibility
    let landmarksVisible = false;
    
    if (currentView === 'front' || currentView === 'unknown') {
      const requiredPoints = [
        LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER,
        LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
        LM.LEFT_WRIST, LM.RIGHT_WRIST,
        LM.LEFT_HIP, LM.RIGHT_HIP,
        LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
      ];
      landmarksVisible = requiredPoints.every(idx => 
        isLandmarkVisible(landmarks[idx], CONSTANTS.VISIBILITY_THRESHOLD)
      );
    } else {
      landmarksVisible = areSideLandmarksVisible(landmarks, currentView);
    }
    
    if (!landmarksVisible) {
      if (visibilityGracePeriodRef.current === 0) {
        visibilityGracePeriodRef.current = now;
      } else if (now - visibilityGracePeriodRef.current > CONSTANTS.GRACE_PERIOD_MS) {
        if (stateRef.current !== 'get_ready') {
          stateRef.current = 'get_ready';
          uiBufferRef.current.state = 'get_ready';
        }
        const feedback = currentView === 'front' || currentView === 'unknown'
          ? 'Move back - full body must be visible'
          : 'Stay in side view - adjust position';
        if (uiBufferRef.current.feedback !== feedback) {
          uiBufferRef.current.feedback = feedback;
          uiBufferRef.current.needsSync = true;
        }
      } else {
        if (uiBufferRef.current.feedback !== 'Stay in frame...') {
          uiBufferRef.current.feedback = 'Stay in frame...';
          uiBufferRef.current.needsSync = true;
        }
      }
      return;
    }
    
    visibilityGracePeriodRef.current = 0;
    
    // Route to detection
    if (currentView === 'left_side' || currentView === 'right_side') {
      detectPushUpSideView(landmarks, currentView);
    } else {
      detectPushUpFrontView(landmarks);
    }
  };
  
  // Front-view detection - enhanced
  const detectPushUpFrontView = (landmarks: any[]) => {
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

    // Enhanced elbow flare detection
    const leftShoulderToElbow = {
      x: landmarks[LM.LEFT_ELBOW].x - landmarks[LM.LEFT_SHOULDER].x,
      y: landmarks[LM.LEFT_ELBOW].y - landmarks[LM.LEFT_SHOULDER].y
    };
    const rightShoulderToElbow = {
      x: landmarks[LM.RIGHT_ELBOW].x - landmarks[LM.RIGHT_SHOULDER].x,
      y: landmarks[LM.RIGHT_ELBOW].y - landmarks[LM.RIGHT_SHOULDER].y
    };
    const shoulderLine = {
      x: landmarks[LM.RIGHT_SHOULDER].x - landmarks[LM.LEFT_SHOULDER].x,
      y: landmarks[LM.RIGHT_SHOULDER].y - landmarks[LM.LEFT_SHOULDER].y
    };
    
    const leftElbowFlare = Math.abs(
      Math.atan2(leftShoulderToElbow.y, leftShoulderToElbow.x) - 
      Math.atan2(shoulderLine.y, shoulderLine.x)
    ) * 180 / Math.PI;
    
    const rightElbowFlare = Math.abs(
      Math.atan2(rightShoulderToElbow.y, rightShoulderToElbow.x) - 
      Math.atan2(-shoulderLine.y, -shoulderLine.x)
    ) * 180 / Math.PI;
    
    const maxElbowFlare = Math.max(leftElbowFlare, rightElbowFlare);

    // Form feedback and quality
    let formFeedback = 'Perfect form!';
    let quality: 'good' | 'warning' | 'poor' = 'good';
    
    if (avgBackAngle < CONSTANTS.BACK_ALIGNMENT_MIN) {
      formFeedback = 'Keep your back straight - don\'t sag';
      quality = 'poor';
    } else if (maxElbowFlare > CONSTANTS.ELBOW_FLARE_THRESHOLD && avgElbowAngle < 120) {
      formFeedback = 'Tuck elbows closer to body';
      quality = 'warning';
    } else if (avgElbowAngle < 120 && avgElbowAngle > 90) {
      formFeedback = 'Good depth - keep going!';
      quality = 'good';
    }
    
    if (uiBufferRef.current.formQuality !== quality) {
      uiBufferRef.current.formQuality = quality;
      uiBufferRef.current.needsSync = true;
    }

    const now = Date.now();

    if (stateRef.current === 'get_ready') {
      if (avgBackAngle > CONSTANTS.PLANK_BACK_ANGLE && avgElbowAngle > CONSTANTS.PLANK_ELBOW_ANGLE) {
        if (now - lastStateChangeRef.current > CONSTANTS.MIN_STATE_CHANGE_MS) {
          stateRef.current = 'plank';
          viewLockedRef.current = true;
          uiBufferRef.current.state = 'plank';
          uiBufferRef.current.viewLocked = true;
          uiBufferRef.current.feedback = '🔒 Front view locked - Start your set!';
          uiBufferRef.current.needsSync = true;
          lastStateChangeRef.current = now;
        }
      } else {
        const newFeedback = 'Get into plank: straight body, arms extended';
        if (uiBufferRef.current.feedback !== newFeedback) {
          uiBufferRef.current.feedback = newFeedback;
          uiBufferRef.current.needsSync = true;
        }
      }
    } else if (stateRef.current === 'plank' || stateRef.current === 'up') {
      if (avgElbowAngle < CONSTANTS.DOWN_ELBOW_ANGLE) {
        if (now - lastStateChangeRef.current > CONSTANTS.MIN_STATE_CHANGE_MS) {
          stateRef.current = 'down';
          uiBufferRef.current.state = 'down';
          uiBufferRef.current.feedback = 'Push up now! 💪';
          uiBufferRef.current.needsSync = true;
          lastStateChangeRef.current = now;
        }
      } else {
        if (uiBufferRef.current.feedback !== formFeedback) {
          uiBufferRef.current.feedback = formFeedback;
          uiBufferRef.current.needsSync = true;
        }
      }
    } else if (stateRef.current === 'down') {
      if (avgElbowAngle > CONSTANTS.UP_ELBOW_ANGLE) {
        const timeSinceDown = now - lastStateChangeRef.current;
        const timeSinceLastRep = now - lastRepTimeRef.current;
        
        if (timeSinceDown > CONSTANTS.MIN_STATE_CHANGE_MS && 
            timeSinceLastRep > CONSTANTS.MIN_REP_DURATION_MS) {
          countRef.current++;
          stateRef.current = 'up';
          const newFeedback = `🎯 Rep ${countRef.current}! ${formFeedback}`;
          uiBufferRef.current.count = countRef.current;
          uiBufferRef.current.state = 'up';
          uiBufferRef.current.feedback = newFeedback;
          uiBufferRef.current.needsSync = true;
          lastStateChangeRef.current = now;
          lastRepTimeRef.current = now;
        }
      } else {
        if (uiBufferRef.current.feedback !== 'Push up - extend arms fully!') {
          uiBufferRef.current.feedback = 'Push up - extend arms fully!';
          uiBufferRef.current.needsSync = true;
        }
      }
    }
  };
  
  // Side-view detection - enhanced
  const detectPushUpSideView = (landmarks: any[], viewMode: ViewMode) => {
    const side = getVisibleSideLandmarks(landmarks, viewMode);
    const now = Date.now();
    const viewLabel = viewMode === 'left_side' ? 'Left' : 'Right';
    
    const elbowAngle = calculateAngle(side.shoulder, side.elbow, side.wrist);
    const bodyAngle = calculateAngle(side.shoulder, side.hip, side.ankle);
    
    const shoulderY = side.shoulder.y;
    const hipY = side.hip.y;
    
    if (baselineShoulderYRef.current === null && stateRef.current === 'get_ready') {
      baselineShoulderYRef.current = shoulderY;
    }
    
    const baseline = baselineShoulderYRef.current ?? shoulderY;
    const shoulderDrop = shoulderY - baseline;
    
    // Form feedback
    let formFeedback = 'Perfect form!';
    let quality: 'good' | 'warning' | 'poor' = 'good';
    
    if (bodyAngle < CONSTANTS.BACK_ALIGNMENT_MIN) {
      formFeedback = 'Keep body straight - don\'t sag hips';
      quality = 'poor';
    } else if (elbowAngle < 100 && elbowAngle > 80) {
      formFeedback = 'Great depth! 💪';
      quality = 'good';
    }
    
    if (uiBufferRef.current.formQuality !== quality) {
      uiBufferRef.current.formQuality = quality;
      uiBufferRef.current.needsSync = true;
    }

    if (stateRef.current === 'get_ready') {
      const isElbowExtended = elbowAngle > CONSTANTS.SIDE_PLANK_ELBOW_ANGLE;
      const isStable = Math.abs(shoulderDrop) < CONSTANTS.SHOULDER_STABLE_TOLERANCE;
      const bodyIsAligned = bodyAngle > CONSTANTS.BACK_ALIGNMENT_MIN;
      
      if (isElbowExtended && isStable && bodyIsAligned) {
        if (now - lastStateChangeRef.current > CONSTANTS.MIN_STATE_CHANGE_MS) {
          stateRef.current = 'plank';
          viewLockedRef.current = true;
          baselineShoulderYRef.current = shoulderY;
          uiBufferRef.current.state = 'plank';
          uiBufferRef.current.viewLocked = true;
          uiBufferRef.current.feedback = `🔒 ${viewLabel} side locked - Start your set!`;
          uiBufferRef.current.needsSync = true;
          lastStateChangeRef.current = now;
        }
      } else {
        const newFeedback = `${viewLabel} side - plank position ready`;
        if (uiBufferRef.current.feedback !== newFeedback) {
          uiBufferRef.current.feedback = newFeedback;
          uiBufferRef.current.needsSync = true;
        }
      }
    } else if (stateRef.current === 'plank' || stateRef.current === 'up') {
      const isElbowBent = elbowAngle < CONSTANTS.SIDE_DOWN_ELBOW_ANGLE;
      const hasShoulderDropped = shoulderDrop > CONSTANTS.SHOULDER_DROP_RATIO;
      
      if (isElbowBent || hasShoulderDropped) {
        if (now - lastStateChangeRef.current > CONSTANTS.MIN_STATE_CHANGE_MS) {
          stateRef.current = 'down';
          uiBufferRef.current.state = 'down';
          uiBufferRef.current.feedback = 'Push up now! 💪';
          uiBufferRef.current.needsSync = true;
          lastStateChangeRef.current = now;
        }
      } else {
        if (uiBufferRef.current.feedback !== formFeedback) {
          uiBufferRef.current.feedback = formFeedback;
          uiBufferRef.current.needsSync = true;
        }
      }
    } else if (stateRef.current === 'down') {
      const isElbowExtended = elbowAngle > CONSTANTS.SIDE_UP_ELBOW_ANGLE;
      const hasShoulderRisen = shoulderDrop < CONSTANTS.SHOULDER_STABLE_TOLERANCE;
      
      if (isElbowExtended && hasShoulderRisen) {
        const timeSinceDown = now - lastStateChangeRef.current;
        const timeSinceLastRep = now - lastRepTimeRef.current;
        
        if (timeSinceDown > CONSTANTS.MIN_STATE_CHANGE_MS && 
            timeSinceLastRep > CONSTANTS.MIN_REP_DURATION_MS) {
          countRef.current++;
          stateRef.current = 'up';
          const newFeedback = `🎯 Rep ${countRef.current}! ${formFeedback}`;
          uiBufferRef.current.count = countRef.current;
          uiBufferRef.current.state = 'up';
          uiBufferRef.current.feedback = newFeedback;
          uiBufferRef.current.needsSync = true;
          lastStateChangeRef.current = now;
          lastRepTimeRef.current = now;
        }
      } else {
        if (uiBufferRef.current.feedback !== 'Push up - extend fully!') {
          uiBufferRef.current.feedback = 'Push up - extend fully!';
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
    setFeedback('Get into position...');
    setFormQuality('good');
    
    viewModeRef.current = 'unknown';
    viewLockedRef.current = false;
    viewConfidenceRef.current = 0;
    lastRepTimeRef.current = 0;
    baselineShoulderYRef.current = null;
    
    uiBufferRef.current = {
      count: 0,
      state: 'get_ready',
      feedback: 'Get into position...',
      poseDetected: uiBufferRef.current.poseDetected,
      viewMode: 'unknown',
      viewLocked: false,
      formQuality: 'good',
      needsSync: true,
    };
  };

  const togglePause = () => {
    setIsPaused(p => !p);
    if (!isPaused) {
      setFeedback('⏸️ Paused');
    } else {
      setFeedback('▶️ Resumed - continue!');
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
      setFeedback('Session ended - no reps completed');
    } else if (!currentUser) {
      setFeedback(`🎉 ${count} push-ups in ${formatTime(duration)}! Login to save.`);
    } else {
      setFeedback(`🎉 ${count} push-ups in ${formatTime(duration)}! Click Save.`);
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
      setFeedback(`✅ Saved! ${count} push-ups in ${formatTime(duration)}`);
    } catch (error) {
      console.error('Failed to save:', error);
      setFeedback('Failed to save. Please try again.');
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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {!cameraEnabled && (
        <div className="z-20 flex flex-col items-center gap-6 p-6">
          <div className="text-center">
            <Activity className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-white mb-2">AI Push-up Tracker</h2>
            <p className="text-gray-400 text-sm">Track your reps with pose detection</p>
          </div>
          <button
            onClick={() => setCameraEnabled(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl transition-all transform hover:scale-105 flex items-center gap-3"
          >
            <Camera size={28} />
            Enable Camera
          </button>
          <p className="text-gray-500 text-sm max-w-xs text-center">
            Camera access required for AI-powered tracking
          </p>
        </div>
      )}

      {cameraEnabled && (
        <>
          {/* Top feedback bar */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 lg:p-6">
            <div className={`backdrop-blur-xl rounded-2xl p-4 lg:p-5 shadow-2xl border-2 transition-colors ${
              formQuality === 'good' ? 'bg-emerald-900/40 border-emerald-500/50' :
              formQuality === 'warning' ? 'bg-yellow-900/40 border-yellow-500/50' :
              'bg-red-900/40 border-red-500/50'
            }`}>
              <div className="text-white text-base lg:text-lg font-semibold text-center">
                {feedback}
              </div>
            </div>
            
            {error && (
              <div className="mt-3 bg-red-600/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl text-sm flex items-center gap-2 justify-center">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
          </div>

          {/* Stats panel - right side */}
          <div className="absolute top-6 right-4 lg:right-6 z-10 flex flex-col gap-3">
            {/* Count */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-purple-900/60 to-pink-900/60 border-2 border-purple-500/50 rounded-2xl px-6 py-4 shadow-2xl">
              <div className="text-white text-5xl lg:text-6xl font-black text-center">{count}</div>
              <div className="text-purple-200 text-xs lg:text-sm font-semibold text-center mt-1">REPS</div>
            </div>
            
            {/* Duration */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-900/60 to-cyan-900/60 border-2 border-blue-500/50 rounded-2xl px-5 py-3 shadow-2xl">
              <div className="text-white text-2xl lg:text-3xl font-bold text-center">{formatTime(duration)}</div>
              <div className="text-blue-200 text-xs font-semibold text-center">TIME</div>
            </div>
            
            {/* Pose status */}
            <div className={`backdrop-blur-xl rounded-xl px-4 py-2 shadow-xl border-2 ${
              poseDetected 
                ? 'bg-green-900/60 border-green-500/50' 
                : 'bg-red-900/60 border-red-500/50'
            }`}>
              <div className="text-white text-xs lg:text-sm font-bold text-center">
                {poseDetected ? '✓ TRACKING' : '✗ NO POSE'}
              </div>
            </div>
            
            {/* View mode */}
            {isTracking && viewMode !== 'unknown' && (
              <div className={`backdrop-blur-xl rounded-xl px-4 py-2 shadow-xl border-2 ${
                viewLocked 
                  ? 'bg-purple-900/60 border-purple-500/50' 
                  : 'bg-orange-900/60 border-orange-500/50'
              }`}>
                <div className="text-white text-xs lg:text-sm font-bold text-center">
                  {viewLocked ? '🔒 ' : '👀 '}
                  {viewMode === 'front' ? 'FRONT' : 
                   viewMode === 'left_side' ? 'LEFT' : 'RIGHT'}
                </div>
              </div>
            )}
            
            {/* Pre-tracking view preview */}
            {!isTracking && !sessionEnded && viewMode !== 'unknown' && poseDetected && (
              <div className="backdrop-blur-xl bg-cyan-900/60 border-2 border-cyan-500/50 rounded-xl px-4 py-2 shadow-xl">
                <div className="text-white text-xs lg:text-sm font-semibold text-center">
                  📷 {viewMode === 'front' ? 'FRONT' : 
                      viewMode === 'left_side' ? 'LEFT' : 'RIGHT'}
                </div>
              </div>
            )}
            
            {/* State indicator */}
            {isTracking && (
              <div className={`backdrop-blur-xl rounded-xl px-4 py-2 shadow-xl border-2 font-black text-xs lg:text-sm uppercase tracking-wider ${
                state === 'get_ready' ? 'bg-yellow-900/60 border-yellow-500/50 text-yellow-100' :
                state === 'plank' ? 'bg-blue-900/60 border-blue-500/50 text-blue-100' :
                state === 'down' ? 'bg-red-900/60 border-red-500/50 text-red-100' :
                'bg-green-900/60 border-green-500/50 text-green-100'
              }`}>
                <div className="text-center">{state.replace('_', ' ')}</div>
              </div>
            )}
          </div>

          {/* Control buttons */}
          <div className="absolute bottom-8 lg:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
            {!isTracking && !sessionEnded ? (
              <button
                onClick={startTracking}
                disabled={!poseDetected && poseRef.current !== null}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-8 lg:px-12 py-4 lg:py-5 rounded-full font-black text-base lg:text-xl shadow-2xl transition-all transform hover:scale-105 disabled:scale-100 flex items-center gap-3"
              >
                <Play size={24} fill="white" />
                START
              </button>
            ) : isTracking ? (
              <>
                <button
                  onClick={togglePause}
                  className="backdrop-blur-xl bg-cyan-600/90 hover:bg-cyan-700 border-2 border-cyan-400/50 text-white px-6 lg:px-10 py-4 rounded-full font-bold shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play size={20} fill="white" />
                      <span className="hidden sm:inline">Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause size={20} fill="white" />
                      <span className="hidden sm:inline">Pause</span>
                    </>
                  )}
                </button>
                <button
                  onClick={endTracking}
                  className="backdrop-blur-xl bg-red-600/90 hover:bg-red-700 border-2 border-red-400/50 text-white px-6 lg:px-10 py-4 rounded-full font-bold shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <Square size={20} fill="white" />
                  <span className="hidden sm:inline">End</span>
                </button>
              </>
            ) : sessionEnded && count > 0 && !isSessionSaved ? (
              <button
                onClick={saveSession}
                disabled={isSaving || !currentUser || count === 0}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white px-8 lg:px-12 py-4 lg:py-5 rounded-full font-black shadow-2xl transition-all transform hover:scale-105 flex items-center gap-3"
              >
                <Save size={24} />
                {isSaving ? 'SAVING...' : 'SAVE SESSION'}
              </button>
            ) : sessionEnded && isSessionSaved ? (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 lg:px-12 py-4 lg:py-5 rounded-full font-black shadow-2xl flex items-center gap-3">
                <Save size={24} />
                SAVED!
              </div>
            ) : null}
          </div>

          {/* Camera controls */}
          <button
            onClick={toggleCamera}
            className="absolute bottom-8 right-4 lg:right-6 z-10 backdrop-blur-xl bg-gray-800/80 hover:bg-gray-700/80 border-2 border-gray-600/50 text-white p-4 rounded-full transition-all shadow-2xl transform hover:scale-110"
            title="Flip Camera"
          >
            <RotateCw size={22} />
          </button>

          <button
            onClick={() => {
              setCameraEnabled(false);
              setIsTracking(false);
            }}
            className="absolute bottom-8 left-4 lg:left-6 z-10 backdrop-blur-xl bg-gray-800/80 hover:bg-gray-700/80 border-2 border-gray-600/50 text-white p-4 rounded-full transition-all shadow-2xl transform hover:scale-110"
            title="Disable Camera"
          >
            <CameraOff size={22} />
          </button>
        </>
      )}
    </div>
  );
}