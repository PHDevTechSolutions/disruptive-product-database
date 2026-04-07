// lib/firebase.ts

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/* =================================
   MAIN FIREBASE
================================= */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,

  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,

  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,

  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/* =================================
   LOGS FIREBASE (FIXED)
================================= */

const firebaseConfigLogs = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_LOGS,

  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_LOGS,

  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_LOGS,

  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_LOGS,

  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_LOGS,

  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_LOGS,

  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID_LOGS,
};



/* =================================
   LOGS FIREBASE COLLAB
================================= */

const firebaseConfigCollab = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_COLLAB,

  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_COLLAB,

  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_COLLAB,

  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_COLLAB,

  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_COLLAB,

  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_COLLAB,

  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID_COLLAB,
};

/* =================================
   INITIALIZE MAIN APP
================================= */

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);

const storage = getStorage(app);

/* =================================
   INITIALIZE LOGS APP
================================= */

const logsApp = getApps().find((a) => a.name === "logs")
  ? getApp("logs")
  : initializeApp(firebaseConfigLogs, "logs");

const dbLogs = getFirestore(logsApp);

/* =================================
   INITIALIZE COLLAB APP
================================= */

const collabApp = getApps().find((a) => a.name === "collab")
  ? getApp("collab")
  : initializeApp(firebaseConfigCollab, "collab");

const dbCollab = getFirestore(collabApp);

/* =================================
   ANALYTICS
================================= */

let analytics: any = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  });
}

/* =================================
   EXPORTS
================================= */

export { app, db, dbLogs, dbCollab, storage, analytics };
