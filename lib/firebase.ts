// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAnalytics, isSupported } from "firebase/analytics"
import { getFirestore } from "firebase/firestore"

// ✅ New Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWtJIQtdC8-0VARFiQvp-nVV2Gk1iljkU",
  authDomain: "disruptive-product-database-v2.firebaseapp.com",
  projectId: "disruptive-product-database-v2",
  storageBucket: "disruptive-product-database-v2.firebasestorage.app",
  messagingSenderId: "944237041937",
  appId: "1:944237041937:web:6f57e8eea770b1178354b0",
  measurementId: "G-Y2Q6WXVYR7"
};

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
//   measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
// };
// ✅ Prevent re-initialization (important sa Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// ✅ Firestore (SSR-safe)
const db = getFirestore(app)

// ✅ Analytics (browser-only, safe)
let analytics: any = null

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  })
}

export { app, db, analytics }
