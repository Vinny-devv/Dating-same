// config.js
// Central Firebase setup. Every other module imports app/auth/db from here
// so there is exactly one place that knows about Firebase initialization.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB9Z5Tjc0yWg69GlWdUBTZ9VgUcGrh5mMU",
  authDomain: "v-scans.firebaseapp.com",
  projectId: "v-scans",
  storageBucket: "v-scans.firebasestorage.app",
  messagingSenderId: "545198752043",
  appId: "1:545198752043:web:efdc1656b5fd4f354ec56e",
  measurementId: "G-NDQER8NPM9",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// The only account allowed to edit content. This is a UX convenience —
// the real enforcement happens in firestore.rules, since anything checked
// only in client JS can be bypassed by editing the JS.
export const ADMIN_EMAIL = "anwarbah96@gmail.com";

// ImgBB is used purely for hosting character/background art referenced by
// URL in Firestore documents — Firestore never stores image bytes.
// NOTE: this key lives in public client code. Anyone can view-source it
// and use it to upload to your ImgBB account. If that ever becomes a
// problem, rotate the key at https://api.imgbb.com/.
export const IMGBB_API_KEY = "bf32151ce65f47f2707753b98cfa9b67";
export const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";
