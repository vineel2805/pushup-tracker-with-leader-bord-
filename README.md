# Push-Up Tracker 

A modern web application for tracking push-ups and fitness progress, built with React, TypeScript, and Firebase.

## Features

- **User Authentication** - Secure sign-up, login, password recovery, and email verification via Firebase Auth
- **Real-time Tracking** - Track your push-ups with MediaPipe pose detection
- **Dashboard** - View your daily progress and statistics at a glance
- **Analytics** - Visualize your fitness journey with interactive charts (Recharts)
- **History** - Browse your past workout sessions
- **Friends** - Connect with friends and see their progress
- **Public Profiles** - Share your achievements with a public profile page
- **Settings** - Customize your experience with theme and notification preferences
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS 4, Radix UI components, Lucide icons
- **Backend**: Firebase (Authentication, Firestore)
- **Pose Detection**: MediaPipe Pose
- **Charts**: Recharts
- **Animations**: Motion (Framer Motion)
- **Forms**: React Hook Form
- **Routing**: React Router DOM v7

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd push-up-tracker
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password) and Firestore
   - Copy your Firebase config to `src/app/config/firebase.ts`
   - See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
src/
├── main.tsx              # App entry point
├── app/
│   ├── App.tsx           # Main app component with routing
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # Shadcn/Radix UI components
│   │   └── ...           # App-specific components
│   ├── config/           # Firebase configuration
│   ├── context/          # React Context providers
│   ├── pages/            # Page components
│   ├── services/         # Firebase services (auth, firestore)
│   └── utils/            # Utility functions and helpers
├── styles/               # Global styles and Tailwind config
└── public/               # Static assets
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production

## Documentation

- [Firebase Setup Guide](FIREBASE_SETUP.md)
- [API Runbook](API_RUNBOOK.md)
- [Development Guidelines](guidelines/Guidelines.md)

## License

This project is private and not licensed for public use.
