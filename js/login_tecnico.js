document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("techLoginForm");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("techUser").value;
      const password = document.getElementById("techPassword").value;

      auth
        .signInWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
          const user = userCredential.user;

          // 1. Obtener datos del usuario
          const doc = await db.collection("users").doc(user.uid).get();
          const userData = doc.exists ? doc.data() : null;

          // 2. Validar existencia de datos y Rol
          const role = userData ? userData.role : null;
          const isMainAdmin = user.email === "admin@gmail.com";

          // Solo permitir Técnicos en este formulario (NO permitir admin principal aquí)
          const isAuthorized = role === "tecnico" && !isMainAdmin;

          // 3. Validar Estado Activo
          const isActive = userData && userData.status !== "inactive";

          if (!isAuthorized || !isActive) {
            let errorMsg =
              "Su cuenta no tiene permisos para acceder a este apartado (Técnico). Por favor use el formulario correcto.";
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
                const form = document.getElementById("techLoginForm");
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
                userData.techName ||
                userData.displayName)) ||
            "Técnico";

          Swal.fire({
            icon: "success",
            title: "¡Bienvenido!",
            text: `Ingresando a Gestión Técnica, ${userName}`,
            timer: 1500,
            showConfirmButton: false,
            allowOutsideClick: false,
          }).then(() => {
            // Intentar cerrar el modal de forma segura
            try {
              const modalEl = document.getElementById("loginModal");
              if (modalEl && typeof bootstrap !== "undefined") {
                const modal =
                  bootstrap.Modal.getInstance(modalEl) ||
                  new bootstrap.Modal(modalEl);
                if (modal) modal.hide();
              }
            } catch (error) {
              console.warn(
                "No se pudo cerrar el modal automáticamente:",
                error
              );
            }

            // Redirección inmediata
            window.location.href = "gestion_tecnica.html";
          });
        })
        .catch((error) => {
          console.error("Login Error:", error);
          let errorMsg = "Ocurrió un error al iniciar sesión.";

          // Detectar error de credenciales inválidas (Firebase Auth REST API o SDK)
          if (
            error.message &&
            (error.message.includes("INVALID_LOGIN_CREDENTIALS") ||
              error.message.includes("auth/wrong-password") ||
              error.message.includes("auth/user-not-found") ||
              error.message.includes("INVALID_PASSWORD"))
          ) {
            errorMsg = "Credenciales incorrectas o usuario no encontrado";
          } else if (error.message) {
            // Intentar limpiar mensaje si es JSON
            try {
              // A veces el mensaje es un JSON stringificado
              if (error.message.startsWith("{")) {
                const parsed = JSON.parse(error.message);
                if (
                  parsed.error &&
                  parsed.error.message === "INVALID_LOGIN_CREDENTIALS"
                ) {
                  errorMsg = "Credenciales incorrectas o usuario no encontrado";
                } else if (parsed.error && parsed.error.message) {
                  errorMsg = parsed.error.message;
                } else {
                  errorMsg = error.message;
                }
              } else {
                errorMsg = error.message;
              }
            } catch (e) {
              errorMsg = error.message;
            }
          }

          // Segunda verificación por si acaso quedó el raw text
          if (errorMsg.includes("INVALID_LOGIN_CREDENTIALS")) {
            errorMsg = "Credenciales incorrectas o usuario no encontrado";
          }

          Swal.fire({
            icon: "error",
            title: "Error",
            text: errorMsg,
            confirmButtonColor: "#d4af37",
          }).then(() => {
            // Reset form on error
            const form = document.getElementById("techLoginForm");
            if (form) form.reset();
          });
        });
    });
  }

  if (window.location.pathname.endsWith("gestion_tecnica.html")) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initGestionTecnica);
    } else {
      initGestionTecnica();
    }
  }

  function initGestionTecnica() {
    // Variables Globales
    window.allTrabajos = [];
    window.allContratos = [];
    window.allGuides = [];
    window.allTutorials = [];
    window.trabajosLoaded = false;
    window.contratosLoaded = false;
    window.guidesLoaded = false;
    window.tutorialsLoaded = false;
    window.allPasswords = [];
    window.passwordsLoaded = false;

    // Cargar Info Usuario
    cargarInfoUsuario();

    // Configurar modales (listeners)
    configurarModalInforme();
    configurarModalContrato();
    configurarModalGuia();
    configurarModalTutorial();
    configurarModalClave();

    // Sidebar Toggle (Mobile)
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("show");
      });
    }

    // Navegación Sidebar
    const sidebarLinks = document.querySelectorAll(".sidebar-link");
    sidebarLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = link.getAttribute("data-view");

        // Actualizar links activos
        sidebarLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");

        // Cerrar sidebar en mobile tras click
        if (sidebar && sidebar.classList.contains("show")) {
          sidebar.classList.remove("show");
        }

        switchView(view);
      });
    });

    // Filtros
    const urgencyFilter = document.getElementById("urgencyFilter");
    const nameFilter = document.getElementById("nameFilter");

    // Contenedores
    const dashboardSection = document.getElementById("dashboardSection");
    const jobsSection = document.getElementById("jobsSection");
    const contractsSection = document.getElementById("contractsSection");
    const globalFilterContainer = document.getElementById(
      "globalFilterContainer"
    );
    const urgencyFilterContainer = document.getElementById(
      "urgencyFilterContainer"
    );

    // Inicializar vista (Dashboard)
    switchView("dashboard");

    if (urgencyFilter) urgencyFilter.addEventListener("change", applyFilters);
    if (nameFilter) nameFilter.addEventListener("input", applyFilters);
    const guideSearchInput = document.getElementById("guideSearchInput");
    if (guideSearchInput)
      guideSearchInput.addEventListener("input", applyFilters);
    const tutorialSearchInput = document.getElementById("tutorialSearchInput");
    if (tutorialSearchInput)
      tutorialSearchInput.addEventListener("input", applyFilters);
    const passwordSearchInput = document.getElementById("passwordSearchInput");
    if (passwordSearchInput)
      passwordSearchInput.addEventListener("input", applyFilters);

    function switchView(view) {
      // Ocultar todo
      dashboardSection.style.display = "none";
      const jobsSection = document.getElementById("jobsSection");
      const contractsSection = document.getElementById("contractsSection");
      const guidesSection = document.getElementById("guidesSection");
      const tutorialsSection = document.getElementById("tutorialsSection");
      const passwordsSection = document.getElementById("passwordsSection");
      const globalFilterContainer = document.getElementById(
        "globalFilterContainer"
      );
      const urgencyFilterContainer = document.getElementById(
        "urgencyFilterContainer"
      );

      if (
        !dashboardSection ||
        !jobsSection ||
        !contractsSection ||
        !guidesSection ||
        !tutorialsSection ||
        !passwordsSection
      )
        return;

      dashboardSection.style.display = "none";
      jobsSection.style.display = "none";
      contractsSection.style.display = "none";
      guidesSection.style.display = "none";
      tutorialsSection.style.display = "none";
      passwordsSection.style.display = "none";
      globalFilterContainer.style.display = "none";
      urgencyFilterContainer.style.display = "none";

      if (view === "dashboard") {
        dashboardSection.style.display = "block";
        actualizarEstadisticas();
      } else if (view === "jobs") {
        jobsSection.style.display = "block";
        globalFilterContainer.style.display = "block";
        urgencyFilterContainer.style.display = "block";
        if (!window.trabajosLoaded) cargarTrabajosTecnicos();
        else renderTrabajosTecnicos(window.allTrabajos);
      } else if (view === "contracts") {
        contractsSection.style.display = "block";
        globalFilterContainer.style.display = "block";
        if (!window.contratosLoaded) cargarContratosTecnicos();
        else renderContratosTecnicos(window.allContratos);
      } else if (view === "guides") {
        guidesSection.style.display = "block";
        if (!window.guidesLoaded) cargarGuiasTecnicas();
        else renderGuiasTecnicas(window.allGuides);
      } else if (view === "tutorials") {
        tutorialsSection.style.display = "block";
        if (!window.tutorialsLoaded) cargarTutorialesTecnicos();
        else renderTutorialesTecnicos(window.allTutorials);
      } else if (view === "passwords") {
        passwordsSection.style.display = "block";
        
        // Controlar visibilidad del botón "Agregar Nueva Clave" (Permitido para jefe y obrero)
        const addPasswordBtn = document.getElementById("addPasswordBtn");
        const subRole = window.actualUserData?.subRole || "";
        if (addPasswordBtn) {
          const canManageKeys = subRole === "tecnico-jefe" || subRole === "tecnico-obrero";
          addPasswordBtn.style.display = canManageKeys ? "block" : "none";
        }

        if (!window.passwordsLoaded) cargarClavesTecnicas();
        else renderClavesTecnicas(window.allPasswords);
      }
    }

    async function actualizarEstadisticas() {
      try {
        const queryTrabajos = await db.collection("trabajos").get();
        // Filtramos para que no cuente las guías como trabajos pendientes
        const pendingTrabajos = queryTrabajos.docs.filter((doc) => {
          const d = doc.data();
          return d.status !== "Culminado" && !d.isGuide && !d.isTutorial;
        }).length;
        document.getElementById("statTotalTrabajos").textContent =
          pendingTrabajos;

        const queryContratos = await db.collection("contracts").get();
        const pendingContratos = queryContratos.docs.filter(
          (doc) => !doc.data().clientSignature
        ).length;
        document.getElementById("statTotalContratos").textContent =
          pendingContratos;

        // Cargar notificaciones (inicialmente todas)
        cargarNotificacionesDashboard("all");
      } catch (error) {
        console.error("Error al actualizar estadísticas:", error);
      }
    }

    let currentNotifications = [];

    async function cargarNotificacionesDashboard(filter = "all") {
      const notificationsSection = document.getElementById(
        "notificationsSection"
      );
      const notificationsList = document.getElementById("notificationsList");
      const notificationBadge = document.getElementById("notificationBadge");

      if (!notificationsSection || !notificationsList || !notificationBadge)
        return;

      try {
        // Solo cargar datos si el array está vacío (primera vez)
        if (currentNotifications.length === 0) {
          const snapTrabajos = await db
            .collection("trabajos")
            .orderBy("createdAt", "desc")
            .limit(10)
            .get();

          const snapContratos = await db
            .collection("contracts")
            .orderBy("createdAt", "desc")
            .limit(10)
            .get();

          snapTrabajos.forEach((doc) => {
            const data = doc.data();
            if (
              data.status !== "Culminado" &&
              !data.isGuide &&
              !data.isTutorial
            ) {
              currentNotifications.push({ id: doc.id, ...data, type: "job" });
            }
          });

          snapContratos.forEach((doc) => {
            const data = doc.data();
            if (!data.clientSignature) {
              currentNotifications.push({
                id: doc.id,
                ...data,
                type: "contract",
              });
            }
          });

          // Ordenar por fecha descendente
          currentNotifications.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
          });
        }

        // Filtrar según selección
        const filtered =
          filter === "all"
            ? currentNotifications
            : currentNotifications.filter((n) => n.type === filter);

        const displayRecent = filtered.slice(0, 5);

        if (displayRecent.length === 0 && filter === "all") {
          notificationsSection.style.display = "none";
          return;
        }

        notificationsSection.style.display = "block";
        notificationBadge.textContent = filtered.length;

        let html = "";
        displayRecent.forEach((item) => {
          const isJob = item.type === "job";
          const icon = isJob ? "fa-screwdriver-wrench" : "fa-file-contract";
          const iconBg = isJob
            ? "rgba(212, 175, 55, 0.1)"
            : "rgba(28, 182, 152, 0.1)";
          const iconColor = isJob ? "#d4af37" : "#1cb698";

          const title = isJob
            ? item.clientName || "Nuevo Trabajo"
            : item.clientName || "Nuevo Contrato";
          const subtitle = isJob
            ? `<div class="d-flex flex-column">
                <span><i class="fa-solid fa-user me-1"></i> ${
                  item.contactName || "Sin contacto"
                }</span>
               </div>`
            : `Cliente: ${item.clientName || "Sin nombre"}`;

          let dateStr = "Reciente";
          if (item.createdAt) {
            const date = item.createdAt.toDate();
            dateStr = date.toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
            });
          }

          html += `
            <div class="notification-item" onclick="document.querySelector('.sidebar-link[data-view=\\'${
              isJob ? "jobs" : "contracts"
            }\\']').click()">
              <div class="notification-item-icon" style="background: ${iconBg}; color: ${iconColor}">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div class="notification-item-content">
                <div class="notification-item-title">${title}</div>
                <div class="notification-item-subtitle text-truncate" style="max-width: 250px;">${subtitle}</div>
              </div>
              <div class="notification-item-date">${dateStr}</div>
            </div>
          `;
        });

        if (html === "") {
          html =
            '<p class="text-center text-muted my-3">No hay notificaciones pendientes</p>';
        }

        notificationsList.innerHTML = html;

        // Configurar botón "Ver Todo"
        const viewAllBtn = document.getElementById("viewAllNotifications");
        if (viewAllBtn) {
          viewAllBtn.onclick = () => {
            const targetView = filter === "contract" ? "contracts" : "jobs";
            document
              .querySelector(`.sidebar-link[data-view="${targetView}"]`)
              .click();
          };
        }
      } catch (error) {
        console.error("Error al cargar notificaciones:", error);
        notificationsSection.style.display = "none";
      }
    }

    // Inicializar listeners de filtros de notificaciones
    document.querySelectorAll(".notif-filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".notif-filter-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        cargarNotificacionesDashboard(e.target.dataset.filter);
      });
    });

    function applyFilters() {
      const urgencyValue = urgencyFilter?.value || "todas";
      const nameValue = nameFilter?.value.toLowerCase() || "";
      const currentActiveLink = document.querySelector(".sidebar-link.active");
      const currentView = currentActiveLink?.getAttribute("data-view");

      if (currentView === "jobs") {
        const filteredTrabajos = window.allTrabajos.filter((job) => {
          const matchUrgency =
            urgencyValue === "todas" || job.jobUrgency === urgencyValue;
          const matchName =
            job.clientName.toLowerCase().includes(nameValue) ||
            job.contactName.toLowerCase().includes(nameValue);
          return matchUrgency && matchName;
        });
        renderTrabajosTecnicos(filteredTrabajos);
      }

      if (currentView === "contracts") {
        const filteredContratos = window.allContratos.filter((contract) => {
          const matchName = contract.clientName
            .toLowerCase()
            .includes(nameFilter?.value.toLowerCase() || "");
          return matchName;
        });
        renderContratosTecnicos(filteredContratos);
      }

      if (currentView === "guides") {
        const guideSearchInput = document.getElementById("guideSearchInput");
        const guideSearchValue = guideSearchInput?.value.toLowerCase() || "";
        const filteredGuides = window.allGuides.filter((guide) => {
          return guide.name.toLowerCase().includes(guideSearchValue);
        });
        renderGuiasTecnicas(filteredGuides);
      }

      if (currentView === "tutorials") {
        const tutorialSearchInput = document.getElementById(
          "tutorialSearchInput"
        );
        const tutorialSearchValue =
          tutorialSearchInput?.value.toLowerCase() || "";
        const filteredTutorials = window.allTutorials.filter((tutorial) => {
          return tutorial.title.toLowerCase().includes(tutorialSearchValue);
        });
        renderTutorialesTecnicos(filteredTutorials);
      }

      if (currentView === "passwords") {
        const passwordSearchInput = document.getElementById(
          "passwordSearchInput"
        );
        const passwordSearchValue =
          passwordSearchInput?.value.toLowerCase() || "";
        const filteredPasswords = window.allPasswords.filter((pass) => {
          return (
            pass.complexName.toLowerCase().includes(passwordSearchValue) ||
            pass.device.toLowerCase().includes(passwordSearchValue)
          );
        });
        renderClavesTecnicas(filteredPasswords);
      }
    }
  }

  async function cargarInfoUsuario() {
    console.log("Iniciando protección de ruta técnica...");

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.warn(
          "No hay sesión activa (Técnico), redirigiendo a control_center.html"
        );
        window.location.href = "control_center.html";
        return;
      }

      try {
        console.log("Sesión activa detectada (Técnico):", user.email);
        const doc = await db.collection("users").doc(user.uid).get();

        if (!doc.exists) {
          console.error("No se encontró documento de técnico.");
          throw new Error("Su cuenta no tiene perfil técnico configurado.");
        }

        const userData = doc.data();
        const role = userData.role ? userData.role.toLowerCase() : "";

        // PROTECCIÓN DE RUTA: Solo técnicos
        if (role !== "tecnico") {
          console.warn(
            "Acceso no autorizado a Gestión Técnica. Redirigiendo..."
          );
          await auth.signOut();
          Swal.fire({
            icon: "error",
            title: "Acceso Denegado",
            text: "Su cuenta no tiene permisos para acceder al portal técnico.",
            confirmButtonColor: "#d4af37",
          }).then(() => {
            window.location.href = "control_center.html";
          });
          return;
        }

        configurarUITecnico(user, userData);
      } catch (error) {
        console.error("Error cargando info técnico:", error);
        await auth.signOut();
        Swal.fire({
          icon: "error",
          title: "Error de Sesión",
          text: error.message || "Error al verificar permisos técnicos.",
          confirmButtonColor: "#d4af37",
        }).then(() => {
          window.location.href = "control_center.html";
        });
      }
    });
  }

  function configurarUITecnico(user, data) {
    window.actualUserData = data; // Guardamos los datos para validaciones posteriores
    const sidebarUserName = document.getElementById("sidebarUserName");
    const sidebarUserRole = document.getElementById("sidebarUserRole");
    const userNameEl = document.getElementById("userName");
    const userEmailEl = document.getElementById("userEmail");
    const userProfileCard = document.getElementById("userProfileCard");

    console.log("Configurando UI Técnica para:", data);

    if (sidebarUserName) {
      sidebarUserName.textContent =
        data.adminName ||
        data.nombre ||
        data.techName ||
        data.displayName ||
        "Técnico";
    }

    if (sidebarUserRole && data.complexName) {
      sidebarUserRole.textContent = data.complexName;
    }

    if (userNameEl)
      userNameEl.textContent =
        data.adminName || data.nombre || data.techName || "Técnico";
    if (userEmailEl) userEmailEl.textContent = data.email || user.email;
    if (userProfileCard) userProfileCard.style.display = "block";

    // Mostrar botón de subir guías solo si es tecnico-jefe
    const uploadBtn = document.querySelector(
      '[data-bs-target="#uploadGuideModal"]'
    );
    if (uploadBtn) {
      if (data.subRole === "tecnico-jefe") {
        uploadBtn.style.display = "block";
      } else {
        uploadBtn.style.display = "none";
      }
    }

    // Mostrar botón de subir tutoriales solo si es tecnico-jefe
    const uploadTutorialBtn = document.getElementById("uploadTutorialBtn");
    if (uploadTutorialBtn) {
      if (data.subRole === "tecnico-jefe") {
        uploadTutorialBtn.style.display = "block";
      } else {
        uploadTutorialBtn.style.display = "none";
      }
    }

    // Mostrar botón de agregar claves para jefe y obrero
    const addPasswordBtn = document.getElementById("addPasswordBtn");
    if (addPasswordBtn) {
      if (data.subRole === "tecnico-jefe" || data.subRole === "tecnico-obrero") {
        addPasswordBtn.style.display = "block";
      } else {
        addPasswordBtn.style.display = "none";
      }
    }

    // Forzar redibujado de secciones si ya están cargadas para aplicar roles
    if (window.passwordsLoaded) renderClavesTecnicas(window.allPasswords);
    if (window.guidesLoaded) renderGuiasTecnicas(window.allGuides);
    if (window.tutorialsLoaded) renderTutorialesTecnicos(window.allTutorials);
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const logoutBtnMobile = document.getElementById("logoutBtnMobile"); // Botón mobile del sidebar

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '<span style="color: #fff;">¿Cerrar Sesión?</span>',
      text: "¿Estás seguro de que deseas salir del sistema?",
      icon: "question",
      iconColor: "#a1c1d1", // Light blue question mark as in the image
      showCancelButton: true,
      confirmButtonColor: "#d4af37", // Gold color for "Sí, salir"
      cancelButtonColor: "#000", // Black color for "No, quedarme"
      confirmButtonText: "Sí, salir",
      cancelButtonText: "No, quedarme",
      background: "#1a1a1a", // Dark background for the alert
      color: "#fff", // White text color
      customClass: {
        popup: "gold-swal-popup",
        confirmButton: "gold-swal-confirm",
        cancelButton: "gold-swal-cancel",
      },
    });

    if (result.isConfirmed) {
      auth
        .signOut()
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "Sesión cerrada",
            text: "Has salido del sistema",
            timer: 1500,
            showConfirmButton: false,
            allowOutsideClick: false,
          }).then(() => {
            window.location.href = "control_center.html";
          });
        })
        .catch((error) => {
          console.error("Error al cerrar sesión:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cerrar sesión",
          });
        });
    }
  };

  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (logoutBtnMobile) logoutBtnMobile.addEventListener("click", handleLogout);

  // Listener para el filtro de contenido
  const contentFilter = document.getElementById("contentFilter");
  if (contentFilter) {
    contentFilter.addEventListener("change", (e) => {
      filtrarContenido(e.target.value);
    });
  }

  // Función para filtrar contenido
  function filtrarContenido(filtro) {
    const jobsContainer = document.getElementById("jobsContainer");
    const contractsContainer = document.getElementById("contractsContainer");
    // Note: I added IDs to headers in the HTML step
    const jobsHeader = document.getElementById("jobsHeader");
    const contractsHeader = document.getElementById("contractsHeader");

    if (filtro === "jobs") {
      if (jobsContainer) jobsContainer.style.display = "flex";
      if (jobsHeader) jobsHeader.style.display = "block";
      if (contractsContainer) contractsContainer.style.display = "none";
      if (contractsHeader) contractsHeader.style.display = "none";
    } else if (filtro === "contracts") {
      if (jobsContainer) jobsContainer.style.display = "none";
      if (jobsHeader) jobsHeader.style.display = "none";
      if (contractsContainer) contractsContainer.style.display = "flex";
      if (contractsHeader) contractsHeader.style.display = "block";
    } else {
      // Mostrar todo
      if (jobsContainer) jobsContainer.style.display = "flex";
      if (jobsHeader) jobsHeader.style.display = "block";
      if (contractsContainer) contractsContainer.style.display = "flex";
      if (contractsHeader) contractsHeader.style.display = "block";
    }
  }
});

