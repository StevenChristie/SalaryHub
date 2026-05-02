// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_c2g2-4E775DM3B6GKqNjJiJoSKDobKE",
  authDomain: "salary-hub-web.firebaseapp.com",
  projectId: "salary-hub-web",
  storageBucket: "salary-hub-web.firebasestorage.app",
  messagingSenderId: "861607869327",
  appId: "1:861607869327:web:32fdea52b26aef315169fa",
  measurementId: "G-MZT1DW2NXN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);