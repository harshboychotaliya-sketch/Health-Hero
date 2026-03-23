# 🌿 MedBuddy — Setup & Deployment Guide

## Repo Structure
```
medbuddy/
├── server.js               ← Node/Express backend (serves files + verifies auth)
├── package.json            ← Dependencies
├── .env.example            ← Copy to .env and fill in your keys
├── .gitignore
├── firebase-auth.js        ← Frontend Firebase auth (Google + Email + Phone)
├── medbuddy_db.js          ← Trilingual medicines/conditions database
└── public/
    └── medbuddy.html       ← Main app HTML
```

---

## Step 1 — Firebase Setup (5 mins)

1. Go to [firebase.google.com](https://firebase.google.com) → **Create project**
2. In the console → **Authentication** → **Sign-in method** → Enable:
   - ✅ Google
   - ✅ Email/Password
   - ✅ Phone
3. **Get frontend config:**
   Project Settings → General → Your apps → Add Web App → copy `firebaseConfig`
4. **Get backend service account:**
   Project Settings → Service Accounts → Generate new private key → download JSON

---

## Step 2 — Add your Firebase config to firebase-auth.js

Open `firebase-auth.js` and replace the top section:

```js
const firebaseConfig = {
  apiKey:            "AIza...",           // ← your values here
  authDomain:        "myapp.firebaseapp.com",
  projectId:         "myapp",
  storageBucket:     "myapp.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc",
};
```

---

## Step 3 — Add script tags to medbuddy.html

In `public/medbuddy.html`, add to `<head>` (before other scripts):

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>

<!-- MedBuddy Auth + DB -->
<script src="/firebase-auth.js"></script>
<script src="/medbuddy_db.js"></script>
```

Also add the invisible reCAPTCHA anchor inside the phone panel div:
```html
<div id="phone-recaptcha"></div>
```

And **remove** these old fake functions from medbuddy.html's `<script>`:
- `loginGoogle()`
- `emailNext()`
- `phoneNext()`
- `validateEmail()`
- `validatePhone()`
- `otpMove()`
- `resendOtp()`
- `toggleCountry()`
- `setCC()`
- `togglePw()`
- `showPanel()`
- `enterApp()`

(They're all replaced by `firebase-auth.js`)

---

## Step 4 — Local development

```bash
npm install
cp .env.example .env
# Fill in your keys in .env
npm run dev
# Open http://localhost:3000
```

---

## Step 5 — Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. **Environment Variables** (Dashboard → Environment):
   - `OPENROUTER_API_KEY` = your OpenRouter key
   - `FIREBASE_SERVICE_ACCOUNT` = paste the entire service account JSON as one line
6. Deploy! 🚀

---

## Sign Out Button (optional)

Add anywhere in medbuddy.html to let users sign out:
```html
<button onclick="signOut()">Sign Out</button>
```

---

## How Auth Flow Works

```
User opens app
      ↓
Splash (2.5s animation)
      ↓
Login page shows
      ↓
User picks: Google / Email / Phone
      ↓
Firebase handles auth → returns idToken
      ↓
firebase-auth.js sends idToken to /api/auth/verify
      ↓
server.js verifies with Firebase Admin SDK
      ↓
Returns user profile → app opens with welcome toast
```