// =======================================================
// 🛠️ CARGAR TRABAJOS PARA TÉCNICOS
// =======================================================
// =======================================================
// 🛠️ CARGAR TRABAJOS PARA TÉCNICOS
// =======================================================
async function cargarTrabajosTecnicos() {
  const container = document.getElementById("jobsContainer");
  if (!container) return;

  container.innerHTML = `<p style="color:white">Cargando trabajos...</p>`;
  window.trabajosLoaded = true; // Marcar como cargando/cargado

  try {
    const query = await db
      .collection("trabajos")
      .orderBy("createdAt", "desc")
      .get();

    window.allTrabajos = [];
    query.forEach((doc) => {
      const data = doc.data();
      if (!data.isGuide && !data.isTutorial) {
        window.allTrabajos.push({ id: doc.id, ...data });
      }
    });

    renderTrabajosTecnicos(window.allTrabajos);
  } catch (error) {
    console.error("Error al cargar trabajos: ", error);
    container.innerHTML = `<p style="color:red">Error al cargar los trabajos.</p>`;
    window.trabajosLoaded = false; // Revertir en caso de error para permitir reintento
  }
}

function renderTrabajosTecnicos(trabajosList) {
  const container = document.getElementById("jobsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (trabajosList.length === 0) {
    container.innerHTML = `<p style="color:white; text-align:center;">No hay trabajos para mostrar.</p>`;
    return;
  }

  trabajosList.forEach((data) => {
    const isCompleted = data.status === "Culminado";

    const watermark = isCompleted
      ? `<div class="watermark-seal">✔ Trabajo Realizado</div>`
      : "";

    const reportButton = !isCompleted
      ? `<button class="btn btn-primary mt-3"
            data-bs-toggle="modal"
            data-bs-target="#technicalReportModal"
            data-id="${data.id}">
            <i class="fa-solid fa-file-alt"></i> Informe Técnico
          </button>`
      : "";

    let badgeClass = "";
    switch (data.jobUrgency) {
      case "Urgente":
        badgeClass = "badge bg-warning text-dark";
        break;
      case "Crítico":
        badgeClass = "badge bg-danger";
        break;
      default:
        badgeClass = "badge bg-success";
    }

    container.innerHTML += `
        <div class="col-md-4">
          <div class="card-job">
            ${watermark}
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="card-title">${data.clientName}</h5>
                <span class="${badgeClass}">${data.jobUrgency}</span>
              </div>

              <p class="card-text"><i class="fa-solid fa-calendar-days"></i> <strong>Fecha:</strong> ${data.jobDate}</p>
              <p class="card-text"><i class="fa-solid fa-user"></i> <strong>Contacto:</strong> ${data.contactName}</p>
              <p class="card-text"><i class="fa-solid fa-phone"></i> <strong>Teléfono:</strong> ${data.contactPhone}</p>

              ${reportButton}

            </div>
          </div>
        </div>
      `;
  });
}

