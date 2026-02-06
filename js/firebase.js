const firebaseConfig = {
  apiKey: "AIzaSyBXnjClWlp-pFXB8dNYAAqX8LSsMsMrCVw",
  authDomain: "seguridad247-ecuador.firebaseapp.com",
  projectId: "seguridad247-ecuador",
  storageBucket: "seguridad247-ecuador.appspot.com",
  messagingSenderId: "575292063962",
  appId: "1:575292063962:web:5fb63dc04b4ef3c66c65e3",
  measurementId: "G-SFZN0LDMK1",
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Habilitar Persistencia Offline (Optimización para múltiples usuarios y conexiones inestables)
firebase
  .firestore()
  .enablePersistence()
  .catch((err) => {
    if (err.code == "failed-precondition") {
      // Multitest: Múltiples pestañas abiertas, la persistencia solo funciona en una.
      console.warn(
        "La persistencia de datos solo puede habilitarse en una pestaña a la vez.",
      );
    } else if (err.code == "unimplemented") {
      // El navegador no soporta persistencia (ej. modo incógnito antiguo)
      console.error("El navegador no soporta persistencia de datos offline.");
    }
  });

// ==========================
// VARIABLES GLOBALES
// ==========================
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage(); // Asegurar storage global
