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
          // Signed in
          var user = userCredential.user;

          // VERIFICACIÓN DE SEGURIDAD:
          // Solo permitir ingreso si el usuario existe en la colección 'users' (creado por el admin)
          try {
            const doc = await firebase.firestore().collection("users").doc(user.uid).get();
            
            if (doc.exists) {
              const userData = doc.data();
              if (userData.status === 'active') {
                // Usuario autorizado y activo
                Swal.fire({
                  title: "Bienvenido",
                  text: "Ingresando al Portal de Residentes...",
                  icon: "success",
                  timer: 1500,
                  showConfirmButton: false,
                }).then(() => {
                  window.location.href = "portal_clientes.html";
                });
              } else {
                // Usuario desactivado
                console.warn("Usuario desactivado:", user.email);
                await firebase.auth().signOut();
                Swal.fire(
                  "Cuenta Desactivada",
                  "Su cuenta ha sido desactivada temporalmente. Contacte al administrador principal.",
                  "warning"
                );
              }
            } else {
              // Usuario no autorizado (no está en la colección users)
              console.warn("Usuario autenticado pero no autorizado (no existe en db):", user.email);
              await firebase.auth().signOut(); // Cerrar sesión inmediatamente
              Swal.fire(
                "Acceso Denegado",
                "Este usuario no tiene permisos para acceder al portal.",
                "error"
              );
            }
          } catch (error) {
            console.error("Error verificando usuario:", error);
            await firebase.auth().signOut();
            Swal.fire(
              "Error",
              "Ocurrió un error verificando sus permisos.",
              "error"
            );
          }
        })
        .catch((error) => {
          var errorCode = error.code;
          var errorMessage = error.message;
          console.error("Error login cliente:", errorCode, errorMessage);
          Swal.fire(
            "Error",
            "Credenciales incorrectas o usuario no encontrado",
            "error"
          );
        });
    });
  }
});