// =======================================================
// 🛠️ CARGAR DETALLES EN EL MODAL DE INFORME
// =======================================================
function configurarModalInforme() {
  const reportModal = document.getElementById("technicalReportModal");
  if (!reportModal) return;

  // Canvas de Firma del Reporte
  const canvas = document.getElementById("reportSignatureCanvas");
  let ctx = null;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  if (canvas) {
    ctx = canvas.getContext("2d");
    
    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 150;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    canvas.hasSignature = false;

    // Mouse events
    canvas.addEventListener("mousedown", (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      canvas.hasSignature = true;
      lastX = currentX;
      lastY = currentY;
    });

    canvas.addEventListener("mouseup", () => isDrawing = false);
    canvas.addEventListener("mouseout", () => isDrawing = false);

    // Touch events
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      lastX = touch.clientX - rect.left;
      lastY = touch.clientY - rect.top;
    });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const currentX = touch.clientX - rect.left;
      const currentY = touch.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      canvas.hasSignature = true;
      lastX = currentX;
      lastY = currentY;
    });

    canvas.addEventListener("touchend", () => isDrawing = false);

    const clearBtn = document.getElementById("clearReportSignatureBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.hasSignature = false;
      });
    }
  }

  reportModal.addEventListener("show.bs.modal", async (event) => {
    const button = event.relatedTarget;
    const jobId = button.getAttribute("data-id");
    document.getElementById("jobId").value = jobId;

    // Reset canvas on open
    if (canvas && ctx) {
      setTimeout(() => {
        resizeCanvas();
        canvas.hasSignature = false;
      }, 200);
    }

    const jobDetailsContainer = document.getElementById("jobDetails");
    jobDetailsContainer.innerHTML = "Cargando detalles...";

    try {
      const doc = await db.collection("trabajos").doc(jobId).get();
      if (doc.exists) {
        const data = doc.data();

        jobDetailsContainer.innerHTML = `
          <div class="job-details-header text-center">
            <h6 class="mb-3">Detalles del Trabajo</h6>
            <p><strong>Cliente:</strong> ${data.clientName}</p>
            <p><strong>Fecha:</strong> ${data.jobDate}</p>
            <p><strong>Descripción:</strong> ${data.jobDescription}</p>
          </div>
        `;
      } else {
        jobDetailsContainer.innerHTML =
          '<p class="text-danger text-center">No se encontraron detalles del trabajo.</p>';
      }
    } catch (error) {
      console.error("Error al cargar detalles: ", error);
      jobDetailsContainer.innerHTML =
        '<p class="text-danger">Error al cargar detalles.</p>';
    }
  });

  const saveReportBtn = document.getElementById("saveReportBtn");

  saveReportBtn.addEventListener("click", async () => {
    const jobId = document.getElementById("jobId").value;
    const reportText = document.getElementById("reportText").value;
    const jobStatus = document.getElementById("jobStatus").value;

    const photo1 = document.getElementById("evidencePhoto1").files[0];
    const photo2 = document.getElementById("evidencePhoto2").files[0];

    if (!reportText || !jobStatus) {
      Swal.fire("Error", "El informe y el estado son obligatorios.", "error");
      return;
    }

    if (!canvas.hasSignature) {
      Swal.fire("Error", "Por favor, capture la firma del cliente.", "error");
      return;
    }

    saveReportBtn.disabled = true;
    saveReportBtn.innerHTML = "Guardando...";

    try {
      const updateData = {
        report: reportText,
        status: jobStatus,
        reportDate: new Date(),
        clientSignature: canvas.toDataURL("image/png"),
      };

      // Convertir imágenes a Base64
      const convertToBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const evidenceImages = [];

      if (photo1) evidenceImages.push(await convertToBase64(photo1));
      if (photo2) evidenceImages.push(await convertToBase64(photo2));

      if (evidenceImages.length > 0) updateData.evidenceBase64 = evidenceImages;

      await db.collection("trabajos").doc(jobId).update(updateData);

      Swal.fire("¡Éxito!", "Informe guardado correctamente.", "success");

      const modal = bootstrap.Modal.getInstance(reportModal);
      modal.hide();

      document.getElementById("reportForm").reset();

      cargarTrabajosTecnicos(); // Recargar trabajos para mostrar el estado actualizado
    } catch (error) {
      console.error("Error al guardar informe:", error);
      Swal.fire("Error", "No se pudo guardar el informe.", "error");
    } finally {
      saveReportBtn.disabled = false;
      saveReportBtn.innerHTML = "Guardar Informe";
    }
  });
}

