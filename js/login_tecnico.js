// Global function to open image in fullscreen
window.openImageFullscreen = function (imageUrl) {
  Swal.fire({
    imageUrl: imageUrl,
    imageAlt: "Imagen del Problema",
    showConfirmButton: false,
    showCloseButton: true,
    background: "#000",
    backdrop: "rgba(0,0,0,0.95)",
    customClass: {
      image: "fullscreen-image-modal",
    },
    width: "90%",
    padding: "20px",
  });
};

// Helper: Resize Image
const resizeImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

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
                error,
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

    // Contenedores
    const dashboardSection = document.getElementById("dashboardSection");
    const jobsSection = document.getElementById("jobsSection");
    const contractsSection = document.getElementById("contractsSection");

    // Inicializar vista (Dashboard)
    switchView("dashboard");

    // Click listeners for dashboard cards
    const cardTrabajosPendientes = document.getElementById(
      "cardTrabajosPendientes",
    );
    const cardTrabajosTerminados = document.getElementById(
      "cardTrabajosTerminados",
    );

    if (cardTrabajosPendientes) {
      cardTrabajosPendientes.addEventListener("click", () => {
        const jobsLink = document.querySelector(
          ".sidebar-link[data-view='jobs']",
        );
        if (jobsLink) {
          jobsLink.click();
          // Set filter to pending after a short delay to ensure jobs are loaded
          setTimeout(() => {
            if (window.setStatusFilter) {
              window.setStatusFilter("Pendiente");
            }
          }, 100);
        }
      });
    }

    if (cardTrabajosTerminados) {
      cardTrabajosTerminados.addEventListener("click", () => {
        const jobsLink = document.querySelector(
          ".sidebar-link[data-view='jobs']",
        );
        if (jobsLink) {
          jobsLink.click();
          // Set filter to finished after a short delay to ensure jobs are loaded
          setTimeout(() => {
            if (window.setStatusFilter) {
              window.setStatusFilter("Culminado");
            }
          }, 100);
        }
      });
    }

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

      if (view === "dashboard") {
        dashboardSection.style.display = "block";
        actualizarEstadisticas();
      } else if (view === "jobs") {
        jobsSection.style.display = "block";
        if (!window.trabajosLoaded) cargarTrabajosTecnicos();
        else {
          renderTrabajosTecnicos(window.allTrabajos);
          // Set default filter to pending jobs
          const filterPendingJobs =
            document.getElementById("filterPendingJobs");
          if (
            filterPendingJobs &&
            !filterPendingJobs.classList.contains("active")
          ) {
            window.setStatusFilter("Pendiente");
          }
        }
      } else if (view === "contracts") {
        contractsSection.style.display = "block";
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

        // Controlar visibilidad del botón "Agregar Nueva Clave"
        const addPasswordBtn = document.getElementById("addPasswordBtn");
        const subRole = window.actualUserData?.subRole || "";
        if (addPasswordBtn) {
          const canManageKeys =
            subRole === "tecnico-jefe" || subRole === "tecnico-obrero";
          addPasswordBtn.style.display = canManageKeys ? "block" : "none";
        }

        if (!window.passwordsLoaded) cargarClavesTecnicas();
        else renderClavesTecnicas(window.allPasswords);
      }
    }

    async function actualizarEstadisticas() {
      try {
        const queryTrabajos = await db.collection("trabajos").get();
        // Filtramos para que no cuente las guías como trabajos
        const allFilteredTrabajos = queryTrabajos.docs.filter((doc) => {
          const d = doc.data();
          return !d.isGuide && !d.isTutorial;
        });

        const pendingTrabajos = allFilteredTrabajos.filter((doc) => {
          const d = doc.data();
          return d.status !== "Culminado";
        }).length;

        const finishedTrabajos = allFilteredTrabajos.filter((doc) => {
          const d = doc.data();
          return d.status === "Culminado";
        }).length;

        const statTotalTrabajos = document.getElementById("statTotalTrabajos");
        if (statTotalTrabajos) statTotalTrabajos.textContent = pendingTrabajos;

        const statTotalTerminados = document.getElementById(
          "statTotalTerminados",
        );
        if (statTotalTerminados)
          statTotalTerminados.textContent = finishedTrabajos;

        const queryContratos = await db.collection("contracts").get();
        const pendingContratos = queryContratos.docs.filter(
          (doc) => !doc.data().clientSignature,
        ).length;
        const statTotalContratos =
          document.getElementById("statTotalContratos");
        if (statTotalContratos)
          statTotalContratos.textContent = pendingContratos;

        cargarNotificacionesDashboard("all");
      } catch (error) {
        console.error("Error al actualizar estadísticas:", error);
      }
    }

    let currentNotifications = [];

    async function cargarNotificacionesDashboard(filter = "all") {
      const notificationsSection = document.getElementById(
        "notificationsSection",
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
      const currentActiveLink = document.querySelector(".sidebar-link.active");
      const currentView = currentActiveLink?.getAttribute("data-view");

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
          "tutorialSearchInput",
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
          "passwordSearchInput",
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

    // Global function for status filter cards
    window.setStatusFilter = function (status) {
      const filterPendingJobs = document.getElementById("filterPendingJobs");
      const filterFinishedJobs = document.getElementById("filterFinishedJobs");
      const jobUrgencyFilter = document.getElementById("jobUrgencyFilter");
      const jobSearchInput = document.getElementById("jobSearchInput");

      // Update active state
      if (filterPendingJobs) filterPendingJobs.classList.remove("active");
      if (filterFinishedJobs) filterFinishedJobs.classList.remove("active");

      if (status === "Pendiente" && filterPendingJobs) {
        filterPendingJobs.classList.add("active");
      } else if (status === "Culminado" && filterFinishedJobs) {
        filterFinishedJobs.classList.add("active");
      }

      // Filter jobs
      const urgencyValue = jobUrgencyFilter?.value || "todas";
      const nameValue = jobSearchInput?.value.toLowerCase() || "";

      const filteredTrabajos = window.allTrabajos.filter((job) => {
        const matchUrgency =
          urgencyValue === "todas" || job.jobUrgency === urgencyValue;

        let matchStatus = true;
        if (status === "Pendiente") {
          matchStatus = job.status !== "Culminado";
        } else if (status === "Culminado") {
          matchStatus = job.status === "Culminado";
        }

        const matchName =
          job.clientName.toLowerCase().includes(nameValue) ||
          job.contactName.toLowerCase().includes(nameValue);

        return matchUrgency && matchName && matchStatus;
      });

      renderTrabajosTecnicos(filteredTrabajos);
    };

    // Function to update job counts
    window.updateJobCounts = function () {
      if (!window.allTrabajos || window.allTrabajos.length === 0) return;

      const pendingCount = window.allTrabajos.filter(
        (job) => job.status !== "Culminado",
      ).length;
      const finishedCount = window.allTrabajos.filter(
        (job) => job.status === "Culminado",
      ).length;

      const countPendingJobs = document.getElementById("countPendingJobs");
      const countFinishedJobs = document.getElementById("countFinishedJobs");

      if (countPendingJobs) countPendingJobs.textContent = pendingCount;
      if (countFinishedJobs) countFinishedJobs.textContent = finishedCount;
    };

    // Add event listeners for new filter inputs
    const jobUrgencyFilter = document.getElementById("jobUrgencyFilter");
    const jobSearchInput = document.getElementById("jobSearchInput");

    if (jobUrgencyFilter) {
      jobUrgencyFilter.addEventListener("change", () => {
        const filterPendingJobs = document.getElementById("filterPendingJobs");
        const filterFinishedJobs =
          document.getElementById("filterFinishedJobs");

        // Determine current status filter
        let currentStatus = null;
        if (
          filterPendingJobs &&
          filterPendingJobs.classList.contains("active")
        ) {
          currentStatus = "Pendiente";
        } else if (
          filterFinishedJobs &&
          filterFinishedJobs.classList.contains("active")
        ) {
          currentStatus = "Culminado";
        }

        if (currentStatus) {
          window.setStatusFilter(currentStatus);
        } else {
          applyFilters();
        }
      });
    }

    if (jobSearchInput) {
      jobSearchInput.addEventListener("input", () => {
        const filterPendingJobs = document.getElementById("filterPendingJobs");
        const filterFinishedJobs =
          document.getElementById("filterFinishedJobs");

        // Determine current status filter
        let currentStatus = null;
        if (
          filterPendingJobs &&
          filterPendingJobs.classList.contains("active")
        ) {
          currentStatus = "Pendiente";
        } else if (
          filterFinishedJobs &&
          filterFinishedJobs.classList.contains("active")
        ) {
          currentStatus = "Culminado";
        }

        if (currentStatus) {
          window.setStatusFilter(currentStatus);
        } else {
          applyFilters();
        }
      });
    }
  }

  async function cargarInfoUsuario() {
    console.log("Iniciando protección de ruta técnica...");

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.warn(
          "No hay sesión activa (Técnico), redirigiendo a control_center.html",
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
            "Acceso no autorizado a Gestión Técnica. Redirigiendo...",
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
      '[data-bs-target="#uploadGuideModal"]',
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
      if (
        data.subRole === "tecnico-jefe" ||
        data.subRole === "tecnico-obrero"
      ) {
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
    container.innerHTML = `<p style="color:white; text-align:center;" class="w-100 mt-4">No se encontraron trabajos.</p>`;
    return;
  }

  trabajosList.forEach((data) => {
    const isCompleted = data.status === "Culminado";

    const urgencyClass =
      data.jobUrgency === "Normal"
        ? "badge-normal"
        : data.jobUrgency === "Urgente"
          ? "badge-urgente"
          : "badge-critico";

    const watermark = isCompleted
      ? `<div class="watermark-seal">✔ Trabajo Realizado</div>`
      : "";

    const reportButton = !isCompleted
      ? `<button class="btn btn-primary mt-3 w-100"
            data-bs-toggle="modal"
            data-bs-target="#technicalReportModal"
            data-id="${data.id}">
            <i class="fa-solid fa-file-alt me-1"></i> Informe Técnico
          </button>`
      : "";

    container.innerHTML += `
      <div class="col-xl-4 col-md-6 col-12">
        <div class="job-card">
          ${watermark}
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="text-gold mb-0 fw-bold">${data.clientName}</h5>
            <span class="badge ${urgencyClass}">${data.jobUrgency}</span>
          </div>

          <div class="job-divider"></div>

          <div class="mb-4 small">
            <p class="mb-2"><i class="fa-solid fa-calendar-day text-gold me-2"></i><strong>Fecha:</strong> ${data.jobDate}</p>
            <p class="mb-2"><i class="fa-solid fa-user-tag text-gold me-2"></i><strong>Contacto:</strong> ${data.contactName}</p>
            <p class="mb-2"><i class="fa-solid fa-phone text-gold me-2"></i><strong>Teléfono:</strong> ${data.contactPhone}</p>
            <p class="mb-0"><i class="fa-solid fa-circle-info text-gold me-2"></i><strong>Estado:</strong> <span class="fw-bold">${data.status || "Pendiente"}</span></p>
          </div>

          ${reportButton}
        </div>
      </div>
    `;
  });

  // Update job counts after rendering
  if (window.updateJobCounts) {
    window.updateJobCounts();
  }
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
      canvas.height = 120;
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

    canvas.addEventListener("mouseup", () => (isDrawing = false));
    canvas.addEventListener("mouseout", () => (isDrawing = false));

    // Touch events
    canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;
      },
      { passive: false },
    );

    canvas.addEventListener(
      "touchmove",
      (e) => {
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
      },
      { passive: false },
    );

    canvas.addEventListener("touchend", () => (isDrawing = false));

    // Handle window resize for canvas
    window.addEventListener("resize", () => {
      if (reportModal.classList.contains("show")) {
        resizeCanvas();
      }
    });

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

    // Resetear inputs de imágenes y previews al abrir el modal (Updated for 4 photos)
    ["Initial1", "Initial2", "Final1", "Final2"].forEach((suffix) => {
      const input = document.getElementById(`evidence${suffix}`);
      const placeholder = document.getElementById(`placeholder${suffix}`);
      const preview = document.getElementById(`preview${suffix}`);
      const removeBtn = document.getElementById(`remove${suffix}`);
      const box = document.getElementById(`box${suffix}`);

      if (input) {
        input.value = "";
      }
      if (box) {
        box.style.borderColor = "";
        box.style.background = "";
      }
      if (placeholder) {
        placeholder.style.display = "flex";
        placeholder.classList.remove("d-none");
      }
      if (preview) {
        preview.style.display = "none";
        preview.src = "";
      }
      if (removeBtn) removeBtn.style.display = "none";
    });

    const jobDetailsContainer = document.getElementById("jobDetails");
    jobDetailsContainer.innerHTML = "Cargando detalles...";

    try {
      const doc = await db.collection("trabajos").doc(jobId).get();
      if (doc.exists) {
        const data = doc.data();

        jobDetailsContainer.innerHTML = `
            <div class="h-100 d-flex flex-column">
                <div class="text-center mb-3">
                  <h5 class="mb-2" style="color: #d4af37; font-weight: 700; letter-spacing: 0.5px; font-size: 1.1rem;">
                    <i class="fa-solid fa-file-invoice me-2"></i>Detalles del Trabajo
                  </h5>
                  
                  <div class="d-flex justify-content-center gap-3 text-white-50" style="font-size: 0.85rem;">
                     <span><i class="fa-solid fa-user me-1"></i> ${data.clientName}</span>
                     <span><i class="fa-calendar-days fa-solid me-1"></i> ${data.jobDate}</span>
                  </div>
                </div>
                
                <div class="mb-2 text-gold fw-bold" style="font-size: 0.9rem;">
                  <i class="fa-solid fa-triangle-exclamation me-2"></i>Problema Reportado
                </div>
                
                <div class="p-2 mb-3 text-start flex-grow-1 overflow-auto" 
                     style="background: rgba(0, 0, 0, 0.4); border-radius: 8px; border-left: 3px solid #d4af37; max-height: 150px;">
                  <p class="mb-0 text-white-50" style="font-size: 0.9rem; line-height: 1.5;">
                    ${data.jobDescription || "Sin descripción detallada del problema."}
                  </p>
                </div>
                
                ${
                  data.jobImageUrl
                    ? `
                  <div class="mt-auto text-center">
                    <div class="position-relative d-inline-block group-hover-effect" 
                         style="width: 100%; height: 160px; cursor: pointer; border-radius: 8px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.3);"
                         onclick="openImageFullscreen('${data.jobImageUrl}')">
                      
                      <img src="${data.jobImageUrl}" 
                           alt="Problema" 
                           style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;"
                           onmouseover="this.style.transform='scale(1.05)'" 
                           onmouseout="this.style.transform='scale(1)'">
                           
                      <div class="position-absolute bottom-0 start-0 w-100 p-1 text-center" 
                           style="background: rgba(0,0,0,0.7); backdrop-filter: blur(2px);">
                        <small style="color: #d4af37; font-size: 0.75rem;">
                          <i class="fa-solid fa-expand me-1"></i> Ver Imagen
                        </small>
                      </div>
                    </div>
                  </div>
                `
                    : ""
                }
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
    const reportInitial = document.getElementById("reportInitial").value;
    const reportFinal = document.getElementById("reportFinal").value;
    const jobStatus = document.getElementById("jobStatus").value;

    const photoInitial1 = document.getElementById("evidenceInitial1").files[0];
    const photoInitial2 = document.getElementById("evidenceInitial2").files[0];
    const photoFinal1 = document.getElementById("evidenceFinal1").files[0];
    const photoFinal2 = document.getElementById("evidenceFinal2").files[0];

    if (!reportInitial || !reportFinal || !jobStatus) {
      Swal.fire(
        "Error",
        "Los reportes (inicial y final) y el estado son obligatorios.",
        "error",
      );
      return;
    }

    saveReportBtn.disabled = true;
    saveReportBtn.innerHTML = "Guardando...";

    try {
      // Concatenar reporte para compatibilidad
      const reportText = `**PROBLEMA ENCONTRADO:**\n${reportInitial}\n\n**SOLUCIÓN IMPLEMENTADA:**\n${reportFinal}`;

      // Convertir y Redimensionar imágenes
      const evidenceInitial = [];
      if (photoInitial1) evidenceInitial.push(await resizeImage(photoInitial1));
      if (photoInitial2) evidenceInitial.push(await resizeImage(photoInitial2));

      const evidenceFinal = [];
      if (photoFinal1) evidenceFinal.push(await resizeImage(photoFinal1));
      if (photoFinal2) evidenceFinal.push(await resizeImage(photoFinal2));

      // Combinar para backward compatibility
      const evidenceBase64 = [...evidenceInitial, ...evidenceFinal];

      const updateData = {
        report: reportText,
        reportInitial: reportInitial,
        reportFinal: reportFinal,
        status: jobStatus,
        reportDate: new Date(),
        clientSignature: canvas.hasSignature
          ? canvas.toDataURL("image/png")
          : null,
        evidenceInitial: evidenceInitial,
        evidenceFinal: evidenceFinal,
        evidenceBase64: evidenceBase64,
      };

      await db.collection("trabajos").doc(jobId).update(updateData);

      const doc = await db.collection("trabajos").doc(jobId).get();
      const jobData = doc.data();

      Swal.fire({
        icon: "success",
        title: "¡Informe Enviado!",
        text: "Se procederá a notificar a administración y monitoreo.",
        showConfirmButton: true,
      }).then(() => {
        // Notificación WhatsApp Automática
        const message =
          `🛠️ *INFORME TÉCNICO FINALIZADO*\n\n` +
          `El técnico *${auth.currentUser.email}* ha completado un trabajo.\n\n` +
          `📋 *Cliente:* ${jobData.clientName}\n` +
          `📅 *Fecha Asignación:* ${jobData.jobDate}\n` +
          `✅ *Estado:* ${jobStatus}\n\n` +
          `📝 *Detalle:* ${reportText}\n\n` +
          `👉 *Informe disponible en plataforma para revisión.*`;

        const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        const waWindow = window.open(waUrl, "_blank");

        if (
          !waWindow ||
          waWindow.closed ||
          typeof waWindow.closed === "undefined"
        ) {
          Swal.fire({
            icon: "info",
            title: "¡Informe Enviado!",
            html: `Se procederá a notificar a administración y monitoreo.<br><br><b>El navegador bloqueó la ventana de WhatsApp.</b><br>Haz clic abajo para abrirlo manualmente:`,
            showCancelButton: true,
            confirmButtonText:
              '<i class="fa-brands fa-whatsapp"></i> Abrir WhatsApp',
            confirmButtonColor: "#25d366",
            background: "#000",
            color: "#d4af37",
          }).then((result) => {
            if (result.isConfirmed) {
              window.open(waUrl, "_blank");
            }
          });
        }
      });

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
    // 🔍 Mapeo de campos (Soporte para esquema nuevo y antiguo)
    const nameDisplay = data.complexName || data.clientName || "Sin Nombre";
    const idDisplay = data.complexRuc || data.clientId || "Sin Identificación";
    const priceDisplay = data.price || data.servicePrice || "0.00";

    // 📅 Formateo de Fecha Robusto
    const rawDate = data.signDate || data.date;
    let formattedDate = "Fecha no registrada";

    if (rawDate) {
      try {
        // Caso 1: String YYYY-MM-DD
        if (typeof rawDate === "string" && rawDate.includes("-")) {
          const parts = rawDate.split("T")[0].split("-");
          if (parts.length === 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }
        // Caso 2: Objeto Date o Timestamp de Firebase
        else {
          const dObj = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
          if (!isNaN(dObj.getTime())) {
            formattedDate = dObj.toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
          }
        }
      } catch (e) {
        console.error("Error formateando fecha:", e);
        formattedDate = "Fecha Inválida";
      }
    }

    // Verificar si el contrato ya está completado
    const isCompleted = !!(data.clientSignature && data.clientIdPhoto);

    const statusBadge = isCompleted
      ? '<span class="badge bg-success">Completado</span>'
      : '<span class="badge bg-warning text-dark">Pendiente</span>';

    container.innerHTML += `
        <div class="col-md-4">
          <div class="card-job">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="card-title text-gold" style="font-weight: 700;">Contrato: ${nameDisplay}</h5>
                ${statusBadge}
              </div>
              <p class="card-text"><i class="fa-solid fa-calendar-days text-gold me-2"></i> <strong>Fecha:</strong> ${formattedDate}</p>
              <p class="card-text"><i class="fa-solid fa-user text-gold me-2"></i> <strong>Cliente / Conjunto:</strong> ${nameDisplay}</p>
              <p class="card-text"><i class="fa-solid fa-id-card text-gold me-2"></i> <strong>RUC / Cédula:</strong> ${idDisplay}</p>
              <p class="card-text"><i class="fa-solid fa-dollar-sign text-gold me-2"></i> <strong>Precio Mensual:</strong> $${priceDisplay} + IVA</p>
              ${
                !isCompleted
                  ? `
                <button class="btn btn-primary mt-3 w-100" onclick="llenarContrato('${data.id}')" style="border-radius: 8px; font-weight: 600;">
                  <i class="fa-solid fa-pen-nib me-2"></i> Llenar Contrato
                </button>
              `
                  : `
                <button class="btn btn-success mt-3 w-100" onclick="verContratoCompleto('${data.id}')" style="border-radius: 8px; font-weight: 600;">
                  <i class="fa-solid fa-file-contract me-2"></i> Ver Contrato Completo
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
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      lastX = touch.clientX - rect.left;
      lastY = touch.clientY - rect.top;
    },
    { passive: false },
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
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
    },
    { passive: false },
  );

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

  // Helper para configurar preview de imágenes
  function setupImagePreview(inputId, placeholderId, previewId, removeBtnId) {
    const input = document.getElementById(inputId);
    const placeholder = document.getElementById(placeholderId);
    const preview = document.getElementById(previewId);
    const removeBtn = document.getElementById(removeBtnId);

    if (!input || !placeholder || !preview || !removeBtn) return;

    const container =
      input.closest(".position-relative") || input.closest(".photo-upload-box");

    input.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          preview.src = e.target.result;
          preview.style.display = "block";
          removeBtn.style.display = "flex";

          // Force hide placeholder securely
          placeholder.style.display = "none";
          placeholder.classList.add("d-none");

          // Visual success indicator
          if (container) {
            container.style.borderColor = "#28a745"; // Green success
            container.style.background = "#000"; // Dark background
          }

          // Notificación de éxito (Toast)
          const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
            background: "#1a1a1a",
            color: "#fff",
            iconColor: "#28a745",
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.addEventListener("mouseenter", Swal.stopTimer);
              toast.addEventListener("mouseleave", Swal.resumeTimer);
            },
          });

          Toast.fire({
            icon: "success",
            title: "Imagen cargada correctamente",
          });
        };
        reader.readAsDataURL(file);
      }
    });

    removeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation(); // Stop event bubbling
      input.value = "";
      preview.src = "";
      preview.style.display = "none";
      removeBtn.style.display = "none";

      placeholder.style.display = "block";
      placeholder.classList.remove("d-none");

      if (container) {
        container.style.borderColor = "rgba(255, 255, 255, 0.3)";
        container.style.background = "rgba(0, 0, 0, 0.2)";
      }
    });
  }

  // Inicializar preview para la foto de cédula
  setupImagePreview(
    "clientIdPhoto",
    "idPhotoPlaceholder",
    "idPhotoPreviewImg",
    "removeIdPhotoBtn",
  );

  // Inicializar previews para evidencias del reporte técnico
  // Inicializar previews para evidencias del reporte técnico (4 Fotos)
  setupImagePreview(
    "evidenceInitial1",
    "placeholderInitial1",
    "previewInitial1",
    "removeInitial1",
  );
  setupImagePreview(
    "evidenceInitial2",
    "placeholderInitial2",
    "previewInitial2",
    "removeInitial2",
  );
  setupImagePreview(
    "evidenceFinal1",
    "placeholderFinal1",
    "previewFinal1",
    "removeFinal1",
  );
  setupImagePreview(
    "evidenceFinal2",
    "placeholderFinal2",
    "previewFinal2",
    "removeFinal2",
  );

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
          "error",
        );
        return;
      }

      saveContractBtn.disabled = true;
      saveContractBtn.innerHTML = "Guardando...";

      try {
        // Convertir y Redimensionar foto de cédula
        const idPhotoBase64 = await resizeImage(idPhotoFile);

        // Actualizar contrato en Firestore
        await db.collection("contracts").doc(contractId).update({
          clientSignature: signatureData,
          clientIdPhoto: idPhotoBase64,
          completedAt: new Date(),
          completedBy: auth.currentUser.email,
        });

        const doc = await db.collection("contracts").doc(contractId).get();
        const contractData = doc.data();

        Swal.fire({
          icon: "success",
          title: "¡Contrato Guardado!",
          text: "Se procederá a notificar a administración y monitoreo.",
          showConfirmButton: true,
        }).then(() => {
          // Notificación WhatsApp Automática
          const name =
            contractData.complexName || contractData.clientName || "Sin Nombre";
          const id =
            contractData.complexRuc ||
            contractData.clientId ||
            "Sin Cédula/RUC";

          const message =
            `📄 *CONTRATO FINALIZADO Y FIRMADO*\n\n` +
            `El técnico *${auth.currentUser.email}* ha completado la firma del contrato.\n\n` +
            `👤 *Cliente / Conjunto:* ${name}\n` +
            `🆔 *RUC / Cédula:* ${id}\n\n` +
            `✅ *Estado:* Firmado y con evidencia.\n` +
            `👉 *Favor validar en plataforma.*`;

          const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
          const waWindow = window.open(waUrl, "_blank");

          if (
            !waWindow ||
            waWindow.closed ||
            typeof waWindow.closed === "undefined"
          ) {
            Swal.fire({
              icon: "info",
              title: "¡Contrato Finalizado!",
              html: `La firma ha sido registrada.<br><br><b>El navegador bloqueó la ventana de WhatsApp.</b><br>Haz clic abajo para abrirlo manualmente:`,
              showCancelButton: true,
              confirmButtonText:
                '<i class="fa-brands fa-whatsapp"></i> Abrir WhatsApp',
              confirmButtonColor: "#25d366",
              background: "#000",
              color: "#d4af37",
            }).then((result) => {
              if (result.isConfirmed) {
                window.open(waUrl, "_blank");
              }
            });
          }
        });

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

    // Mostrar botón de guardar, ocultar PDF
    if (document.getElementById("saveContractBtn"))
      document.getElementById("saveContractBtn").style.display = "block";
    if (document.getElementById("generateContractPdfBtn"))
      document.getElementById("generateContractPdfBtn").style.display = "none";

    // Mostrar el hr
    const hrElement = document.getElementById("fillContractDivider");
    if (hrElement) {
      hrElement.style.display = "block";
    }

    // Abrir modal
    const modal = new bootstrap.Modal(
      document.getElementById("fillContractModal"),
    );
    modal.show();
  } catch (error) {
    console.error("Error al cargar contrato: ", error);
    Swal.fire("Error", "No se pudo cargar el contrato.", "error");
  }
}

const formatDateES = (dateString) => {
  if (!dateString) return "______";
  try {
    // Handle Firestore Timestamp
    if (dateString && typeof dateString.toDate === "function") {
      dateString = dateString.toDate();
    }

    const date = new Date(dateString);
    if (typeof dateString === "string" && dateString.includes("-")) {
      const parts = dateString.split("T")[0].split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const months = [
          "enero",
          "febrero",
          "marzo",
          "abril",
          "mayo",
          "junio",
          "julio",
          "agosto",
          "septiembre",
          "octubre",
          "noviembre",
          "diciembre",
        ];
        return `${parseInt(d)} de ${months[parseInt(m) - 1]} del ${y}`;
      }
    }

    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("es-ES", options);
  } catch (e) {
    return "______";
  }
};

// =======================================================
// 📄 MOSTRAR CONTRATO PARA LLENAR
// =======================================================
function mostrarContratoParaLlenar(data) {
  const contractContentArea = document.getElementById("contractContentToFill");

  // Map data fields from admin schema
  const city = data.city || "San Francisco de Quito";
  const signDateText = formatDateES(data.signDate || data.date);
  const startDateText = formatDateES(data.startDate || data.date);

  const complexName =
    data.complexName || data.clientName || "_________________";
  const complexRuc = data.complexRuc || data.clientId || "_________________";
  const complexRep = data.complexRep || data.clientName || "_________________";
  const address = data.address || data.clientAddress || "_________________";
  const canton = data.canton || "_________________";
  const price = data.price || data.servicePrice || "0.00";
  const duration = data.duration || "12";
  const annexDetails =
    data.annexDetails || "No se han registrado equipos para este contrato.";

  // Hardcoded Company Info
  const companyName = "SEGURIDAD 24-7 DEL ECUADOR CIA. LTDA.";
  const companyRep = "EDWIN YUBILLO";
  const companyRuc = "1793205916001";

  // Pre-filled company signature image for "To Fill" view
  const companySigImg = `<img src="assets/img/firma.png" style="max-height: 80px; max-width: 150px;" alt="Firma Empresa">`;
  const clientSigImg = `<div style="height: 80px;"></div>`;

  // Signatures HTML Section (Company Signed, Client To Sign)
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
             <div style="border-bottom: 2px solid #000; margin-bottom: 12px; height: 100px;"></div>
             <p style="font-weight: 800; text-transform: uppercase; margin: 0; font-size: 14px; color: #000;">${complexRep}</p>
             <p style="margin: 4px 0; font-size: 12px; color: #666; font-style: italic;">EL CLIENTE / CONTRATANTE</p>
             <p style="margin: 0; font-size: 11px; font-weight: 700; color: #000; text-transform: uppercase;">${complexName}</p>
        </div>
    </div>
  `;

  // Main Contract Template with Verbatim 11 clauses
  const content = `
    <div style="font-family: 'Times New Roman', Times, serif; font-size: 9pt; line-height: 1.6; color: #000; padding: 60px 40px; background: #fff; width: 800px; margin: 0 auto; box-sizing: border-box;">
      
      <!-- ELEGANT HEADER -->
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
          En la ciudad de San Francisco de Quito, a los <strong>${signDateText}</strong>, comparecen, a celebrar el presente contrato mercantil de prestación de servicios de seguridad privada, por una parte <strong>${complexRep}</strong> en calidad de representante legal de <strong>${complexName}</strong> con RUC <strong>${complexRuc}</strong> a quien para los efectos del presente contrato se lo denominará también <strong>El Cliente</strong>; y, por otra parte, comparecen a la suscripción de este contrato el señor <strong>${companyRep}</strong>, en calidad de representante legal de <strong>SEGURIDAD 24-7 DEL ECUADOR CIA. LTDA.</strong>, con RUC <strong>${companyRuc}</strong> a quien para los efectos del presente contrato se lo podrá denominar <strong>la Compañía de Seguridad</strong>.
        </p>

        <p style="margin-bottom: 18px; font-style: italic; color: #222; text-align: center; border: 1px solid #f1e6c9; background: #fdfaf0; padding: 10px;">
          Las partes libres y voluntariamente, por así convenir a sus mutuos intereses, acuerdan el contenido del presente contrato al tenor de las siguientes clausulas:
        </p>

        <!-- CLAUSE 1 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>PRIMERA.- ANTECEDENTES:</strong></p>
          <p>
            El Beneficiario requiere contratar los servicios de seguridad privada, resguardo y protección virtual, mediante el monitoreo al sistema de cámaras, perifoneo en tiempo real las 24 horas de lunes a domingo, desde el <strong>${startDateText}</strong> para custodiar <strong>${complexName}</strong> ubicado en la provincia de Pichincha, cantón <strong>${canton}</strong>, dirección: <strong>${address}</strong>, a fin de cuidarlo y protegerlo, conforme a las normas de seguridad privada y a las indicaciones proporcionadas por el Beneficiario, quien ha creído conveniente a sus intereses contratar este servicio.
          </p>
          <p style="margin-top: 8px;">
            El Beneficiario solicita personal capacitado y calificado tanto en los procedimientos de vigilancia y control, como el manejo de equipos de comunicación, equipos de emergencia y otros que la función lo requiera.
          </p>
          <p style="margin-top: 8px;">
            <strong>${companyName}</strong>, es una compañía legalmente constituida, cuyas oficinas se encuentran ubicadas en la calle Pedro Cando N59-116 y Antonio Macata (SECTOR LA KENNEDY) de la ciudad de San Francisco de Quito, dedicada de forma habitual y por cuenta propia, a prestar los servicios de prevención del delito, vigilancia y seguridad a favor de personas naturales y jurídicas, instalaciones y bienes, deposito, custodia y transporte de valores y otras conexas en el área de seguridad privada.
          </p>
        </div>

        <!-- CLAUSE 2 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>SEGUNDA. - CONTRATACIÓN DEL SERVICIO DE SEGURIDAD:</strong></p>
          <p>
            Teniendo como base los antecedentes enunciados, El Cliente contrata resguardo y protección privada virtual, mediante el monitoreo al sistema de cámaras, perifoneo las 24 horas de lunes a domingo, adicional la empresa en caso de emergencia como intentos de robo, asalto, hurto, etc., la compañía coordinará con ECU 911, auxilio inmediato, además que personal motorizado propio de la compañía acudirá en auxilio, en un tiempo promedio de 20 minutos, para socorrer ante el incidente presentado con el fin de proteger, custodiar y brindar máxima seguridad interna y externa al lugar indicado. La Compañía de Seguridad se compromete a colocar la infraestructura necesaria que garantice: Alerta de identificación de movimiento/detección de personas en horas de poco tránsito para que, La Compañía de Seguridad alerte de forma temprana e identifique posibles riesgos. Para corroborar el cumplimiento de este, se anexará (Anexo 1) a este contrato un informe de los componentes instalados, Adicional, El Cliente podrá solicitar un nuevo informe del cumplimiento de cobertura de los vídeos cuando lo considere necesario. Si estos equipos presentan fallas y deben ser reparados o reposicionados, este costo lo asumirá la Compañía de Seguridad. La Compañía de Seguridad brindará el servicio de rondas a través de un motorizado o camioneta que visitará el Domicilio una vez al día en un horario aleatorio. Este se encargará de analizar de forma visual el exterior de la institución revisando riesgos potenciales, equipos instalados visibles y otros datos que La Compañía de Seguridad considere importante.
          </p>
        </div>

        <!-- CLAUSE 3 -->
        <div style="margin-bottom: 18px; background: #fdfbf5; padding: 20px; border-left: 5px solid #d4af37;">
          <p style="margin: 0;"><strong>TERCERA. - PRECIO:</strong> El valor por el servicio de seguridad es por la cantidad de <span style="font-size: 18px; font-weight: 900; color: #d4af37;">$${price} USD</span> (+ IVA), mismos que serán cancelados los 5 primeros días del mes. El retiro del valor mensual a pagar será efectuado por un delegado oficial del personal administrativo debidamente autorizado de SEGURIDAD 24/7.</p>
        </div>

        <!-- CLAUSE 4 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>CUARTA. - PLAZO:</strong> El plazo de duración del presente contrato es por  <strong>${duration} meses</strong>, tomando como fecha inicial la fecha de inicio de la prestación del servicio de guardia virtual, con treinta días de anticipación las partes se notificarán la continuidad o no del mismo, en caso de la no notificación de las partes se entenderá que el contrato se ha renovado de manera automática.</p>
        </div>

        <!-- CLAUSE 5 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>QUINTA. - CONDICIONES ESPECIALES:</strong> La empresa de seguridad., conjuntamente con el Supervisor de Seguridad controlarán coordinadamente la función de los Guardias Virtuales. En caso de cualquier anomalía El Cliente notificará de inmediato cualquier actividad fuera de lo normal, en forma verbal-telefónica o por escrito a la oficina de la compañía a fin de proceder a los correctivos efectivos y eficaces que el caso lo amerite.</p>
        </div>

        <!-- CLAUSE 6 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>SEXTA. - RESPONSABILIDAD DE LA EMPRESA DE SEGURIDAD:</strong> La compañía de seguridad se responsabiliza a disponer de una pantalla exclusiva para el sistema de cámaras en su central de monitoreo y demás dispositivos de seguridad que el conjunto dispone, para que se monitoree en todo tiempo las actividades diarias que se presenten. La empresa de Seguridad, además, dará las recomendaciones de seguridad necesarias al beneficiario para que se tome las medidas preventivas contra el delito a fin de evitar actos ilícitos provenientes del exterior o interior del sitio protegido.</p>
        </div>

        <!-- CLAUSE 7 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>SEPTIMO. - SERVICIO ADICIONAL:</strong> SEGURIDAD 24/7., posee una póliza de responsabilidad civil de $100.000,00 USD (Cien mil dólares de los Estados Unidos de América) contratada con la aseguradora Zúrich, la cual podrá ser utilizada siguiendo los trámites pertinentes que exige la empresa Aseguradora expedidora de dicha póliza. Adicional la Compañía estará dispuesta a atender cualquier requerimiento, sea este de requerimiento de personal de guardia, o de medios que necesitare El Cliente en alguna circunstancia, debiéndose reconocer sus costos como adicionales al presente contrato.</p>
        </div>

        <!-- CLAUSE 8 -->
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

        <!-- CLAUSE 9 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>NOVENA. - FORMA DE PAGO:</strong> El pago se lo realizará dentro de los 5 primeros días de cada mes, si no está al día en sus haberes El Cliente pierde todos sus derechos, en caso de que el pago no se realice por dos meses consecutivos, se procederá a suspender el servicio de guardia virtual sin aviso previo y se procederá a las acciones legales pertinentes. </p>
        </div>

        <!-- CLAUSE 10 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>DECIMA. - TERMINACIÓN DEL CONTRATO:</strong> Las partes contratantes tendrán derecho a dar por terminado el presente contrato, luego de haber cursado las comunicaciones escritas pertinentes, por la violación de cualquiera de las cláusulas de este convenio, o por decisión unilateral de alguna de ellas con por lo menos treinta días de anticipación. Por lo demás se obligan a todas y cada una de las cláusulas estipuladas en este contrato, las mismas que las aceptan y las declaran fielmente cumplir. En caso de terminar anticipadamente e intempestivamente el contrato sin justificación alguna dentro del primer año de contrato, se le pagará a la parte afectada la facturación mensual de dos meses en un tiempo no mayor de 15 días </p>
        </div>

        <!-- CLAUSE 11 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>DECIMA PRIMERA. - JURISDICCIÓN Y COMPETENCIA:</strong> Si se suscitaren divergencias o controversias entre las partes, y no llegaren a un acuerdo amigable directo, utilizarán en primera instancia los métodos alternativos para la solución de conflictos en un centro de Mediación y Arbitraje. Y si no existiera acuerdo, las partes deciden someterse a los jueces civiles del Distrito Metropolitano de Quito. Libre y voluntariamente, las partes expresamente declararan su aceptación a todo lo convenido en el presente contrato y se someten a sus estipulaciones</p>
        </div>

        <p style="margin-top: 40px; font-weight: 700; text-align: center; color: #111; padding-top: 20px; border-top: 1px solid #eee;">
          Para constancia de lo estipulado, las partes firman el presente contrato digital.
        </p>

        ${firmaHTML}

        <!-- ANNEX PAGE -->
        <div style="page-break-before: always; page-break-inside: avoid; border-top: 2px dashed #d4af37; margin-top: 20px; padding-top: 30px;">
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

    // Ocultar botón de guardar, mostrar PDF
    if (document.getElementById("saveContractBtn"))
      document.getElementById("saveContractBtn").style.display = "none";
    if (document.getElementById("generateContractPdfBtn"))
      document.getElementById("generateContractPdfBtn").style.display = "block";

    // Ocultar el hr
    const hrElement = document.getElementById("fillContractDivider");
    if (hrElement) {
      hrElement.style.display = "none";
    }

    // Abrir modal
    const modal = new bootstrap.Modal(
      document.getElementById("fillContractModal"),
    );
    modal.show();
  } catch (error) {
    console.error("Error al cargar contrato: ", error);
    Swal.fire("Error", "No se pudo cargar el contrato.", "error");
  }
}

// PDF Generation Listener for Técnico
document.addEventListener("DOMContentLoaded", () => {
  const pdfBtn = document.getElementById("generateContractPdfBtn");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", async () => {
      const content = document.getElementById("contractContentToFill");
      if (!content) return;

      Swal.fire({
        title: "Generando PDF...",
        text: "Procesando documento legal firmado...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const { jsPDF } = window.jspdf;

        // Wait briefly for images/signatures to load
        await new Promise((resolve) => setTimeout(resolve, 800));

        const doc = new jsPDF("p", "pt", "a4");
        await doc.html(content, {
          callback: function (doc) {
            doc.save(`Contrato_Firmado.pdf`);
            Swal.close();
          },
          x: 30, // Left margin (30)
          y: 20, // Top margin (Reduced to 20)
          margin: [40, 0, 60, 0], // [Top, Right, Bottom, Left]
          html2canvas: {
            scale: 0.58, // Adjusted scale to fit 800px content into ~465pt available width
            useCORS: true,
            letterRendering: true,
          },
          width: 465,
          windowWidth: 800,
          autoPaging: "text",
        });
      } catch (err) {
        console.error("PDF Error:", err);
        Swal.fire("Error", "No se pudo generar el PDF.", "error");
      }
    });
  }
});

// =======================================================
// 📄 MOSTRAR CONTRATO COMPLETO (con firma y cédula)
// =======================================================
function mostrarContratoCompleto(data) {
  const contractContentArea = document.getElementById("contractContentToFill");

  // Map data fields from admin schema
  const city = data.city || "San Francisco de Quito";
  const signDateText = formatDateES(data.signDate || data.date);
  const startDateText = formatDateES(data.startDate || data.date);

  const complexName =
    data.complexName || data.clientName || "_________________";
  const complexRuc = data.complexRuc || data.clientId || "_________________";
  const complexRep = data.complexRep || data.clientName || "_________________";
  const address = data.address || data.clientAddress || "_________________";
  const canton = data.canton || "_________________";
  const price = data.price || data.servicePrice || "0.00";
  const duration = data.duration || "12";
  const annexDetails =
    data.annexDetails || "No se han registrado equipos para este contrato.";

  // Hardcoded Company Info
  const companyName = "SEGURIDAD 24-7 DEL ECUADOR CIA. LTDA.";
  const companyRep = "EDWIN YUBILLO";
  const companyRuc = "1793205916001";

  // Firma de la Empresa (Edwin Yubillo) - Automática
  const companySigImg = `<img src="assets/img/firma.png" style="max-height: 80px; max-width: 150px;" alt="Firma Empresa">`;

  // Firma del Cliente (Dinámica)
  const clientSigImg = data.clientSignature
    ? `<img src="${data.clientSignature}" crossorigin="anonymous" style="max-height: 80px; max-width: 180px;" alt="Firma Cliente">`
    : `<div style="height: 80px;"></div>`;

  // Map signatures dynamically
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

  // Full Contract Template for Viewing Completed (Full Legal Framework)
  const content = `
    <div style="font-family: 'Times New Roman', Times, serif; font-size: 9pt; line-height: 1.6; color: #000; padding: 60px 40px; background: #fff; width: 800px; margin: 0 auto; box-sizing: border-box;">
      
      <!-- ELEGANT HEADER -->
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
          En la ciudad de San Francisco de Quito, a los <strong>${signDateText}</strong>, comparecen, a celebrar el presente contrato mercantil de prestación de servicios de seguridad privada, por una parte <strong>${complexRep}</strong> en calidad de representante legal de <strong>${complexName}</strong> con RUC <strong>${complexRuc}</strong> a quien para los efectos del presente contrato se lo denominará también <strong>El Cliente</strong>; y, por otra parte, comparecen a la suscripción de este contrato el señor <strong>${companyRep}</strong>, en calidad de representante legal de <strong>SEGURIDAD 24-7 DEL ECUADOR CIA. LTDA.</strong>, con RUC <strong>${companyRuc}</strong> a quien para los efectos del presente contrato se lo podrá denominar <strong>la Compañía de Seguridad</strong>.
        </p>

        <p style="margin-bottom: 18px; font-style: italic; color: #222; text-align: center; border: 1px solid #f1e6c9; background: #fdfaf0; padding: 10px;">
          Las partes libres y voluntariamente, por así convenir a sus mutuos intereses, acuerdan el contenido del presente contrato al tenor de las siguientes clausulas:
        </p>

        <!-- CLAUSE 1 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>PRIMERA.- ANTECEDENTES:</strong></p>
          <p>
            El Beneficiario requiere contratar los servicios de seguridad privada, resguardo y protección virtual, mediante el monitoreo al sistema de cámaras, perifoneo en tiempo real las 24 horas de lunes a domingo, desde el <strong>${startDateText}</strong> para custodiar <strong>${complexName}</strong> ubicado en la provincia de Pichincha, cantón <strong>${canton}</strong>, dirección: <strong>${address}</strong>, a fin de cuidarlo y protegerlo, conforme a las normas de seguridad privada y a las indicaciones proporcionadas por el Beneficiario, quien ha creído conveniente a sus intereses contratar este servicio.
          </p>
          <p style="margin-top: 8px;">
            El Beneficiario solicita personal capacitado y calificado tanto en los procedimientos de vigilancia y control, como el manejo de equipos de comunicación, equipos de emergencia y otros que la función lo requiera.
          </p>
          <p style="margin-top: 8px;">
            <strong>${companyName}</strong>, es una compañía legalmente constituida, cuyas oficinas se encuentran ubicadas en la calle Pedro Cando N59-116 y Antonio Macata (SECTOR LA KENNEDY) de la ciudad de San Francisco de Quito, dedicada de forma habitual y por cuenta propia, a prestar los servicios de prevención del delito, vigilancia y seguridad a favor de personas naturales y jurídicas, instalaciones y bienes, deposito, custodia y transporte de valores y otras conexas en el área de seguridad privada.
          </p>
        </div>

        <!-- CLAUSE 2 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>SEGUNDA. - CONTRATACIÓN DEL SERVICIO DE SEGURIDAD:</strong></p>
          <p>
            Teniendo como base los antecedentes enunciados, El Cliente contrata resguardo y protección privada virtual, mediante el monitoreo al sistema de cámaras, perifoneo las 24 horas de lunes a domingo, adicional la empresa en caso de emergencia como intentos de robo, asalto, hurto, etc., la compañía coordinará con ECU 911, auxilio inmediato, además que personal motorizado propio de la compañía acudirá en auxilio, en un tiempo promedio de 20 minutos, para socorrer ante el incidente presentado con el fin de proteger, custodiar y brindar máxima seguridad interna y externa al lugar indicado. La Compañía de Seguridad se compromete a colocar la infraestructura necesaria que garantice: Alerta de identificación de movimiento/detección de personas en horas de poco tránsito para que, La Compañía de Seguridad alerte de forma temprana e identifique posibles riesgos. Para corroborar el cumplimiento de este, se anexará (Anexo 1) a este contrato un informe de los componentes instalados, Adicional, El Cliente podrá solicitar un nuevo informe del cumplimiento de cobertura de los vídeos cuando lo considere necesario. Si estos equipos presentan fallas y deben ser reparados o reposicionados, este costo lo asumirá la Compañía de Seguridad. La Compañía de Seguridad brindará el servicio de rondas a través de un motorizado o camioneta que visitará el Domicilio una vez al día en un horario aleatorio. Este se encargará de analizar de forma visual el exterior de la institución revisando riesgos potenciales, equipos instalados visibles y otros datos que La Compañía de Seguridad considere importante.
          </p>
        </div>

        <!-- CLAUSE 3 -->
        <div style="margin-bottom: 18px; background: #fdfbf5; padding: 20px; border-left: 5px solid #d4af37;">
          <p style="margin: 0;"><strong>TERCERA. - PRECIO:</strong> El valor por el servicio de seguridad es por la cantidad de <span style="font-size: 18px; font-weight: 900; color: #d4af37;">$${price} USD</span> (+ IVA), mismos que serán cancelados los 5 primeros días del mes. El retiro del valor mensual a pagar será efectuado por un delegado oficial del personal administrativo debidamente autorizado de SEGURIDAD 24/7.</p>
        </div>

        <!-- CLAUSE 4 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>CUARTA. - PLAZO:</strong> El plazo de duración del presente contrato es por  <strong>${duration} meses</strong>, tomando como fecha inicial la fecha de inicio de la prestación del servicio de guardia virtual, con treinta días de anticipación las partes se notificarán la continuidad o no del mismo, en caso de la no notificación de las partes se entenderá que el contrato se ha renovado de manera automática.</p>
        </div>

        <!-- CLAUSE 5 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>QUINTA. - CONDICIONES ESPECIALES:</strong> La empresa de seguridad., conjuntamente con el Supervisor de Seguridad controlarán coordinadamente la función de los Guardias Virtuales. En caso de cualquier anomalía El Cliente notificará de inmediato cualquier actividad fuera de lo normal, en forma verbal-telefónica o por escrito a la oficina de la compañía a fin de proceder a los correctivos efectivos y eficaces que el caso lo amerite.</p>
        </div>

        <!-- CLAUSE 6 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>SEXTA. - RESPONSABILIDAD DE LA EMPRESA DE SEGURIDAD:</strong> La compañía de seguridad se responsabiliza a disponer de una pantalla exclusiva para el sistema de cámaras en su central de monitoreo y demás dispositivos de seguridad que el conjunto dispone, para que se monitoree en todo tiempo las actividades diarias que se presenten. La empresa de Seguridad, además, dará las recomendaciones de seguridad necesarias al beneficiario para que se tome las medidas preventivas contra el delito a fin de evitar actos ilícitos provenientes del exterior o interior del sitio protegido.</p>
        </div>

        <!-- CLAUSE 7 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>SEPTIMO. - SERVICIO ADICIONAL:</strong> SEGURIDAD 24/7., posee una póliza de responsabilidad civil de $100.000,00 USD (Cien mil dólares de los Estados Unidos de América) contratada con la aseguradora Zúrich, la cual podrá ser utilizada siguiendo los trámites pertinentes que exige la empresa Aseguradora expedidora de dicha póliza. Adicional la Compañía estará dispuesta a atender cualquier requerimiento, sea este de requerimiento de personal de guardia, o de medios que necesitare El Cliente en alguna circunstancia, debiéndose reconocer sus costos como adicionales al presente contrato.</p>
        </div>

        <!-- CLAUSE 8 -->
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

        <!-- CLAUSE 9 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>NOVENA. - FORMA DE PAGO:</strong> El pago se lo realizará dentro de los 5 primeros días de cada mes, si no está al día en sus haberes El Cliente pierde todos sus derechos, en caso de que el pago no se realice por dos meses consecutivos, se procederá a suspender el servicio de guardia virtual sin aviso previo y se procederá a las acciones legales pertinentes. </p>
        </div>

        <!-- CLAUSE 10 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>DECIMA. - TERMINACIÓN DEL CONTRATO:</strong> Las partes contratantes tendrán derecho a dar por terminado el presente contrato, luego de haber cursado las comunicaciones escritas pertinentes, por la violación de cualquiera de las cláusulas de este convenio, o por decisión unilateral de alguna de ellas con por lo menos treinta días de anticipación. Por lo demás se obligan a todas y cada una de las cláusulas estipuladas en este contrato, las mismas que las aceptan y las declaran fielmente cumplir. En caso de terminar anticipadamente e intempestivamente el contrato sin justificación alguna dentro del primer año de contrato, se le pagará a la parte afectada la facturación mensual de dos meses en un tiempo no mayor de 15 días </p>
        </div>

        <!-- CLAUSE 11 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>DECIMA PRIMERA. - JURISDICCIÓN Y COMPETENCIA:</strong> Si se suscitaren divergencias o controversias entre las partes, y no llegaren a un acuerdo amigable directo, utilizarán en primera instancia los métodos alternativos para la solución de conflictos en un centro de Mediación y Arbitraje. Y si no existiera acuerdo, las partes deciden someterse a los jueces civiles del Distrito Metropolitano de Quito. Libre y voluntariamente, las partes expresamente declararan su aceptación a todo lo convenido en el presente contrato y se someten a sus estipulaciones</p>
        </div>

        <p style="margin-top: 40px; font-weight: 700; text-align: center; color: #111; padding-top: 20px; border-top: 1px solid #eee;">
          Para constancia de lo estipulado, las partes firman el presente contrato digital.
        </p>

        ${firmaHTML}

        <!-- ANNEX PAGE -->
        <div style="page-break-before: always; page-break-inside: avoid; border-top: 2px dashed #d4af37; margin-top: 20px; padding-top: 30px;">
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

        ${
          data.clientIdPhoto
            ? `
          <div style="margin-top: 40px; text-align: center; page-break-before: always; page-break-inside: avoid; font-family: 'Times New Roman', Times, serif;">
            <div style="border-bottom: 2px solid #d4af37; padding-bottom: 10px; margin-bottom: 20px;">
                <h4 style="font-weight: 700; color: #000; text-transform: uppercase; font-size: 11pt;">EVIDENCIA: CÉDULA DE IDENTIDAD / RUC</h4>
            </div>
            <div style="display: inline-block; padding: 10px; border: 1px solid #eee; background: #fff; border-radius: 4px;">
                <img src="${data.clientIdPhoto}" crossorigin="anonymous" alt="Cédula" style="max-width: 400px; width: 100%; height: auto;">
            </div>
          </div>
          `
            : ""
        }

      </div>
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
        "warning",
      );
      return;
    }

    if (file.type !== "application/pdf") {
      Swal.fire(
        "Archivo no válido",
        "Por favor suba únicamente archivos en formato PDF.",
        "error",
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
          "error",
        );
        return;
      }

      try {
        saveGuideBtn.disabled = true;
        const progressContainer = document.getElementById(
          "uploadProgressContainer",
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
          subRole,
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
          <button class="card-action-btn btn-delete position-absolute top-0 end-0 m-2" 
                  onclick="eliminarGuia('${guide.id}', '${guide.name}')" 
                  title="Eliminar Guía">
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
        "success",
      );
      cargarGuiasTecnicas(); // Recargar la lista
    } catch (error) {
      console.error("Error al eliminar guía:", error);
      Swal.fire(
        "Error",
        "No se pudo eliminar la guía. Verifique sus permisos.",
        "error",
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
        "warning",
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
            "error",
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
            "warning",
          );
          saveTutorialBtn.disabled = false;
          saveTutorialBtn.innerHTML = "Guardar Tutorial";
          return;
        }

        const progressBar = document.querySelector(
          "#tutorialPdfProgress .progress-bar",
        );
        const progressContainer = document.getElementById(
          "tutorialPdfProgress",
        );
        progressContainer.style.display = "block";
        progressBar.style.width = "50%";

        const base64PDF = await convertFileToBase64(file);
        if (base64PDF.length > 1000000) {
          Swal.fire(
            "Archivo demasiado grande",
            "El PDF debe ser menor a 700KB para este sistema.",
            "error",
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
            </div>
          </div>
          ${
            subRole === "tecnico-jefe"
              ? `
          <button class="card-action-btn btn-delete position-absolute top-0 end-0 m-2" 
                  onclick="eliminarTutorial('${tutorial.id}', '${tutorial.title}')" 
                  title="Eliminar Tutorial"
                  style="z-index: 10;">
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
        "success",
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
      Swal.fire(
        "Atención",
        "El nombre del conjunto es obligatorio.",
        "warning",
      );
      return;
    }

    savePasswordBtn.disabled = true;
    savePasswordBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';

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
        updatedBy: auth.currentUser.email,
      };

      if (passwordId) {
        await db
          .collection("device_passwords")
          .doc(passwordId)
          .update(passwordData);
      } else {
        passwordData.createdAt =
          firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("device_passwords").add(passwordData);
      }

      Swal.fire({
        icon: "success",
        title: "¡Claves Guardadas!",
        text: "La información se ha actualizado correctamente.",
        timer: 1500,
        showConfirmButton: false,
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
    addPasswordModal.addEventListener("hidden.bs.modal", () => {
      document.getElementById("passwordForm").reset();
      document.getElementById("passwordId").value = "";
      document.getElementById("addPasswordModalLabel").textContent =
        "Gestionar Clave de Dispositivo";
    });
  }
}

async function cargarClavesTecnicas() {
  const container = document.getElementById("passwordsContainer");
  if (!container) return;

  container.innerHTML = `<p class="text-center text-white w-100">Cargando claves...</p>`;

  try {
    const query = await db
      .collection("device_passwords")
      .orderBy("complexName", "asc")
      .get();

    window.allPasswords = [];
    query.forEach((doc) => {
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

  passwordsList.forEach((pass) => {
    container.innerHTML += `
      <div class="col-md-6 col-lg-4">
        <div class="card-job h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="text-gold mb-1">${pass.complexName}</h5>
                <span class="badge bg-gold">Gestión Técnica</span>
              </div>
              
              ${
                subRole === "tecnico-jefe" || subRole === "tecnico-obrero"
                  ? `
              <div class="dropdown">
                <button class="btn btn-link text-white p-0" data-bs-toggle="dropdown">
                  <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-dark">
                  <li><a class="dropdown-item" href="#" onclick="editarClave('${pass.id}')"><i class="fa-solid fa-pen me-2"></i> Editar</a></li>
                  <li><a class="dropdown-item text-danger" href="#" onclick="eliminarClave('${pass.id}', '${pass.complexName}')"><i class="fa-solid fa-trash me-2"></i> Eliminar</a></li>
                </ul>
              </div>
              `
                  : ""
              }
            </div>
            
            <div class="bg-dark p-3 rounded mb-3">
              <div class="row g-2">
                <div class="col-6">
                  <span class="text-white-50 x-small d-block">Citófono:</span>
                  <span class="text-white small font-monospace">${
                    pass.citofono || "---"
                  }</span>
                </div>
                <div class="col-6">
                  <span class="text-white-50 x-small d-block">DVR:</span>
                  <span class="text-white small font-monospace">${
                    pass.dvr || "---"
                  }</span>
                </div>
                
                <div class="col-12 border-top border-secondary my-2"></div>
                
                <div class="col-12 col-sm-6 mb-3 mb-sm-0">
                  <div class="mb-2">
                    <span class="text-white-50 x-small d-block">Wifi: ${
                      pass.wifiName || "N/A"
                    }</span>
                    <span class="text-gold small font-monospace d-block text-break">${
                      pass.wifiPass || "---"
                    }</span>
                  </div>
                  <div>
                    <span class="text-white-50 x-small d-block">Cámaras (${
                      pass.camBrand || "N/A"
                    }):</span>
                    <span class="text-white small font-monospace d-block text-break">${
                      pass.camPass || "---"
                    }</span>
                  </div>
                </div>
                
                <div class="col-12 col-sm-6 ps-sm-2 border-top border-sm-0 border-start-sm border-secondary pt-3 pt-sm-0">
                  <span class="text-white-50 x-small d-block mb-1">OBSERVACIONES:</span>
                  <div class="text-white-50 x-small text-break" style="line-height:1.3; font-style: italic;">
                    ${pass.notes ? pass.notes.replace(/\n/g, "<br>") : '<span class="text-muted">Sin notas</span>'}
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

window.editarClave = function (id) {
  const pass = window.allPasswords.find((p) => p.id === id);
  if (!pass) return;

  document.getElementById("passwordId").value = pass.id;
  document.getElementById("passComplexName").value = pass.complexName;
  document.getElementById("passCitofono").value = pass.citofono || "";
  document.getElementById("passDVR").value = pass.dvr || "";
  document.getElementById("passWifiName").value = pass.wifiName || "";
  document.getElementById("passWifiPass").value = pass.wifiPass || "";
  if (document.getElementById("passCamBrand")) {
    document.getElementById("passCamBrand").value =
      pass.camBrand || "Hikvision";
  }
  document.getElementById("passCamPass").value = pass.camPass || "";
  document.getElementById("passNotes").value = pass.notes || "";

  document.getElementById("addPasswordModalLabel").textContent =
    "Editar Datos del Conjunto";

  const modal = new bootstrap.Modal(
    document.getElementById("addPasswordModal"),
  );
  modal.show();
};

window.eliminarClave = async function (id, label) {
  const result = await Swal.fire({
    title: "¿Eliminar registro?",
    text: `¿Estás seguro de que deseas eliminar los datos de "${label}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
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
