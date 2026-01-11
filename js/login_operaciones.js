document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("opsLoginForm");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("opsUser").value;
      const password = document.getElementById("opsPassword").value;

      if (!email || !password) {
        Swal.fire({
          icon: "warning",
          title: "Campos incompletos",
          text: "Por favor, ingresa tu usuario y contraseña.",
          confirmButtonColor: "#d4af37",
        });
        return;
      }

      auth
        .signInWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
          const user = userCredential.user;

          // 1. Obtener datos del usuario
          const doc = await db.collection("users").doc(user.uid).get();
          const userData = doc.exists ? doc.data() : null;

          // 2. Validar existencia de datos y Rol
          const role = userData ? userData.role : null;

          // Permitir rol 'operaciones' o 'monitoreo'
          const isAuthorized = role === "operaciones" || role === "monitoreo";

          // 3. Validar Estado Activo
          const isActive = userData && userData.status !== "inactive";

          if (!isAuthorized || !isActive) {
            let errorMsg =
              "Su cuenta no tiene permisos para acceder al Departamento de Operaciones. Por favor use el formulario correcto.";
            if (!isActive && userData)
              errorMsg =
                "Su cuenta ha sido desactivada. Por favor, contacte con el soporte técnico.";

            auth.signOut().then(() => {
              Swal.fire({
                icon: "error",
                title: "Acceso Denegado",
                text: errorMsg,
                confirmButtonColor: "#d4af37",
              }).then(() => {
                const form = document.getElementById("opsLoginForm");
                if (form) form.reset();
                window.location.href = "control_center.html";
              });
            });
            return;
          }

          // 4. Login Exitoso
          const userName =
            (userData &&
              (userData.adminName ||
                userData.nombre ||
                userData.displayName)) ||
            "Operador";

          Swal.fire({
            icon: "success",
            title: "¡Bienvenido!",
            text: `Ingresando a Departamento de Operaciones, ${userName}`,
            timer: 1500,
            showConfirmButton: false,
            allowOutsideClick: false,
          }).then(() => {
            // Redirección inmediata
            window.location.href = "gestion_operaciones.html";
          });
        })
        .catch((error) => {
          console.error("Login Error:", error);
          let errorMsg = "Ocurrió un error al iniciar sesión.";

          if (
            error.code === "auth/wrong-password" ||
            error.code === "auth/user-not-found"
          ) {
            errorMsg = "Credenciales incorrectas o usuario no encontrado";
          } else if (error.message.includes("INVALID_LOGIN_CREDENTIALS")) {
            errorMsg = "Credenciales incorrectas o usuario no encontrado";
          }

          Swal.fire({
            icon: "error",
            title: "Error",
            text: errorMsg,
            confirmButtonColor: "#d4af37",
          });
        });
    });
  }
});