// =======================================================
// 📋 CARGAR CONTRATOS PARA TÉCNICOS
// =======================================================
// =======================================================
// 📋 CARGAR CONTRATOS PARA TÉCNICOS
// =======================================================
async function cargarContratosTecnicos() {
  const container = document.getElementById("contractsContainer");
  if (!container) return;

  container.innerHTML = `<p style="color:white">Cargando contratos...</p>`;
  window.contratosLoaded = true;

  try {
    const query = await db
      .collection("contracts")
      .orderBy("createdAt", "desc")
      .get();

    window.allContratos = [];
    query.forEach((doc) => {
      window.allContratos.push({ id: doc.id, ...doc.data() });
    });

    renderContratosTecnicos(window.allContratos);
  } catch (error) {
    console.error("Error al cargar contratos: ", error);
    container.innerHTML = `<p style="color:red">Error al cargar los contratos.</p>`;
    window.contratosLoaded = false;
  }
}

function renderContratosTecnicos(contratosList) {
  const container = document.getElementById("contractsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (contratosList.length === 0) {
    container.innerHTML = `<p style="color:white">No hay contratos disponibles.</p>`;
    return;
  }

  contratosList.forEach((data) => {
    const contractDate = new Date(data.date + "T00:00:00");
    const formattedDate = contractDate.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Verificar si el contrato ya está completado (tiene firma y cédula)
    const isCompleted = data.clientSignature && data.clientIdPhoto;

    const statusBadge = isCompleted
      ? '<span class="badge bg-success">Completado</span>'
      : '<span class="badge bg-warning text-dark">Pendiente</span>';

    container.innerHTML += `
        <div class="col-md-4">
          <div class="card-job">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="card-title">Contrato: ${data.clientName}</h5>
                ${statusBadge}
              </div>
              <p class="card-text"><i class="fa-solid fa-calendar-days"></i> <strong>Fecha:</strong> ${formattedDate}</p>
              <p class="card-text"><i class="fa-solid fa-user"></i> <strong>Cliente:</strong> ${
                data.clientName
              }</p>
              <p class="card-text"><i class="fa-solid fa-id-card"></i> <strong>Cédula:</strong> ${
                data.clientId
              }</p>
              <p class="card-text"><i class="fa-solid fa-dollar-sign"></i> <strong>Precio:</strong> $${
                data.servicePrice
              } + IVA</p>
              ${
                !isCompleted
                  ? `
                <button class="btn btn-primary mt-3" onclick="llenarContrato('${data.id}')">
                  <i class="fa-solid fa-pen"></i> Llenar Contrato
                </button>
              `
                  : `
                <button class="btn btn-success mt-3" onclick="verContratoCompleto('${data.id}')">
                  <i class="fa-solid fa-eye"></i> Ver Contrato Completo
                </button>
              `
              }
            </div>
          </div>
        </div>
      `;
  });
}

