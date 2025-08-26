// public/assets/js/firebase-config.js
// Firebase modular SDK via CDN (vanilla ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  sendPasswordResetEmail, // ← para “Olvidé mi contraseña”
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  // Firestore: usamos initializeFirestore para afinar el transporte
  initializeFirestore,
  // Helpers de lectura/escritura que usaremos en todo el proyecto
  doc, setDoc, getDoc, updateDoc,
  collection, addDoc, getDocs, query, where, orderBy,
  serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ——————————————————————————————————————
// Configuración de tu proyecto Firebase
// ——————————————————————————————————————
const firebaseConfig = {
  apiKey: "AIzaSyD6iz3DiM8BX5BM-x9u1MeysQRw6rENVfc",
  authDomain: "crudcenter-28cf1.firebaseapp.com",
  projectId: "crudcenter-28cf1",
  storageBucket: "crudcenter-28cf1.firebasestorage.app",
  messagingSenderId: "790801923486",
  appId: "1:790801923486:web:00d1f8bce8e509c1be6a8f",
  measurementId: "G-JMMN5D4G4F",
};

// App + Auth
export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firestore con “hints” de conectividad para redes complicadas
// - experimentalAutoDetectLongPolling: intenta long-polling si detecta problemas
// - useFetchStreams: off para evitar fallos con algunos proxies/ad-blockers
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  // Si aún ves 400, descomenta la siguiente línea para forzar long-polling:
  // experimentalForceLongPolling: true,
  useFetchStreams: false,
});

// Re-exports para importar todo desde un solo archivo
export {
  // Auth
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  sendPasswordResetEmail,

  // Firestore
  doc, setDoc, getDoc, updateDoc,
  collection, addDoc, getDocs, query, where, orderBy,
  serverTimestamp, Timestamp,
};
