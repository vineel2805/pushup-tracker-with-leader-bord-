import { useState, useEffect } from 'react';
import { Play, Pause, Square, Plus, Minus } from 'lucide-react';
import { addSession, getCurrentUser } from '../utils/mockData';
import { useNavigate } from 'react-router-dom';

export function TrackPage() {
  const [count, setCount] = useState(0);
  const [sets, setSets] = useState(1);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && !isPaused) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, isPaused]);

  const handleStart = () => {
    setIsTracking(true);
    setIsPaused(false);
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
  };

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (count > 0) {
      setCount(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-2xl">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <h1 className="text-2xl text-zinc-400 mb-4">Current Session</h1>
          
          {/* Counter */}
          <div className="my-12">
            <div className="text-9xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              {count}
            </div>
            <p className="text-xl text-zinc-400">Push-Ups</p>
          </div>

          {/* Timer */}
          <div className="text-4xl text-white mb-8">{formatTime(duration)}</div>

          {/* Set Counter */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => setSets(prev => Math.max(1, prev - 1))}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              disabled={isTracking}
            >
              <Minus className="w-5 h-5 text-white" />
            </button>
            <div className="px-8 py-3 bg-zinc-800 rounded-lg">
              <span className="text-white">Set {sets}</span>
            </div>
            <button
              onClick={() => setSets(prev => prev + 1)}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              disabled={isTracking}
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex gap-4 justify-center mb-8">
            {!isTracking ? (
              <button
                onClick={handleStart}
                className="px-12 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start
              </button>
            ) : (
              <>
                <button
                  onClick={handlePause}
                  className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Pause className="w-5 h-5" />
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleEnd}
                  className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Square className="w-5 h-5" />
                  End
                </button>
              </>
            )}
          </div>

          {/* Manual Counter */}
          {isTracking && (
            <div className="pt-8 border-t border-zinc-800">
              <p className="text-zinc-400 mb-4 text-sm">Manual Count</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleDecrement}
                  className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Minus className="w-5 h-5" />
                  -1
                </button>
                <button
                  onClick={handleIncrement}
                  className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  +1
                </button>
              </div>
            </div>
          )}
        </div>

        {!isTracking && (
          <p className="text-center text-zinc-500 mt-6">
            Click Start to begin tracking your push-ups
          </p>
        )}
      </div>
    </div>
  );
}
