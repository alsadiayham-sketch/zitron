"use client";

import { FirebaseError } from "firebase/app";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { onSnapshot, setDoc } from "firebase/firestore";
import { auth, getDocRef } from "@/lib/firebase";
import type { SavedLocation, UserProfileDoc } from "@/lib/admin";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  profile: UserProfileDoc | null;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeLocations(value: unknown): SavedLocation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((location, index) => ({
      id: typeof location?.id === "string" && location.id.trim() ? location.id : `location-${index}`,
      label: typeof location?.label === "string" ? location.label : "عنوان محفوظ",
      city: typeof location?.city === "string" ? location.city : "",
      fullAddress: typeof location?.fullAddress === "string" ? location.fullAddress : "",
      isDefault: Boolean(location?.isDefault),
    }))
    .filter((location) => location.city || location.fullAddress || location.label);
}

function normalizeProfile(user: User, value: unknown): UserProfileDoc {
  const data = (value ?? {}) as Partial<UserProfileDoc>;
  return {
    name: typeof data.name === "string" && data.name.trim() ? data.name : user.displayName || "",
    email: typeof data.email === "string" && data.email.trim() ? data.email : user.email || "",
    phone: typeof data.phone === "string" ? data.phone : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    orders: Number(data.orders || 0),
    locations: normalizeLocations(data.locations),
  };
}

export function getAuthErrorMessage(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : typeof error === "object" && error && "code" in error ? String(error.code) : "";
  switch (code) {
    case "auth/email-already-in-use": return "هذا البريد الإلكتروني مستخدم بالفعل.";
    case "auth/weak-password": return "كلمة المرور ضعيفة جداً. استخدم 6 أحرف أو أكثر.";
    case "auth/invalid-email": return "البريد الإلكتروني غير صالح.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password": return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    case "auth/too-many-requests": return "تمت محاولات كثيرة. حاول مرة أخرى بعد قليل.";
    case "auth/requires-recent-login": return "يرجى تسجيل الدخول من جديد ثم إعادة المحاولة.";
    case "auth/network-request-failed": return "تعذر الاتصال حالياً. تحقق من الإنترنت ثم حاول مرة أخرى.";
    case "auth/configuration-not-found": return "خدمة المصادقة غير مفعّلة حالياً. يرجى تفعيل Email/Password من إعدادات Firebase.";
    case "auth/operation-not-allowed": return "تسجيل الدخول بالبريد الإلكتروني غير مفعّل. يرجى التواصل مع مدير النظام.";
    default: return error instanceof Error && error.message ? error.message : "حدث خطأ غير متوقع. حاول مرة أخرى.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      setProfileLoading(Boolean(nextUser));
      if (!nextUser) {
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      getDocRef("users", user.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? normalizeProfile(user, snapshot.data()) : normalizeProfile(user, null));
        setProfileLoading(false);
      },
      () => {
        setProfile(normalizeProfile(user, null));
        setProfileLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    profile,
    profileLoading,
    signIn: async (email, password) => { await signInWithEmailAndPassword(auth, email.trim(), password); },
    signUp: async (email, password, name, phone) => {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(getDocRef("users", credential.user.uid), {
        name: name.trim(),
        email: credential.user.email ?? email.trim(),
        phone: phone.trim(),
        createdAt: new Date().toISOString(),
        orders: 0,
        locations: [],
      });
    },
    signOut: async () => { await firebaseSignOut(auth); },
    resetPassword: async (email) => { await sendPasswordResetEmail(auth, email.trim()); },
  }), [loading, profile, profileLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
