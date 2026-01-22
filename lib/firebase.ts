// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAnalytics, isSupported } from "firebase/analytics"
import { getFirestore } from "firebase/firestore"

// ✅ New Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBcNuHZ_w6c0Qib-NnGyxMtomxIxNOD4p0",
  authDomain: "disruptive-product-datab-d518f.firebaseapp.com",
  projectId: "disruptive-product-datab-d518f",
  storageBucket: "disruptive-product-datab-d518f.firebasestorage.app",
  messagingSenderId: "130447840889",
  appId: "1:130447840889:web:e10a1ebd58e61742cea6a8",
  measurementId: "G-WCNF6TNC3R",
}

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
