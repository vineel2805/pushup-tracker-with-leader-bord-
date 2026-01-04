import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Mic, MicOff } from 'lucide-react';
import { voiceAgent, VoiceAgentConfig } from '../services/voiceAgentService';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Button } from './ui/button';

interface VoiceAgentSettingsProps {
  className?: string;
}

export function VoiceAgentSettings({ className = '' }: VoiceAgentSettingsProps) {
  const [config, setConfig] = useState<VoiceAgentConfig>(voiceAgent.getConfig());
  const [isSupported, setIsSupported] = useState(true);
  const [voiceCommandsSupported, setVoiceCommandsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(voiceAgent.isSupported());
    setVoiceCommandsSupported(voiceAgent.isVoiceCommandsSupported());
  }, []);

  const updateConfig = (updates: Partial<VoiceAgentConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    voiceAgent.saveConfig(updates);
  };

  const handleTestVoice = () => {
    voiceAgent.testVoice();
  };

  if (!isSupported) {
    return (
      <div className={`p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 ${className}`}>
        <div className="flex items-center gap-2 text-zinc-400">
          <VolumeX className="w-5 h-5" />
          <span className="text-sm">Voice Agent is not supported in this browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Master Enable/Disable */}
      <div className="flex items-center justify-between py-3">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2">
            {config.enabled ? (
              <Volume2 className="w-4 h-4 text-green-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
            <span className="text-[13px] text-zinc-300">Voice Agent</span>
          </div>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            Audio feedback during workouts
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => updateConfig({ enabled: checked })}
          className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700"
        />
      </div>

      {config.enabled && (
        <>
          {/* Voice Commands - NEW */}
          <div className="py-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  {config.voiceCommands ? (
                    <Mic className="w-4 h-4 text-blue-400" />
                  ) : (
                    <MicOff className="w-4 h-4 text-zinc-500" />
                  )}
                  <span className="text-[13px] text-zinc-300">Voice Commands</span>
                </div>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Control workout with your voice (hands-free)
                </p>
              </div>
              {voiceCommandsSupported ? (
                <Switch
                  checked={config.voiceCommands}
                  onCheckedChange={(checked) => updateConfig({ voiceCommands: checked })}
                  className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700"
                />
              ) : (
                <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded">
                  Not supported
                </span>
              )}
            </div>

            {/* Voice Commands Help */}
            {config.voiceCommands && voiceCommandsSupported && (
              <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-[11px] text-zinc-400 mb-2">Available commands:</p>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="text-green-400">•</span>
                    <span className="text-zinc-500">"Start" / "Begin" / "Go"</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">•</span>
                    <span className="text-zinc-500">"Pause" / "Wait"</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    <span className="text-zinc-500">"Resume" / "Continue"</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-red-400">•</span>
                    <span className="text-zinc-500">"Stop" / "End" / "Finish"</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-purple-400">•</span>
                    <span className="text-zinc-500">"Save" / "Save session"</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-orange-400">•</span>
                    <span className="text-zinc-500">"Reset" / "New session"</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-cyan-400">•</span>
                    <span className="text-zinc-500">"Flip" / "Switch camera"</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className="py-3 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-zinc-300">Volume</span>
              <span className="text-[11px] text-zinc-500">
                {Math.round(config.volume * 100)}%
              </span>
            </div>
            <Slider
              value={[config.volume * 100]}
              onValueChange={([value]) => updateConfig({ volume: value / 100 })}
              max={100}
              min={0}
              step={5}
              className="w-full [&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-emerald-500"
            />
          </div>

          {/* Voice Type Selection */}
          <div className="py-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <span className="text-[13px] text-zinc-300">Voice Type</span>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Choose voice preference
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateConfig({ voiceType: 'male' })}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    config.voiceType === 'male'
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Male
                </button>
                <button
                  onClick={() => updateConfig({ voiceType: 'female' })}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    config.voiceType === 'female'
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>
          </div>

          {/* Announcement Options */}
          <div className="py-3 border-t border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <span className="text-[13px] text-zinc-300">Rep Announcements</span>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Announce each rep count
                </p>
              </div>
              <Switch
                checked={config.announceReps}
                onCheckedChange={(checked) => updateConfig({ announceReps: checked })}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <span className="text-[13px] text-zinc-300">Milestone Alerts</span>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Celebrate every 5, 10, 15+ reps
                </p>
              </div>
              <Switch
                checked={config.milestoneAlerts}
                onCheckedChange={(checked) => updateConfig({ milestoneAlerts: checked })}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <span className="text-[13px] text-zinc-300">Motivational Messages</span>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Random encouragement during workout
                </p>
              </div>
              <Switch
                checked={config.motivationalMessages}
                onCheckedChange={(checked) => updateConfig({ motivationalMessages: checked })}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <span className="text-[13px] text-zinc-300">Session Announcements</span>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Announce start, pause, and end
                </p>
              </div>
              <Switch
                checked={config.sessionAnnouncements}
                onCheckedChange={(checked) => updateConfig({ sessionAnnouncements: checked })}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700"
              />
            </div>
          </div>

          {/* Test Button */}
          <div className="pt-3 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestVoice}
              className="w-full bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700 text-zinc-300"
            >
              <Play className="w-4 h-4 mr-2" />
              Test Voice
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
