import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Camera, CameraOff, RotateCw, Loader2, Save, Check, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addSession } from '../services/firestoreService';
import { voiceAgent } from '../services/voiceAgentService';

// ============================================================================
// CONFIGURATION - Simple and Relaxed
// ============================================================================
const CONFIG = {
  // Elbow angle thresholds (degrees) - RELAXED for front camera
  UP_ANGLE_MIN: 140,          // Arms fairly straight = up position (min)
  UP_ANGLE_MAX: 180,          // Arms fully straight (max)
  DOWN_ANGLE_MIN: 70,         // Elbows very bent (min)
  DOWN_ANGLE_MAX: 110,        // Elbows bent = down position (max)
  
  // Face vertical movement thresholds (normalized coordinates 0-1)
  // Face Y increases when moving DOWN in the frame
  FACE_MOVE_THRESHOLD: 0.015, // Reduced threshold for easier detection
  FACE_MIN_VISIBILITY: 0.3,   // Lowered visibility requirement
  
  // Timing
  MIN_REP_TIME_MS: 300,       // Minimum time for valid rep (debounce)
  FACE_LOST_PAUSE_MS: 2000,   // Auto-pause after face lost for this duration
  
  // Visibility - RELAXED for body landmarks
  MIN_VISIBILITY: 0.2,        // Accept lower visibility for arms
  
  // FPS
  POSE_FPS: 20,
  UI_FPS: 15,
};

// MediaPipe landmark indices
const LM = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;

const getCameraConstraints = (facing: 'user' | 'environment') => ({
  video: {
    facingMode: facing,
    width: { ideal: isMobile() ? 720 : 1280 },
    height: { ideal: isMobile() ? 540 : 720 },
    frameRate: { ideal: CONFIG.POSE_FPS },
  },
});

const isVisible = (lm: any) => lm && lm.visibility >= CONFIG.MIN_VISIBILITY;

// Calculate angle between three points (in degrees)
const calculateAngle = (a: any, b: any, c: any): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};

// ============================================================================
// PUSH-UP DETECTION LOGIC - ELBOW ANGLE + FACE MOTION VALIDATION
// ============================================================================
type State = 'up' | 'down';

interface DetectionResult {
  state: State;
  count: number;
  feedback: string;
  angle: number;
  faceY: number;        // Current face Y position (for debugging)
  faceValid: boolean;   // Whether face motion was validated
  faceVisible: boolean; // Whether face is currently visible
  faceMovement: number; // How much face moved (for debugging)
}

class PushUpDetector {
  // Core state
  state: State = 'up';
  count = 0;
  lastRepTime = 0;
  
  // Face tracking - we track the HIGHEST and LOWEST face Y positions
  private maxFaceY = 0;        // Highest Y value seen (lowest position in frame)
  private minFaceY = 1;        // Lowest Y value seen (highest position in frame)
  private lastFaceMovement = 0;
  
  reset() {
    this.state = 'up';
    this.count = 0;
    this.lastRepTime = 0;
    this.maxFaceY = 0;
    this.minFaceY = 1;
    this.lastFaceMovement = 0;
  }
  
  /**
   * Get face Y position from landmarks (using nose as primary, eyes as fallback)
   * Returns normalized Y coordinate (0 = top, 1 = bottom)
   */
  private getFaceY(landmarks: any[]): number | null {
    const nose = landmarks[LM.NOSE];
    const leftEye = landmarks[LM.LEFT_EYE];
    const rightEye = landmarks[LM.RIGHT_EYE];
    
    // Prefer nose if visible enough
    if (nose && nose.visibility >= CONFIG.FACE_MIN_VISIBILITY) {
      return nose.y;
    }
    
    // Fallback to average of eyes
    if (leftEye && rightEye && 
        leftEye.visibility >= CONFIG.FACE_MIN_VISIBILITY &&
        rightEye.visibility >= CONFIG.FACE_MIN_VISIBILITY) {
      return (leftEye.y + rightEye.y) / 2;
    }
    
    // Last resort: use any visible face landmark with lower threshold
    if (nose && nose.visibility >= 0.1) {
      return nose.y;
    }
    
    return null;
  }
  
