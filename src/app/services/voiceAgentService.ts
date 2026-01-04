/**
 * Voice Agent Service
 * Uses Web Speech API to provide audio feedback during workouts
 */

export interface VoiceAgentConfig {
  enabled: boolean;
  volume: number; // 0-1
  voiceType: 'male' | 'female';
  announceReps: boolean;
  milestoneAlerts: boolean; // Every 5 reps
  motivationalMessages: boolean;
  sessionAnnouncements: boolean;
}

const DEFAULT_CONFIG: VoiceAgentConfig = {
  enabled: true,
  volume: 0.8,
  voiceType: 'female',
  announceReps: true,
  milestoneAlerts: true,
  motivationalMessages: true,
  sessionAnnouncements: true,
};

const STORAGE_KEY = 'voiceAgentConfig';

const MOTIVATIONAL_MESSAGES = [
  "You're doing great!",
  "Keep pushing!",
  "Strong form!",
  "You've got this!",
  "Feel the burn!",
  "Excellent work!",
  "Stay focused!",
  "Power through!",
];

const MILESTONE_MESSAGES: Record<number, string> = {
  5: "5 reps! Nice warm-up!",
  10: "10 reps! You're on fire!",
  15: "15 reps! Impressive!",
  20: "20 reps! Beast mode!",
  25: "25 reps! Incredible!",
  30: "30 reps! Legendary!",
  40: "40 reps! Superhuman!",
  50: "50 reps! Unstoppable!",
};

class VoiceAgentService {
  private config: VoiceAgentConfig;
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private lastMotivationalIndex = -1;
  private isSpeaking = false;
  private speechQueue: string[] = [];

  constructor() {
    this.config = this.loadConfig();
    this.initSynth();
  }

  private initSynth() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      
      // Voices may load asynchronously
      const loadVoices = () => {
        this.voices = this.synth?.getVoices() || [];
        this.selectVoice();
      };

      loadVoices();
      
      // Chrome loads voices asynchronously
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = loadVoices;
      }
    }
  }

  private selectVoice() {
    if (!this.voices.length) return;

    // Try to find an English voice matching the preference
    const isPreferredGender = (name: string, type: 'male' | 'female'): boolean => {
      const nameLower = name.toLowerCase();
      if (type === 'female') {
        return nameLower.includes('female') || 
               nameLower.includes('woman') ||
               nameLower.includes('samantha') ||
               nameLower.includes('victoria') ||
               nameLower.includes('karen') ||
               nameLower.includes('zira') ||
               nameLower.includes('susan') ||
               nameLower.includes('hazel');
      } else {
        return nameLower.includes('male') || 
               nameLower.includes('man') ||
               nameLower.includes('daniel') ||
               nameLower.includes('david') ||
               nameLower.includes('alex') ||
               nameLower.includes('james') ||
               nameLower.includes('mark');
      }
    };

    // Filter English voices
    const englishVoices = this.voices.filter(v => 
      v.lang.startsWith('en') || v.lang === 'en-US' || v.lang === 'en-GB'
    );

    // Try to find matching gender
    const genderMatch = englishVoices.find(v => 
      isPreferredGender(v.name, this.config.voiceType)
    );

    // Fallback to any English voice, then any voice
    this.selectedVoice = genderMatch || englishVoices[0] || this.voices[0] || null;
  }

  private loadConfig(): VoiceAgentConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load voice agent config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  saveConfig(config: Partial<VoiceAgentConfig>) {
    this.config = { ...this.config, ...config };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Failed to save voice agent config:', e);
    }
    // Re-select voice if voice type changed
    if (config.voiceType) {
      this.selectVoice();
    }
  }

  getConfig(): VoiceAgentConfig {
    return { ...this.config };
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(v => v.lang.startsWith('en'));
  }

  private speak(text: string, priority: boolean = false) {
    if (!this.config.enabled || !this.synth || !text) return;

    if (priority) {
      // Cancel current speech for priority messages
      this.synth.cancel();
      this.speechQueue = [];
      this.isSpeaking = false;
    }

    this.speechQueue.push(text);
    this.processQueue();
  }

  private processQueue() {
    if (this.isSpeaking || !this.speechQueue.length || !this.synth) return;

    const text = this.speechQueue.shift();
    if (!text) return;

    this.isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = this.config.volume;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      // Small delay between utterances
      setTimeout(() => this.processQueue(), 200);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    this.synth.speak(utterance);
  }

  /**
   * Announce a rep count
   */
  announceRep(count: number) {
    if (!this.config.announceReps && !this.config.milestoneAlerts) return;

    // Check for milestone
    if (this.config.milestoneAlerts && MILESTONE_MESSAGES[count]) {
      this.speak(MILESTONE_MESSAGES[count], true);
      return;
    }

    // Regular rep announcement
    if (this.config.announceReps) {
      // Announce every rep, but keep it short
      this.speak(String(count));
    }
  }

  /**
   * Get a random motivational message
   */
  speakMotivation() {
    if (!this.config.motivationalMessages) return;

    // Avoid repeating the last message
    let index;
    do {
      index = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    } while (index === this.lastMotivationalIndex && MOTIVATIONAL_MESSAGES.length > 1);
    
    this.lastMotivationalIndex = index;
    this.speak(MOTIVATIONAL_MESSAGES[index]);
  }

  /**
   * Announce session start
   */
  announceSessionStart() {
    if (!this.config.sessionAnnouncements) return;
    this.speak("Session started. Let's go!", true);
  }

  /**
   * Announce session pause
   */
  announceSessionPause() {
    if (!this.config.sessionAnnouncements) return;
    this.speak("Session paused.", true);
  }

  /**
   * Announce session resume
   */
  announceSessionResume() {
    if (!this.config.sessionAnnouncements) return;
    this.speak("Resuming session.", true);
  }

  /**
   * Announce session end
   */
  announceSessionEnd(count: number, duration: number) {
    if (!this.config.sessionAnnouncements) return;
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    let timeStr = '';
    if (minutes > 0) {
      timeStr = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      if (seconds > 0) {
        timeStr += ` and ${seconds} second${seconds > 1 ? 's' : ''}`;
      }
    } else {
      timeStr = `${seconds} second${seconds > 1 ? 's' : ''}`;
    }
    
    const message = count > 0 
      ? `Session complete! You did ${count} push-up${count > 1 ? 's' : ''} in ${timeStr}. Great work!`
      : "Session ended. No reps recorded.";
    
    this.speak(message, true);
  }

  /**
   * Stop all speech
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.speechQueue = [];
      this.isSpeaking = false;
    }
  }

  /**
   * Test the voice with a sample message
   */
  testVoice() {
    this.speak("Voice agent is working. Let's crush this workout!", true);
  }
}

// Export singleton instance
export const voiceAgent = new VoiceAgentService();
