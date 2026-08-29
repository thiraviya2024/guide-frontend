"use client"

import { getApp, getApps, initializeApp } from "firebase/app"
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const requiredConfig = Object.entries(firebaseConfig).filter(([, value]) => !value).map(([key]) => key)

export const isFirebaseConfigured = requiredConfig.length === 0

function firebaseAuth() {
  if (!isFirebaseConfigured) {
    throw new Error(`Firebase is not configured. Missing: ${requiredConfig.join(", ")}.`)
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getAuth(app)
}

export async function signInWithFirebaseEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(firebaseAuth(), email, password)
  return credential.user
}

export async function createFirebaseUser(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(firebaseAuth(), email, password)
  return credential.user
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider())
  return credential.user
}

export async function getFirebaseIdToken(user: User): Promise<string> {
  return user.getIdToken()
}

export function getCurrentFirebaseUser(): User | null {
  return firebaseAuth().currentUser
}

export function observeFirebaseAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth(), callback)
}

export async function signOutFromFirebase() {
  if (isFirebaseConfigured) await signOut(firebaseAuth())
}

export function firebaseErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead."
    case "auth/invalid-email":
      return "Please enter a valid email address."
    case "auth/weak-password":
      return "Password must be at least 6 characters."
    case "auth/operation-not-allowed":
      return "Email/password authentication is not enabled in Firebase."
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email address or password is incorrect."
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled."
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup. Allow popups and try again."
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using another sign-in method."
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again."
    case "auth/user-token-expired":
      return "Your sign-in session expired. Please sign in again."
    default:
      return code ? `Firebase authentication failed (${code}). Please try again.` : "Unable to sign in with Firebase. Please try again."
  }
}
