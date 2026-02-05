import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCkLQ5vf1z9dYjAVcOo7tm0BRT8N7jAbOw",
  authDomain: "ratul-liv.firebaseapp.com",
  databaseURL: "https://ratul-liv-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ratul-liv",
  storageBucket: "ratul-liv.appspot.com",
  messagingSenderId: "395032456768",
  appId: "1:395032456768:web:eadef753d410c71c5439a5"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);
