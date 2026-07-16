document.addEventListener("DOMContentLoaded", () => {
  // Desactivar el enforceFocus de Bootstrap para permitir entrada de texto en iframes (ej: PayPhone)
  if (typeof bootstrap !== "undefined" && bootstrap.Modal && bootstrap.Modal.prototype) {
    bootstrap.Modal.prototype._enforceFocus = function() {};
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  // DOM Elements
  const logoutBtn = document.getElementById("logoutBtn");
  const userNameDisplay = document.getElementById("userNameDisplay");
  const paymentsTableBody = document.getElementById("paymentsTableBody");

  // CHECK FOR PAYPHONE CALLBACK PARAMETERS IN URL
  const urlParams = new URLSearchParams(window.location.search);
  const payphoneId = urlParams.get("id");
  const clientTransactionId = urlParams.get("clientTransactionId");

  if (payphoneId && clientTransactionId) {
    verifyPayphonePayment(payphoneId, clientTransactionId);
  }

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

    function showPublicUI() {
      console.log("Habilitando interfaz pública/búsqueda");
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
        } else {
          console.warn("El documento del usuario no existe en la colección 'users'.");
          showPublicUI();
        }
      } catch (error) {
        console.error("Error al cargar datos de usuario:", error);
        showPublicUI();
      }
    } else {
      console.log("Modo público habilitado");
      showPublicUI();
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
      transactionId: extraData.transactionId || null,
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

      loadPayments(userId);
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

  // 5. PAYPHONE CHECKOUT BOX INTEGRATION
  function initPayPhone(amount, serviceName) {
    const btnOpenModal = document.getElementById("btnOpenPayphoneModal");
    if (!btnOpenModal) return;

    // Remover listeners anteriores reemplazando el botón
    const newBtn = btnOpenModal.cloneNode(true);
    btnOpenModal.parentNode.replaceChild(newBtn, btnOpenModal);

    newBtn.addEventListener("click", () => {
      const totalAmount = parseFloat(amount);
      if (isNaN(totalAmount) || totalAmount <= 0) return;

      // Actualizar información en el modal
      const modalService = document.getElementById("payphone-modal-service");
      const modalAmount = document.getElementById("payphone-modal-amount");
      if (modalService) modalService.textContent = serviceName;
      if (modalAmount) modalAmount.textContent = `$${totalAmount.toFixed(2)}`;

      // Recrear el contenedor del botón de pago para evitar duplicaciones
      const modalBody = document.querySelector("#payphoneModal .modal-body");
      let ppButton = document.getElementById("pp-button");
      if (!ppButton) {
        ppButton = document.createElement("div");
        ppButton.id = "pp-button";
        modalBody.appendChild(ppButton);
      }
      ppButton.innerHTML = "";

      // Convertir a centavos e IVA
      const totalCents = Math.round(totalAmount * 100);
      const baseCents = Math.round((totalAmount / 1.15) * 100);
      const taxCents = totalCents - baseCents;

      const clientTxId = "TX_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      const user = auth.currentUser;
      const userId = user ? user.uid : (window.currentGuestUserId || "GUEST");
      const userEmail = user ? user.email : (window.currentGuestEmail || "GUEST_EMAIL");

      // Guardar datos temporales en localStorage
      localStorage.setItem("pending_payphone_" + clientTxId, JSON.stringify({
        userId: userId,
        userEmail: userEmail,
        serviceName: serviceName,
        amount: totalAmount
      }));

      // Abrir modal
      const payphoneModalEl = document.getElementById('payphoneModal');
      const modal = new bootstrap.Modal(payphoneModalEl);
      modal.show();

      try {
        if (typeof PPaymentButtonBox !== "undefined") {
          const ppb = new PPaymentButtonBox({
            token: "JwU5Yax6fZ_6q7EpOtz56Cs4Ul9vMJwK8QFvokUEtsfwcJw1cCgmSAndFKKeBB0WAAc5flQHNJI-yyGXRb8Ln1hyANDG44B8sGfAUQMRRxZ-xblrrqNAPWWHo33VG7uHmqHA9VvRH2dR7URG7lD934yFKXumnhKpDVjtUxRDTgHtmQ5IZi8mHz0NkIDePaveBQQshe77K2_KNnu8a-eL0Tiu9ZpyXlaoQvW4U5OizGdT_rgBILmLY4L3NXPTYunIMsyy7E3xGZiazqSWhWze3Xu8M70rsncdBFhhiCAbMINGrHqcT5pOZugBh-_HJguV3Un5vJMlvRgI8zCXzcCFCt5Mpak",
            clientTransactionId: clientTxId,
            amount: totalCents,
            amountWithoutTax: 0,
            amountWithTax: baseCents,
            tax: taxCents,
            currency: "USD",
            reference: serviceName,
            lang: "es",
            defaultMethod: "card"
          });
          ppb.render('pp-button');
        } else {
          console.error("PPaymentButtonBox no está definido");
        }
      } catch (error) {
        console.error("Error al inicializar el botón PayPhone:", error);
      }
    });
  }

  async function verifyPayphonePayment(payphoneId, clientTxId) {
    Swal.fire({
      title: "Verificando pago...",
      text: "Por favor espera mientras confirmamos tu transacción con PayPhone.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const confirmUrl = "https://paymentbox.payphonetodoesposible.com/api/confirm";
      
      const response = await fetch(confirmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer JwU5Yax6fZ_6q7EpOtz56Cs4Ul9vMJwK8QFvokUEtsfwcJw1cCgmSAndFKKeBB0WAAc5flQHNJI-yyGXRb8Ln1hyANDG44B8sGfAUQMRRxZ-xblrrqNAPWWHo33VG7uHmqHA9VvRH2dR7URG7lD934yFKXumnhKpDVjtUxRDTgHtmQ5IZi8mHz0NkIDePaveBQQshe77K2_KNnu8a-eL0Tiu9ZpyXlaoQvW4U5OizGdT_rgBILmLY4L3NXPTYunIMsyy7E3xGZiazqSWhWze3Xu8M70rsncdBFhhiCAbMINGrHqcT5pOZugBh-_HJguV3Un5vJMlvRgI8zCXzcCFCt5Mpak"
        },
        body: JSON.stringify({
          id: parseInt(payphoneId),
          clientTxId: clientTxId
        })
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      const result = await response.json();
      console.log("Payphone Confirm Result:", result);

      if (result.transactionStatus === "Approved" || result.statusCode === 3) {
        // Cerrar modal si estuviera abierto
        try {
          const payphoneModalEl = document.getElementById('payphoneModal');
          const modalInstance = bootstrap.Modal.getInstance(payphoneModalEl);
          if (modalInstance) modalInstance.hide();
        } catch (me) {
          console.error("Error al cerrar modal:", me);
        }

        let pendingData = null;
        try {
          const stored = localStorage.getItem("pending_payphone_" + clientTxId);
          if (stored) {
            pendingData = JSON.parse(stored);
          }
        } catch (e) {
          console.error("Error leyendo localStorage:", e);
        }

        const userId = pendingData ? pendingData.userId : "GUEST";
        const userEmail = pendingData ? pendingData.userEmail : "GUEST_EMAIL";
        const serviceName = pendingData ? pendingData.serviceName : ("Pago PayPhone " + payphoneId);
        const amount = pendingData ? parseFloat(pendingData.amount) : (parseFloat(result.amount) / 100);

        const paymentData = {
          userId: userId,
          userEmail: userEmail,
          service: serviceName,
          amount: amount,
          method: "Tarjeta",
          notes: `Pago aprobado vía Cajita de Pagos PayPhone. Transacción: ${payphoneId} - Ref: ${clientTxId}`,
          status: "Aprobado",
          transactionId: payphoneId,
          date: new Date(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          isGuestMode: userId === "GUEST"
        };

        await db.collection("payments").add(paymentData);

        localStorage.removeItem("pending_payphone_" + clientTxId);

        Swal.fire({
          title: "¡Pago Exitoso!",
          text: "El pago de tu alícuota se ha procesado y registrado correctamente.",
          icon: "success",
          confirmButtonColor: "#d4af37"
        }).then(() => {
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          if (userId !== "GUEST") {
            loadPayments(userId);
          }
        });
      } else {
        throw new Error(result.message || "Pago no aprobado");
      }
    } catch (error) {
      console.error("Error al confirmar transacción PayPhone:", error);
      Swal.fire({
        title: "Error al Confirmar",
        text: "No pudimos confirmar la transacción. Si el dinero fue debitado de tu cuenta, por favor contáctanos con tu ID de transacción: " + payphoneId,
        icon: "error"
      }).then(() => {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      });
    }
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

      // Guardar datos del contrato de forma global para descarga PDF
      window.currentContractData = { id: contractId, ...contractData };
      const btnDownloadContract = document.getElementById("btnDownloadContractPdf");
      if (btnDownloadContract) {
        btnDownloadContract.classList.remove("d-none");
      }
      const btnProfileDownloadContract = document.getElementById("btnProfileDownloadContractPdf");
      if (btnProfileDownloadContract) {
        btnProfileDownloadContract.classList.remove("d-none");
      }

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

  // Listener para los botones de descargar contrato PDF
  const btnDownloadContract = document.getElementById("btnDownloadContractPdf");
  if (btnDownloadContract) {
    btnDownloadContract.addEventListener("click", async () => {
      if (!window.currentContractData) {
        Swal.fire("Error", "No se han cargado los datos del contrato.", "error");
        return;
      }
      descargarContratoPDF(window.currentContractData);
    });
  }

  const btnProfileDownloadContract = document.getElementById("btnProfileDownloadContractPdf");
  if (btnProfileDownloadContract) {
    btnProfileDownloadContract.addEventListener("click", async () => {
      if (!window.currentContractData) {
        Swal.fire("Error", "No se han cargado los datos del contrato.", "error");
        return;
      }
      descargarContratoPDF(window.currentContractData);
    });
  }

  // 📋 DESCARGAR CONTRATO PDF (COMPLETO)
  function formatFechaES(dateStr) {
    if (!dateStr) return "_________________";
    if (typeof dateStr === "string" && dateStr.includes(" de ")) return dateStr;
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const meses = [
          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        return `${day} de ${meses[month]} del ${year}`;
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];
      return `${d.getDate()} de ${meses[d.getMonth()]} del ${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  }

  async function urlToBase64(url, maxWidth = 600) {
    try {
      const response = await fetch(url, { method: "GET", mode: "cors" });
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn("Error converting image to base64:", error);
      return null;
    }
  }

  async function compressBase64Image(base64String, maxWidth = 600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = base64String;
    });
  }

  async function descargarContratoPDF(data) {
    Swal.fire({
      title: "Preparando Contrato...",
      text: "Generando PDF de alta calidad...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      // Duplicar datos para no mutar el objeto original
      const contractData = JSON.parse(JSON.stringify(data));

      // Procesar firmas a Base64 para evitar errores CORS
      if (contractData.clientSignature) {
        if (contractData.clientSignature.startsWith("http")) {
          const base64 = await urlToBase64(contractData.clientSignature);
          if (base64) contractData.clientSignature = base64;
        } else if (contractData.clientSignature.startsWith("data:image")) {
          try {
            contractData.clientSignature = await compressBase64Image(contractData.clientSignature);
          } catch (e) {
            console.error(e);
          }
        }
      }

      // Procesar foto de cédula a Base64 para evitar errores CORS
      if (contractData.clientIdPhoto) {
        if (contractData.clientIdPhoto.startsWith("http")) {
          const base64 = await urlToBase64(contractData.clientIdPhoto);
          if (base64) contractData.clientIdPhoto = base64;
        } else if (contractData.clientIdPhoto.startsWith("data:image")) {
          try {
            contractData.clientIdPhoto = await compressBase64Image(contractData.clientIdPhoto);
          } catch (e) {
            console.error(e);
          }
        }
      }

      // Crear contenedor temporal para el HTML del contrato
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "-9999px";
      tempDiv.style.width = "800px";
      tempDiv.style.background = "#ffffff";
      tempDiv.style.color = "#000000";

      // Usar la plantilla exacta
      const city = contractData.city || "San Francisco de Quito";
      const signDateText = formatFechaES(contractData.signDate || contractData.date);
      const startDateText = formatFechaES(contractData.startDate || contractData.date);

      const complexName = contractData.complexName || contractData.clientName || "_________________";
      const complexRuc = contractData.complexRuc || contractData.clientId || "_________________";
      const complexRep = contractData.complexRep || contractData.clientName || "_________________";
      const address = contractData.address || contractData.clientAddress || "_________________";
      const canton = contractData.canton || "_________________";
      const price = contractData.price || contractData.servicePrice || "0.00";
      const duration = contractData.duration || "12";
      const annexDetails = contractData.annexDetails || "No se han registrado equipos para este contrato.";

      const companyName = "SEGURIDAD 24-7 DEL ECUADOR CIA. LTDA.";
      const companyRep = "EDWIN YUBILLO";
      const companyRuc = "1793205916001";

      const companySigImg = `<img src="assets/img/firma.png" style="max-height: 80px; max-width: 150px;" alt="Firma Empresa">`;
      const clientSigImg = contractData.clientSignature
        ? `<img src="${contractData.clientSignature}" crossorigin="anonymous" style="max-height: 80px; max-width: 180px;" alt="Firma Cliente">`
        : `<div style="height: 80px;"></div>`;

      const idPhotoHTML = contractData.clientIdPhoto
        ? `<div style="page-break-before: always; break-before: page; clear: both; height: 1px;"></div>
           <div style="padding-top: 20px; text-align: center; font-family: 'Times New Roman', Times, serif;">
               <div style="border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 40px;">
                   <h4 style="font-weight: 700; color: #000; text-transform: uppercase; font-size: 12pt; letter-spacing: 1px;">EVIDENCIA: CÉDULA DE IDENTIDAD / RUC</h4>
               </div>
               <div style="display: block; margin: 0 auto; width: 410px; padding: 12px; border: 1px solid #eee; background: #fff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                   <img src="${contractData.clientIdPhoto}" alt="Cédula" crossorigin="anonymous" style="width: 380px; height: 250px; display: block; margin: 0 auto; object-fit: contain;" data-pdf-image="true">
               </div>
           </div>`
        : '';

      const firmaHTML = `
        <div style="margin-top: 80px; display: flex; justify-content: space-between; page-break-inside: avoid;">
            <div style="text-align: center; width: 45%;">
                <div style="border-bottom: 2px solid #000; margin-bottom: 12px; height: 100px; display: flex; align-items: flex-end; justify-content: center;">
                    ${companySigImg}
                </div>
                <p style="font-weight: 800; text-transform: uppercase; margin: 0; font-size: 14px; color: #000;">${companyRep}</p>
                <p style="margin: 4px 0; font-size: 12px; color: #666; font-style: italic;">Representante Legal</p>
                <p style="margin: 0; font-size: 11px; font-weight: 700; color: #d4af37; letter-spacing: 1px;">COMPAÑÍA DE SEGURIDAD</p>
            </div>
            <div style="text-align: center; width: 45%;">
                 <div style="border-bottom: 2px solid #000; margin-bottom: 12px; min-height: 100px; display: flex; align-items: flex-end; justify-content: center;">
                    ${clientSigImg}
                 </div>
                 <p style="font-weight: 800; text-transform: uppercase; margin: 0; font-size: 14px; color: #000;">${complexRep}</p>
                 <p style="margin: 4px 0; font-size: 12px; color: #666; font-style: italic;">EL CLIENTE / CONTRATANTE</p>
                 <p style="margin: 0; font-size: 11px; font-weight: 700; color: #000; text-transform: uppercase;">${complexName}</p>
            </div>
        </div>
      `;

      tempDiv.innerHTML = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 9pt; line-height: 1.6; color: #000; padding: 60px 40px 20px 40px; background: #fff; width: 800px; margin: 0 auto; box-sizing: border-box;">
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #d4af37; padding-bottom: 15px;">
            <div style="width: 140px;">
              <img src="assets/img/logo.png" alt="Logo" style="max-width: 100%; height: auto;">
            </div>
            <div style="text-align: right; font-family: 'Times New Roman', Times, serif;">
              <h2 style="margin: 0; color: #d4af37; font-size: 18pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">SEGURIDAD 24-7</h2>
              <p style="margin: 3px 0 0; font-size: 9pt; color: #333; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Vigilancia Virtual de Alta Gama</p>
              <p style="margin: 2px 0 0; font-size: 8pt; color: #666;">RUC: ${companyRuc}</p>
            </div>
          </div>

          <h3 style="text-align: center; font-family: 'Times New Roman', Times, serif; font-weight: 700; margin-bottom: 30px; color: #000; text-transform: uppercase; font-size: 11pt; letter-spacing: 0.5px; line-height: 1.4;">
            CONTRATO DE PRESTACIÓN DE SERVICIOS DE SEGURIDAD PRIVADA Y<br>VIGILANCIA CON GUARDIAS VIRTUALES
          </h3>

          <div style="text-align: justify; font-size: 9pt; color: #000;">
            <p style="margin-bottom: 18px;">
              En la ciudad de ${city}, a los <strong>${signDateText}</strong>, comparecen, a celebrar el presente contrato mercantil de prestación de servicios de seguridad privada, por una parte <strong>${complexRep}</strong> en calidad de representante legal de <strong>${complexName}</strong> con RUC <strong>${complexRuc}</strong> a quien para los efectos del presente contrato se lo denominará también <strong>El Cliente</strong>; y, por otra parte, comparecen a la suscripción de este contrato el señor <strong>${companyRep}</strong>, en calidad de representante legal de <strong>SEGURIDAD 24-7 DEL ECUADOR CIA. LTDA.</strong>, con RUC <strong>${companyRuc}</strong> a quien para los efectos del presente contrato se lo podrá denominar <strong>la Compañía de Seguridad</strong>.
            </p>

            <p style="margin-bottom: 18px; font-style: italic; color: #222; text-align: center; border: 1px solid #f1e6c9; background: #fdfaf0; padding: 10px;">
              Las partes libres y voluntariamente, por así convenir a sus mutuos intereses, acuerdan el contenido del presente contrato al tenor de las siguientes clausulas:
            </p>

            <div style="margin-bottom: 18px;">
              <p style="margin-bottom: 5px;"><strong>PRIMERA.- ANTECEDENTES:</strong></p>
              <p>
                El Beneficiario requiere contratar los servicios de seguridad privada, resguardo y protección virtual, mediante el monitoreo al sistema de cámaras, perifoneo en tiempo real las 24 horas de lunes a domingo, desde el <strong>${startDateText}</strong> para custodiar <strong>${complexName}</strong> ubicado en la dirección: <strong>${address}</strong>, cantón <strong>${canton}</strong>, a fin de cuidarlo y protegerlo, conforme a las normas de seguridad privada y a las indicaciones proporcionadas por el Beneficiario, quien ha creído conveniente a sus intereses contratar este servicio.
              </p>
              <p style="margin-top: 8px;">
                El Beneficiario solicita personal capacitado y calificado tanto en los procedimientos de vigilancia y control, como el manejo de equipos de comunicación, equipos de emergencia y otros que la función lo requiera.
              </p>
              <p style="margin-top: 8px;">
                <strong>${companyName}</strong>, es una compañía legalmente constituida, cuyas oficinas se encuentran ubicadas en la calle Pedro Cando N59-116 y Antonio Macata (SECTOR LA KENNEDY) de la ciudad de San Francisco de Quito, dedicada de forma habitual y por cuenta propia, a prestar los servicios de prevención del delito, vigilancia y seguridad a favor de personas naturales y jurídicas, instalaciones y bienes, deposito, custodia y transporte de valores y otras conexas en el área de seguridad privada.
              </p>
            </div>

            <div style="margin-bottom: 18px;">
              <p style="margin-bottom: 5px;"><strong>SEGUNDA. - CONTRATACIÓN DEL SERVICIO DE SEGURIDAD:</strong></p>
              <p>
                Teniendo como base los antecedentes enunciados, El Cliente contrata resguardo y protección privada virtual, mediante el monitoreo al sistema de cámaras, perifoneo las 24 horas de lunes a domingo, adicional la empresa en caso de emergencia como intentos de robo, asalto, hurto, etc., la compañía coordinará con ECU 911, auxilio inmediato, además que personal motorizado propio de la compañía acudirá en auxilio, en un tiempo promedio de 20 minutos, para socorrer ante el incidente presentado con el fin de proteger, custodiar y brindar máxima seguridad interna y externa al lugar indicado. La Compañía de Seguridad se compromete a colocar la infraestructura necesaria que garantice: Alerta de identificación de movimiento/detección de personas en horas de poco tránsito para que, La Compañía de Seguridad alerte de forma temprana e identifique posibles riesgos. Para corroborar el cumplimiento de este, se anexará (Anexo 1) a este contrato un informe de los componentes instalados, Adicional, El Cliente podrá solicitar un nuevo informe del cumplimiento de cobertura de los vídeos cuando lo consider necesario. Si estos equipos presentan fallas y deben ser reparados o reposicionados, este costo lo asumirá la Compañía de Seguridad. La Compañía de Seguridad brindará el servicio de rondas a través de un motorizado o camioneta que visitará el Domicilio una vez al día en un horario aleatorio. Este se encargará de analizar de forma visual el exterior de la institución revisando riesgos potenciales, equipos instalados visibles y otros datos que La Compañía de Seguridad considere importante.
              </p>
            </div>

            <div style="margin-bottom: 18px; background: #fdfbf5; padding: 20px; border-left: 5px solid #d4af37;">
              <p style="margin: 0;"><strong>TERCERA. - PRECIO:</strong> El valor por el servicio de seguridad es por la cantidad de <span style="font-size: 18px; font-weight: 900; color: #d4af37;">$${price} USD</span> (+ IVA), mismos que serán cancelados los 5 primeros días del mes. El retiro del valor mensual a pagar será efectuado por un delegado oficial del personal administrativo debidamente autorizado de SEGURIDAD 24/7.</p>
            </div>

            <div style="margin-bottom: 18px;">
              <p style="margin-bottom: 5px;"><strong>CUARTA. - PLAZO:</strong> El plazo de duración del presente contrato es por  <strong>${duration} meses</strong>, tomando como fecha inicial la fecha de inicio de la prestación del servicio de guardia virtual, con treinta días de anticipación las partes se notificarán la continuidad o no del mismo, en caso de la no notificación de las partes se entenderá que el contrato se ha renovado de manera automática.</p>
            </div>

            <div style="margin-bottom: 18px;">
              <p style="margin-bottom: 5px;"><strong>QUINTA. - CONDICIONES ESPECIALES:</strong> La empresa de seguridad., conjuntamente con el Supervisor de Seguridad controlarán coordinadamente la función de los Guardias Virtuales. En caso de cualquier anomalía El Cliente notificará de inmediato cualquier actividad fuera de lo normal, en forma verbal-telefónica o por escrito a la oficina de la compañía a fin de proceder a los correctivos efectivos y eficaces que el caso lo amerite.</p>
            </div>

            <div style="margin-bottom: 18px;">
                <p style="margin-bottom: 5px;"><strong>SEXTA. - RESPONSABILIDAD DE LA EMPRESA DE SEGURIDAD:</strong> La compañía de seguridad se responsabiliza a disponer de una pantalla exclusiva para el sistema de cámaras en su central de monitoreo y demás dispositivos de seguridad que el conjunto dispone, para que se monitoree en todo tiempo las actividades diarias que se presenten. La empresa de Seguridad, además, dará las recomendaciones de seguridad necesarias al beneficiario para que se tome las medidas preventivas contra el delito a fin de evitar actos ilícitos provenientes del exterior o interior del sitio protegido.</p>
            </div>

            <div style="margin-bottom: 18px;">
                <p style="margin-bottom: 5px;"><strong>SEPTIMO. - SERVICIO ADICIONAL:</strong> SEGURIDAD 24/7., posee una póliza de responsabilidad civil de $100.000,00 USD (Cien mil dólares de los Estados Unidos de América) contratada con la aseguradora Zúrich, la cual podrá ser utilizada siguiendo los trámites pertinentes que exige la empresa Aseguradora expedidora de dicha póliza. Adicional la Compañía estará dispuesta a atender cualquier requerimiento, sea este de requerimiento de personal de guardia, o de medios que necesitare El Cliente en alguna circunstancia, debiéndose reconocer sus costos como adicionales al presente contrato.</p>
            </div>

            <div style="margin-bottom: 18px;">
              <p style="margin-bottom: 5px; font-size: 10pt;">
                <strong>OCTAVA. - PARTES DEL CONTRATO:</strong>
                Forman parte de este contrato, por su orden:
              </p>
              <ol style="margin-top: 5px; padding-left: 18px; font-size: 10pt;">
                <li>Nombramientos de los Representantes Legales de las partes intervinientes en el contrato.</li>
                <li>Copias de las cédulas y papeletas de votación.</li>
                <li>La oferta y sus complementos.</li>
                <li>Anexo 1, con detalles de los equipos colocados por la empresa de seguridad en calidad de préstamo.</li>
              </ol>
            </div>

            <div style="margin-bottom: 18px;">
                <p style="margin-bottom: 5px;"><strong>NOVENA. - FORMA DE PAGO:</strong> El pago se lo realizará dentro de los 5 primeros días de cada mes, si no está al día en sus haberes El Cliente pierde todos sus derechos, en caso de que el pago no se realice por dos meses consecutivos, se procederá a suspender el servicio de guardia virtual sin aviso previo y se procederá a las acciones legales pertinentes. </p>
            </div>

            <div style="margin-bottom: 18px;">
                <p style="margin-bottom: 5px;"><strong>DECIMA. - TERMINACIÓN DEL CONTRATO:</strong> Las partes contratantes tendrán derecho a dar por terminado el presente contrato, luego de haber cursado las comunicaciones escritas pertinentes, por la violación de cualquiera de las cláusulas de este convenio, o por decisión unilateral de alguna de ellas con por lo menos treinta días de anticipación. Por lo demás se obligan a todas y cada una de las cláusulas estipuladas en este contrato, las mismas que las aceptan y las declaran fielmente cumplir. En caso de terminar anticipadamente e intempestivamente el contrato sin justificación alguna dentro del primer año de contrato, se le pagará a la parte afectada la facturación mensual de dos meses en un tiempo no mayor de 15 días </p>
            </div>

            <div style="margin-bottom: 18px;">
                <p style="margin-bottom: 5px;"><strong>DECIMA PRIMERA. - JURISDICCIÓN Y COMPETENCIA:</strong> Si se suscitaren divergencias o controversias entre las partes, y no llegaren a un acuerdo amigable directo, utilizarán en primera instancia los métodos alternativos para la solución de conflictos en un centro de Mediación y Arbitraje. Y si no existiera acuerdo, las partes deciden someterse a los jueces civiles del Distrito Metropolitano de Quito. Libre y voluntariamente, las partes expresamente declararan su aceptación a todo lo convenido en el presente contrato y se someten a sus estipulaciones</p>
            </div>

            <p style="margin-top: 40px; font-weight: 700; text-align: center; color: #111; padding-top: 20px; border-top: 1px solid #eee;">
              Para constancia de lo estipulado, las partes firman el presente contrato digital.
            </p>

            ${firmaHTML}
          </div>

          <div style="page-break-before: always; break-before: page; clear: both; height: 1px;"></div>

          <div style="clear: both; padding-top: 10px; border-top: 1px dashed #d4af37;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h4 style="font-weight: 700; color: #d4af37; text-transform: uppercase; font-family: 'Times New Roman', Times, serif; font-size: 11pt; letter-spacing: 1px; margin: 0;">ANEXO 1: EQUIPAMIENTO INSTALADO</h4>
              </div>
              <div style="border: 2px solid #f1e6c9; padding: 25px; min-height: 150px; background: #fffcf5; border-radius: 10px; white-space: pre-line; font-family: 'Times New Roman', Times, serif; font-size: 9pt; color: #000; margin-bottom: 30px;">
                ${annexDetails}
              </div>
              <div style="display: flex; justify-content: space-between; font-family: 'Times New Roman', Times, serif;">
                  <div style="text-align: center; width: 45%;">
                      <p style="font-size: 8pt; font-weight: 600; margin-bottom: 10px; color: #666; text-transform: uppercase;">ENTREGA EQUIPOS</p>
                      <div style="margin-bottom: 5px; display: flex; justify-content: center; align-items: flex-end; height: 60px; margin-top: 40px;">
                          ${companySigImg}
                      </div>
                      <p style="border-top: 2px solid #000; padding-top: 5px; font-weight: 700; font-size: 9pt; margin: 0;">${companyRep}</p>
                  </div>
                  <div style="text-align: center; width: 45%;">
                      <p style="font-size: 8pt; font-weight: 600; margin-bottom: 10px; color: #666; text-transform: uppercase;">RECIBE CONFORME</p>
                      <div style="margin-bottom: 5px; display: flex; justify-content: center; align-items: flex-end; height: 60px; margin-top: 40px;">
                          ${clientSigImg}
                      </div>
                      <p style="border-top: 2px solid #000; padding-top: 5px; font-weight: 700; font-size: 9pt; margin: 0;">${complexRep}</p>
                  </div>
              </div>
          </div>

          ${idPhotoHTML}
        </div>
      `;

      document.body.appendChild(tempDiv);

      // Asegurar que las firmas carguen antes del renderizado
      const images = tempDiv.querySelectorAll("img");
      const imagePromises = Array.from(images).map((img) => {
        return new Promise((resolve) => {
          if (img.complete && img.naturalHeight !== 0) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });
      });
      await Promise.all(imagePromises);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("p", "pt", "a4");

      await doc.html(tempDiv, {
        callback: function (pdfDoc) {
          const clientName = contractData.complexName || contractData.clientName || "Contrato";
          pdfDoc.save(`Contrato_${clientName.replace(/\s+/g, "_")}.pdf`);
          document.body.removeChild(tempDiv);
          Swal.fire({
            icon: "success",
            title: "Contrato Descargado",
            text: "El PDF del contrato completo se ha generado y descargado correctamente.",
            confirmButtonColor: "#d4af37",
          });
        },
        x: 30,
        y: 20,
        margin: [40, 0, 20, 0],
        html2canvas: {
          scale: 0.58,
          useCORS: true,
          allowTaint: false,
          letterRendering: true,
          backgroundColor: "#ffffff",
          imageTimeout: 15000,
          onclone: function (clonedDoc) {
            const clonedImages = clonedDoc.querySelectorAll("img");
            clonedImages.forEach((img) => {
              if (img.src && img.src.startsWith("data:")) {
                img.removeAttribute("crossorigin");
              }
            });
          },
        },
        width: 465,
        windowWidth: 800,
        autoPaging: "text",
      });

    } catch (err) {
      console.error("Error al generar PDF del contrato:", err);
      Swal.fire("Error", "No se pudo generar el documento del contrato.", "error");
    }
  }
});
