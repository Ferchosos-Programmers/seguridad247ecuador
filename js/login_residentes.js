document.addEventListener("DOMContentLoaded", () => {
  const residentesLoginForm = document.getElementById("residentesLoginForm");

  if (residentesLoginForm) {
    residentesLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("residentesUser").value.trim();
      const password = document
        .getElementById("residentesPassword")
        .value.trim();

      if (!email || !password) {
        Swal.fire({
          icon: "warning",
          title: "Campos incompletos",
          text: "Por favor, ingresa tu correo y contraseña.",
          confirmButtonColor: "#4287f5",
        });
        return;
      }

      // Mostrar estado de carga
      Swal.fire({
        title: "Autenticando...",
        text: "Por favor espera un momento.",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        // 1. Iniciar sesión con Firebase Auth
        const userCredential = await firebase
          .auth()
          .signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 2. Verificar rol en Firestore
        const db = firebase.firestore();
        const userDoc = await db.collection("users").doc(user.uid).get();

        if (userDoc.exists) {
          const userData = userDoc.data();

          // Verificamos si el rol es Administrador de Conjunto
          // Basado en login_admin.js, el rol se guarda como "ADMIN_CONJUNTO"
          if (userData.role === "ADMIN_CONJUNTO") {
            Swal.fire({
              icon: "success",
              title: "¡Bienvenido!",
              text: "Acceso concedido como Administrador de Conjunto.",
              timer: 2000,
              showConfirmButton: false,
            }).then(() => {
              window.location.href = "conjuntos.html";
            });
          } else {
            // Si tiene cuenta pero no es el rol adecuado
            await firebase.auth().signOut();
            Swal.fire({
              icon: "error",
              title: "Acceso Denegado",
              text: "No tienes permisos de Administrador de Conjunto para acceder aquí.",
              confirmButtonColor: "#4287f5",
            });
          }
        } else {
          // Si el usuario no existe en la colección 'users'
          await firebase.auth().signOut();
          Swal.fire({
            icon: "error",
            title: "Usuario no encontrado",
            text: "No hay registros de este usuario en el sistema.",
            confirmButtonColor: "#4287f5",
          });
        }
      } catch (error) {
        console.error("Error en login residentes:", error);

        let errorMessage = "Ocurrió un error al intentar iniciar sesión.";
        if (
          error.code === "auth/user-not-found" ||
          error.code === "auth/wrong-password"
        ) {
          errorMessage = "Correo o contraseña incorrectos.";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "El formato del correo electrónico no es válido.";
        }

        Swal.fire({
          icon: "error",
          title: "Error de Autenticación",
          text: errorMessage,
          confirmButtonColor: "#4287f5",
        });
      }
    });
  }
});
