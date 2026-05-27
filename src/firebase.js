import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCBjaMmUOsWhKAX1xtgSkMTlmdSjADZEto",
  authDomain: "mattress-c4fd5.firebaseapp.com",
  projectId: "mattress-c4fd5",
  storageBucket: "mattress-c4fd5.firebasestorage.app",
  messagingSenderId: "893903754520",
  appId: "1:893903754520:web:8ea5bbe1799bdb65cc7a6d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