  /**
   * Calculate average elbow angle from visible arms
   */
  private getElbowAngle(landmarks: any[]): number | null {
    const leftShoulder = landmarks[LM.LEFT_SHOULDER];
    const rightShoulder = landmarks[LM.RIGHT_SHOULDER];
    const leftElbow = landmarks[LM.LEFT_ELBOW];
    const rightElbow = landmarks[LM.RIGHT_ELBOW];
    const leftWrist = landmarks[LM.LEFT_WRIST];
    const rightWrist = landmarks[LM.RIGHT_WRIST];
    
    let totalAngle = 0;
    let armCount = 0;
    
    // Left arm angle
    if (leftShoulder && leftElbow && leftWrist &&
        isVisible(leftShoulder) && isVisible(leftElbow) && isVisible(leftWrist)) {
      const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
      if (!isNaN(angle)) {
        totalAngle += angle;
        armCount++;
      }
    }
    
    // Right arm angle
    if (rightShoulder && rightElbow && rightWrist &&
        isVisible(rightShoulder) && isVisible(rightElbow) && isVisible(rightWrist)) {
      const angle = calculateAngle(rightShoulder, rightElbow, rightWrist);
      if (!isNaN(angle)) {
        totalAngle += angle;
        armCount++;
      }
    }
    
    return armCount > 0 ? totalAngle / armCount : null;
  }
  
