import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Plus, Minus, Camera, CameraOff, RefreshCw } from 'lucide-react';
import { addSession } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

type PushUpState = 'get_ready' | 'ready' | 'up' | 'down';

const LM = {
  LS: 11, RS: 12,
  LE: 13, RE: 14,
  LW: 15, RW: 16,
  LH: 23, RH: 24,
  LA: 27, RA: 28,
};

const angle = (a: any, b: any, c: any) => {
  const r =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((r * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
};

export function TrackPage() {
  const [count, setCount] = useState(0);
  const [sets, setSets] = useState(1);
  const [duration, setDuration] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [stateUI, setStateUI] = useState<PushUpState>('get_ready');
  const [feedback, setFeedback] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const camRef = useRef<MediaPipeCamera | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stateRef = useRef<PushUpState>('get_ready');
  const countRef = useRef(0);
  const trackingRef = useRef(false);
  const pausedRef = useRef(false);

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => { trackingRef.current = isTracking; }, [isTracking]);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);

  useEffect(() => {
    if (!isTracking || isPaused) return;
    const i = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(i);
  }, [isTracking, isPaused]);

  useEffect(() => {
    const pose = new Pose({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults(onResults);
    poseRef.current = pose;
    return () => pose.close();
  }, []);

  useEffect(() => {
    cameraEnabled ? startCam() : stopCam();
    return stopCam;
  }, [cameraEnabled, facingMode]);

  const startCam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: 1280, height: 720 },
    });
    streamRef.current = stream;
    videoRef.current!.srcObject = stream;
    await videoRef.current!.play();

    camRef.current = new MediaPipeCamera(videoRef.current!, {
      onFrame: async () =>
        poseRef.current?.send({ image: videoRef.current! }),
      width: 1280,
      height: 720,
    });
    camRef.current.start();
  };

  const stopCam = () => {
    camRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const onResults = (res: any) => {
    if (!res.poseLandmarks || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width = videoRef.current!.videoWidth;
    canvasRef.current.height = videoRef.current!.videoHeight;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    drawConnectors(ctx, res.poseLandmarks, POSE_CONNECTIONS, { color: '#0f0', lineWidth: 3 });
    drawLandmarks(ctx, res.poseLandmarks, { color: '#f00', radius: 4 });

    if (trackingRef.current && !pausedRef.current) {
      detect(res.poseLandmarks);
    }
  };

  const detect = (lm: any[]) => {
    const l = lm, r = lm;

    const ls = l[LM.LS], le = l[LM.LE], lw = l[LM.LW], lh = l[LM.LH], la = l[LM.LA];
    const rs = r[LM.RS], re = r[LM.RE], rw = r[LM.RW], rh = r[LM.RH], ra = r[LM.RA];

    if ([ls, le, lw, lh, la, rs, re, rw, rh, ra].some(p => !p || p.visibility < 0.35)) {
      setFeedback('NO BODY DETECTED');
      stateRef.current = 'get_ready';
      setStateUI('get_ready');
      return;
    }

    const avgElbow =
      (angle(ls, le, lw) + angle(rs, re, rw)) / 2;
    const avgBack =
      (angle(ls, lh, la) + angle(rs, rh, ra)) / 2;

    let fb = 'GOOD FORM';
    if (angle(lh, ls, le) > 65 || angle(rh, rs, re) > 65) {
      fb = 'TUCK ELBOWS';
    }

    if (stateRef.current === 'get_ready') {
      if (avgBack > 145 && avgElbow > 155) {
        stateRef.current = 'ready';
        setStateUI('ready');
      } else {
        setFeedback('GET INTO PLANK');
        return;
      }
    }

    if (stateRef.current === 'ready' || stateRef.current === 'up') {
      if (avgElbow < 90) {
        stateRef.current = 'down';
        setStateUI('down');
      }
    }

    if (stateRef.current === 'down') {
      if (avgElbow > 155) {
        countRef.current++;
        setCount(countRef.current);
        setFeedback('REP COUNTED');
        stateRef.current = 'ready';
        setStateUI('ready');
        return;
      }
    }

    setFeedback(fb);
  };

  const start = () => {
    setIsTracking(true);
    setIsPaused(false);
    countRef.current = 0;
    setCount(0);
    setDuration(0);
    stateRef.current = 'get_ready';
    setStateUI('get_ready');
  };

  const end = async () => {
    if (currentUser && count > 0) {
      try {
        await addSession({ 
          userId: currentUser.uid, 
          pushUps: count, 
          duration, 
          sets, 
          date: new Date().toISOString().slice(0, 10) 
        });
      } catch (error) {
        console.error('Error saving session:', error);
      }
    }
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 bg-black">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }} />

      {!cameraEnabled && (
        <button onClick={() => setCameraEnabled(true)}
          className="absolute inset-0 m-auto h-14 px-8 bg-emerald-600 text-white rounded-full">
          Enable Camera
        </button>
      )}

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-7xl font-bold">
        {count}
        <div className="text-lg mt-2">{Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}</div>
      </div>

      <div className="absolute bottom-6 w-full flex justify-center gap-4">
        {!isTracking ? (
          <button onClick={start} className="bg-emerald-600 px-8 py-3 rounded-full text-white">Start</button>
        ) : (
          <>
            <button onClick={() => setIsPaused(p => !p)} className="bg-cyan-600 px-6 py-3 rounded-full text-white">
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={end} className="bg-red-600 px-6 py-3 rounded-full text-white">End</button>
          </>
        )}
      </div>

      <div className="absolute top-6 left-6 text-white bg-black/60 px-4 py-2 rounded">
        {stateUI.toUpperCase()} — {feedback}
      </div>
    </div>
  );
}
