// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Import Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLh9NIhbWwRNDZ530udteUbzpnIarEWOA",
  authDomain: "product-database-b4975.firebaseapp.com",
  projectId: "product-database-b4975",
  storageBucket: "product-database-b4975.firebasestorage.app",
  messagingSenderId: "681965972013",
  appId: "1:681965972013:web:c57706c26ea4bc3fbd66a4",
  measurementId: "G-3NG38E0CF6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Analytics
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Export Firestore instance
export { db, analytics };
