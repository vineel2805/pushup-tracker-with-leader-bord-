# Track & Grow 🌱

An AI-powered push-up counter with real-time pose detection, voice commands, audio feedback, and social features. Built with React, TypeScript, MediaPipe, and Firebase.

![Track & Grow](https://img.shields.io/badge/version-2.1.0-green) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Firebase](https://img.shields.io/badge/Firebase-10-orange)

## 🎯 Features

### Core Features
- **AI Push-Up Detection** - Real-time rep counting using MediaPipe pose detection
  - **Elbow Angle Tracking** - Detects arm bending (UP: ≥140°, DOWN: ≤110°)
  - **Face Motion Validation** - Prevents false counts from arm-only movements
  - **Smart State Machine** - Tracks UP → DOWN → UP cycle for accurate rep counting
- **Live Camera Preview** - See yourself with skeleton overlay and joint highlights
  - Responsive point sizes that scale with screen size
  - Face landmarks (cyan), elbows (red), other joints (yellow)
- **Session Tracking** - Track reps, duration, and save workouts to your profile
- **Auto-Pause** - Automatically pauses when face/pose is lost for 2+ seconds

### Voice Agent
- **Voice Commands** - Hands-free control with speech recognition
  - "Start" / "Pause" / "Resume" / "Stop" - Control your session
  - "Save" / "Reset" - Save or discard your workout
  - "Flip camera" - Switch between front and back cameras
- **Audio Feedback** - Spoken announcements during workouts
  - Rep count announcements (every 5 reps by default)
  - Milestone alerts (10, 25, 50, 100 reps)
  - Motivational messages to keep you going
  - Session start/stop announcements

### Real-Time Debug Dashboard
During tracking, see live metrics:
- **State Indicator** - Current position (UP/DOWN)
- **Elbow Angle** - Real-time angle in degrees
- **Face Visibility** - Whether your face is detected
- **Face Movement** - Vertical travel percentage for validation

### Social Features
- **Leaderboard** - Compete with friends and see top performers
- **Friends System** - Send/accept friend requests and view friends' progress
- **Public Profiles** - Share your achievements with a customizable public profile

### User Experience
- **User Authentication** - Secure sign-up, login, Google auth, and email verification
- **Dashboard** - View daily progress, streaks, and statistics at a glance
- **Analytics** - Visualize your fitness journey with interactive charts
- **History** - Browse past workout sessions
- **Settings** - Customize theme, notifications, privacy, and voice agent settings
- **Collapsible Sidebar** - Clean navigation with expand/collapse toggle
- **Responsive Design** - Works seamlessly on desktop and mobile

## 🏋️ How Push-Up Detection Works

The detection uses a two-factor validation system:

1. **Elbow Angle Detection**
   - Calculates angle at elbow joint (shoulder → elbow → wrist)
   - UP position: Elbow angle ≥ 140° (arms extended)
   - DOWN position: Elbow angle ≤ 110° (arms bent)

2. **Face Motion Validation**
   - Tracks vertical face movement (nose/eyes) during rep
   - Prevents counting when just bending arms while sitting/standing
   - Threshold: ~1.5% of frame height vertical travel required

3. **State Machine**
   ```
   UP → (elbows bend) → DOWN → (elbows extend + face moved) → UP = 1 REP
   ```

4. **Debounce**
   - Minimum 300ms between reps to prevent double-counting

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS 4, Radix UI, Lucide Icons |
| **Backend** | Firebase (Auth, Firestore, Storage) |
| **AI/ML** | MediaPipe Pose Detection |
| **Voice** | Web Speech API |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form |
| **Routing** | React Router DOM v7 |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Firebase account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vineel2805/pushup-tracker-with-leader-bord-.git
   cd pushup-tracker-with-leader-bord-
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables:**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Set up Firebase:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password + Google)
   - Create a Firestore database
   - Copy security rules from `FIREBASE_RULES.txt`
   - See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions

5. **Start the development server:**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:5173](http://localhost:5173)

## 📁 Project Structure

```
src/
├── main.tsx                 # App entry point
├── app/
│   ├── App.tsx              # Main app with routing
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Shadcn/Radix UI components
│   │   └── ...              # App-specific components
│   ├── config/              # Firebase configuration
│   ├── context/             # React Context (Auth, Sidebar)
│   ├── pages/               # Page components
│   │   ├── TrackPage.tsx    # Push-up tracking with AI
│   │   ├── DashboardPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── FriendsPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── ...
│   ├── services/            # Firebase & app services
│   │   ├── authService.ts
│   │   ├── firestoreService.ts
│   │   ├── avatarService.ts
│   │   └── voiceAgentService.ts  # Voice commands & audio feedback
│   └── utils/               # Utility functions
├── styles/                  # Global styles
└── public/                  # Static assets
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |

## 🚀 Deployment

### Deploy to Vercel (Recommended)

```bash
npm run build
npx vercel --prod
```

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📚 Documentation

- [Firebase Setup Guide](FIREBASE_SETUP.md) - Complete Firebase configuration
- [API Runbook](API_RUNBOOK.md) - Avatar upload API documentation
- [Firebase Rules](FIREBASE_RULES.txt) - Firestore security rules
- [Development Guidelines](guidelines/Guidelines.md) - Code style and best practices

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use Firebase security rules to protect user data
- Enable email verification for new accounts
- Regularly update dependencies for security patches

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 👨‍💻 Author

**Vineel** - [GitHub](https://github.com/vineel2805)

## 📝 Changelog

### v2.1.0 (January 2026)
- ✨ Added face motion validation to prevent false rep counts
- ✨ Auto-pause when face/pose is lost for 2+ seconds
- ✨ Real-time debug dashboard showing state, angle, face visibility, and movement
- 🎨 Responsive skeleton point sizes for mobile
- ⚡ Optimized canvas rendering with single save/restore
- 🐛 Fixed face landmark tracking for accurate motion detection

### v2.0.0
- Initial release with AI push-up detection
- Voice commands and audio feedback
- Social features (leaderboard, friends, public profiles)
- Firebase authentication and data storage

---




