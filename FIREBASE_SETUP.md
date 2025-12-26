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

## Step 3: Create Firestore Database

1. Go to **Firestore Database** in the left sidebar
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select a location for your database
5. Click "Enable"

### Firestore Security Rules

For production, update your Firestore rules. Go to **Firestore Database** > **Rules** and use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      // Allow users to read their own profile
      allow get: if isAuthenticated() && isOwner(userId);
      
      // Allow users to read public profiles (for search/suggestions)
      allow get: if isAuthenticated() && resource.data.publicProfile == true;
      
      // Allow users to list/query public profiles (required for search queries)
      allow list: if isAuthenticated();
      
      // Allow users to write only their own profile
      allow create, update: if isAuthenticated() && isOwner(userId);
    }
    
    // Sessions collection
    match /sessions/{sessionId} {
      // Allow read/write only for own sessions
      allow read, write: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // Allow creating sessions with correct userId
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Friend requests collection
    match /friendRequests/{requestId} {
      // Allow reading own friend requests (sent or received)
      allow get: if isAuthenticated() && (
        resource.data.toUserId == request.auth.uid || 
        resource.data.fromUserId == request.auth.uid
      );
      
      // Allow listing friend requests - queries filter by toUserId/fromUserId
      // The query itself ensures only relevant requests are returned
      allow list: if isAuthenticated();
      
      // Allow creating friend requests
      allow create: if isAuthenticated() && 
        request.resource.data.fromUserId == request.auth.uid;
      
      // Allow updating friend requests (only recipient can update)
      allow update: if isAuthenticated() && 
        resource.data.toUserId == request.auth.uid;
    }
  }
}
```

**Important Notes:**

1. **Query Permissions**: The rules now use `list` permission which is required for Firestore queries. The `get` permission only works for individual document reads.

2. **User Search**: The `allow list: if isAuthenticated()` on users collection allows authenticated users to query the users collection. The application code filters results to only show public profiles.

3. **Friend Requests Query**: The `allow list` on friendRequests allows queries, but you must have the composite index created (which you already have).

4. **Index Required**: Make sure you have created the composite index for friendRequests:
   - Collection: `friendRequests`
   - Fields: `toUserId` (Ascending), `status` (Ascending), `createdAt` (Descending)

5. **User Search Index**: You may also need to create an index for user search:
   - Collection: `users`
   - Fields: `username` (Ascending), `publicProfile` (Ascending)

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

