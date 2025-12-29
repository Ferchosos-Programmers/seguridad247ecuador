document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  // DOM Elements
  const logoutBtn = document.getElementById("logoutBtn");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const paymentsTableBody = document.getElementById("paymentsTableBody");

  // 1. CHECK AUTH
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in.
      console.log("Usuario logueado:", user.email);
      userNameDisplay.textContent = user.email.split('@')[0]; // Mostrar parte del email como nombre
      loadPayments(user.uid);
    } else {
      // No user is signed in. Redirect to home.
      window.location.href = "control_center.html";
    }
  });

  // 2. LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.signOut().then(() => {
        window.location.href = "control_center.html";
      });
    });
  }

  // 3. REGISTER PAYMENT
  // 3. TOGGLE PAYMENT METHOD UI
  window.togglePaymentMethod = (method) => {
      const cardSection = document.getElementById("cardFormSection");
      const transferSection = document.getElementById("transferFormSection");

      if (method === 'card') {
          cardSection.style.display = "block";
          transferSection.style.display = "none";
      } else {
          cardSection.style.display = "none";
          transferSection.style.display = "block";
      }
  };

  // 4. PROCESS PAYMENT (COMMON FUNCTION)
  async function processPayment(method, notes, extraData = {}) {
      const user = auth.currentUser;
      if (!user) return;

      const service = document.getElementById("commonService").value;
      const amount = parseFloat(document.getElementById("commonAmount").value);

      if (!service || !amount) {
          Swal.fire("Error", "Por favor selecciona un servicio y un monto válido", "warning");
          return;
      }

      // Prepara datos
      const paymentData = {
          userId: user.uid,
          userEmail: user.email,
          service: service,
          amount: amount,
          method: method, // 'Tarjeta' or 'Transferencia'
          notes: notes,
          status: extraData.status || "Pendiente",
          proofFile: extraData.fileName || null, // Guardamos nombre de archivo si hay
          date: new Date(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
          await db.collection("payments").add(paymentData);
          
          let successMsg = "Tu pago ha sido registrado.";
          if (method === 'Tarjeta') successMsg = "Pago con tarjeta aprobado exitosamente.";
          if (method === 'Transferencia') successMsg = "Transferencia registrada. Pendiente de validación.";

          Swal.fire({
              title: "Éxito",
              text: successMsg,
              icon: "success",
              confirmButtonColor: "#d4af37"
          });

          // Reset forms
          document.getElementById("formCard").reset();
          document.getElementById("formTransfer").reset();
          document.getElementById("commonService").value = "";
          document.getElementById("commonAmount").value = "";

          loadPayments(user.uid); 

      } catch (error) {
          console.error("Error al registrar pago:", error);
          Swal.fire("Error", "No se pudo registrar el pago. Intenta más tarde.", "error");
      }
  }

  // 5. LISTENERS FOR NEW FORMS
  const formCard = document.getElementById("formCard");
  const formTransfer = document.getElementById("formTransfer");

  if (formCard) {
      formCard.addEventListener("submit", (e) => {
          e.preventDefault();
          // Simular validación de tarjeta
          const cardNum = document.getElementById("cardNumber").value;
          if (cardNum.length < 10) {
              Swal.fire("Error", "Número de tarjeta inválido", "error");
              return;
          }
          // Si pasa validación simulada
          processPayment("Tarjeta", "Pago Online con Tarjeta", { status: "Aprobado" });
      });
  }

  if (formTransfer) {
      formTransfer.addEventListener("submit", (e) => {
          e.preventDefault();
          const fileInput = document.getElementById("transferFile");
          const notes = document.getElementById("transferNotes").value;
          
          if (fileInput.files.length === 0) {
              Swal.fire("Requerido", "Por favor sube una foto del comprobante", "warning");
              return;
          }

          const fileName = fileInput.files[0].name; // Simular subida guardando el nombre
          processPayment("Transferencia", notes, { status: "Pendiente", fileName: fileName });
      });
  }

  // 4. LOAD PAYMENTS
  window.loadPayments = async (userId) => {
      // Si no se pasa userId (ej. botón actualizar manual), intentar obtenerlo
      if (!userId) {
          const user = auth.currentUser;
          if (user) userId = user.uid;
          else return;
      }

      try {
          paymentsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</td></tr>';
          
          const querySnapshot = await db.collection("payments")
              .where("userId", "==", userId)
              .orderBy("date", "desc")
              .limit(20)
              .get();

          if (querySnapshot.empty) {
              paymentsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No tienes pagos registrados aún.</td></tr>';
              return;
          }

          let html = "";
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              // Formatear fecha
              let dateStr = "---";
              if (data.date && data.date.toDate) {
                  dateStr = data.date.toDate().toLocaleDateString("es-ES", {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                  });
              }

              // Badge de estado
              let statusClass = "badge-pending";
              if (data.status === "Aprobado" || data.status === "Completado") statusClass = "badge-success";

              html += `
                  <tr>
                      <td>${dateStr}</td>
                      <td>${data.service}</td>
                      <td class="text-gold fw-bold">$${parseFloat(data.amount).toFixed(2)}</td>
                      <td>${data.method}</td>
                      <td><span class="badge-status ${statusClass}">${data.status}</span></td>
                  </tr>
              `;
          });

          paymentsTableBody.innerHTML = html;

      } catch (error) {
          console.error("Error al cargar pagos:", error);
          paymentsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Error al cargar historial.</td></tr>';
      }
  };

});
