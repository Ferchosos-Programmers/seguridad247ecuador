document.addEventListener("DOMContentLoaded", () => {
  activarLoginComercial();
});

function activarLoginComercial() {
  const form = document.getElementById("comercialLoginForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("comercialUser").value;
    const password = document.getElementById("comercialPassword").value;

    auth
      .signInWithEmailAndPassword(email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        // Validar Rol y Estado
        const doc = await db.collection("users").doc(user.uid).get();
        const userData = doc.exists ? doc.data() : null;

        // En este caso permitimos 'administrador', 'admin' o 'comercial'
        const role =
          userData && userData.role ? userData.role.toLowerCase() : null;
        const isMainAdmin = user.email === "admin@gmail.com";
        const isAuthorized =
          isMainAdmin ||
          role === "administrador" ||
          role === "admin" ||
          role === "comercial";
        const isActive =
          isMainAdmin || (userData && userData.status !== "inactive");

        if (!isAuthorized || !isActive) {
          let errorMsg =
            "Su cuenta no tiene permisos para acceder al apartado Comercial.";
          if (!isActive && userData)
            errorMsg =
              "Su cuenta ha sido desactivada. Por favor, contacte con el administrador.";

          auth.signOut().then(() => {
            Swal.fire({
              icon: "error",
              title: "Acceso Denegado",
              text: errorMsg,
              confirmButtonColor: "#d4af37",
            }).then(() => {
              if (form) form.reset();
            });
          });
          return;
        }

        const userName =
          (userData &&
            (userData.adminName || userData.nombre || userData.displayName)) ||
          "Usuario Comercial";

        Swal.fire({
          icon: "success",
          title: "¡Bienvenido!",
          text: `Ingresando a Administración Comercial, ${userName}`,
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          try {
            const modalEl = document.getElementById("loginModalComercial");
            if (modalEl && typeof bootstrap !== "undefined") {
              const modal =
                bootstrap.Modal.getInstance(modalEl) ||
                new bootstrap.Modal(modalEl);
              if (modal) modal.hide();
            }
          } catch (error) {
            console.warn("No se pudo cerrar el modal automáticamente:", error);
          }
          window.location.href = "gestion_comercial.html";
        });
      })
      .catch((error) => {
        console.error("Login Error:", error);
        let errorMsg = "Credenciales incorrectas o usuario no encontrado";

        Swal.fire({
          icon: "error",
          title: "Error",
          text: errorMsg,
          confirmButtonColor: "#d4af37",
        });
      });
  });
}
