import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC2DevBMeT80nj9NN6CDyXssSDyXUyceWA",
  authDomain: "stock-app-4afe8.firebaseapp.com",
  projectId: "stock-app-4afe8",
  storageBucket: "stock-app-4afe8.firebasestorage.app",
  messagingSenderId: "310499318784",
  appId: "1:310499318784:web:3589c499c939edf8d8cce5",
  measurementId: "G-YE84KR5W2N"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);