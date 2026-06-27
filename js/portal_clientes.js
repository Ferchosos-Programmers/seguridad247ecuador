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
    const tabsSection = document.getElementById("portalTabsSection");
    const tabContent = document.getElementById("portalTabContent");
    const navBtn = document.getElementById("navActionBtn");

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
          if (tabsSection) tabsSection.style.display = "block";
          if (tabContent) tabContent.style.display = "block";

          if (userNameDisplay) {
            const rawName =
              userData.adminName || userData.name || user.email.split("@")[0];
            userNameDisplay.textContent = rawName
              .toLowerCase()
              .replace(/\b\w/g, (c) => c.toUpperCase());
          }

          const userNameEl = document.getElementById("userName");
          const userEmailEl = document.getElementById("userEmail");

          if (userNameEl) {
            const rawName =
              userData.adminName || userData.name || "Administrador Conjunto";
            userNameEl.textContent = rawName
              .toLowerCase()
              .replace(/\b\w/g, (c) => c.toUpperCase());
          }
          if (userEmailEl)
            userEmailEl.textContent = userData.email || user.email;

          if (navBtn) {
            navBtn.innerHTML =
              '<i class="fa-solid fa-right-from-bracket"></i> Cerrar Sesión';
            navBtn.href = "#";
            navBtn.onclick = (e) => {
              e.preventDefault();
              auth.signOut().then(() => {
                window.location.href = "control_center.html";
              });
            };
          }

          loadPayments(user.uid);
          loadContractData(user.uid).then(() => {
            cargarCotizacionesPortal();
            cargarComunicacionesPortal();
          });
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
      if (tabsSection) tabsSection.style.display = "none";
      if (tabContent) tabContent.style.display = "none";

      if (navBtn) {
        navBtn.innerHTML =
          '<i class="fa-solid fa-users"></i> 24/7 Control Center';
        navBtn.href = "control_center.html";
        navBtn.onclick = null;
      }

      initPublicSearch();
    }
  });
  function initPublicSearch() {
    const btnEnter = document.getElementById("btnEnterPublic");
    const idInput = document.getElementById("publicIdInput");

    if (!btnEnter || !idInput) return;

    btnEnter.addEventListener("click", async () => {
      const idValue = idInput.value.trim();
      if (!idValue) {
        Swal.fire(
          "Atención",
          "Por favor ingresa tu número de cédula o RUC.",
          "warning",
        );
        return;
      }

      Swal.fire({
        title: "Buscando contrato...",
        didOpen: () => Swal.showLoading(),
      });

      try {
        // Buscar contrato por RUC/Cédula (nombre del campo en DB: clientId o complexRuc)
        let contractSnapshot = await db
          .collection("contracts")
          .where("clientId", "==", idValue)
          .limit(1)
          .get();

        if (contractSnapshot.empty) {
          contractSnapshot = await db
            .collection("contracts")
            .where("complexRuc", "==", idValue)
            .limit(1)
            .get();
        }

        if (contractSnapshot.empty) {
          Swal.fire(
            "No encontrado",
            "No se encontró ningún contrato con esa identificación.",
            "error",
          );
          return;
        }

        const contractData = contractSnapshot.docs[0].data();
        const contractId = contractSnapshot.docs[0].id;

        // Ahora debemos encontrar al administrador (user) asociado a este contrato o conjunto
        const userSnapshot = await db
          .collection("users")
          .where("contractId", "==", contractId)
          .limit(1)
          .get();

        if (userSnapshot.empty) {
          Swal.fire(
            "Aviso",
            "Contrato encontrado, pero no hay un perfil de usuario asignado. Contacte a soporte.",
            "info",
          );
          return;
        }

        const userData = userSnapshot.docs[0].data();
        const adminEmail = userData.email;
        const rawName = userData.adminName || userData.name || "";
        const formattedName = rawName
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());

        Swal.close();

        // Solicitar contraseña del administrador
        const { value: password } = await Swal.fire({
          title: "Iniciar Sesión",
          html: `<div style="text-align: center; padding: 10px 0;">
                   <p class="text-white-50 mb-3" style="font-size: 0.95rem;">Se ha encontrado la cuenta del administrador:</p>
                   <h4 style="color: #d4af37; font-weight: 800; font-size: 1.5rem; letter-spacing: -0.5px; margin-bottom: 20px;">
                     <i class="fa-solid fa-user-shield me-2"></i>${formattedName}
                   </h4>
                   <p class="text-white-50 small mb-1">Ingresa la contraseña para el correo:</p>
                   <strong style="color: #fff; font-size: 0.95rem;">${adminEmail}</strong>
                 </div>`,
          input: "password",
          inputPlaceholder: "Escribe tu contraseña",
          inputAttributes: {
            autocapitalize: "off",
            autocorrect: "off",
          },
          showCancelButton: true,
          confirmButtonColor: "#d4af37",
          cancelButtonColor: "#555",
          confirmButtonText: "Entrar",
          cancelButtonText: "Cancelar",
          background: "#151515",
          color: "#fff",
        });

        if (!password) return;

        Swal.fire({
          title: "Iniciando sesión...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        await auth.signInWithEmailAndPassword(adminEmail, password);

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `Bienvenido, ${userData.adminName || userData.name}`,
          showConfirmButton: false,
          timer: 3000,
        });
      } catch (err) {
        console.error(err);
        let errorMsg = "Ocurrió un error al iniciar sesión.";
        if (
          err.message &&
          (err.message.includes("wrong-password") ||
            err.message.includes("user-not-found") ||
            err.message.includes("INVALID_LOGIN_CREDENTIALS") ||
            err.message.includes("INVALID_PASSWORD"))
        ) {
          errorMsg = "Contraseña incorrecta. Por favor intente de nuevo.";
        }
        Swal.fire("Error de Acceso", errorMsg, "error");
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
      if (!silent)
        Swal.fire(
          "Error",
          "Por favor selecciona un servicio y un monto válido",
          "warning",
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
      isGuestMode: !user,
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
      if (!silent)
        Swal.fire(
          "Error",
          "No se pudo registrar el pago. Intenta más tarde.",
          "error",
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
        title: "Registrando intención de pago...",
        text: "Serás redirigido a PayPhone en un momento.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Registrar el pago como pendiente antes de ir al link
      const success = await processPayment(
        "Tarjeta",
        `PayPhone Link - ${serviceName}`,
        {
          status: "Pendiente",
        },
        true,
      ); // silent = true

      if (success) {
        window.open(newLink.href, "_blank");
        Swal.close();

        // Opcional: mostrar un mensaje de que debe reportar el pago si PayPhone no notifica
        Swal.fire({
          title: "Redirigido",
          text: "Se ha abierto PayPhone en una nueva pestaña. Recuerda que una vez realizado el pago, el administrador lo validará para marcarlo como Pagado.",
          icon: "info",
          confirmButtonColor: "#d4af37",
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
          "warning",
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
        let actionBtn = "";
        if (data.status === "Aprobado" || data.status === "Completado") {
          statusClass = "badge-success";
          actionBtn = `<button class="btn btn-sm btn-outline-danger ms-2 px-2 py-1" onclick="descargarFactura('${doc.id}')" title="Descargar Factura" style="font-size: 0.75rem;"><i class="fa-solid fa-file-pdf"></i> PDF</button>`;
        }

        html += `
                  <tr>
                      <td data-label="Fecha">${dateStr}</td>
                      <td data-label="Servicio">${data.service}</td>
                      <td data-label="Monto" class="text-gold fw-bold">$${parseFloat(
                        data.amount,
                      ).toFixed(2)}</td>
                      <td data-label="Método">${data.method}</td>
                      <td data-label="Estado">
                        <div class="d-flex align-items-center justify-content-md-start justify-content-end gap-1">
                          <span class="badge-status ${statusClass}">${data.status}</span>
                          ${actionBtn}
                        </div>
                      </td>
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

      // Guardar información del complejo y contrato de forma global
      window.currentComplexName = userData.complexName || "";
      window.currentAdminName = userData.adminName || userData.name || "";
      window.currentComplexRuc =
        contractData.complexRuc || contractData.clientId || "";
      window.currentComplexRep =
        contractData.complexRep || userData.adminName || "";

      const priceBase =
        parseFloat(contractData.price || contractData.servicePrice) || 0;
      const priceWithIva = priceBase * 1.15;

      const amountInput = document.getElementById("commonAmount");
      if (amountInput && priceWithIva) {
        amountInput.value = priceWithIva.toFixed(2);
      }

      if (userData.complexName && userNameDisplay) {
        const rawName = userData.adminName || userData.name || "";
        const formattedName = rawName
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
        userNameDisplay.textContent = `${formattedName} (${userData.complexName})`;
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

    const paymentDayMatch = contract.paymentPeriod
      ? contract.paymentPeriod.match(/\d+/)
      : null;
    const paymentDay = paymentDayMatch ? parseInt(paymentDayMatch[0]) : 5;

    const contractDateStr =
      contract.date || contract.signDate || contract.startDate;
    const signatureDate = new Date(contractDateStr + "T00:00:00");
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
                  <td data-label="Pagar">
                       <div class="form-check custom-check">
                           <input class="form-check-input payment-checkbox" type="checkbox" name="paymentSelect" 
                                  id="chk_${i}" value="${amountWithIva.toFixed(
                                    2,
                                  )}" 
                                  data-service="${serviceLabel}" ${
                                    hideCheckbox ? 'style="display:none"' : ""
                                  }>
                       </div>
                   </td>
                   <td data-label="Fecha Límite" class="fw-bold">${dateStr}</td>
                   <td data-label="Monto (+IVA)" class="text-gold fw-bold">$${amountWithIva.toFixed(
                     2,
                   )}</td>
                   <td data-label="Estado">${statusBadge}</td>
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

  // =========================================
  //  GENERAR FACTURA PDF MODERNA Y ELEGANTE
  // =========================================
  window.descargarFactura = async (paymentId) => {
    Swal.fire({
      title: "Generando Factura...",
      text: "Por favor espera un momento.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const docSnap = await db.collection("payments").doc(paymentId).get();
      if (!docSnap.exists) {
        Swal.fire("Error", "No se encontró el registro de pago.", "error");
        return;
      }
      const data = docSnap.data();

      // Info de facturación del cliente (usamos las variables globales cargadas)
      const complexName =
        window.currentComplexName ||
        window.currentGuestComplex ||
        "CONJUNTO RESIDENCIAL";
      const complexRuc = window.currentComplexRuc || "17XXXXXXXX001";
      const complexRep = window.currentComplexRep || "Representante";

      const total = parseFloat(data.amount) || 0;
      const subtotal = total / 1.15;
      const iva = total - subtotal;

      let dateStr = "---";
      if (data.date) {
        const dObj = data.date.toDate
          ? data.date.toDate()
          : new Date(data.date);
        dateStr = dObj.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      }

      // Crear contenedor temporal para el HTML
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "-9999px";
      tempDiv.style.width = "800px";
      tempDiv.style.background = "#ffffff";
      tempDiv.style.color = "#333333";
      tempDiv.style.padding = "40px";
      tempDiv.style.fontFamily =
        "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";

      tempDiv.innerHTML = `
        <div style="padding: 20px; border: 1px solid #eee; border-radius: 12px; position: relative;">
          <!-- Decoración de la Factura -->
          <div style="position: absolute; top: 0; right: 0; width: 120px; height: 120px; background: linear-gradient(225deg, rgba(212,175,55,0.15) 0%, transparent 70%); border-radius: 0 0 0 100%;"></div>

          <!-- Encabezado -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
            <div>
              <img src="assets/img/logo.png" alt="Logo" style="height: 60px; margin-bottom: 10px;">
              <div style="font-size: 11px; color: #555; line-height: 1.4;">
                <p style="margin: 0; font-weight: bold; color: #111;">SEGURIDAD 24/7 DEL ECUADOR CIA. LTDA.</p>
                <p style="margin: 0;">Vigilancia Virtual de Alta Gama</p>
                <p style="margin: 0;">RUC: 1793205916001</p>
                <p style="margin: 0;">Pedro Cando N59-116 y Antonio Macata, Quito</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h1 style="color: #d4af37; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">FACTURA</h1>
              <div style="font-size: 14px; font-weight: bold; color: #111; margin-top: 5px;">N° FAC-${paymentId.substring(0, 8).toUpperCase()}</div>
              <div style="display: inline-block; background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; border-radius: 20px; padding: 4px 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-top: 10px;">
                <i class="fa-solid fa-circle-check" style="margin-right: 4px;"></i> PAGADO
              </div>
            </div>
          </div>

          <!-- Grid de Detalles de Cliente e Información de Factura -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #fdfaf0; border: 1px solid #f1e6c9; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
            <div>
              <h6 style="color: #b8922b; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin: 0 0 6px 0;">FACTURADO A (CLIENTE):</h6>
              <p style="font-size: 13px; font-weight: bold; color: #000; margin: 0 0 2px 0;">${complexName}</p>
              <p style="font-size: 11px; color: #555; margin: 0 0 2px 0;">RUC/Cédula: <strong>${complexRuc}</strong></p>
              <p style="font-size: 11px; color: #555; margin: 0;">Representante: ${complexRep}</p>
            </div>
            <div style="text-align: right;">
              <h6 style="color: #b8922b; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin: 0 0 6px 0;">DETALLES DEL DOCUMENTO:</h6>
              <p style="font-size: 11px; color: #333; margin: 0 0 2px 0;">Fecha de Emisión: <strong>${dateStr}</strong></p>
              <p style="font-size: 11px; color: #555; margin: 0 0 2px 0;">Método de Pago: ${data.method}</p>
              <p style="font-size: 11px; color: #555; margin: 0;">Transacción ID: ${paymentId.substring(0, 12)}</p>
            </div>
          </div>

          <!-- Tabla de Productos / Servicios -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background: #111; color: #d4af37;">
                <th style="padding: 10px; font-size: 10px; text-transform: uppercase; text-align: center; border-radius: 6px 0 0 6px; width: 60px;">CANT.</th>
                <th style="padding: 10px; font-size: 10px; text-transform: uppercase; text-align: left;">DESCRIPCIÓN DEL SERVICIO</th>
                <th style="padding: 10px; font-size: 10px; text-transform: uppercase; text-align: right; width: 120px;">P. UNIT</th>
                <th style="padding: 10px; font-size: 10px; text-transform: uppercase; text-align: right; border-radius: 0 6px 6px 0; width: 120px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; color: #000; font-size: 12px;">1</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #eee;">
                  <div style="font-weight: bold; color: #000; font-size: 13px;">${data.service}</div>
                  <div style="font-size: 11px; color: #777;">Monitoreo de Vigilancia Virtual 24/7 y Asistencia Motorizada</div>
                </td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: right; color: #333; font-size: 12px;">$${subtotal.toFixed(2)}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #000; font-size: 12px;">$${subtotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totales y Nota de Cierre -->
          <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; align-items: start;">
            <div style="background: #fdfdfd; border: 1px dashed #ccc; border-radius: 8px; padding: 15px; font-size: 10px; color: #666; line-height: 1.5;">
              <h6 style="font-weight: bold; font-size: 11px; color: #111; margin: 0 0 8px 0; text-transform: uppercase;">NOTAS Y CONDICIONES DE PAGO:</h6>
              <ul style="padding-left: 15px; margin: 0;">
                <li>Este documento certifica la recepción de los fondos correspondientes al servicio indicado.</li>
                <li>Los servicios se facturan de manera mensual anticipada.</li>
                <li>Conserve este comprobante digital para cualquier conciliación.</li>
              </ul>
            </div>
            <div style="background: #ffffff; border: 1px solid #eee; border-radius: 8px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                <span style="color: #666;">SUBTOTAL:</span>
                <span style="font-weight: bold; color: #111;">$${subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px;">
                <span style="color: #666;">IVA (15%):</span>
                <span style="font-weight: bold; color: #111;">$${iva.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; background: #000; color: #d4af37; border-radius: 6px; padding: 10px; box-shadow: 0 3px 6px rgba(0,0,0,0.1);">
                <span style="font-weight: bold; font-size: 11px;">TOTAL PAGADO:</span>
                <span style="font-weight: 900; font-size: 16px;">$${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Pie de Pagina -->
          <div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="font-weight: bold; color: #d4af37; font-size: 11px; margin: 0 0 4px 0; letter-spacing: 1px; text-transform: uppercase;">SEGURIDAD 24/7 ECUADOR</p>
            <p style="font-size: 10px; color: #888; margin: 0 0 8px 0;">Gracias por confiar en nuestro servicio de seguridad virtual de alta gama.</p>
            <div style="font-size: 9px; color: #ccc; text-transform: uppercase;">Comprobante de Pago Electrónico Autorizado.</div>
          </div>
        </div>
      `;

      document.body.appendChild(tempDiv);

      const { jsPDF } = window.jspdf;
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 800,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        pdfWidth,
        pdfHeight,
        undefined,
        "FAST",
      );
      pdf.save(
        `FACTURA_${complexName.replace(/\s+/g, "_").toUpperCase()}_${paymentId.substring(0, 6).toUpperCase()}.pdf`,
      );

      document.body.removeChild(tempDiv);

      Swal.fire({
        icon: "success",
        title: "¡Factura Generada!",
        text: "El documento PDF se ha descargado correctamente.",
        confirmButtonColor: "#d4af37",
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo generar la factura en PDF.", "error");
    }
  };

  // =========================================
  //  CARGAR COTIZACIONES DEL CONJUNTO
  // =========================================
  window.cargarCotizacionesPortal = async () => {
    const tableBody = document.getElementById("quotesPortalTableBody");
    if (!tableBody) return;

    const complexName = window.currentComplexName || "";
    if (!complexName) {
      tableBody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-4">Cargando datos del conjunto...</td></tr>';
      return;
    }

    try {
      tableBody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>';

      const snapshot = await db
        .collection("proformas")
        .where("clientName", "==", complexName.toUpperCase())
        .get();

      if (snapshot.empty) {
        tableBody.innerHTML =
          '<tr><td colspan="5" class="text-center text-white py-4">No hay cotizaciones registradas para este conjunto.</td></tr>';
        return;
      }

      let html = "";
      window.allPortalProformas = [];

      snapshot.forEach((doc) => {
        const p = { id: doc.id, ...doc.data() };
        window.allPortalProformas.push(p);

        html += `
          <tr>
            <td data-label="Fecha">${p.date}</td>
            <td data-label="Código"><span class="badge bg-secondary">PR-${p.id.substring(0, 6).toUpperCase()}</span></td>
            <td data-label="Validez">${p.expiry || 15} días</td>
            <td data-label="Total" class="text-gold fw-bold">$${parseFloat(p.total).toFixed(2)}</td>
            <td data-label="Acciones">
              <button class="btn btn-sm btn-outline-danger" onclick="viewProformaPortal('${p.id}')">
                <i class="fa-solid fa-file-pdf"></i> PDF
              </button>
            </td>
          </tr>
        `;
      });

      tableBody.innerHTML = html;
    } catch (err) {
      console.error("Error al cargar cotizaciones:", err);
      tableBody.innerHTML =
        '<tr><td colspan="5" class="text-center text-danger py-4">Error al cargar cotizaciones.</td></tr>';
    }
  };

  // =========================================
  //  VISTA PREVIA DE COTIZACIÓN
  // =========================================
  window.viewProformaPortal = (id) => {
    const p = window.allPortalProformas.find((item) => item.id === id);
    if (!p) return;

    const htmlTemplate = `
        <div style="font-family: 'Inter', sans-serif; padding: 40px; color: #333; position: relative; background: #fff;">
            <div style="position: absolute; top: 0; right: 0; width: 150px; height: 150px; background: linear-gradient(225deg, rgba(212,175,55,0.1) 0%, transparent 70%); border-radius: 0 0 0 100%;"></div>
            
            <div class="prof-header mb-4 d-flex justify-content-between align-items-start flex-wrap gap-4">
                <div>
                    <img src="assets/img/logo.png" alt="Logo" style="height: 65px; margin-bottom: 10px;">
                    <div style="font-size: 11px; color: #666; line-height: 1.3;">
                        <p class="mb-0"><strong>SEGURIDAD 24/7 DEL ECUADOR CIA. LTDA.</strong></p>
                        <p class="mb-0">Vigilancia Virtual de Alta Gama</p>
                        <p class="mb-0">RUC: 1793205916001</p>
                        <p class="mb-0">Pedro Cando N59-116 y Antonio Macata, Quito</p>
                    </div>
                </div>
                <div class="text-md-end">
                    <h1 style="color: #d4af37; font-size: 32px; font-weight: 900; margin-bottom: 0; letter-spacing: -1px; line-height: 1;">PROFORMA</h1>
                    <div style="font-size: 14px; font-weight: 700; color: #333; margin-top: 5px;">N° PR-${p.id.substring(0, 6).toUpperCase()}</div>
                    <div class="badge bg-gold text-dark mt-2 px-3 py-2 rounded-pill shadow-sm" style="font-size: 11px; font-weight: bold; background-color: #d4af37 !important;">FECHA: ${p.date}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #fdfaf0; border: 1px solid #f1e6c9; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <div>
                    <h6 style="color: #b8922b; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px;">PREPARADO PARA:</h6>
                    <p style="font-size: 15px; font-weight: 800; color: #000; margin-bottom: 2px;">${p.clientName}</p>
                    <p style="font-size: 12px; color: #555;">Contacto: ${p.clientPhone || "Cliente Distinguido"}</p>
                </div>
                <div class="text-md-end" style="text-align: right;">
                    <h6 style="color: #b8922b; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px;">INFORMACIÓN ADICIONAL:</h6>
                    <p style="font-size: 12px; color: #333; margin-bottom: 2px;">Validez: <strong>${p.expiry || 15} días</strong></p>
                    <p style="font-size: 12px; color: #777;">ID Ref: ${p.id.substring(0, 8)}</p>
                </div>
            </div>

            <div class="table-responsive" style="margin-bottom: 25px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #000; color: #d4af37;">
                            <th style="padding: 12px 10px; text-align: center; border-radius: 6px 0 0 6px; font-size: 11px; text-transform: uppercase; width: 60px;">CANT.</th>
                            <th style="padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase;">DESCRIPCIÓN DE EQUIPO / SERVICIO</th>
                            <th style="padding: 12px 10px; text-align: right; font-size: 11px; text-transform: uppercase; width: 120px;">P. UNIT</th>
                            <th style="padding: 12px 10px; text-align: right; border-radius: 0 6px 6px 0; font-size: 11px; text-transform: uppercase; width: 120px;">VALOR TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${p.items
                          .map(
                            (item) => `
                            <tr>
                                <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; color: #000; font-size: 13px;">${item.qty}</td>
                                <td style="padding: 12px 10px; border-bottom: 1px solid #eee;">
                                    <div style="font-weight: bold; color: #000; font-size: 13px;">${item.name}</div>
                                    <div style="font-size: 11px; color: #777;">Tecnología de Seguridad Premium 24/7</div>
                                </td>
                                <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: right; color: #333; font-size: 12px;">$${parseFloat(item.price).toFixed(2)}</td>
                                <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #000; font-size: 12px;">$${parseFloat(item.subtotal).toFixed(2)}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>

            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; align-items: start; margin-top: 20px;">
                <div style="background: #fafafa; border-radius: 8px; padding: 15px; border: 1px dashed #ddd;">
                    <h6 style="font-weight: 800; font-size: 11px; color: #000; text-transform: uppercase; margin: 0 0 10px 0;">TÉRMINOS Y CONDICIONES:</h6>
                    <ul style="padding-left: 15px; font-size: 10px; color: #666; line-height: 1.5; margin: 0;">
                        <li>Todos nuestros equipos incluyen garantía de 1 año.</li>
                        <li>La instalación se coordina tras el primer pago (50%).</li>
                        <li>Forma de pago: Efectivo, Transferencia o Depósito.</li>
                        <li>Precios sujetos a cambios sin previo aviso tras la validez.</li>
                    </ul>
                </div>
                <div style="background: #ffffff; border: 1px solid #eee; border-radius: 8px; padding: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
                        <span style="color: #666;">SUBTOTAL:</span>
                        <span style="font-weight: bold; color: #111;">$${parseFloat(p.subtotal).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px;">
                        <span style="color: #666;">IVA (15%):</span>
                        <span style="font-weight: bold; color: #111;">$${parseFloat(p.iva).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #000; color: #d4af37; border-radius: 6px; padding: 10px;">
                        <span style="font-weight: bold; font-size: 10px;">TOTAL A PAGAR:</span>
                        <span style="font-weight: 900; font-size: 16px; color: #d4af37;">$${parseFloat(p.total).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                <p style="font-weight: 800; color: #d4af37; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 5px 0;">SEGURIDAD 24/7 ECUADOR</p>
                <p style="font-size: 11px; color: #999; margin: 0;">Gracias por permitirnos proteger lo que más le importa.</p>
            </div>
        </div>
    `;

    document.getElementById("proformaPreviewPortal").innerHTML = htmlTemplate;
    document.getElementById("proformaPrintAreaPortal").innerHTML = htmlTemplate;

    const modal = new bootstrap.Modal(
      document.getElementById("viewProformaModalPortal"),
    );
    modal.show();
    window.currentViewingProformaPortal = p;
  };

  // Botón de descargar proforma
  const dlBtn = document.getElementById("downloadProformaPdfBtnPortal");
  if (dlBtn) {
    dlBtn.addEventListener("click", async () => {
      const element = document.getElementById("proformaPrintAreaPortal");
      const p = window.currentViewingProformaPortal;
      if (!p) return;

      Swal.fire({
        title: "Generando Documento...",
        text: "Creando PDF de alta calidad",
        timerProgressBar: true,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 800,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(
          imgData,
          "PNG",
          0,
          0,
          pdfWidth,
          pdfHeight,
          undefined,
          "FAST",
        );
        pdf.save(
          `COTIZACION_${p.clientName.replace(/\s+/g, "_").toUpperCase()}_${p.id.substring(0, 6)}.pdf`,
        );

        Swal.fire({
          icon: "success",
          title: "¡Éxito!",
          text: "La cotización se ha descargado correctamente.",
          confirmButtonColor: "#d4af37",
        });
      } catch (error) {
        console.error("PDF Export Error:", error);
        Swal.fire("Error", "No se pudo generar el PDF.", "error");
      }
    });
  }

  // =========================================
  //  FORMULARIO ENVIAR SOLICITUD COTIZACIÓN
  // =========================================
  const requestQuoteForm = document.getElementById("requestQuoteForm");
  if (requestQuoteForm) {
    requestQuoteForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = auth.currentUser;
      if (!user) return;

      const desc = document.getElementById("quoteReqDesc").value;
      const phone = document.getElementById("quoteReqPhone").value;

      Swal.fire({
        title: "Enviando solicitud...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const reqData = {
          id: "req_" + Date.now(),
          description: desc,
          phone: phone,
          status: "Pendiente",
          createdAt: new Date().toISOString(),
        };

        const userDocRef = db.collection("users").doc(user.uid);
        let userData = {};
        await db.runTransaction(async (transaction) => {
          const sfDoc = await transaction.get(userDocRef);
          if (!sfDoc.exists) return;
          userData = sfDoc.data();
          const currentReqs = userData.quoteRequests || [];
          currentReqs.push(reqData);
          transaction.update(userDocRef, { quoteRequests: currentReqs });
        });

        Swal.fire({
          icon: "success",
          title: "Solicitud Enviada",
          text: "El departamento comercial analizará tu requerimiento y enviará la cotización al portal.",
          confirmButtonColor: "#d4af37",
        });

        requestQuoteForm.reset();
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "No se pudo enviar la solicitud.", "error");
      }
    });
  }

  // =========================================
  //  CARGAR BANDEJA DE COMUNICACIONES / QUEJAS
  // =========================================
  window.cargarComunicacionesPortal = async () => {
    const container = document.getElementById("communicationsPortalContainer");
    if (!container) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      container.innerHTML =
        '<div class="text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin"></i> Cargando comunicaciones...</div>';

      const userDoc = await db.collection("users").doc(user.uid).get();
      if (!userDoc.exists) {
        container.innerHTML =
          '<div class="text-center text-white py-4">No hay comunicaciones enviadas aún.</div>';
        return;
      }

      const userData = userDoc.data();
      const comunicaciones = userData.comunicaciones || [];

      if (comunicaciones.length === 0) {
        container.innerHTML =
          '<div class="text-center text-white py-4">No hay comunicaciones enviadas aún.</div>';
        return;
      }

      // Ordenar localmente por fecha descendente
      comunicaciones.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      let html = "";
      comunicaciones.forEach((data) => {
        let dateStr = "---";
        if (data.createdAt) {
          const d = new Date(data.createdAt);
          dateStr = d.toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        const typeLabel =
          data.type === "queja"
            ? "Queja Formal"
            : data.type === "sugerencia"
              ? "Sugerencia"
              : "Mensaje General";
        const typeBadge =
          data.type === "queja"
            ? "bg-danger"
            : data.type === "sugerencia"
              ? "bg-info"
              : "bg-secondary";
        const statusBadge =
          data.status === "Respondido" ? "bg-success" : "bg-warning text-dark";

        html += `
          <div class="comm-bubble" style="text-align: left;">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <span class="badge ${typeBadge} me-2">${typeLabel}</span>
                <span class="badge ${statusBadge}">${data.status || "Pendiente"}</span>
              </div>
              <small class="text-white-50">${dateStr}</small>
            </div>
            <h6 class="text-gold fw-bold mb-1">${data.subject}</h6>
            <p class="text-white small mb-2" style="white-space: pre-wrap;">${data.message}</p>
            ${
              data.reply
                ? `
              <div class="mt-3 p-3 rounded bg-dark bg-opacity-50 border-start border-gold">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <small class="text-gold fw-bold"><i class="fa-solid fa-reply me-1"></i> Respuesta de Administración</small>
                </div>
                <p class="text-white-50 small mb-0" style="white-space: pre-wrap;">${data.reply}</p>
              </div>
            `
                : ""
            }
          </div>
        `;
      });

      container.innerHTML = html;
    } catch (err) {
      console.error(err);
      container.innerHTML =
        '<div class="text-center text-danger py-4">Error al cargar comunicaciones.</div>';
    }
  };

  // =========================================
  //  FORMULARIO ENVIAR MENSAJE / QUEJA
  // =========================================
  const sendMessageForm = document.getElementById("sendMessagePortalForm");
  if (sendMessageForm) {
    sendMessageForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const user = auth.currentUser;
      if (!user) return;

      const type = document.getElementById("msgType").value;
      const subject = document.getElementById("msgSubject").value;
      const message = document.getElementById("msgContent").value;

      Swal.fire({
        title: "Enviando mensaje...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const commData = {
          id: "comm_" + Date.now(),
          type: type,
          subject: subject,
          message: message,
          status: "Pendiente",
          reply: null,
          createdAt: new Date().toISOString(),
        };

        const userDocRef = db.collection("users").doc(user.uid);
        let userData = {};
        await db.runTransaction(async (transaction) => {
          const sfDoc = await transaction.get(userDocRef);
          if (!sfDoc.exists) return;
          userData = sfDoc.data();
          const currentComm = userData.comunicaciones || [];
          currentComm.push(commData);
          transaction.update(userDocRef, { comunicaciones: currentComm });
        });

        Swal.fire({
          icon: "success",
          title: "Mensaje Enviado",
          text: "Tu comunicación ha sido enviada al departamento administrativo.",
          confirmButtonColor: "#d4af37",
        });

        sendMessageForm.reset();
        cargarComunicacionesPortal();
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "No se pudo enviar el mensaje.", "error");
      }
    });
  }
});