// =======================================================
// 📝 CONFIGURAR MODAL DE CONTRATO
// =======================================================
function configurarModalContrato() {
  const fillContractModal = document.getElementById("fillContractModal");
  if (!fillContractModal) return;

  // Inicializar canvas de firma
  const canvas = document.getElementById("signatureCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Función para ajustar tamaño del canvas
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 200;
    // Reconfigurar estilo después de cambiar tamaño
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  // Inicializar tamaño
  resizeCanvas();

  // Configurar estilo del canvas
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  // Usar una propiedad del canvas para almacenar el estado
  canvas.hasSignature = false;

  // Eventos del mouse
  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    canvas.hasSignature = true; // Se ha dibujado algo

    lastX = currentX;
    lastY = currentY;
  });

  canvas.addEventListener("mouseup", () => {
    isDrawing = false;
  });

  canvas.addEventListener("mouseout", () => {
    isDrawing = false;
  });

  // Eventos táctiles (para dispositivos móviles)
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    canvas.hasSignature = true; // Se ha dibujado algo

    lastX = currentX;
    lastY = currentY;
  });

  canvas.addEventListener("touchend", () => {
    isDrawing = false;
  });

  // Botón limpiar firma
  const clearSignatureBtn = document.getElementById("clearSignatureBtn");
  if (clearSignatureBtn) {
    clearSignatureBtn.addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.hasSignature = false; // Reiniciar la variable
      // Reconfigurar estilo después de limpiar
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    });
  }

  // Preview de foto de cédula
  const idPhotoInput = document.getElementById("clientIdPhoto");
  const idPhotoPreview = document.getElementById("idPhotoPreview");
  const idPhotoPreviewImg = document.getElementById("idPhotoPreviewImg");

  if (idPhotoInput && idPhotoPreview && idPhotoPreviewImg) {
    idPhotoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          idPhotoPreviewImg.src = event.target.result;
          idPhotoPreview.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Reinicializar canvas cuando se abre el modal
  fillContractModal.addEventListener("shown.bs.modal", () => {
    resizeCanvas();
  });

  // Guardar contrato completado
  const saveContractBtn = document.getElementById("saveContractBtn");
  if (saveContractBtn) {
    saveContractBtn.addEventListener("click", async () => {
      const contractId = document.getElementById("contractIdToFill").value;

      // Obtener foto de cédula
      const idPhotoFile = document.getElementById("clientIdPhoto").files[0];

      // Verificar si se ha dibujado algo en el canvas
      if (!canvas.hasSignature) {
        Swal.fire("Error", "Por favor, capture la firma del cliente.", "error");
        return;
      }

      // Obtener firma del canvas
      const signatureData = canvas.toDataURL("image/png");

      if (!idPhotoFile) {
        Swal.fire(
          "Error",
          "Por favor, suba la foto de la cédula del cliente.",
          "error"
        );
        return;
      }

      saveContractBtn.disabled = true;
      saveContractBtn.innerHTML = "Guardando...";

      try {
        // Convertir foto de cédula a Base64
        const convertToBase64 = (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

        const idPhotoBase64 = await convertToBase64(idPhotoFile);

        // Actualizar contrato en Firestore
        await db.collection("contracts").doc(contractId).update({
          clientSignature: signatureData,
          clientIdPhoto: idPhotoBase64,
          completedAt: new Date(),
          completedBy: auth.currentUser.email,
        });

        Swal.fire("¡Éxito!", "Contrato completado correctamente.", "success");

        const modal = bootstrap.Modal.getInstance(fillContractModal);
        modal.hide();

        // Limpiar formulario
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.hasSignature = false; // Reiniciar variable
        // Reconfigurar estilo después de limpiar
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        document.getElementById("clientIdPhoto").value = "";
        if (idPhotoPreview) {
          idPhotoPreview.style.display = "none";
        }
        document.getElementById("contractIdToFill").value = "";

        cargarContratosTecnicos(); // Recargar contratos
      } catch (error) {
        console.error("Error al guardar contrato:", error);
        Swal.fire("Error", "No se pudo guardar el contrato.", "error");
      } finally {
        saveContractBtn.disabled = false;
        saveContractBtn.innerHTML = "Guardar Contrato Completado";
      }
    });
  }
}

// =======================================================
// 📄 LLENAR CONTRATO (Abrir modal)
// =======================================================
async function llenarContrato(contractId) {
  try {
    const doc = await db.collection("contracts").doc(contractId).get();
    if (!doc.exists) {
      Swal.fire("Error", "No se encontró el contrato", "error");
      return;
    }

    const data = doc.data();

    // Guardar ID del contrato
    document.getElementById("contractIdToFill").value = contractId;

    // Generar y mostrar el contrato
    mostrarContratoParaLlenar(data);

    // Limpiar canvas y preview
    const canvas = document.getElementById("signatureCanvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Reconfigurar estilo
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Resetear variable hasSignature cuando se abre el modal para llenar
      canvas.hasSignature = false;
    }
    document.getElementById("clientIdPhoto").value = "";
    const preview = document.getElementById("idPhotoPreview");
    if (preview) {
      preview.style.display = "none";
    }

    // Mostrar sección de llenar contrato
    const fillSection = document.getElementById("fillContractSection");
    if (fillSection) {
      fillSection.style.display = "block";
    }

    // Mostrar botón de guardar
    const saveBtn = document.getElementById("saveContractBtn");
    if (saveBtn) {
      saveBtn.style.display = "block";
    }

    // Mostrar el hr
    const hrElement = document.getElementById("fillContractDivider");
    if (hrElement) {
      hrElement.style.display = "block";
    }

    // Abrir modal
    const modal = new bootstrap.Modal(
      document.getElementById("fillContractModal")
    );
    modal.show();
  } catch (error) {
    console.error("Error al cargar contrato: ", error);
    Swal.fire("Error", "No se pudo cargar el contrato.", "error");
  }
}

// =======================================================
// 📄 MOSTRAR CONTRATO PARA LLENAR
// =======================================================
function mostrarContratoParaLlenar(data) {
  const contractContentArea = document.getElementById("contractContentToFill");
  const contractDate = new Date(data.date + "T00:00:00");

  const day = contractDate.getDate();
  const month = contractDate.toLocaleString("es-ES", { month: "long" });
  const year = contractDate.getFullYear();

  const content = `
    <div style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.8; color: #2c3e50; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
      <h4 style="font-size: 24px; font-weight: 700; color: #1a1a1a; text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #d4af37; letter-spacing: 1px;">CONTRATO DE PRESTACIÓN DEL SERVICIO DE GUARDIA VIRTUAL</h4>
      
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">En la ciudad de <strong style="color: #1a1a1a; font-weight: 600;">${data.city}</strong>, a los ${day} días del mes de ${month} del año ${year}, se celebra el presente Contrato de Prestación del Servicio de Guardia Virtual, al tenor de las siguientes cláusulas:</p>
      
      <h5 style="font-size: 18px; font-weight: 700; color: #d4af37; margin-top: 30px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e8e8e8; letter-spacing: 0.5px;">COMPARECIENTES</h5>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">Comparecen a la celebración del presente contrato, por una parte:</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;"><strong style="color: #1a1a1a; font-weight: 600;">247 DEL ECUADOR</strong>, empresa dedicada a la prestación de servicios de seguridad electrónica y vigilancia virtual, legalmente constituida conforme a las leyes de la República del Ecuador, a quien en adelante se la denominará "LA EMPRESA".</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">Y por otra parte:</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;"><strong style="color: #1a1a1a; font-weight: 600;">Nombre completo del contratante:</strong> ${data.clientName}<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Cédula de identidad:</strong> ${data.clientId}<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Dirección domiciliaria:</strong> ${data.clientAddress}<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Teléfono:</strong> ${data.clientPhone}<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Correo electrónico:</strong> ${data.clientEmail}</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">A quien en adelante se lo denominará "EL CONTRATANTE".</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">Las partes declaran tener capacidad legal para contratar y obligarse, y de mutuo acuerdo celebran el presente contrato bajo las siguientes cláusulas:</p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA PRIMERA: OBJETO DEL CONTRATO</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">LA EMPRESA se obliga a prestar a EL CONTRATANTE el Servicio de Guardia Virtual, el cual consiste en la monitoreo remoto, vigilancia electrónica y supervisión virtual de los sistemas de seguridad instalados, tales como cámaras de videovigilancia, alarmas u otros dispositivos tecnológicos, según el plan contratado.</p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA QUINTA: VALOR DEL CONTRATO Y FORMA DE PAGO</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">El valor del servicio será de <strong style="color: #1a1a1a; font-weight: 600;">$${data.servicePrice} USD más IVA</strong>, acordado entre las partes según el plan contratado, el cual constará en un anexo o factura correspondiente.<br>
      La forma de pago será: <strong style="color: #1a1a1a; font-weight: 600;">${data.paymentMethod}</strong><br>
      La periodicidad del pago será: <strong style="color: #1a1a1a; font-weight: 600;">${data.paymentPeriod}</strong></p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA SEXTA: PLAZO DE DURACIÓN</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">El presente contrato tendrá una duración de <strong style="color: #1a1a1a; font-weight: 600;">${data.duration} meses</strong>, contados a partir de la fecha de su firma, pudiendo renovarse previo acuerdo entre las partes.</p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA NOVENA: TERMINACIÓN DEL CONTRATO</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">El presente contrato podrá darse por terminado:<br>
      a) Por mutuo acuerdo entre las partes.<br>
      b) Por incumplimiento de cualquiera de las cláusulas.<br>
      c) Por decisión unilateral, con aviso previo de <strong style="color: #1a1a1a; font-weight: 600;">${data.terminationNotice} días</strong>.</p>

      <div style="margin-top: 50px; padding-top: 30px; border-top: 2px solid #e8e8e8; display: flex; justify-content: space-around; flex-wrap: wrap; gap: 40px;">
        <div style="flex: 1; min-width: 250px; padding: 25px; background: #f8f9fa; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);">
          <p style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #d4af37;">POR LA EMPRESA</p>
          <p style="font-size: 14px; margin-bottom: 10px; color: #555555;">247 DEL ECUADOR</p>
          <p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Firma:</p>
          <img src="assets/img/firma.png" alt="Firma de la empresa" style="max-width: 200px; border: 2px solid #d4af37; background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); display: block; margin: 15px 0;">
          <p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Nombre: ${data.companyName}</p>
          <p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Cargo: ${data.companyPosition}</p>
        </div>
        <div style="flex: 1; min-width: 250px; padding: 25px; background: #f8f9fa; border-radius: 10px; border: 1px solid #e0e0e0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);">
          <p style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #d4af37;">EL CONTRATANTE</p>
          <p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Firma: ________________________________</p>
          <p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Nombre completo: ${data.clientName}</p>
          <p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Cédula: ${data.clientId}</p>
          <p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Fecha: ${day} de ${month} de ${year}</p>
        </div>
      </div>
    </div>
  `;

  contractContentArea.innerHTML = content;
}

// =======================================================
// 👁️ VER CONTRATO COMPLETO
// =======================================================
async function verContratoCompleto(contractId) {
  try {
    const doc = await db.collection("contracts").doc(contractId).get();
    if (!doc.exists) {
      Swal.fire("Error", "No se encontró el contrato", "error");
      return;
    }

    const data = doc.data();

    // Guardar ID del contrato (aunque no lo usaremos para editar)
    document.getElementById("contractIdToFill").value = contractId;

    // Generar y mostrar el contrato con firma y cédula
    mostrarContratoCompleto(data);

    // Ocultar sección de llenar contrato
    const fillSection = document.getElementById("fillContractSection");
    if (fillSection) {
      fillSection.style.display = "none";
    }

    // Ocultar botón de guardar y mostrar solo cerrar
    const saveBtn = document.getElementById("saveContractBtn");
    if (saveBtn) {
      saveBtn.style.display = "none";
    }

    // Ocultar el hr también
    const hrElement = document.getElementById("fillContractDivider");
    if (hrElement) {
      hrElement.style.display = "none";
    }

    // Abrir modal
    const modal = new bootstrap.Modal(
      document.getElementById("fillContractModal")
    );
    modal.show();
  } catch (error) {
    console.error("Error al cargar contrato: ", error);
    Swal.fire("Error", "No se pudo cargar el contrato.", "error");
  }
}

// =======================================================
// 📄 MOSTRAR CONTRATO COMPLETO (con firma y cédula)
// =======================================================
function mostrarContratoCompleto(data) {
  const contractContentArea = document.getElementById("contractContentToFill");
  const contractDate = new Date(data.date + "T00:00:00");

  const day = contractDate.getDate();
  const month = contractDate.toLocaleString("es-ES", { month: "long" });
  const year = contractDate.getFullYear();

  // Mostrar firma si existe
  const firmaHTML = data.clientSignature
    ? `<p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Firma:</p><div style="margin: 15px 0;"><img src="${data.clientSignature}" alt="Firma del cliente" style="max-width: 200px; border: 2px solid #d4af37; background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); display: block;"></div>`
    : '<p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Firma no disponible</p>';

  // Mostrar cédula si existe
  const cedulaHTML = data.clientIdPhoto
    ? `<p style="font-size: 14px; margin-bottom: 10px; color: #555555; margin-top: 20px;">Cédula de Identidad:</p><div style="margin: 15px 0; text-align: center;"><img src="${data.clientIdPhoto}" alt="Cédula del cliente" style="max-width: 100%; max-height: 200px; border: 2px solid #d4af37; background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); display: inline-block;"></div>`
    : '<p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Cédula no disponible</p>';

  const content = `
    <div style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.8; color: #2c3e50; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
      <h4 style="font-size: 24px; font-weight: 700; color: #1a1a1a; text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #d4af37; letter-spacing: 1px;">CONTRATO DE PRESTACIÓN DEL SERVICIO DE GUARDIA VIRTUAL</h4>
      
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">En la ciudad de <strong style="color: #1a1a1a; font-weight: 600;">${
        data.city
      }</strong>, a los ${day} días del mes de ${month} del año ${year}, se celebra el presente Contrato de Prestación del Servicio de Guardia Virtual, al tenor de las siguientes cláusulas:</p>
      
      <h5 style="font-size: 18px; font-weight: 700; color: #d4af37; margin-top: 30px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e8e8e8; letter-spacing: 0.5px;">COMPARECIENTES</h5>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">Comparecen a la celebración del presente contrato, por una parte:</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;"><strong style="color: #1a1a1a; font-weight: 600;">247 DEL ECUADOR</strong>, empresa dedicada a la prestación de servicios de seguridad electrónica y vigilancia virtual, legalmente constituida conforme a las leyes de la República del Ecuador, a quien en adelante se la denominará "LA EMPRESA".</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">Y por otra parte:</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;"><strong style="color: #1a1a1a; font-weight: 600;">Nombre completo del contratante:</strong> ${
        data.clientName
      }<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Cédula de identidad:</strong> ${
        data.clientId
      }<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Dirección domiciliaria:</strong> ${
        data.clientAddress
      }<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Teléfono:</strong> ${
        data.clientPhone
      }<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Correo electrónico:</strong> ${
        data.clientEmail
      }</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">A quien en adelante se lo denominará "EL CONTRATANTE".</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">Las partes declaran tener capacidad legal para contratar y obligarse, y de mutuo acuerdo celebran el presente contrato bajo las siguientes cláusulas:</p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA PRIMERA: OBJETO DEL CONTRATO</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">LA EMPRESA se obliga a prestar a EL CONTRATANTE el Servicio de Guardia Virtual, el cual consiste en la monitoreo remoto, vigilancia electrónica y supervisión virtual de los sistemas de seguridad instalados, tales como cámaras de videovigilancia, alarmas u otros dispositivos tecnológicos, según el plan contratado.</p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA QUINTA: VALOR DEL CONTRATO Y FORMA DE PAGO</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">El valor del servicio será de <strong style="color: #1a1a1a; font-weight: 600;">$${
        data.servicePrice
      } USD más IVA</strong>, acordado entre las partes según el plan contratado, el cual constará en un anexo o factura correspondiente.<br>
      La forma de pago será: <strong style="color: #1a1a1a; font-weight: 600;">${
        data.paymentMethod
      }</strong><br>
      La periodicidad del pago será: <strong style="color: #1a1a1a; font-weight: 600;">${
        data.paymentPeriod
      }</strong></p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA SEXTA: PLAZO DE DURACIÓN</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">El presente contrato tendrá una duración de <strong style="color: #1a1a1a; font-weight: 600;">${
        data.duration
      } meses</strong>, contados a partir de la fecha de su firma, pudiendo renovarse previo acuerdo entre las partes.</p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA NOVENA: TERMINACIÓN DEL CONTRATO</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">El presente contrato podrá darse por terminado:<br>
      a) Por mutuo acuerdo entre las partes.<br>
      b) Por incumplimiento de cualquiera de las cláusulas.<br>
      c) Por decisión unilateral, con aviso previo de <strong style="color: #1a1a1a; font-weight: 600;">${
        data.terminationNotice
      } días</strong>.</p>

      <div style="margin-top:50px;padding-top:30px;border-top:2px solid #e8e8e8;
display:flex;justify-content:space-between;flex-wrap:wrap;gap:60px;">

  <!-- POR LA EMPRESA -->
  <div style="flex:1;min-width:260px;">
    <p style="font-size:16px;font-weight:700;color:#1a1a1a;
    border-bottom:2px solid #d4af37;padding-bottom:8px;">
      POR LA EMPRESA
    </p>

    <p style="font-size:14px;color:#555;">247 DEL ECUADOR</p>

    <img src="assets/img/firma.png"
      alt="Firma de la empresa"
      style="max-width:200px;margin:15px 0;
      border:2px solid #d4af37;padding:10px;border-radius:8px;">

    <p style="font-size:14px;color:#555;">Nombre: ${data.companyName}</p>
    <p style="font-size:14px;color:#555;">Cargo: ${data.companyPosition}</p>
  </div>

  <!-- EL CONTRATANTE -->
  <div style="flex:1;min-width:260px;">
    <p style="font-size:16px;font-weight:700;color:#1a1a1a;
    border-bottom:2px solid #d4af37;padding-bottom:8px;">
      EL CONTRATANTE
    </p>

    ${firmaHTML}

    <p style="font-size:14px;color:#555;">Nombre completo: ${
      data.clientName
    }</p>
    <p style="font-size:14px;color:#555;">Cédula: ${data.clientId}</p>
    <p style="font-size:14px;color:#555;">Fecha: ${contractDate.toLocaleDateString(
      "es-EC"
    )}</p>
  </div>

</div>

${
  data.clientIdPhoto
    ? `
  <div style="
    margin-top:60px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    text-align:center;
  ">
    <p style="
      font-size:16px;
      font-weight:700;
      color:#1a1a1a;
      margin-bottom:20px;
    ">
      Cédula de Identidad del Contratante
    </p>
  
    <img src="${data.clientIdPhoto}"
      alt="Cédula del cliente"
      style="
        max-width:420px;
        width:100%;
        border:2px solid #d4af37;
        background:#fff;
        padding:12px;
        border-radius:10px;
        box-shadow:0 4px 12px rgba(0,0,0,0.25);
      ">
  </div>
  `
    : ""
}
  
    </div>
  `;

  contractContentArea.innerHTML = content;
}

// =======================================================
// 📚 GESTIÓN DE GUÍAS TÉCNICAS
// =======================================================
function configurarModalGuia() {
  const saveGuideBtn = document.getElementById("saveGuideBtn");
  if (!saveGuideBtn) return;

  saveGuideBtn.addEventListener("click", async () => {
    const name = document.getElementById("guideName").value;
    const file = document.getElementById("guideFile").files[0];

    if (!name || !file) {
      Swal.fire(
        "Atención",
        "Por favor complete el nombre y seleccione un archivo PDF.",
        "warning"
      );
      return;
    }

    if (file.type !== "application/pdf") {
      Swal.fire(
        "Archivo no válido",
        "Por favor suba únicamente archivos en formato PDF.",
        "error"
      );
      return;
    }

    // Convert PDF to Base64 to avoid CORS/Storage issues
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64PDF = reader.result;

      // Firestore document limit is 1MB. Base64 is ~33% larger.
      if (base64PDF.length > 1000000) {
        Swal.fire(
          "Archivo demasiado grande",
          "Para este sistema simplificado, el PDF debe ser menor a 700KB.",
          "error"
        );
        return;
      }

      try {
        saveGuideBtn.disabled = true;
        const progressContainer = document.getElementById(
          "uploadProgressContainer"
        );
        const progressBar = document.getElementById("uploadProgressBar");
        progressContainer.style.display = "block";
        progressBar.style.width = "50%";
        progressBar.textContent = "Procesando...";

        const subRole = window.actualUserData?.subRole || "";
        const role = window.actualUserData?.role || "";

        console.log(
          "Intentando guardar guía como Doc en 'trabajos' con Rol:",
          role,
          "subRole:",
          subRole
        );

        // Guardamos en la colección dedicada 'technical_guides'
        await db.collection("technical_guides").add({
          name: name,
          pdfData: base64PDF,
          // isGuide ya no es necesario, pero se puede dejar por compatibilidad si se quisiera
          category: "technical_guide",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          fileName: file.name,
          uploadedBy: role,
          subRole: subRole,
        });

        progressBar.style.width = "100%";
        progressBar.textContent = "¡Listo!";

        Swal.fire({
          icon: "success",
          title: "¡Guía Guardada!",
          text: "La guía técnica se ha guardado correctamente en la base de datos.",
          confirmButtonColor: "#d4af37",
        }).then(() => {
          document.getElementById("guideUploadForm").reset();
          progressContainer.style.display = "none";
          progressBar.style.width = "0%";
          const modalEl = document.getElementById("uploadGuideModal");
          if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
          cargarGuiasTecnicas(); // Recargar lista
        });
        saveGuideBtn.disabled = false;
      } catch (error) {
        console.error("Error al guardar guía en Firestore:", error);
        let errorMsg = "Hubo un problema al guardar la guía.";
        if (error.code === "permission-denied") {
          errorMsg =
            "Permisos insuficientes. Contacte al administrador para habilitar la colección.";
        }
        Swal.fire("Error", errorMsg, "error");
        saveGuideBtn.disabled = false;
        document.getElementById("uploadProgressContainer").style.display =
          "none";
      }
    };

    reader.onerror = () => {
      Swal.fire("Error", "No se pudo leer el archivo seleccionado.", "error");
    };
  });
}