  /**
   * Main detection function - combines elbow angle with face motion validation
   * 
   * SIMPLE LOGIC:
   * 1. Track min/max face Y during the whole rep cycle
   * 2. When completing a rep (DOWN→UP), check if face traveled enough distance
   * 3. The face travel = maxFaceY - minFaceY (how much vertical movement occurred)
   */
  detect(landmarks: any[]): DetectionResult {
    const now = Date.now();
    
    // Get elbow angle
    const elbowAngle = this.getElbowAngle(landmarks);
    if (elbowAngle === null) {
      return {
        state: this.state,
        count: this.count,
        feedback: 'Show your arms',
        angle: 0,
        faceY: 0,
        faceValid: false,
        faceVisible: false,
        faceMovement: 0,
      };
    }
    
    // Get face Y position
    const faceY = this.getFaceY(landmarks);
    const faceVisible = faceY !== null;
    
    // Track min/max face Y throughout the rep
    if (faceVisible) {
      this.maxFaceY = Math.max(this.maxFaceY, faceY);
      this.minFaceY = Math.min(this.minFaceY, faceY);
      this.lastFaceMovement = this.maxFaceY - this.minFaceY; // Total vertical travel
    }
    
    // Determine elbow position based on angle
    const isElbowUp = elbowAngle >= CONFIG.UP_ANGLE_MIN;
    const isElbowDown = elbowAngle <= CONFIG.DOWN_ANGLE_MAX;
    
    // =========================================================================
    // STATE MACHINE
    // =========================================================================
    
    // STATE: UP → Check for transition to DOWN
    if (this.state === 'up') {
      if (isElbowDown) {
        // Transition to DOWN
        this.state = 'down';
        
        return {
          state: this.state,
          count: this.count,
          feedback: 'Push up!',
          angle: elbowAngle,
          faceY: faceY ?? 0,
          faceValid: this.lastFaceMovement > CONFIG.FACE_MOVE_THRESHOLD,
          faceVisible,
          faceMovement: this.lastFaceMovement,
        };
      }
      
      // Still in UP state
      return {
        state: this.state,
        count: this.count,
        feedback: 'Lower down',
        angle: elbowAngle,
        faceY: faceY ?? 0,
        faceValid: false,
        faceVisible,
        faceMovement: this.lastFaceMovement,
      };
    }
    
    // STATE: DOWN → Check for transition to UP (and count rep)
    if (this.state === 'down') {
      if (isElbowUp) {
        const timeSinceLastRep = now - this.lastRepTime;
        
        // Check if face traveled enough vertical distance during this rep
        // This catches the whole up-down-up motion
        const faceMovedEnough = this.lastFaceMovement > CONFIG.FACE_MOVE_THRESHOLD;
        
        // COUNT REP: Valid if face moved enough (or not visible) and debounce passed
        const validRep = (faceMovedEnough || !faceVisible) && 
                         timeSinceLastRep > CONFIG.MIN_REP_TIME_MS;
        
        if (validRep) {
          this.count++;
          this.lastRepTime = now;
        }
        
        // Reset face tracking for next rep
        this.state = 'up';
        if (faceVisible) {
          this.minFaceY = faceY;
          this.maxFaceY = faceY;
        } else {
          this.minFaceY = 1;
          this.maxFaceY = 0;
        }
        
        if (validRep) {
          return {
            state: this.state,
            count: this.count,
            feedback: `${this.count}!`,
            angle: elbowAngle,
            faceY: faceY ?? 0,
            faceValid: true,
            faceVisible,
            faceMovement: this.lastFaceMovement,
          };
        } else if (timeSinceLastRep <= CONFIG.MIN_REP_TIME_MS) {
          return {
            state: this.state,
            count: this.count,
            feedback: 'Too fast',
            angle: elbowAngle,
            faceY: faceY ?? 0,
            faceValid: false,
            faceVisible,
            faceMovement: this.lastFaceMovement,
          };
        } else {
          return {
            state: this.state,
            count: this.count,
            feedback: 'Move body more',
            angle: elbowAngle,
            faceY: faceY ?? 0,
            faceValid: false,
            faceVisible,
            faceMovement: this.lastFaceMovement,
          };
        }
      }
      
      // Still in DOWN state
      return {
        state: this.state,
        count: this.count,
        feedback: 'Push up!',
        angle: elbowAngle,
        faceY: faceY ?? 0,
        faceValid: this.lastFaceMovement > CONFIG.FACE_MOVE_THRESHOLD,
        faceVisible,
        faceMovement: this.lastFaceMovement,
      };
    }
    
    // Fallback (should never reach)
    return {
      state: this.state,
      count: this.count,
      feedback: 'Ready',
      angle: elbowAngle,
      faceY: faceY ?? 0,
      faceValid: false,
      faceVisible: faceVisible,
      faceMovement: 0,
    };
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function TrackPage() {
  const { currentUser } = useAuth();
  const [count, setCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [feedback, setFeedback] = useState('Enable camera to start');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [poseDetected, setPoseDetected] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [faceValid, setFaceValid] = useState(false);
  const [faceVisible, setFaceVisible] = useState(false);
  const [faceMovement, setFaceMovement] = useState(0);
  const [currentState, setCurrentState] = useState<State>('up');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(voiceAgent.getConfig().enabled);
  const [isListening, setIsListening] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const detectorRef = useRef(new PushUpDetector());
  const poseRef = useRef<any>(null);
  const lastResultRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const isTrackingRef = useRef(false);
  const isPausedRef = useRef(false);
  const lastAnnouncedCountRef = useRef(0);
  const faceLostTimeRef = useRef<number | null>(null); // Track when face was lost for auto-pause
  
  // Keep refs in sync with state
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);
  
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  
  // Timer
  useEffect(() => {
    if (!isTracking || isPaused) return;
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [isTracking, isPaused]);
  
  // UI sync
  useEffect(() => {
    if (!isTracking || isPaused) return;
    const sync = setInterval(() => {
      if (detectorRef.current) {
        setCount(detectorRef.current.count);
      }
    }, 1000 / CONFIG.UI_FPS);
    return () => clearInterval(sync);
  }, [isTracking, isPaused]);
  
  // Load MediaPipe
  useEffect(() => {
    const load = async () => {
      try {
        setModelLoading(true);
        const { Pose } = await import('@mediapipe/pose');
        
        const pose = new Pose({
          locateFile: (file: string) => 
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
        });
        
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        
        pose.onResults(onResults);
        poseRef.current = pose;
        setModelLoading(false);
      } catch (err) {
        console.error('MediaPipe load failed:', err);
        setModelLoading(false);
      }
    };
    load();
  }, []);
  
  // Camera control
  useEffect(() => {
    if (cameraEnabled && !modelLoading) {
      startCamera();
    } else {
      stopCamera();
    }
    return stopCamera;
  }, [cameraEnabled, facingMode, modelLoading]);
  
  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
      if (poseRef.current) {
        try { poseRef.current.close(); } catch {}
        poseRef.current = null;
      }
    };
  }, []);
  
