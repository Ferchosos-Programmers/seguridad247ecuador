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
      userNameDisplay.textContent = user.email.split('@')[0]; 
      loadPayments(user.uid);
      loadContractData(user.uid); // Cargar datos del contrato asociado
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
              paymentsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-white py-4">No tienes pagos registrados aún.</td></tr>';
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
  
  // 5. LOAD ASSOCIATED CONTRACT DATA & GENERATE SCHEDULE
  async function loadContractData(userId) {
      try {
          const userDoc = await db.collection("users").doc(userId).get();
          if (!userDoc.exists) return;
          
          const userData = userDoc.data();
          const contractId = userData.contractId;
          
          if (!contractId) {
              document.getElementById("paymentScheduleBody").innerHTML = '<tr><td colspan="4" class="text-center text-warning">No hay contrato asociado para generar calendario.</td></tr>';
              return;
          }
          
          const contractDoc = await db.collection("contracts").doc(contractId).get();
          if (!contractDoc.exists) return;
          
          const contractData = contractDoc.data();
          
          // 15% IVA calculation
          const priceBase = parseFloat(contractData.servicePrice) || 0;
          const priceWithIva = priceBase * 1.15;

          // Cargar el monto con IVA en el input de pago por defecto
          const amountInput = document.getElementById("commonAmount");
          if (amountInput && priceWithIva) {
              amountInput.value = priceWithIva.toFixed(2);
          }
          
          if (userData.complexName) {
              userNameDisplay.textContent = `${userData.adminName} (${userData.complexName})`;
          }

          // Generar el calendario
          generatePaymentSchedule(contractData, priceWithIva);

      } catch (error) {
          console.error("Error al cargar datos del contrato:", error);
      }
  }

  async function generatePaymentSchedule(contract, amountWithIva) {
      const scheduleBody = document.getElementById("paymentScheduleBody");
      if (!scheduleBody) return;

      const user = auth.currentUser;
      if (!user) return;

      // 1. Obtener pagos reales para cruzar información
      let paidMonths = [];
      try {
          const paymentsSnapshot = await db.collection("payments")
              .where("userId", "==", user.uid)
              .get();
          
          paymentsSnapshot.forEach(doc => {
              const data = doc.data();
              if (data.date && data.date.toDate) {
                  const d = data.date.toDate();
                  // Guardamos mes y año del pago (usamos el mes del pago para simplificar)
                  paidMonths.push(`${d.getMonth()}-${d.getFullYear()}`);
              }
          });
      } catch (e) {
          console.error("Error al cruzar pagos:", e);
      }

      // 2. Extraer día de pago (ej: "5 de cada mes" -> 5)
      const paymentDayMatch = contract.paymentPeriod.match(/\d+/);
      const paymentDay = paymentDayMatch ? parseInt(paymentDayMatch[0]) : 1;

      // 3. Fecha de inicio: Mes siguiente a la firma
      const signatureDate = new Date(contract.date + "T00:00:00");
      const duration = parseInt(contract.duration) || 12;

      let html = "";
      
      for (let i = 1; i <= duration; i++) {
          let paymentDate = new Date(signatureDate);
          paymentDate.setMonth(signatureDate.getMonth() + i);
          paymentDate.setDate(paymentDay);

          const monthName = paymentDate.toLocaleString('es-ES', { month: 'long' });
          const yearNum = paymentDate.getFullYear();
          const dateStr = paymentDate.toLocaleDateString('es-ES');
          
          const monthYearKey = `${paymentDate.getMonth()}-${paymentDate.getFullYear()}`;
          const isPaid = paidMonths.includes(monthYearKey);

          const statusBadge = isPaid 
              ? '<span class="badge bg-success-soft">Pagado</span>' 
              : '<span class="badge bg-warning-soft text-warning">Pendiente</span>';

          const checkboxAttr = isPaid ? 'disabled' : '';
          const serviceLabel = `Pago Cuota ${monthName} ${yearNum}`;

          html += `
              <tr class="${isPaid ? 'row-paid' : 'row-pending'}">
                  <td>
                       <div class="form-check custom-check">
                           <input class="form-check-input payment-checkbox" type="checkbox" name="paymentSelect" 
                                  id="chk_${monthYearKey}" value="${amountWithIva.toFixed(2)}" 
                                  data-service="${serviceLabel}" ${checkboxAttr}>
                       </div>
                   </td>
                   <td class="fw-bold">${dateStr}</td>
                   <td class="text-gold fw-bold">$${amountWithIva.toFixed(2)}</td>
                   <td>${statusBadge}</td>
               </tr>
           `;
       }
 
       scheduleBody.innerHTML = html;
 
       // Listener para los checkboxes (ahora permiten deseleccionar y ocultar metodos)
       const checkboxes = document.querySelectorAll(".payment-checkbox");
       checkboxes.forEach(chk => {
           chk.addEventListener("change", function() {
               const methodsWrapper = document.getElementById("paymentMethodsWrapper");
               const instructions = document.getElementById("paymentInstructions");
               const amountInput = document.getElementById("commonAmount");
               const serviceInput = document.getElementById("commonService");

               if (this.checked) {
                   // Desmarcar todos los demás para simular comportamiento de radio pero con uncheck
                   checkboxes.forEach(other => { if (other !== this) other.checked = false; });

                   const amount = this.value;
                   const service = this.getAttribute("data-service");
                   
                   if (amountInput) amountInput.value = amount;
                   if (serviceInput) serviceInput.value = service;
 
                   // Mostrar el contenedor de métodos de pago y ocultar instrucciones
                   if (methodsWrapper) methodsWrapper.style.display = "block";
                   if (instructions) instructions.style.display = "none";
 
                   // Feedback visual suave con Scroll
                   methodsWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
 
                   Swal.fire({
                       toast: true,
                       position: 'top-end',
                       icon: 'success',
                       title: `Cuota seleccionada: $${amount}`,
                       showConfirmButton: false,
                       timer: 2000
                   });
               } else {
                   // SI SE DESELECCIONA: Limpiar inputs y ocultar metodos
                   if (amountInput) amountInput.value = "";
                   if (serviceInput) serviceInput.value = "";
                   
                   if (methodsWrapper) methodsWrapper.style.display = "none";
                   if (instructions) instructions.style.display = "block";
                   
                   Swal.fire({
                       toast: true,
                       position: 'top-end',
                       icon: 'info',
                       title: 'Selección cancelada',
                       showConfirmButton: false,
                       timer: 1500
                   });
               }
           });
       });
   }

});