async function cargarGuiasTecnicas() {
  const container = document.getElementById("guidesContainer");
  if (!container) return;

  container.innerHTML = `<p class="text-center text-white w-100">Cargando guías...</p>`;

  try {
    // Buscamos en 'technical_guides'
    const query = await db
      .collection("technical_guides")
      .orderBy("createdAt", "desc")
      .get();

    window.allGuides = [];
    query.forEach((doc) => {
      window.allGuides.push({ id: doc.id, ...doc.data() });
    });

    // Si no hay índice para el where, el catch lo manejará y se puede intentar un filter manual
    window.guidesLoaded = true;
    renderGuiasTecnicas(window.allGuides);
  } catch (error) {
    console.error("Error al cargar guías:", error);
    container.innerHTML = `<p class="text-center text-danger w-100">Error al cargar las guías. (Acceso restringido o Error de Red)</p>`;
  }
}

function renderGuiasTecnicas(guidesList) {
  const container = document.getElementById("guidesContainer");
  if (!container) return;

  container.innerHTML = "";

  if (guidesList.length === 0) {
    container.innerHTML = `<p class="text-center text-white-50 w-100 mt-4">No se encontraron guías técnicas.</p>`;
    return;
  }

  const subRole = window.actualUserData?.subRole || "";

  guidesList.forEach((guide) => {
    container.innerHTML += `
      <div class="col-md-6 col-lg-3">
        <div class="card-job card-guide position-relative h-100" style="overflow: hidden; border-radius: 15px;">
          <div class="position-relative" onclick="verGuiaPDF('${
            guide.id
          }')" style="cursor: pointer; height: 200px;">
            <img src="assets/img/portada.jfif" alt="Portada" class="w-100 h-100" style="object-fit: cover;">
            <!-- Overlay opcional para texto al hover o siempre visible si se desea -->
          </div>
          <div class="card-body text-center py-3">
            <h5 class="card-title text-gold mb-2">${guide.name}</h5>
            <p class="text-white-50 small mb-0">Ver Documento</p>
          </div>
          ${
            subRole === "tecnico-jefe"
              ? `
          <button class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-2" 
                  onclick="eliminarGuia('${guide.id}', '${guide.name}')" 
                  title="Eliminar Guía"
                  style="z-index: 10; background: rgba(0,0,0,0.5);">
            <i class="fa-solid fa-trash"></i>
          </button>
          `
              : ""
          }
        </div>
      </div>
    `;
  });
}

