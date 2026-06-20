import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    // Create/update user document in Firestore
    await createOrUpdateUser(user);
    return user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

export async function createOrUpdateUser(user: User) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      onboarded: false,
      isOnline: true,
      lastSeen: serverTimestamp(),
    });
  } else {
    await setDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true });
  }
}

export async function getUserProfile(uid: string) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid: string, data: Record<string, unknown>) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { ...data, lastSeen: serverTimestamp() }, { merge: true });
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out error:", error);
    throw error;
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
