# Push-Up Tracker 

An AI-powered push-up counter with real-time pose detection, leaderboard, and social features. Built with React, TypeScript, MediaPipe, and Firebase.

![Push-Up Tracker](https://img.shields.io/badge/version-1.0.0-green) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Firebase](https://img.shields.io/badge/Firebase-10-orange)

## 🎯 Features

### Core Features
- **AI Push-Up Detection** - Real-time rep counting using MediaPipe pose detection with elbow angle tracking
- **Live Camera Preview** - See yourself with skeleton overlay and joint highlights
- **Session Tracking** - Track reps, duration, and save workouts to your profile

### Social Features
- **Leaderboard** - Compete with friends and see top performers
- **Friends System** - Send/accept friend requests and view friends' progress
- **Public Profiles** - Share your achievements with a customizable public profile

### User Experience
- **User Authentication** - Secure sign-up, login, Google auth, and email verification
- **Voice Agent** - Audio feedback during workouts with rep announcements, milestone alerts, and motivational messages
- **Dashboard** - View daily progress and statistics at a glance
- **Analytics** - Visualize your fitness journey with interactive charts
- **History** - Browse past workout sessions
- **Settings** - Customize theme, notifications, privacy, and voice agent settings
- **Responsive Design** - Works seamlessly on desktop and mobile

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
│   ├── services/            # Firebase services
│   │   ├── authService.ts
│   │   ├── firestoreService.ts
│   │   └── avatarService.ts
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

## 📄 License

This project is private and not licensed for public use.

## 👨‍💻 Author

**Vineel** - [GitHub](https://github.com/vineel2805)

---


