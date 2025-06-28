import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyBxXIA2ZRntgZwXXXSR-3WkhpmakNh84Io",
  authDomain: "nitu-designer.firebaseapp.com",
  projectId: "nitu-designer",
  storageBucket: "nitu-designer.firebasestorage.app",
  messagingSenderId: "218608537340",
  appId: "1:218608537340:web:783c885c87e5a830bfd179",
  measurementId: "G-E2F1LFR7M7",
};

export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
