# Play Store Deployment Guide — Privacy Messenger

## Prerequisites

- Node.js 18+
- Android Studio (latest)
- Java 17 JDK
- Google Play Developer account ($25 one-time fee)
- Firebase account (free tier)

---

## Step 1: Setup Firebase (Push Notifications)

1. Go to https://console.firebase.google.com
2. Create new project: "Privacy Messenger"
3. Add Android app:
   - Package name: `com.privacymessenger.app`
   - Download `google-services.json`
4. Add Web app:
   - Copy the Firebase config object
5. Go to Cloud Messaging > Web Push certificates
   - Generate VAPID key pair

### Update config files:
- Replace `YOUR_API_KEY`, etc. in:
  - `src/services/pushNotifications.js`
  - `public/firebase-messaging-sw.js`

---

## Step 2: Deploy Backend to Railway

```bash
cd privacy-messenger

# Initialize git repo
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
gh repo create privacymessenger-backend --private --push

# On Railway (railway.app):
# 1. New Project > Deploy from GitHub repo
# 2. Add PostgreSQL plugin
# 3. Add Redis plugin
# 4. Set environment variables:
#    PORT=8082
#    NODE_ENV=production
#    JWT_SECRET=<generate: openssl rand -hex 64>
#    JWT_REFRESH_SECRET=<generate: openssl rand -hex 64>
#    DATABASE_URL=<auto from Railway PostgreSQL>
#    REDIS_URL=<auto from Railway Redis>
#    ENCRYPTION_SALT_ROUNDS=12

# 5. After deploy, run migrations:
railway run node migrations/run.js
railway run node migrations/v2_push_files.js
```

Save your Railway backend URL (e.g., `https://privmsg-backend.up.railway.app`)

---

## Step 3: Build Android APK

```bash
cd privacy-messenger-app

# Install dependencies
npm install

# Set backend URL
echo "VITE_API_URL=https://your-railway-url.up.railway.app/api" > .env
echo "VITE_SOCKET_URL=https://your-railway-url.up.railway.app" >> .env

# Build web app
npm run build

# Add Android platform
npx cap add android

# Copy google-services.json to android/app/
cp ~/Downloads/google-services.json android/app/

# Sync web build to Android
npx cap sync

# Open in Android Studio
npx cap open android
```

### In Android Studio:

1. Wait for Gradle sync to complete
2. Edit `android/app/build.gradle`:
   - Set `minSdkVersion 23`
   - Set `targetSdkVersion 34`
3. Add internet permission in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   ```

### Generate Signed APK:

1. Build > Generate Signed Bundle / APK
2. Choose "Android App Bundle (AAB)" for Play Store
3. Create new keystore:
   - Save keystore file somewhere SAFE (you need it for every update!)
   - Key alias: `privacymessenger`
   - Set passwords
4. Build Release variant
5. Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Step 4: Create Play Store Listing

### Go to https://play.google.com/console

1. Create new app:
   - App name: "Privacy Messenger"
   - Default language: English
   - App type: App
   - Free or paid: Free
   - Category: Communication

2. Store listing:
   - Short description (80 chars max):
     "Private messaging with zero-knowledge encryption. No phone number needed."
   - Full description (4000 chars max):
     ```
     Privacy Messenger is a secure, encrypted messaging app that puts 
     your privacy first.

     ✦ No Phone Number Required — Get a unique ID instead
     ✦ End-to-End Encrypted — Only you and your recipient can read messages
     ✦ Zero Knowledge — Our servers never see your message content
     ✦ One Account Per Device — No fake accounts or spam
     ✦ Disappearing Messages — Set messages to auto-delete
     ✦ No Data Collection — We don't track you, period

     Unlike other messaging apps, Privacy Messenger doesn't require your 
     phone number, email, or any personal information. Your identity is a 
     randomly generated unique ID that you control.

     Messages are encrypted on your device before being sent. Even we 
     cannot read them. This isn't a marketing promise — it's mathematically 
     enforced by ECDH key exchange and AES-256-GCM encryption.

     Take back control of your privacy. Download Privacy Messenger today.
     ```

3. Graphics:
   - App icon: 512x512 PNG (use icon-512.png)
   - Feature graphic: 1024x500 PNG
   - Screenshots: At least 2 phone screenshots (1080x1920)

4. Content rating:
   - Fill out the IARC questionnaire
   - Category will likely be: "Everyone" or "Everyone 10+"

5. Privacy policy URL:
   - Host privacy-policy.html on your domain
   - Enter the URL: `https://yourdomain.com/privacy-policy.html`

6. Target audience:
   - NOT primarily child-directed
   - Target age: 13+

---

## Step 5: App Review Checklist

Before uploading:

- [ ] App works without crashes
- [ ] Login/register flow completes successfully  
- [ ] Messages send and receive correctly
- [ ] Push notifications arrive
- [ ] E2E encryption is active (lock icon visible)
- [ ] Privacy policy is accessible
- [ ] Terms of service is accessible
- [ ] App icon displays correctly
- [ ] Splash screen shows and dismisses
- [ ] Back button works correctly (doesn't exit on chat screens)
- [ ] Keyboard doesn't overlap input fields
- [ ] Works on Android 7.0+ (API 23+)
- [ ] Works in both portrait and landscape
- [ ] No hardcoded localhost URLs in production build

---

## Step 6: Upload & Publish

1. In Play Console > Release > Production
2. Create new release
3. Upload the `.aab` file
4. Add release notes:
   ```
   v1.0.0 - Initial Release
   • Private messaging with unique ID system
   • End-to-end encryption
   • Real-time message delivery
   • Typing indicators and read receipts
   • Push notifications
   • Dark theme
   ```
5. Review and roll out to Production
6. Google review takes 1-7 days

---

## Domain Setup (Optional but Recommended)

1. Buy domain: `privacymessenger.app` (or similar)
2. Point DNS to your Railway backend
3. Host privacy policy + terms on the domain
4. Update all URLs in the app config

---

## Post-Launch Checklist

- [ ] Monitor crash reports in Play Console
- [ ] Set up Firebase Analytics (optional)
- [ ] Respond to user reviews
- [ ] Plan v1.1 features (group chat, voice messages, etc.)
