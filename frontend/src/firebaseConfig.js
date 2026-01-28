// Import the functions you need from the SDKs you need
import { initializeApp, } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAzqhnwTpaQBscLlta2WI3oWa0bjd4Sw-M",
    authDomain: "jukebox-party-485415.firebaseapp.com",
    projectId: "jukebox-party-485415",
    storageBucket: "jukebox-party-485415.firebasestorage.app",
    messagingSenderId: "1087797195504",
    appId: "1:1087797195504:web:ef42a7dbef420a36888835",
    measurementId: "G-K983VCDGD0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);