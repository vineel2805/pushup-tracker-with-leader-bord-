import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';
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

  useEffect(() => {
    setIsSupported(voiceAgent.isSupported());
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
        />
      </div>

      {config.enabled && (
        <>
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
              className="w-full"
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
