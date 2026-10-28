import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAIsq4QV6wxwMb8phPa3tU14p2NRSXvTdY",
  authDomain: "dimaboutique-b4f16.firebaseapp.com",
  projectId: "dimaboutique-b4f16",
  storageBucket: "dimaboutique-b4f16.firebasestorage.app",
  messagingSenderId: "438611658146",
  appId: "1:438611658146:web:83b1a97cfc42bd12aadefb",
  measurementId: "G-TWLMJT4Y8R",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
export { app, auth };
export default app;
