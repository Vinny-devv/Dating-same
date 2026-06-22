// auth.js
// Thin wrapper around Firebase Auth so admin.js never touches the SDK
// directly. Keeps the "who is the admin" logic in one place (config.js).

import { auth, googleProvider, ADMIN_EMAIL } from "./config.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export function signIn() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

/**
 * Subscribes to auth state. Calls back with (user, isAdmin) on every change,
 * where user is null when signed out and isAdmin is true only when the
 * signed-in account matches ADMIN_EMAIL.
 */
export function watchAuth(callback) {
  return onAuthStateChanged(auth, (user) => {
    const isAdmin = !!user && user.email === ADMIN_EMAIL;
    callback(user, isAdmin);
  });
}
