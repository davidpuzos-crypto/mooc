// Firebase configuration
// Utilisation du SDK compat via balises <script> (chargé dans index.html)

const firebaseConfig = {
    apiKey: "AIzaSyBLMERKeQ9AnU4uRc2XRcWja7ZRqi7arNE",
    authDomain: "app-evaluation-candidats.firebaseapp.com",
    projectId: "app-evaluation-candidats",
    storageBucket: "app-evaluation-candidats.firebasestorage.app",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);

// Initialisation de Firestore
const db = firebase.firestore();

// Analytics (optionnel)
if (typeof firebase.analytics === "function") {
    firebase.analytics();
}
