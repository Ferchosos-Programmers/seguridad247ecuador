document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();

  // DOM Elements
  const logoutBtn = document.getElementById("logoutBtn");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const paymentsTableBody = document.getElementById("paymentsTableBody");

  // 1. CHECK AUTH AND INITIALIZE VIEW
  console.log("Iniciando protección de ruta clientes...");
  
  // Variables de estado para modo invitado
  window.currentGuestComplex = null;
  window.currentGuestContractId = null;

  auth.onAuthStateChanged(async (user) => {
    const authInfo = document.getElementById("authRequiredInfo");
    const noAuthInfo = document.getElementById("noAuthInfo");
    const publicSearch = document.getElementById("publicSearchSection");
    const mainContent = document.getElementById("mainPortalContent");
    const profileSection = document.getElementById("userProfileSection");

    if (user) {
      console.log("Sesión activa detectada (Cliente):", user.email);
      try {
        const doc = await db.collection("users").doc(user.uid).get();
        if (doc.exists) {
            const userData = doc.data();
            // Mostrar UI autenticada
            if (authInfo) authInfo.style.display = "flex";
            if (noAuthInfo) noAuthInfo.style.display = "none";
            if (publicSearch) publicSearch.style.display = "none";
            if (mainContent) mainContent.style.display = "flex";
            if (profileSection) profileSection.style.display = "block";

            if (userNameDisplay) {
                userNameDisplay.textContent = userData.adminName || userData.name || user.email.split("@")[0];
            }
            
            const userNameEl = document.getElementById("userName");
            const userEmailEl = document.getElementById("userEmail");
            
            if (userNameEl) userNameEl.textContent = userData.adminName || userData.name || "Administrador Conjunto";
            if (userEmailEl) userEmailEl.textContent = userData.email || user.email;

            loadPayments(user.uid);
            loadContractData(user.uid);
        }
      } catch (error) {
        console.error("Error al cargar datos de usuario:", error);
      }
    } else {
      console.log("Modo público habilitado");
      if (authInfo) authInfo.style.display = "none";
      if (noAuthInfo) noAuthInfo.style.display = "block";
      if (publicSearch) publicSearch.style.display = "flex";
      if (mainContent) mainContent.style.display = "none";
      if (profileSection) profileSection.style.display = "none";
      
      initPublicSearch();
    }
  });

  // Función para inicializar búsqueda por RUC/Cédula
  function initPublicSearch() {
    const btnEnter = document.getElementById("btnEnterPublic");
    const idInput = document.getElementById("publicIdInput");
    
    if (!btnEnter || !idInput) return;

    btnEnter.addEventListener("click", async () => {
        const idValue = idInput.value.trim();
        if (!idValue) {
            Swal.fire("Atención", "Por favor ingresa tu número de cédula o RUC.", "warning");
            return;
        }

        Swal.fire({
            title: 'Buscando contrato...',
            didOpen: () => Swal.showLoading()
        });

        try {
            // Buscar contrato por RUC/Cédula (nombre del campo en DB: clientId)
            const contractSnapshot = await db.collection("contracts")
                .where("clientId", "==", idValue)
                .limit(1)
                .get();

            if (contractSnapshot.empty) {
                Swal.fire("No encontrado", "No se encontró ningún contrato con esa identificación.", "error");
                return;
            }

            const contractData = contractSnapshot.docs[0].data();
            const contractId = contractSnapshot.docs[0].id;

            // Ahora debemos encontrar al administrador (user) asociado a este contrato o conjunto
            const userSnapshot = await db.collection("users")
                .where("contractId", "==", contractId)
                .limit(1)
                .get();

            if (userSnapshot.empty) {
                Swal.fire("Aviso", "Contrato encontrado, pero no hay un perfil de usuario asignado. Contacte a soporte.", "info");
                return;
            }

            const userData = userSnapshot.docs[0].data();
            
            // Configurar sesión de invitado global
            window.currentGuestUserId = userSnapshot.docs[0].id;
            window.currentGuestEmail = userData.email;
            window.currentGuestComplex = userData.complexName;
            window.currentGuestContractId = contractId;

            // Mostrar interfaz de pago
            document.getElementById("publicSearchSection").style.display = "none";
            document.getElementById("mainPortalContent").style.display = "flex";
            
            // Cargar datos (estos ya usan currentGuestUserId)
            loadPayments(window.currentGuestUserId);
            loadContractData(window.currentGuestUserId);
            
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Bienvenido, ${userData.adminName || userData.name}`,
                showConfirmButton: false,
                timer: 3000
            });

        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Ocurrió un error al consultar la información.", "error");
        }
    });

    // Enter Key Support
    idInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") btnEnter.click();
    });
  }

  // 2. LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      auth.signOut().then(() => {
        window.location.href = "control_center.html";
      });
    });
  }

  // 3. TOGGLE PAYMENT METHOD UI
  window.togglePaymentMethod = (method) => {
    const cardSection = document.getElementById("cardFormSection");
    const transferSection = document.getElementById("transferFormSection");

    if (method === "card") {
      cardSection.style.display = "block";
      transferSection.style.display = "none";
    } else {
      cardSection.style.display = "none";
      transferSection.style.display = "block";
    }
  };

  // 4. PROCESS PAYMENT (COMMON FUNCTION)
  async function processPayment(method, notes, extraData = {}, silent = false) {
    const user = auth.currentUser;
    const userId = user ? user.uid : window.currentGuestUserId;
    const userEmail = user ? user.email : window.currentGuestEmail;

    if (!userId || !userEmail) return false;

    const service = document.getElementById("commonService").value;
    const amount = parseFloat(document.getElementById("commonAmount").value);

    if (!service || !amount) {
      if (!silent) Swal.fire(
        "Error",
        "Por favor selecciona un servicio y un monto válido",
        "warning"
      );
      return false;
    }

    // Prepara datos
    const paymentData = {
      userId: userId,
      userEmail: userEmail,
      service: service,
      amount: amount,
      method: method, // 'Tarjeta' or 'Transferencia'
      notes: notes,
      status: extraData.status || "Pendiente",
      proofFile: extraData.fileName || null,
      proofUrl: extraData.proofUrl || null,
      date: new Date(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isGuestMode: !user
    };

    try {
      await db.collection("payments").add(paymentData);

      if (!silent) {
        let successMsg = "Tu pago ha sido registrado.";
        if (method === "Tarjeta")
          successMsg = "Pago con tarjeta aprobado exitosamente.";
        if (method === "Transferencia")
          successMsg = "Transferencia registrada. Pendiente de validación.";

        Swal.fire({
          title: "Éxito",
          text: successMsg,
          icon: "success",
          confirmButtonColor: "#d4af37",
        });
      }

      // Reset forms
      const formCard = document.getElementById("formCard");
      if (formCard) formCard.reset();
      document.getElementById("formTransfer").reset();
      document.getElementById("commonService").value = "";
      document.getElementById("commonAmount").value = "";

      loadPayments(user.uid);
      return true;

    } catch (error) {
      console.error("Error al registrar pago:", error);
      if (!silent) Swal.fire(
        "Error",
        "No se pudo registrar el pago. Intenta más tarde.",
        "error"
      );
      return false;
    }
  }

  // 5. PAYPHONE REDIRECT
  function initPayPhone(amount, serviceName) {
    const payphoneLink = document.getElementById("payphone-link");
    if (!payphoneLink) return;

    // Clonar para limpiar handlers previos
    const newLink = payphoneLink.cloneNode(true);
    payphoneLink.parentNode.replaceChild(newLink, payphoneLink);

    newLink.addEventListener("click", async (e) => {
        e.preventDefault();
        
        Swal.fire({
            title: 'Registrando intención de pago...',
            text: 'Serás redirigido a PayPhone en un momento.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Registrar el pago como pendiente antes de ir al link
        const success = await processPayment("Tarjeta", `PayPhone Link - ${serviceName}`, { 
            status: "Pendiente"
        }, true); // silent = true

        if (success) {
            window.open(newLink.href, '_blank');
            Swal.close();
            
            // Opcional: mostrar un mensaje de que debe reportar el pago si PayPhone no notifica
            Swal.fire({
              title: "Redirigido",
              text: "Se ha abierto PayPhone en una nueva pestaña. Recuerda que una vez realizado el pago, el administrador lo validará para marcarlo como Pagado.",
              icon: "info",
              confirmButtonColor: "#d4af37"
            });
        }
    });
  }

  const formTransfer = document.getElementById("formTransfer");
  if (formTransfer) {
    formTransfer.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById("transferFile");
      const notes = document.getElementById("transferNotes").value;

      if (fileInput.files.length === 0) {
        Swal.fire(
          "Requerido",
          "Por favor sube una foto del comprobante",
          "warning"
        );
        return;
      }

      const file = fileInput.files[0];
      const storageRef = firebase
        .storage()
        .ref(`payment_proofs/${Date.now()}_${file.name}`);

      try {
        // Mostrar indicador de carga
        Swal.fire({
          title: "Subiendo comprobante...",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        const snapshot = await storageRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();

        processPayment("Transferencia", notes, {
          status: "Pendiente",
          fileName: file.name,
          proofUrl: downloadURL,
        });
      } catch (error) {
        console.error("Error al subir archivo:", error);
        Swal.fire("Error", "No se pudo subir el archivo comprobante.", "error");
      }
    });
  }

  // 4. LOAD PAYMENTS
  window.loadPayments = async (userId) => {
    if (!userId) {
      const user = auth.currentUser;
      if (user) userId = user.uid;
      else if (window.currentGuestUserId) userId = window.currentGuestUserId;
      else return;
    }

    try {
      paymentsTableBody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</td></tr>';

      const querySnapshot = await db
        .collection("payments")
        .where("userId", "==", userId)
        .orderBy("date", "desc")
        .limit(20)
        .get();

      if (querySnapshot.empty) {
        paymentsTableBody.innerHTML =
          '<tr><td colspan="5" class="text-center text-white py-4">No tienes pagos registrados aún.</td></tr>';
        return;
      }

      let html = "";
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let dateStr = "---";
        if (data.date && data.date.toDate) {
          dateStr = data.date.toDate().toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        let statusClass = "badge-pending";
        if (data.status === "Aprobado" || data.status === "Completado")
          statusClass = "badge-success";

        html += `
                  <tr>
                      <td>${dateStr}</td>
                      <td>${data.service}</td>
                      <td class="text-gold fw-bold">$${parseFloat(
                        data.amount
                      ).toFixed(2)}</td>
                      <td>${data.method}</td>
                      <td><span class="badge-status ${statusClass}">${
          data.status
        }</span></td>
                  </tr>
              `;
      });

      paymentsTableBody.innerHTML = html;
    } catch (error) {
      console.error("Error al cargar pagos:", error);
      paymentsTableBody.innerHTML =
        '<tr><td colspan="5" class="text-center text-danger py-4">Error al cargar historial.</td></tr>';
    }
  };

  async function loadContractData(userId) {
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const contractId = userData.contractId;

      if (!contractId) {
        document.getElementById("paymentScheduleBody").innerHTML =
          '<tr><td colspan="4" class="text-center text-warning">No hay contrato asociado para generar calendario.</td></tr>';
        return;
      }

      const contractDoc = await db
        .collection("contracts")
        .doc(contractId)
        .get();
      if (!contractDoc.exists) return;

      const contractData = contractDoc.data();

      const priceBase = parseFloat(contractData.servicePrice) || 0;
      const priceWithIva = priceBase * 1.15;

      const amountInput = document.getElementById("commonAmount");
      if (amountInput && priceWithIva) {
        amountInput.value = priceWithIva.toFixed(2);
      }

      if (userData.complexName && userNameDisplay) {
        userNameDisplay.textContent = `${userData.adminName} (${userData.complexName})`;
      }

      generatePaymentSchedule(contractData, priceWithIva);
    } catch (error) {
      console.error("Error al cargar datos del contrato:", error);
    }
  }

  async function generatePaymentSchedule(contract, amountWithIva) {
    const scheduleBody = document.getElementById("paymentScheduleBody");
    if (!scheduleBody) return;

    const user = auth.currentUser;
    const currentId = user ? user.uid : window.currentGuestUserId;
    if (!currentId) return;

    let reportedPayments = {};
    try {
      const paymentsSnapshot = await db
        .collection("payments")
        .where("userId", "==", currentId)
        .get();

      paymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.service) {
          reportedPayments[data.service] = data.status;
        }
      });
    } catch (e) {
      console.error("Error al cruzar pagos:", e);
    }

    const paymentDayMatch = contract.paymentPeriod.match(/\d+/);
    const paymentDay = paymentDayMatch ? parseInt(paymentDayMatch[0]) : 1;

    const signatureDate = new Date(contract.date + "T00:00:00");
    const duration = parseInt(contract.duration) || 12;

    let html = "";

    for (let i = 1; i <= duration; i++) {
      let paymentDate = new Date(signatureDate);
      paymentDate.setMonth(signatureDate.getMonth() + i);
      paymentDate.setDate(paymentDay);

      const monthName = paymentDate.toLocaleString("es-ES", { month: "long" });
      const yearNum = paymentDate.getFullYear();
      const dateStr = paymentDate.toLocaleDateString("es-ES");

      const serviceLabel = `Pago Cuota ${monthName} ${yearNum}`;
      const reportedStatus = reportedPayments[serviceLabel];

      const isPaid = reportedStatus === "Aprobado";
      const isPending = reportedStatus === "Pendiente";

      let statusBadge =
        '<span class="badge bg-warning-soft text-warning">Por Pagar</span>';
      if (isPaid)
        statusBadge = '<span class="badge bg-success-soft">Pagado</span>';
      else if (isPending)
        statusBadge =
          '<span class="badge bg-info-soft text-info">En Revisión</span>';

      const hideCheckbox = isPaid || isPending;
      const serviceRowClass = isPaid
        ? "row-paid"
        : isPending
        ? "row-pending-review"
        : "row-pending";

      html += `
              <tr class="${serviceRowClass}">
                  <td>
                       <div class="form-check custom-check">
                           <input class="form-check-input payment-checkbox" type="checkbox" name="paymentSelect" 
                                  id="chk_${i}" value="${amountWithIva.toFixed(
        2
      )}" 
                                  data-service="${serviceLabel}" ${
        hideCheckbox ? 'style="display:none"' : ""
      }>
                       </div>
                   </td>
                   <td class="fw-bold">${dateStr}</td>
                   <td class="text-gold fw-bold">$${amountWithIva.toFixed(
                     2
                   )}</td>
                   <td>${statusBadge}</td>
               </tr>
           `;
    }

    scheduleBody.innerHTML = html;

    const checkboxes = document.querySelectorAll(".payment-checkbox");
    checkboxes.forEach((chk) => {
      chk.addEventListener("change", function () {
        const methodsWrapper = document.getElementById("paymentMethodsWrapper");
        const instructions = document.getElementById("paymentInstructions");
        const amountInput = document.getElementById("commonAmount");
        const serviceInput = document.getElementById("commonService");

        if (this.checked) {
          checkboxes.forEach((other) => {
            if (other !== this) other.checked = false;
          });

          const amount = this.value;
          const service = this.getAttribute("data-service");

          if (amountInput) amountInput.value = amount;
          if (serviceInput) serviceInput.value = service;

          // MOSTRAR MÉTODOS Y LUEGO INICIALIZAR PAYPHONE
          if (methodsWrapper) methodsWrapper.style.display = "block";
          if (instructions) instructions.style.display = "none";

          // Inicializar PayPhone con los datos de esta cuota
          if (typeof initPayPhone === "function") {
            initPayPhone(amount, service);
          }

          methodsWrapper.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });

          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: `Cuota seleccionada: $${amount}`,
            showConfirmButton: false,
            timer: 2000,
          });
        } else {
          if (amountInput) amountInput.value = "";
          if (serviceInput) serviceInput.value = "";

          if (methodsWrapper) methodsWrapper.style.display = "none";
          if (instructions) instructions.style.display = "block";
        }
      });
    });
  }
});
