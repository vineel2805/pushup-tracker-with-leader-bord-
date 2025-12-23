import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Camera, CameraOff, RotateCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addSession } from '../services/firestoreService';

type PushUpState = 'get_ready' | 'plank' | 'down' | 'up';

// Constants
const CONSTANTS = {
  MIN_STATE_CHANGE_MS: 300,
  VISIBILITY_THRESHOLD: 0.3,
  POSE_FPS: 30,
  PLANK_BACK_ANGLE: 140,
  PLANK_ELBOW_ANGLE: 150,
  DOWN_ELBOW_ANGLE: 90,
  UP_ELBOW_ANGLE: 150,
  MAX_ELBOW_FLARE: 70,
  GRACE_PERIOD_MS: 2000,
  SAVE_RETRY_ATTEMPTS: 3,
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
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  
  const stateRef = useRef<PushUpState>('get_ready');
  const countRef = useRef(0);
  const trackingRef = useRef(false);
  const pausedRef = useRef(false);
  const lastStateChangeRef = useRef(0);
  const visibilityGracePeriodRef = useRef(0);

  const poseRef = useRef<any>(null);
  const lastPoseResultsRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);

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

  // Initialize MediaPipe Pose
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
        setError('Pose detection unavailable - using video only mode');
        poseRef.current = null;
      }
    };

    loadPose();
  }, []);

  // Camera management
  useEffect(() => {
    if (cameraEnabled) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [cameraEnabled, facingMode]);

  // Unified render loop
  const startRenderLoop = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    
    const render = () => {
      if (!canvasRef.current || !videoRef.current || !streamRef.current) {
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
      
      animationRef.current = requestAnimationFrame(render);
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
          const frameInterval = 1000 / CONSTANTS.POSE_FPS;
          
          const sendFrame = async () => {
            const now = Date.now();
            if (videoRef.current && poseRef.current?.pose && videoRef.current.readyState >= 2) {
              if (now - lastFrameTime >= frameInterval) {
                lastFrameTime = now;
                try {
                  await poseRef.current.pose.send({ image: videoRef.current });
                } catch (error) {
                  console.error('Error sending frame to pose detection:', error);
                }
              }
            }
            if (streamRef.current) {
              requestAnimationFrame(sendFrame);
            }
          };
          sendFrame();
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
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    
    if (cameraInstanceRef.current) {
      try {
        cameraInstanceRef.current.stop();
      } catch (e) {
        console.error('Error stopping camera instance:', e);
      }
      cameraInstanceRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const onPoseResults = (results: any) => {
    lastPoseResultsRef.current = results;
    
    if (results.poseLandmarks) {
      setPoseDetected(true);
      visibilityGracePeriodRef.current = 0;
      
      if (trackingRef.current && !pausedRef.current) {
        detectPushUp(results.poseLandmarks);
      }
    } else {
      setPoseDetected(false);
      if (trackingRef.current) {
        setFeedback('Position yourself in frame');
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
        setState('get_ready');
        setFeedback('Full body must be visible - move back');
      } else {
        setFeedback('Stay in frame...');
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
          setState('plank');
          setFeedback('Perfect! Ready to start');
          lastStateChangeRef.current = now;
        }
      } else {
        setFeedback('Get into plank position (straight body, arms extended)');
      }
    } else if (stateRef.current === 'plank' || stateRef.current === 'up') {
      if (avgElbowAngle < CONSTANTS.DOWN_ELBOW_ANGLE) {
        if (now - lastStateChangeRef.current > CONSTANTS.MIN_STATE_CHANGE_MS) {
          stateRef.current = 'down';
          setState('down');
          setFeedback('Push up now!');
          lastStateChangeRef.current = now;
        }
      } else {
        setFeedback(formFeedback);
      }
    } else if (stateRef.current === 'down') {
      if (avgElbowAngle > CONSTANTS.UP_ELBOW_ANGLE) {
        if (now - lastStateChangeRef.current > CONSTANTS.MIN_STATE_CHANGE_MS) {
          countRef.current++;
          setCount(countRef.current);
          stateRef.current = 'up';
          setState('up');
          setFeedback(`Rep ${countRef.current}! ${formFeedback}`);
          lastStateChangeRef.current = now;
        }
      } else {
        setFeedback('Keep pushing up');
      }
    }
  };

  const startTracking = () => {
    setIsTracking(true);
    setIsPaused(false);
    countRef.current = 0;
    setCount(0);
    setDuration(0);
    stateRef.current = 'get_ready';
    setState('get_ready');
    setFeedback('Get into plank position');
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

  const endTracking = async () => {
    setIsTracking(false);
    setIsPaused(false);
    stateRef.current = 'get_ready';
    setState('get_ready');
    
    if (currentUser && count > 0) {
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
        
        setFeedback(`✓ Session saved! ${count} push-ups in ${formatTime(duration)}`);
      } catch (error) {
        console.error('Failed to save session:', error);
        setFeedback(`Session: ${count} push-ups in ${formatTime(duration)} (Save failed - try again)`);
      } finally {
        setIsSaving(false);
      }
    } else if (count > 0) {
      setFeedback(`Session: ${count} push-ups in ${formatTime(duration)} (Login to save progress)`);
    } else {
      setFeedback('Session ended - no push-ups completed');
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
          <div className="absolute top-6 left-6 right-6 z-10 flex flex-col gap-3">
            <div className="bg-black/80 text-white px-6 py-3 rounded-xl font-semibold backdrop-blur-sm">
              {feedback}
            </div>
            
            {error && (
              <div className="bg-red-600/90 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {isTracking && (
              <div className={`px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider self-start ${
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
          <div className="absolute top-6 right-6 z-10 flex flex-col items-end gap-2">
            <div className="bg-black/80 backdrop-blur-sm rounded-xl px-6 py-3 text-right">
              <div className="text-white text-5xl font-bold">{count}</div>
              <div className="text-white/70 text-sm font-medium">Push-ups</div>
            </div>
            
            <div className="bg-black/80 backdrop-blur-sm rounded-xl px-6 py-3 text-right">
              <div className="text-white text-2xl font-semibold">{formatTime(duration)}</div>
              <div className="text-white/70 text-xs font-medium">Duration</div>
            </div>
            
            <div className={`px-4 py-2 rounded-xl ${
              poseDetected ? 'bg-green-600/80' : 'bg-red-600/80'
            } text-white text-sm font-medium`}>
              {poseDetected ? '✓ Pose Detected' : '✗ No Pose'}
            </div>
          </div>

          {/* Control buttons - Bottom Center */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
            {!isTracking ? (
              <button
                onClick={startTracking}
                disabled={!poseDetected && poseRef.current !== null}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-colors flex items-center gap-3"
              >
                <Play size={24} fill="white" />
                Start Tracking
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play size={20} fill="white" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause size={20} fill="white" />
                      Pause
                    </>
                  )}
                </button>
                <button
                  onClick={endTracking}
                  disabled={isSaving}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2"
                >
                  <Square size={20} fill="white" />
                  {isSaving ? 'Saving...' : 'End Session'}
                </button>
              </>
            )}
          </div>

          {/* Camera flip button */}
          <button
            onClick={toggleCamera}
            className="absolute bottom-8 right-6 z-10 bg-black/60 hover:bg-black/80 text-white p-4 rounded-full transition-colors shadow-lg"
            title="Flip Camera"
          >
            <RotateCw size={24} />
          </button>

          {/* Camera disable button */}
          <button
            onClick={() => {
              setCameraEnabled(false);
              setIsTracking(false);
            }}
            className="absolute bottom-8 left-6 z-10 bg-black/60 hover:bg-black/80 text-white p-4 rounded-full transition-colors shadow-lg"
            title="Disable Camera"
          >
            <CameraOff size={24} />
          </button>
        </>
      )}
    </div>
  );
}