async function eliminarGuia(id, name) {
  const result = await Swal.fire({
    title: "¿Eliminar guía?",
    text: `¿Estás seguro de que deseas eliminar la guía "${name}"? Esta acción no se puede deshacer.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  });

  if (result.isConfirmed) {
    try {
      await db.collection("technical_guides").doc(id).delete();
      Swal.fire(
        "Eliminado",
        "La guía ha sido eliminada correctamente.",
        "success"
      );
      cargarGuiasTecnicas(); // Recargar la lista
    } catch (error) {
      console.error("Error al eliminar guía:", error);
      Swal.fire(
        "Error",
        "No se pudo eliminar la guía. Verifique sus permisos.",
        "error"
      );
    }
  }
}

function verGuiaPDF(id) {
  const guide = window.allGuides.find((g) => g.id === id);
  if (!guide) return;

  const pdfContent = guide.pdfData || guide.url;
  if (!pdfContent) {
    Swal.fire("Error", "No se encontró el contenido del PDF.", "error");
    return;
  }

  if (pdfContent.startsWith("http")) {
    window.open(pdfContent, "_blank");
  } else {
    // Para Base64
    const newTab = window.open();
    newTab.document.write(`
            <title>${guide.name}</title>
            <body style="margin:0">
                <embed src="${pdfContent}" width="100%" height="100%" type="application/pdf">
            </body>
        `);
  }
}

// =======================================================
// 🎥 GESTIÓN DE TUTORIALES (VIDEOS Y PDF)
// =======================================================
function configurarModalTutorial() {
  const tutorialType = document.getElementById("tutorialType");
  const videoUrlGroup = document.getElementById("videoUrlGroup");
  const pdfFileGroup = document.getElementById("pdfFileGroup");
  const saveTutorialBtn = document.getElementById("saveTutorialBtn");

  if (tutorialType) {
    tutorialType.addEventListener("change", () => {
      const type = tutorialType.value;
      if (type === "video") {
        videoUrlGroup.style.display = "block";
        pdfFileGroup.style.display = "none";
      } else if (type === "pdf") {
        videoUrlGroup.style.display = "none";
        pdfFileGroup.style.display = "block";
      }
    });
  }

  if (!saveTutorialBtn) return;

  saveTutorialBtn.addEventListener("click", async () => {
    const type = document.getElementById("tutorialType").value;
    const title = document.getElementById("tutorialTitle").value;
    const category = document.getElementById("tutorialCategory").value;

    if (!type || !title || !category) {
      Swal.fire(
        "Atención",
        "Por favor complete todos los campos obligatorios.",
        "warning"
      );
      return;
    }

    let saveStatus = false;
    saveTutorialBtn.disabled = true;
    saveTutorialBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

    try {
      const role = window.actualUserData?.role || "";
      const subRole = window.actualUserData?.subRole || "";
      const tutorialData = {
        title: title.toUpperCase(),
        category: category,
        tutorialType: type,
        isTutorial: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        uploadedBy: role,
        subRole: subRole,
      };

      if (type === "video") {
        const url = document.getElementById("tutorialVideoUrl").value;
        const videoId = extractYouTubeId(url);
        if (!videoId) {
          Swal.fire(
            "URL no válida",
            "Por favor ingrese una URL de YouTube válida.",
            "error"
          );
          saveTutorialBtn.disabled = false;
          saveTutorialBtn.innerHTML = "Guardar Tutorial";
          return;
        }
        tutorialData.url = url;
        tutorialData.videoId = videoId;
      } else if (type === "pdf") {
        const file = document.getElementById("tutorialPdfFile").files[0];
        if (!file) {
          Swal.fire(
            "Atención",
            "Por favor seleccione un archivo PDF.",
            "warning"
          );
          saveTutorialBtn.disabled = false;
          saveTutorialBtn.innerHTML = "Guardar Tutorial";
          return;
        }

        const progressBar = document.querySelector(
          "#tutorialPdfProgress .progress-bar"
        );
        const progressContainer = document.getElementById(
          "tutorialPdfProgress"
        );
        progressContainer.style.display = "block";
        progressBar.style.width = "50%";

        const base64PDF = await convertFileToBase64(file);
        if (base64PDF.length > 1000000) {
          Swal.fire(
            "Archivo demasiado grande",
            "El PDF debe ser menor a 700KB para este sistema.",
            "error"
          );
          saveTutorialBtn.disabled = false;
          saveTutorialBtn.innerHTML = "Guardar Tutorial";
          progressContainer.style.display = "none";
          return;
        }
        tutorialData.pdfData = base64PDF;
        tutorialData.fileName = file.name;
        progressBar.style.width = "100%";
      }

      await db.collection("tutorials").add(tutorialData);
      saveStatus = true;
    } catch (error) {
      console.error("Error al guardar tutorial:", error);
      Swal.fire("Error", "Hubo un problema al guardar el tutorial.", "error");
    } finally {
      saveTutorialBtn.disabled = false;
      saveTutorialBtn.innerHTML = "Guardar Tutorial";
      if (saveStatus) {
        Swal.fire({
          icon: "success",
          title: "¡Tutorial Guardado!",
          text: "El tutorial se ha guardado correctamente.",
          confirmButtonColor: "#d4af37",
        }).then(() => {
          document.getElementById("tutorialUploadForm").reset();
          document.getElementById("videoUrlGroup").style.display = "none";
          document.getElementById("pdfFileGroup").style.display = "none";
          document.getElementById("tutorialPdfProgress").style.display = "none";
          const modalEl = document.getElementById("uploadTutorialModal");
          if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
          cargarTutorialesTecnicos();
        });
      }
    }
  });
}

async function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function extractYouTubeId(url) {
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

async function cargarTutorialesTecnicos() {
  const container = document.getElementById("tutorialsContainer");
  if (!container) return;

  container.innerHTML = `<p class="text-center text-white w-100">Cargando tutoriales...</p>`;

  try {
    const query = await db
      .collection("tutorials")
      .orderBy("createdAt", "desc")
      .get();

    window.allTutorials = [];
    query.forEach((doc) => {
      window.allTutorials.push({ id: doc.id, ...doc.data() });
    });

    window.allTutorials.sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });

    window.tutorialsLoaded = true;
    renderTutorialesTecnicos(window.allTutorials);
  } catch (error) {
    console.error("Error al cargar tutoriales:", error);
    container.innerHTML = `<p class="text-center text-danger w-100">Error al cargar los tutoriales.</p>`;
  }
}

function renderTutorialesTecnicos(tutorialsList) {
  const container = document.getElementById("tutorialsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (tutorialsList.length === 0) {
    container.innerHTML = `<p class="text-center text-white-50 w-100 mt-4">No se encontraron tutoriales.</p>`;
    return;
  }

  const subRole = window.actualUserData?.subRole || "";

  tutorialsList.forEach((tutorial) => {
    let contentHtml = "";
    if (tutorial.tutorialType === "video") {
      contentHtml = `
        <div class="position-relative mb-3" style="height: 200px; overflow: hidden; border-radius: 8px; cursor: pointer;" onclick="window.open('${
          tutorial.url || "https://www.youtube.com/watch?v=" + tutorial.videoId
        }', '_blank')">
          <img src="assets/img/portada.jfif" alt="Ver Video" class="w-100 h-100" style="object-fit: cover;">
          <div class="position-absolute top-0 end-0" style="width: 70px; height: 70px; background-color: #dc3545; clip-path: polygon(0 0, 100% 0, 100% 100%); display: flex; justify-content: flex-end; align-items: flex-start; padding: 8px;">
             <i class="fa-brands fa-youtube fa-2x text-white"></i>
          </div>
        </div>
      `;
    } else {
      contentHtml = `
        <div class="position-relative mb-3" style="height: 200px; overflow: hidden; border-radius: 8px; cursor: pointer;" onclick="verGuiaPDF('${tutorial.id}', true)">
          <img src="assets/img/portada.jfif" alt="Ver Documento" class="w-100 h-100" style="object-fit: cover;">
          <div class="position-absolute top-0 end-0" style="width: 70px; height: 70px; background-color: #dc3545; clip-path: polygon(0 0, 100% 0, 100% 100%); display: flex; justify-content: flex-end; align-items: flex-start; padding: 8px;">
             <i class="fa-solid fa-file-pdf fa-2x text-white"></i>
          </div>
        </div>
      `;
    }

    container.innerHTML += `
      <div class="col-md-6 col-lg-3">
        <div class="card-job h-100 position-relative">
          <div class="card-body">
            ${contentHtml}
            <h5 class="card-title text-gold mb-2 text-center">${
              tutorial.title
            }</h5>
            <div class="d-flex gap-2 justify-content-center align-items-center">
              <span class="badge bg-secondary">${tutorial.category.toUpperCase()}</span>
              <span class="badge ${
                tutorial.tutorialType === "video" ? "bg-success" : "bg-danger"
              }">${tutorial.tutorialType.toUpperCase()}</span>
              
              ${
                subRole === "tecnico-jefe"
                  ? `
              <button class="btn btn-sm btn-danger ms-2" 
                      onclick="eliminarTutorial('${tutorial.id}', '${tutorial.title}')" 
                      title="Eliminar Tutorial">
                <i class="fa-solid fa-trash"></i>
              </button>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

async function eliminarTutorial(id, title) {
  const result = await Swal.fire({
    title: "¿Eliminar tutorial?",
    text: `¿Estás seguro de que deseas eliminar el tutorial "${title}"? Esta acción no se puede deshacer.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  });

  if (result.isConfirmed) {
    try {
      await db.collection("tutorials").doc(id).delete();
      Swal.fire(
        "Eliminado",
        "El tutorial ha sido eliminado correctamente.",
        "success"
      );
      cargarTutorialesTecnicos();
    } catch (error) {
      console.error("Error al eliminar tutorial:", error);
      Swal.fire("Error", "No se pudo eliminar el tutorial.", "error");
    }
  }
}

