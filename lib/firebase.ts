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