  const onResults = (results: any) => {
    if (!isMountedRef.current || isPausedRef.current) return;
    lastResultRef.current = results;
    
    if (results.poseLandmarks) {
      setPoseDetected(true);
      
      // Always run detection to show angle, regardless of tracking state
      const result = detectorRef.current.detect(results.poseLandmarks);
      setCurrentAngle(result.angle);
      setFaceValid(result.faceValid);
      setFaceVisible(result.faceVisible);
      setFaceMovement(result.faceMovement);
      setCurrentState(result.state);
      
      // Reset face lost timer when face is visible
      if (result.faceVisible) {
        faceLostTimeRef.current = null;
      }
      
      if (isTrackingRef.current) {
        setFeedback(result.feedback);
        
        // Auto-pause if face lost for too long
        if (!result.faceVisible) {
          if (faceLostTimeRef.current === null) {
            faceLostTimeRef.current = Date.now();
          } else if (Date.now() - faceLostTimeRef.current > CONFIG.FACE_LOST_PAUSE_MS) {
            setFeedback('Face lost - paused');
            setIsPaused(true);
            voiceAgent.announceSessionPause();
          }
        }
        
        // Announce new reps via voice agent
        if (result.count > lastAnnouncedCountRef.current) {
          voiceAgent.announceRep(result.count);
          lastAnnouncedCountRef.current = result.count;
        }
      }
    } else {
      setPoseDetected(false);
      setCurrentAngle(0);
      setFaceValid(false);
      setFaceVisible(false);
      setFaceMovement(0);
      
      // Auto-pause if pose lost for too long during tracking
      if (isTrackingRef.current) {
        if (faceLostTimeRef.current === null) {
          faceLostTimeRef.current = Date.now();
        } else if (Date.now() - faceLostTimeRef.current > CONFIG.FACE_LOST_PAUSE_MS) {
          setFeedback('Pose lost - paused');
          setIsPaused(true);
          voiceAgent.announceSessionPause();
        }
      }
    }
  };
  
