import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Plus, Minus, Camera, CameraOff, RefreshCw } from 'lucide-react';
import { addSession, getCurrentUser } from '../utils/mockData';
import { useNavigate } from 'react-router-dom';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

// Pose landmark indices
const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Push-up states
type PushUpState = 'IDLE' | 'UP' | 'DOWN';

// Calculate angle between three points
function calculateAngle(a: any, b: any, c: any): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

function isValidOrientation(landmarks: any[]): boolean {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  
  if (!leftShoulder || !rightShoulder) return false;
  
  const shoulderDistance = Math.abs(leftShoulder.x - rightShoulder.x);
  return shoulderDistance < 0.15;
}

function checkBodyAlignment(landmarks: any[]): boolean {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return false;
  
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const verticalDiff = Math.abs(shoulderY - hipY);
  
  const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  const hipX = (leftHip.x + rightHip.x) / 2;
  const horizontalDiff = Math.abs(shoulderX - hipX);
  
  return verticalDiff > 0.15 && verticalDiff < 0.6 && horizontalDiff < 0.2;
}

function checkLandmarkVisibility(landmark: any): boolean {
  return landmark && landmark.visibility !== undefined ? landmark.visibility > 0.7 : false;
}

export function TrackPage() {
  const [count, setCount] = useState(0);
  const [sets, setSets] = useState(1);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [currentState, setCurrentState] = useState<PushUpState>('IDLE');
  const [repValid, setRepValid] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string>('');
  const [detectionWarning, setDetectionWarning] = useState<string>('');
  
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<MediaPipeCamera | null>(null);
  const stateRef = useRef<PushUpState>('IDLE');
  const lastRepTimeRef = useRef<number>(0);
  const countRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTracking && !isPaused) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, isPaused]);

  // Initialize MediaPipe Pose
  useEffect(() => {
    const initPose = async () => {
      const pose = new Pose({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(onPoseResults);
      poseRef.current = pose;
    };

    initPose();

    return () => {
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, []);

  // Handle camera toggle
  useEffect(() => {
    if (cameraEnabled) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [cameraEnabled, facingMode]);

  const startCamera = async () => {
    try {
      setCameraError('');
      
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          
          // Initialize camera for MediaPipe
          if (poseRef.current && videoRef.current) {
            const camera = new MediaPipeCamera(videoRef.current, {
              onFrame: async () => {
                if (poseRef.current && videoRef.current) {
                  await poseRef.current.send({ image: videoRef.current });
                }
              },
              width: 1280,
              height: 720
            });
            camera.start();
            cameraRef.current = camera;
          }
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.message || 'Failed to access camera');
      setCameraEnabled(false);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
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
    if (!canvasRef.current || !results.poseLandmarks) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = videoRef.current?.videoWidth || 1280;
    canvas.height = videoRef.current?.videoHeight || 720;

    // Clear canvas
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pose landmarks and connections
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 4
    });
    drawLandmarks(ctx, results.poseLandmarks, {
      color: '#FF0000',
      lineWidth: 2,
      radius: 6
    });

    ctx.restore();

    // Process push-up detection only when tracking and not paused
    if (isTracking && !isPaused) {
      detectPushUp(results.poseLandmarks);
    }
  };

  const detectPushUp = (landmarks: any[]) => {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

    if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist) {
      setDetectionWarning('Body not fully visible');
      return;
    }

    const visibleLandmarks = [
      checkLandmarkVisibility(leftShoulder),
      checkLandmarkVisibility(leftElbow),
      checkLandmarkVisibility(leftWrist),
      checkLandmarkVisibility(rightShoulder),
      checkLandmarkVisibility(rightElbow),
      checkLandmarkVisibility(rightWrist)
    ];

    if (!visibleLandmarks.every(v => v)) {
      setDetectionWarning('Poor tracking quality');
      return;
    }

    if (!isValidOrientation(landmarks)) {
      setDetectionWarning('Turn sideways to camera');
      setRepValid(false);
      return;
    }

    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    const isAligned = checkBodyAlignment(landmarks);
    setRepValid(isAligned);

    if (!isAligned) {
      setDetectionWarning('Keep body straight');
    } else {
      setDetectionWarning('');
    }

    const currentTime = Date.now();
    const timeSinceLastRep = currentTime - lastRepTimeRef.current;

    if (stateRef.current === 'UP') {
      if (avgElbowAngle >= 100 && avgElbowAngle <= 120 && isAligned) {
        stateRef.current = 'DOWN';
        setCurrentState('DOWN');
      }
    } else if (stateRef.current === 'DOWN') {
      if (avgElbowAngle >= 145 && avgElbowAngle <= 165 && isAligned && timeSinceLastRep >= 900) {
        stateRef.current = 'UP';
        setCurrentState('UP');
        countRef.current += 1;
        setCount(countRef.current);
        lastRepTimeRef.current = currentTime;
      }
    } else if (stateRef.current === 'IDLE') {
      if (avgElbowAngle >= 145 && avgElbowAngle <= 165) {
        stateRef.current = 'UP';
        setCurrentState('UP');
      }
    }
  };

  const handleStart = () => {
    if (!cameraEnabled) {
      setCameraError('Please enable camera first');
      return;
    }
    setIsTracking(true);
    setIsPaused(false);
    stateRef.current = 'IDLE';
    setCurrentState('IDLE');
    countRef.current = 0;
    setCount(0);
    lastRepTimeRef.current = 0;
    setDetectionWarning('');
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleEnd = () => {
    if (count > 0) {
      const user = getCurrentUser();
      if (user) {
        addSession({
          userId: user.id,
          date: new Date().toISOString().split('T')[0],
          pushUps: count,
          duration: duration,
          sets: sets,
        });
      }
      navigate('/dashboard');
    }
    stopCamera();
  };

  const toggleCamera = () => {
    setCameraEnabled(!cameraEnabled);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {!cameraEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <CameraOff className="w-20 h-20 text-zinc-700 mx-auto mb-6" />
            <p className="text-white text-lg mb-2">Camera Disabled</p>
            <button
              onClick={toggleCamera}
              className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Camera className="w-5 h-5" />
              Enable Camera
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center px-4">
            <p className="text-red-500 text-lg mb-2">Camera Error</p>
            <p className="text-zinc-400">{cameraError}</p>
          </div>
        </div>
      )}

      {cameraEnabled && (
        <>
          <div className="absolute top-6 right-6 flex gap-3">
            <button
              onClick={switchCamera}
              className="w-10 h-10 bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-full transition-colors flex items-center justify-center"
              title="Switch Camera"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={toggleCamera}
              className="w-10 h-10 bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-full transition-colors flex items-center justify-center"
              title="Turn Off Camera"
            >
              <CameraOff className="w-5 h-5 text-white" />
            </button>
          </div>

          {!isTracking && (
            <div className="absolute top-6 left-6">
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                <button
                  onClick={() => setSets(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                >
                  <Minus className="w-4 h-4 text-white" />
                </button>
                <span className="text-white text-sm font-medium min-w-[60px] text-center">Set {sets}</span>
                <button
                  onClick={() => setSets(prev => prev + 1)}
                  className="w-8 h-8 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}

          {isTracking && !isPaused && (
            <>
              <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    currentState === 'UP' ? 'bg-emerald-500' : 
                    currentState === 'DOWN' ? 'bg-cyan-500' : 
                    'bg-zinc-500'
                  }`}></div>
                  <span className="text-white text-sm font-medium">{currentState}</span>
                </div>
              </div>

              <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${repValid ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="text-white text-sm">{repValid ? 'Good' : 'Fix'}</span>
                </div>
              </div>

              {detectionWarning && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur-sm rounded-lg px-4 py-2">
                  <span className="text-white text-sm font-medium">{detectionWarning}</span>
                </div>
              )}
            </>
          )}

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-7xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {count}
            </div>
            <div className="text-lg text-white/80 mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {formatTime(duration)}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm flex items-center justify-center gap-3 px-6">
            {!isTracking ? (
              <button
                onClick={handleStart}
                className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors flex items-center gap-2 font-medium"
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            ) : (
              <>
                <button
                  onClick={handlePause}
                  className="h-11 px-6 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full transition-colors flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleEnd}
                  className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  End
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