// Modificar verGuiaPDF para que funcione con tutoriales también
const originalVerGuiaPDF = window.verGuiaPDF;
window.verGuiaPDF = function (id, isTutorial = false) {
  let guide;
  if (isTutorial) {
    guide = window.allTutorials.find((g) => g.id === id);
  } else {
    guide = window.allGuides.find((g) => g.id === id);
  }

  if (!guide) return;

  const pdfContent = guide.pdfData || guide.url;
  if (!pdfContent) {
    // Si es un tutorial tipo video, no debería entrar aquí, pero por si acaso
    if (guide.videoId) {
      window.open(guide.url, "_blank");
      return;
    }
    Swal.fire("Error", "No se encontró el contenido del PDF.", "error");
    return;
  }

  if (pdfContent.startsWith("http")) {
    window.open(pdfContent, "_blank");
  } else {
    const newTab = window.open();
    newTab.document.write(`
            <html>
                <head><title>${guide.title || guide.name}</title></head>
                <body style="margin:0">
                    <embed src="${pdfContent}" width="100%" height="100%" type="application/pdf">
                </body>
            </html>
        `);
  }
};

// =======================================================
// 🔑 GESTIÓN DE CLAVES TÉCNICAS
// =======================================================
function configurarModalClave() {
  const savePasswordBtn = document.getElementById("savePasswordBtn");
  if (!savePasswordBtn) return;

  savePasswordBtn.addEventListener("click", async () => {
    const complexName = document.getElementById("passComplexName").value;
    const citofono = document.getElementById("passCitofono").value;
    const dvr = document.getElementById("passDVR").value;
    const wifiName = document.getElementById("passWifiName").value;
    const wifiPass = document.getElementById("passWifiPass").value;
    const camBrand = document.getElementById("passCamBrand").value;
    const camPass = document.getElementById("passCamPass").value;
    const notes = document.getElementById("passNotes").value;
    const passwordId = document.getElementById("passwordId").value;

    if (!complexName) {
      Swal.fire("Atención", "El nombre del conjunto es obligatorio.", "warning");
      return;
    }

    savePasswordBtn.disabled = true;
    savePasswordBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

    try {
      const passwordData = {
        complexName: complexName,
        citofono: citofono,
        dvr: dvr,
        wifiName: wifiName,
        wifiPass: wifiPass,
        camBrand: camBrand,
        camPass: camPass,
        notes: notes,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.currentUser.email
      };

      if (passwordId) {
        await db.collection("device_passwords").doc(passwordId).update(passwordData);
      } else {
        passwordData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("device_passwords").add(passwordData);
      }

      Swal.fire({
        icon: "success",
        title: "¡Claves Guardadas!",
        text: "La información se ha actualizado correctamente.",
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        const modalEl = document.getElementById("addPasswordModal");
        if (modalEl) bootstrap.Modal.getInstance(modalEl).hide();
        document.getElementById("passwordForm").reset();
        document.getElementById("passwordId").value = "";
        cargarClavesTecnicas();
      });

    } catch (error) {
      console.error("Error al guardar claves:", error);
      Swal.fire("Error", "Hubo un problema al guardar los datos.", "error");
    } finally {
      savePasswordBtn.disabled = false;
      savePasswordBtn.innerHTML = "Guardar Clave";
    }
  });

  const addPasswordModal = document.getElementById("addPasswordModal");
  if (addPasswordModal) {
    addPasswordModal.addEventListener('hidden.bs.modal', () => {
      document.getElementById("passwordForm").reset();
      document.getElementById("passwordId").value = "";
      document.getElementById("addPasswordModalLabel").textContent = "Gestionar Clave de Dispositivo";
    });
  }
}

async function cargarClavesTecnicas() {
  const container = document.getElementById("passwordsContainer");
  if (!container) return;

  container.innerHTML = `<p class="text-center text-white w-100">Cargando claves...</p>`;

  try {
    const query = await db.collection("device_passwords")
      .orderBy("complexName", "asc")
      .get();
      
    window.allPasswords = [];
    query.forEach(doc => {
      window.allPasswords.push({ id: doc.id, ...doc.data() });
    });
    
    window.passwordsLoaded = true;
    renderClavesTecnicas(window.allPasswords);
  } catch (error) {
    console.error("Error al cargar claves:", error);
    container.innerHTML = `<p class="text-center text-danger w-100">Error al cargar las claves.</p>`;
  }
}

function renderClavesTecnicas(passwordsList) {
  const container = document.getElementById("passwordsContainer");
  if (!container) return;

  container.innerHTML = "";

  if (passwordsList.length === 0) {
    container.innerHTML = `<p class="text-center text-white-50 w-100 mt-4">No se encontraron registros.</p>`;
    return;
  }

  const subRole = window.actualUserData?.subRole || "";

  passwordsList.forEach(pass => {
    container.innerHTML += `
      <div class="col-md-6 col-lg-4">
        <div class="card-job h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="text-gold mb-1">${pass.complexName}</h5>
                <span class="badge bg-gold">Gestión Técnica</span>
              </div>
              
              ${(subRole === "tecnico-jefe" || subRole === "tecnico-obrero") ? `
              <div class="dropdown">
                <button class="btn btn-link text-white p-0" data-bs-toggle="dropdown">
                  <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-dark">
                  <li><a class="dropdown-item" href="#" onclick="editarClave('${pass.id}')"><i class="fa-solid fa-pen me-2"></i> Editar</a></li>
                  <li><a class="dropdown-item text-danger" href="#" onclick="eliminarClave('${pass.id}', '${pass.complexName}')"><i class="fa-solid fa-trash me-2"></i> Eliminar</a></li>
                </ul>
              </div>
              ` : ""}
            </div>
            
            <div class="bg-dark p-3 rounded mb-3">
              <div class="row g-2">
                <div class="col-6">
                  <span class="text-white-50 x-small d-block">Citófono:</span>
                  <span class="text-white small font-monospace">${pass.citofono || '---'}</span>
                </div>
                <div class="col-6">
                  <span class="text-white-50 x-small d-block">DVR:</span>
                  <span class="text-white small font-monospace">${pass.dvr || '---'}</span>
                </div>
                
                <div class="col-12 border-top border-secondary my-2"></div>
                
                <div class="col-6 border-end border-secondary pe-2">
                  <div class="mb-2">
                    <span class="text-white-50 x-small d-block">Wifi: ${pass.wifiName || 'N/A'}</span>
                    <span class="text-gold small font-monospace">${pass.wifiPass || '---'}</span>
                  </div>
                  <div>
                    <span class="text-white-50 x-small d-block">Cámaras (${pass.camBrand || 'N/A'}):</span>
                    <span class="text-white small font-monospace">${pass.camPass || '---'}</span>
                  </div>
                </div>
                
                <div class="col-6 ps-2">
                  <span class="text-white-50 x-small d-block">Observaciones:</span>
                  <div class="text-white-50 x-small" style="line-height:1.2; font-style: italic;">
                    ${pass.notes || '<span class="text-muted">Sin notas</span>'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
}

window.editarClave = function(id) {
  const pass = window.allPasswords.find(p => p.id === id);
  if (!pass) return;

  document.getElementById("passwordId").value = pass.id;
  document.getElementById("passComplexName").value = pass.complexName;
  document.getElementById("passCitofono").value = pass.citofono || "";
  document.getElementById("passDVR").value = pass.dvr || "";
  document.getElementById("passWifiName").value = pass.wifiName || "";
  document.getElementById("passWifiPass").value = pass.wifiPass || "";
  if (document.getElementById("passCamBrand")) {
    document.getElementById("passCamBrand").value = pass.camBrand || "Hikvision";
  }
  document.getElementById("passCamPass").value = pass.camPass || "";
  document.getElementById("passNotes").value = pass.notes || "";
  
  document.getElementById("addPasswordModalLabel").textContent = "Editar Datos del Conjunto";
  
  const modal = new bootstrap.Modal(document.getElementById("addPasswordModal"));
  modal.show();
};

window.eliminarClave = async function(id, label) {
  const result = await Swal.fire({
    title: "¿Eliminar registro?",
    text: `¿Estás seguro de que deseas eliminar los datos de "${label}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (result.isConfirmed) {
    try {
      await db.collection("device_passwords").doc(id).delete();
      Swal.fire("¡Eliminado!", "El registro ha sido eliminada.", "success");
      cargarClavesTecnicas();
    } catch (error) {
      console.error("Error al eliminar registro:", error);
      Swal.fire("Error", "No se pudo eliminar el registro.", "error");
    }
  }
};
