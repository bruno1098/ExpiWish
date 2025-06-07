// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBoCA8htD7kcfCMfephG6O1oKlrG2hbGzU",
  authDomain: "expi-e7219.firebaseapp.com",
  databaseURL: "https://expi-e7219-default-rtdb.firebaseio.com",
  projectId: "expi-e7219",
  storageBucket: "expi-e7219.firebasestorage.app",
  messagingSenderId: "873889751904",
  appId: "1:873889751904:web:041d5ea449384087727405"
};

const app = initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const realtimeDb: Database = getDatabase(app);

export { db, auth, realtimeDb, firebaseConfig }; 