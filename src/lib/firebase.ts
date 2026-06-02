import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc } from "firebase/firestore";

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
const rawDb = getFirestore(app);

const PROJECT_ID = "zitron";
const projectRef = doc(rawDb, "projects", PROJECT_ID);

export function getCollection(name: string) {
  return collection(projectRef, name);
}

export function getDocRef(collectionName: string, docId: string) {
  return doc(projectRef, collectionName, docId);
}

export { app, auth, rawDb, projectRef, PROJECT_ID };
export default app;
