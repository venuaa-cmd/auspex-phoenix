// src/lib/firebase.js

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

// Your Web App's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJKv0rhHnonCbIJgl7XYh-TJdXhY1NgsE",
  authDomain: "auspex-phoenix.firebaseapp.com",
  projectId: "auspex-phoenix",
  storageBucket: "auspex-phoenix.firebasestorage.app",
  messagingSenderId: "1021098409196",
  appId: "1:1021098409196:web:e013b56b1b74cfd1ceb9c9",
  measurementId: "G-5FCF7KG7P4"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialize Services
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// CRITICAL FIX: Ensure the auth object is exported and ready.
// The next module (supabaseClient.js) relies on a synchronous check of this object.
// While async load is always present, ensuring a robust export is necessary here.

// Single Export Statement
export { db, auth, storage, firebase };