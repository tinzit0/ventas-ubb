import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Reemplazaremos estos valores cuando crees tu proyecto en la consola de Firebase (firebase.google.com)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "ventas-ubb.firebaseapp.com",
  projectId: "ventas-ubb",
  storageBucket: "ventas-ubb.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);