  const startRenderLoop = () => {
    const render = () => {
      if (!isMountedRef.current || !canvasRef.current || !videoRef.current) {
        return;
      }
      
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState < 2) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      ctx.save();
      if (facingMode === 'user') {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
      }
      ctx.drawImage(video, 0, 0);
      ctx.restore();
      
      // Draw skeleton
      if (lastResultRef.current?.poseLandmarks) {
        drawSkeleton(ctx, lastResultRef.current.poseLandmarks);
      }
      
      if (isMountedRef.current && streamRef.current) {
        animationRef.current = requestAnimationFrame(render);
      }
    };
    render();
  };
  
  // Optimized skeleton drawing - single save/restore, responsive point sizes
  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    
    // Responsive point sizes based on canvas size (works better on mobile)
    const baseSize = Math.min(w, h) / 100;
    const facePointSize = Math.max(baseSize * 1.5, 6);   // Was fixed 12px
    const elbowPointSize = Math.max(baseSize * 1.2, 5);  // Was fixed 8px
    const jointPointSize = Math.max(baseSize, 4);         // Was fixed 6px
    const lineWidth = Math.max(baseSize * 0.4, 2);
    
    const connections = [
      // Arms (important for push-ups)
      [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
      [LM.LEFT_ELBOW, LM.LEFT_WRIST],
      [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
      [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
      // Torso
      [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
      [LM.LEFT_SHOULDER, LM.LEFT_HIP],
      [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
      [LM.LEFT_HIP, LM.RIGHT_HIP],
      // Legs
      [LM.LEFT_HIP, LM.LEFT_KNEE],
      [LM.LEFT_KNEE, LM.LEFT_ANKLE],
      [LM.RIGHT_HIP, LM.RIGHT_KNEE],
      [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
    ];
    
    // Single save at start
    ctx.save();
    
    if (facingMode === 'user') {
      ctx.scale(-1, 1);
      ctx.translate(-w, 0);
    }
    
    // Draw skeleton lines
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    
    connections.forEach(([a, b]) => {
      const lmA = landmarks[a];
      const lmB = landmarks[b];
      if (isVisible(lmA) && isVisible(lmB)) {
        ctx.beginPath();
        ctx.moveTo(lmA.x * w, lmA.y * h);
        ctx.lineTo(lmB.x * w, lmB.y * h);
        ctx.stroke();
      }
    });
    
    // Draw FACE landmarks (nose and eyes) - CYAN
    const facePoints = [LM.NOSE, LM.LEFT_EYE, LM.RIGHT_EYE];
    ctx.fillStyle = 'rgba(0, 255, 255, 0.95)';
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    
    facePoints.forEach(idx => {
      const lm = landmarks[idx];
      if (lm && lm.visibility >= 0.1) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, facePointSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    });
    
    // Draw line connecting eyes
    const leftEye = landmarks[LM.LEFT_EYE];
    const rightEye = landmarks[LM.RIGHT_EYE];
    
    if (leftEye && rightEye && 
        leftEye.visibility >= 0.1 && 
        rightEye.visibility >= 0.1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.moveTo(leftEye.x * w, leftEye.y * h);
      ctx.lineTo(rightEye.x * w, rightEye.y * h);
      ctx.stroke();
    }
    
    // Highlight elbows (key joints for push-ups) - RED
    ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
    [LM.LEFT_ELBOW, LM.RIGHT_ELBOW].forEach(idx => {
      const lm = landmarks[idx];
      if (isVisible(lm)) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, elbowPointSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Other key joints - YELLOW
    ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
    [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_HIP, LM.RIGHT_HIP].forEach(idx => {
      const lm = landmarks[idx];
      if (isVisible(lm)) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, jointPointSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Single restore at end
    ctx.restore();
  };
  
  const startCamera = async () => {
    try {
      const constraints = getCameraConstraints(facingMode);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        await new Promise<void>(resolve => {
          const check = () => {
            if (videoRef.current && videoRef.current.readyState >= 2) resolve();
            else setTimeout(check, 100);
          };
          check();
        });
        
        startRenderLoop();
        
        // Send frames to pose detector
        const sendFrame = async () => {
          if (!isMountedRef.current || !streamRef.current || !poseRef.current) return;
          if (videoRef.current && videoRef.current.readyState >= 2) {
            await poseRef.current.send({ image: videoRef.current });
          }
          setTimeout(sendFrame, 1000 / CONFIG.POSE_FPS);
        };
        sendFrame();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setFeedback('Camera access denied');
    }
  };
  
  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };
  
  const startTracking = () => {
    detectorRef.current.reset();
    lastAnnouncedCountRef.current = 0;
    faceLostTimeRef.current = null;
    setCount(0);
    setDuration(0);
    setIsTracking(true);
    setIsPaused(false);
    setSessionEnded(false);
    setIsSaved(false);
    setFeedback('Start doing push-ups!');
    voiceAgent.announceSessionStart();
  };
  
  const togglePause = () => {
    if (isPaused) {
      faceLostTimeRef.current = null; // Reset face lost timer on resume
      setIsPaused(false);
      voiceAgent.announceSessionResume();
    } else {
      setIsPaused(true);
      voiceAgent.announceSessionPause();
    }
  };
  
  const endTracking = () => {
    setIsTracking(false);
    setIsPaused(false);
    setSessionEnded(true);
    setFeedback(count > 0 ? `Session complete: ${count} reps` : 'No reps completed');
    voiceAgent.announceSessionEnd(count, duration);
  };
  
  const resetSession = () => {
    detectorRef.current.reset();
    lastAnnouncedCountRef.current = 0;
    faceLostTimeRef.current = null;
    setCount(0);
    setDuration(0);
    setIsTracking(false);
    setIsPaused(false);
    setSessionEnded(false);
    setIsSaved(false);
    setFeedback('Ready to start');
  };
  
  const toggleVoice = () => {
    const newEnabled = !voiceEnabled;
    setVoiceEnabled(newEnabled);
    voiceAgent.saveConfig({ enabled: newEnabled });
  };
  
  const saveSession = async () => {
    if (!currentUser || count === 0 || isSaved) return;
    
    setIsSaving(true);
    try {
      await addSession({
        userId: currentUser.uid,
        pushUps: count,
        duration,
        date: new Date().toISOString().split('T')[0],
        sets: 1,
      });
      setIsSaved(true);
      setFeedback('Session saved!');
    } catch (error) {
      console.error('Failed to save session:', error);
      setFeedback('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Voice command registration
  useEffect(() => {
    voiceAgent.registerCommandCallbacks({
      onStart: () => {
        if (!isTracking && cameraEnabled && !modelLoading) {
          startTracking();
        }
      },
      onStop: () => {
        if (isTracking) {
          endTracking();
        }
      },
      onPause: () => {
        if (isTracking && !isPaused) {
          togglePause();
        }
      },
      onResume: () => {
        if (isTracking && isPaused) {
          togglePause();
        }
      },
      onSave: () => {
        if (sessionEnded && !isSaved && count > 0 && currentUser) {
          saveSession();
        }
      },
      onReset: () => {
        resetSession();
      },
      onFlipCamera: () => {
        if (cameraEnabled) {
          setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
        }
      },
    });

    // Start listening if voice commands enabled
    const config = voiceAgent.getConfig();
    if (config.enabled && config.voiceCommands && cameraEnabled) {
      voiceAgent.startListening();
    }

    return () => {
      voiceAgent.unregisterCommandCallbacks();
    };
  }, [isTracking, isPaused, sessionEnded, isSaved, count, currentUser, cameraEnabled, modelLoading]);

  // Sync listening state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsListening(voiceAgent.isCurrentlyListening());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Toggle voice listening
  const toggleVoiceListening = () => {
    if (isListening) {
      voiceAgent.stopListening();
      setIsListening(false);
    } else {
      voiceAgent.startListening();
      setIsListening(true);
    }
  };
  
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {!cameraEnabled && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-sm">
            <h1 className="text-4xl font-light text-white">Push-Up Counter</h1>
            <p className="text-zinc-400">Elbow angle-based rep detection</p>
            
            <button
              onClick={() => setCameraEnabled(true)}
              disabled={modelLoading}
              className="w-full bg-white hover:bg-zinc-100 disabled:bg-zinc-700 text-black disabled:text-zinc-500 py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              {modelLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Loading AI model...
                </>
              ) : (
                <>
                  <Camera size={20} />
                  Enable Camera
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {cameraEnabled && (
        <>
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
          
          {/* Top bar */}
          <div className="relative z-10 flex items-start justify-between p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')}
                className="w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
              >
                <RotateCw size={20} />
              </button>
              <button
                onClick={toggleVoice}
                className={`w-12 h-12 ${voiceEnabled ? 'bg-green-500/50' : 'bg-black/50'} hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm`}
                title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
              >
                {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              {/* Voice Commands Indicator */}
              {voiceEnabled && voiceAgent.isVoiceCommandsSupported() && voiceAgent.getConfig().voiceCommands && (
                <button
                  onClick={toggleVoiceListening}
                  className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${
                    isListening 
                      ? 'bg-red-500 animate-pulse' 
                      : 'bg-black/50 hover:bg-black/70'
                  }`}
                  title={isListening ? "Listening for commands (click to stop)" : "Start listening for commands"}
                >
                  {isListening ? (
                    <Mic size={20} className="text-white" />
                  ) : (
                    <MicOff size={20} className="text-white" />
                  )}
                </button>
              )}
            </div>
            
            <div className="bg-black/50 backdrop-blur-sm text-white px-6 py-2 rounded-full font-semibold">
              {feedback}
            </div>
            
            <button
              onClick={() => {
                setCameraEnabled(false);
                setIsTracking(false);
              }}
              className="w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm"
            >
              <CameraOff size={20} />
            </button>
          </div>
          
          {/* Stats */}
          <div className="flex-1 relative z-10 flex flex-col justify-end pointer-events-none">
            <div className="absolute top-0 right-0 p-4 pointer-events-auto">
              <div className="flex flex-col items-end gap-3">
                <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-4 text-center min-w-[100px]">
                  <div className="text-5xl font-bold text-white">{count}</div>
                  <div className="text-zinc-400 text-sm">reps</div>
                </div>
                
                <div className="bg-black/50 backdrop-blur-sm rounded-xl px-5 py-2 text-center">
                  <div className="text-2xl font-semibold text-white font-mono">
                    {formatTime(duration)}
                  </div>
                </div>
                
                {isTracking && (
                  <>
                    {/* State indicator */}
                    <div className={`rounded-xl px-4 py-2 text-center backdrop-blur-sm ${
                      currentState === 'down' ? 'bg-orange-500/30' : 'bg-blue-500/30'
                    }`}>
                      <div className={`text-lg font-bold ${
                        currentState === 'down' ? 'text-orange-300' : 'text-blue-300'
                      }`}>
                        {currentState.toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Elbow angle */}
                    <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                      <div className="text-lg font-semibold text-amber-400">
                        {currentAngle.toFixed(0)}°
                      </div>
                      <div className="text-zinc-400 text-xs">elbow</div>
                    </div>
                    
                    {/* Face visibility */}
                    <div className={`rounded-xl px-4 py-2 text-center backdrop-blur-sm ${
                      faceVisible ? 'bg-cyan-500/30' : 'bg-red-500/30'
                    }`}>
                      <div className={`text-xs font-medium ${
                        faceVisible ? 'text-cyan-300' : 'text-red-400'
                      }`}>
                        {faceVisible ? '👁 Face OK' : '❌ No face'}
                      </div>
                    </div>
                    
                    {/* Face movement */}
                    <div className={`rounded-xl px-4 py-2 text-center backdrop-blur-sm ${
                      faceValid ? 'bg-emerald-500/30' : 'bg-black/50'
                    }`}>
                      <div className={`text-sm font-semibold ${
                        Math.abs(faceMovement) > CONFIG.FACE_MOVE_THRESHOLD 
                          ? 'text-emerald-300' 
                          : 'text-zinc-500'
                      }`}>
                        {(faceMovement * 100).toFixed(1)}%
                      </div>
                      <div className={`text-xs ${
                        faceValid ? 'text-emerald-300' : 'text-zinc-500'
                      }`}>
                        {faceValid ? '↕ Moving' : '— Still'}
                      </div>
                    </div>
                  </>
                )}
                
                <div className={`rounded-lg px-3 py-1.5 backdrop-blur-sm ${
                  poseDetected ? 'bg-emerald-500/30' : 'bg-black/50'
                }`}>
                  <div className={`text-xs font-medium ${
                    poseDetected ? 'text-emerald-300' : 'text-zinc-500'
                  }`}>
                    {poseDetected ? '● Tracking' : '○ No pose'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="relative z-10 p-4 pointer-events-auto">
            <div className="flex justify-center gap-3">
              {!isTracking && !sessionEnded && (
                <button
                  onClick={startTracking}
                  disabled={!poseDetected}
                  className="flex-1 max-w-xs bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Play size={22} fill="white" />
                  Start Counting
                </button>
              )}
              
              {isTracking && (
                <div className="flex gap-3 w-full max-w-md">
                  <button
                    onClick={togglePause}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    {isPaused ? <Play size={20} fill="white" /> : <Pause size={20} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={endTracking}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Square size={20} fill="white" />
                    End
                  </button>
                </div>
              )}
              
              {sessionEnded && (
                <div className="flex gap-3 w-full max-w-md">
                  {count > 0 && currentUser && !isSaved && (
                    <button
                      onClick={saveSession}
                      disabled={isSaving}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={20} />
                          Save Session
                        </>
                      )}
                    </button>
                  )}
                  {isSaved && (
                    <div className="flex-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 py-4 rounded-xl font-semibold flex items-center justify-center gap-2">
                      <Check size={20} />
                      Saved!
                    </div>
                  )}
                  <button
                    onClick={startTracking}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    <RotateCw size={20} />
                    New Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}