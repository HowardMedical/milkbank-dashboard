import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDUwKr20VpAaPxcfwAsR2whTolKj31bDNU",
  authDomain: "howard-medical-dashboard.firebaseapp.com",
  projectId: "howard-medical-dashboard",
  storageBucket: "howard-medical-dashboard.firebasestorage.app",
  messagingSenderId: "503396234880",
  appId: "1:503396234880:web:6df09e846dbc86314ad865"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy };
