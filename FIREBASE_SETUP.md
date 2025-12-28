# Firebase Setup Guide

This guide will help you set up Firebase for authentication and data storage in the Push-Up Tracker application.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter a project name
   - Enable/disable Google Analytics (optional)
   - Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Enable **Email/Password** authentication:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"
5. Enable **Google** authentication:
   - Click on "Google"
   - Toggle "Enable" to ON
   - Enter your project support email
   - Click "Save"

## Step 3: Create Firestore Database

1. Go to **Firestore Database** in the left sidebar
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select a location for your database
5. Click "Enable"

### Firestore Security Rules

**CRITICAL:** Copy the rules from `FIREBASE_RULES.txt` and paste them into Firebase Console.

1. Go to **Firestore Database** → **Rules**
2. **DELETE** all existing rules
3. **PASTE** the rules from `FIREBASE_RULES.txt`
4. Click **Publish**

**Important Notes:**

1. **Username Queries**: The `allow list: if true` on users collection allows checking username availability during signup (even when unauthenticated). This is necessary for the signup flow.

2. **Friend Sessions**: Users can read sessions of their friends (for leaderboards). The rules check if the session owner is in the current user's friends list.

3. **Public Profiles**: Authenticated users can read public profiles for search and suggestions.

4. **Indexes Required**: Make sure you have created these composite indexes:
   - **Sessions**: `userId` (Ascending), `createdAt` (Descending)
   - **Friend Requests**: `toUserId` (Ascending), `status` (Ascending), `createdAt` (Descending)
   - **Users**: `username` (Ascending), `publicProfile` (Ascending) - for search queries

## Step 4: Get Firebase Configuration

1. Go to **Project Settings** (gear icon next to "Project Overview")
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register your app with a nickname (e.g., "Push-Up Tracker Web")
5. Copy the Firebase configuration object

## Step 5: Set Up Environment Variables

1. Create a `.env` file in the root of your project (copy from `.env.example` if it exists)
2. Add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Replace the placeholder values with your actual Firebase config values.

## Step 6: Install Dependencies

Run the following command to install Firebase and other dependencies:

```bash
npm install
```

This will install:
- `firebase` - Firebase SDK
- `react` and `react-dom` - React dependencies

## Step 7: Create Firestore Indexes

For optimal performance, create composite indexes in Firestore:

1. Go to **Firestore Database** > **Indexes**
2. Click "Create Index"
3. Create the following indexes:

**Index 1: Sessions Query**
- Collection: `sessions`
- Fields:
  - `userId` (Ascending)
  - `createdAt` (Descending)

**Index 2: Friend Requests Query**
- Collection: `friendRequests`
- Fields:
  - `toUserId` (Ascending)
  - `status` (Ascending)
  - `createdAt` (Descending)

## Step 8: Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Try creating an account:
   - Go to the signup page
   - Create a new account
   - Check Firebase Console > Authentication to see the new user

3. Try adding a session:
   - Log in and track a push-up session
   - Check Firestore Database to see the session document

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure your `.env` file exists and has all required variables
- Restart your development server after creating/updating `.env`

### "Missing or insufficient permissions"
- Check your Firestore security rules
- Make sure you're authenticated before accessing protected data

### "Index not found"
- Create the required Firestore indexes (see Step 7)
- Wait a few minutes for indexes to build

### Authentication not working
- Verify Email/Password is enabled in Firebase Authentication
- Check browser console for detailed error messages

## Production Considerations

Before deploying to production:

1. **Update Firestore Security Rules** - Use the rules provided above or customize for your needs
2. **Enable App Check** - Add App Check to protect your backend resources
3. **Set up Custom Domain** - Configure a custom domain for Firebase Auth
4. **Monitor Usage** - Set up billing alerts in Firebase Console
5. **Backup Data** - Set up automated backups for Firestore

## Support

For more information, visit:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)

