document.addEventListener("DOMContentLoaded", () => {
  const clientLoginForm = document.getElementById("clientLoginForm");

  if (clientLoginForm) {
    clientLoginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("clientUser").value;
      const password = document.getElementById("clientPassword").value;

      if (!email || !password) {
        Swal.fire("Error", "Por favor ingresa usuario y contraseña", "error");
        return;
      }

      firebase
        .auth()
        .signInWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
          const user = userCredential.user;

          try {
            const doc = await firebase.firestore().collection("users").doc(user.uid).get();
            
            if (doc.exists) {
              const userData = doc.data();
              
              // 1. Validar Rol
              const role = userData ? userData.role : null;
              const isMainAdmin = user.email === 'admin@gmail.com';

              // Solo permitir Administradores de Conjunto en este formulario
              const isAuthorized = role === 'ADMIN_CONJUNTO' && !isMainAdmin;

              // 2. Validar Estado Activo
              const isActive = userData && userData.status === 'active';

              if (!isAuthorized || !isActive) {
                let errorMsg = "Su cuenta no tiene permisos para acceder a este apartado (Residentes). Por favor use el formulario correcto.";
                if (!isActive && userData) errorMsg = "Su cuenta ha sido desactivada temporalmente. Contacte al administrador principal.";

                await firebase.auth().signOut();
                
                Swal.fire({
                  icon: "error",
                  title: "Acceso Denegado",
                  text: errorMsg,
                  confirmButtonColor: "#d4af37",
                }).then(() => {
                  const form = document.getElementById("clientLoginForm");
                  if (form) form.reset();
                  window.location.href = "control_center.html";
                });
                return;
              }

              // 3. Login Exitoso
              const userName = (userData && (userData.adminName || userData.nombre || userData.displayName)) || "Residente";

              Swal.fire({
                title: "¡Bienvenido!",
                text: `Ingresando al Portal de Residentes, ${userName}`,
                icon: "success",
                timer: 1500,
                showConfirmButton: false,
              }).then(() => {
                // Intentar cerrar el modal de forma segura
                try {
                  const modalEl = document.getElementById("loginModalCliente");
                  if (modalEl && typeof bootstrap !== 'undefined') {
                    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                    if (modal) modal.hide();
                  }
                } catch (error) {
                  console.warn("No se pudo cerrar el modal automáticamente:", error);
                }

                // Redirección inmediata
                window.location.href = "portal_clientes.html";
              });

            } else {
              // Usuario no existe en base de datos
              await firebase.auth().signOut();
              Swal.fire({
                icon: "error",
                title: "Acceso Denegado",
                text: "Este usuario no tiene permisos para acceder al portal.",
                confirmButtonColor: "#d4af37",
              }).then(() => {
                const form = document.getElementById("clientLoginForm");
                if (form) form.reset();
                window.location.href = "control_center.html";
              });
            }
          } catch (error) {
            console.error("Error verificando usuario:", error);
            await firebase.auth().signOut();
            Swal.fire("Error", "Ocurrió un error verificando sus permisos.", "error");
          }
        })
        .catch((error) => {
          console.error("Error login cliente:", error);
          Swal.fire("Error", "Credenciales incorrectas o usuario no encontrado", "error");
        });
    });
  }
});
