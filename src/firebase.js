import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCbTEjcFDBXh6qvnfISFAapdElhg3g30QQ",
  authDomain: "ventas-ubb.firebaseapp.com",
  projectId: "ventas-ubb",
  storageBucket: "ventas-ubb.firebasestorage.app",
  messagingSenderId: "152970680924",
  appId: "1:152970680924:web:981a0e839773d756bfe499"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);