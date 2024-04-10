// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA9b_3CtXKZUaD9WS1PVGPhu_ftVw5MN48",
  authDomain: "betie-ccd27.firebaseapp.com",
  projectId: "betie-ccd27",
  storageBucket: "betie-ccd27.appspot.com",
  messagingSenderId: "207649973683",
  appId: "1:207649973683:web:e51a93806d5b2f397017c6",
  measurementId: "G-9HK1YC8PQ6"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const firestore = getFirestore(app)
export const storage = getStorage(app)