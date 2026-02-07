import { getApp, getApps, initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAt8oB7aw8qzlTDZBetR-5p5GOXQBTopa0",
  authDomain: "wedding-ambush.firebaseapp.com",
  projectId: "wedding-ambush",
  storageBucket: "wedding-ambush.firebasestorage.app",
  messagingSenderId: "716074972390",
  appId: "1:716074972390:web:9171b7fdf8c11a12b33727",
  measurementId: "G-9G69VZ0L1R",
};

export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

console.log("[firebase:init] projectId:", app.options.projectId);
console.log("[firebase:init] storageBucket:", app.options.storageBucket);

export const storage = getStorage(app);
export const db = getFirestore(app);
