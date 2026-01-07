/**
 * Voice Agent Service
 * Uses Web Speech API to provide audio feedback during workouts
 * Also supports voice recognition for hands-free control
 */

// Type declarations for Web Speech API (not included in all TypeScript versions)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface VoiceAgentConfig {
  enabled: boolean;
  volume: number; // 0-1
  voiceType: 'male' | 'female';
  announceReps: boolean;
  milestoneAlerts: boolean; // Every 5 reps
  motivationalMessages: boolean;
  sessionAnnouncements: boolean;
  voiceCommands: boolean; // NEW: Enable voice recognition
}

// Voice command types
type VoiceCommand = 
  | 'start'
  | 'stop'
  | 'pause'
  | 'resume'
  | 'save'
  | 'reset'
  | 'flip_camera'
  | 'unknown';

export interface VoiceCommandCallback {
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onSave?: () => void;
  onReset?: () => void;
  onFlipCamera?: () => void;
}

const DEFAULT_CONFIG: VoiceAgentConfig = {
  enabled: true,
  volume: 0.8,
  voiceType: 'female',
  announceReps: true,
  milestoneAlerts: true,
  motivationalMessages: true,
  sessionAnnouncements: true,
  voiceCommands: false, // Off by default
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
  
  // Voice recognition
  private recognition: SpeechRecognition | null = null;
  private recognitionSupported: boolean = false;
  private isListening: boolean = false;
  private commandCallbacks: VoiceCommandCallback = {};

  constructor() {
    this.config = this.loadConfig();
    this.initSynth();
    this.initRecognition();
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

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      if (process.env.NODE_ENV !== 'production') console.log('Speech recognition not supported in this browser');
      this.recognitionSupported = false;
      return;
    }

    this.recognitionSupported = true;
    const recognition = new SpeechRecognitionAPI() as SpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      if (process.env.NODE_ENV !== 'production') console.log('🎤 Voice command heard:', transcript);
      this.processCommand(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (process.env.NODE_ENV !== 'production') console.log('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'aborted') {
        if (this.isListening && this.config.voiceCommands) {
          setTimeout(() => this.restartListening(), 500);
        }
      }
    };

    recognition.onend = () => {
      if (this.isListening && this.config.voiceCommands && this.config.enabled) {
        setTimeout(() => this.restartListening(), 500);
      }
    };
    
    this.recognition = recognition;
  }

  private processCommand(transcript: string): void {
    if (!this.config.voiceCommands) return;
    
    const command = this.parseCommand(transcript);
    if (command === 'unknown') return;

    // Speak confirmation
    this.speakCommandConfirmation(command);

    // Execute callback
    switch (command) {
      case 'start':
        this.commandCallbacks.onStart?.();
        break;
      case 'stop':
        this.commandCallbacks.onStop?.();
        break;
      case 'pause':
        this.commandCallbacks.onPause?.();
        break;
      case 'resume':
        this.commandCallbacks.onResume?.();
        break;
      case 'save':
        this.commandCallbacks.onSave?.();
        break;
      case 'reset':
        this.commandCallbacks.onReset?.();
        break;
      case 'flip_camera':
        this.commandCallbacks.onFlipCamera?.();
        break;
    }
  }

  private parseCommand(transcript: string): VoiceCommand {
    const text = transcript.toLowerCase().trim();

    // Start commands
    if (text.includes('start') || text.includes('begin') || text.includes('let\'s go') || text === 'go') {
      return 'start';
    }
    // Stop commands
    if (text.includes('stop') || text.includes('end') || text.includes('finish') || text.includes('done')) {
      return 'stop';
    }
    // Pause commands
    if (text.includes('pause') || text.includes('wait') || text.includes('hold') || text.includes('break')) {
      return 'pause';
    }
    // Resume commands
    if (text.includes('resume') || text.includes('continue') || text.includes('unpause')) {
      return 'resume';
    }
    // Save commands
    if (text.includes('save')) {
      return 'save';
    }
    // Reset commands
    if (text.includes('reset') || text.includes('restart') || text.includes('new session')) {
      return 'reset';
    }
    // Flip camera
    if (text.includes('flip') || text.includes('switch camera') || text.includes('camera')) {
      return 'flip_camera';
    }

    return 'unknown';
  }

  private speakCommandConfirmation(command: VoiceCommand): void {
    const confirmations: Record<VoiceCommand, string> = {
      start: 'Starting',
      stop: 'Stopping',
      pause: 'Pausing',
      resume: 'Resuming',
      save: 'Saving',
      reset: 'Resetting',
      flip_camera: 'Flipping camera',
      unknown: '',
    };

    if (confirmations[command]) {
      this.speak(confirmations[command], true);
    }
  }

  // Public methods for voice commands
  registerCommandCallbacks(callbacks: VoiceCommandCallback): void {
    this.commandCallbacks = callbacks;
  }

  unregisterCommandCallbacks(): void {
    this.commandCallbacks = {};
  }

  startListening(): void {
    if (!this.recognitionSupported || !this.recognition) return;
    if (!this.config.voiceCommands || !this.config.enabled) return;
    if (this.isListening) return;

    try {
      this.recognition.start();
      this.isListening = true;
      if (process.env.NODE_ENV !== 'production') console.log('🎤 Listening for voice commands...');
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.log('Failed to start listening:', e);
    }
  }

  stopListening(): void {
    if (!this.recognition) return;
    this.isListening = false;
    try {
      this.recognition.stop();
      if (process.env.NODE_ENV !== 'production') console.log('🎤 Stopped listening');
    } catch (e) {
      // Ignore errors when stopping
    }
  }

  private restartListening(): void {
    if (!this.recognition || !this.isListening) return;
    try {
      this.recognition.start();
    } catch (e) {
      // May already be running
    }
  }

  isVoiceCommandsSupported(): boolean {
    return this.recognitionSupported;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
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
    // Handle voice commands toggle
    if ('voiceCommands' in config || 'enabled' in config) {
      if (this.config.enabled && this.config.voiceCommands) {
        this.startListening();
      } else {
        this.stopListening();
      }
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
    this.speak("Voice agent is ready. You can also use voice commands like start, pause, or save.", true);
  }
}

// Export singleton instance
export const voiceAgent = new VoiceAgentService();
export type { VoiceCommand };
