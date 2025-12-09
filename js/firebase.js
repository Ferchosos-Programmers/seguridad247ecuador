const firebaseConfig = {
  apiKey: "AIzaSyBXnjClWlp-pFXB8dNYAAqX8LSsMsMrCVw",
  authDomain: "seguridad247-ecuador.firebaseapp.com",
  projectId: "seguridad247-ecuador",
  storageBucket: "seguridad247-ecuador.appspot.com",
  messagingSenderId: "575292063962",
  appId: "1:575292063962:web:5fb63dc04b4ef3c66c65e3",
  measurementId: "G-SFZN0LDMK1"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// ==========================
// VARIABLES GLOBALES
// ==========================
const auth = firebase.auth();
const db = firebase.firestore();
