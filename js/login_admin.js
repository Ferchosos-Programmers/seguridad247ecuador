// ===============================
// INICIALIZACIÓN GENERAL
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  activarLoginAdmin();
  activarLogout();
  activarRegistroAdmin();


  // Si estamos en gestion_admin.html
  if (document.getElementById("jobForm")) {
    configurarFormulario();
    // cargarTrabajos(); // No cargar al inicio
    // cargarContratos(); // No cargar al inicio
    activarEdicion(); // Activa el formulario de edición  

    // Variables Globales para almacenamiento temporal
    window.allTrabajos = [];
    window.allContratos = [];
    window.allAdmins = [];
    window.allPayments = [];
    window.currentView = "todos";

    // Sidebar navigation
    const sidebarLinks = document.querySelectorAll(".sidebar-link[data-view]");
    const dashboardSection = document.getElementById("dashboardSection");
    const jobsSection = document.getElementById("jobsSection");
    const contractsSection = document.getElementById("contractsSection");
    const createJobBtn = document.getElementById("createJobBtn");
    const createContractBtn = document.getElementById("createContractBtn");

    // Contenedores de filtros secundarios
    const urgencyFilterContainer = document.getElementById("urgencyFilterContainer");
    const nameFilterContainer = document.getElementById("nameFilterContainer");

    // Inputs de filtros secundarios
    const urgencyFilter = document.getElementById("urgencyFilter");
    const nameFilter = document.getElementById("nameFilter");

    function updateView(viewValue) {
      window.currentView = viewValue;

      // Actualizar estado activo en el sidebar
      sidebarLinks.forEach(link => {
        if (link.getAttribute("data-view") === viewValue) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });

      // Ocultar todo por defecto
      if (dashboardSection) dashboardSection.style.display = "none";
      jobsSection.style.display = "none";
      contractsSection.style.display = "none";
      const adminsSection = document.getElementById("adminsSection");
      if (adminsSection) adminsSection.style.display = "none";
      const paymentsSection = document.getElementById("paymentsSection");
      if (paymentsSection) paymentsSection.style.display = "none";

      createJobBtn.style.display = "none";
      createContractBtn.style.display = "none";
      urgencyFilterContainer.style.display = "none";
      nameFilterContainer.style.display = "none";
      
      const btnAddAdmin = document.getElementById("btnAddAdmin");
      if (btnAddAdmin) {
        btnAddAdmin.style.display = "none";
        // Cargar contratos al presionar el botón de agregar admin
        btnAddAdmin.removeEventListener("click", cargarOpcionesContrato);
        btnAddAdmin.addEventListener("click", cargarOpcionesContrato);
      }

      if (viewValue === "finished") {
        jobsSection.style.display = "block";
        createJobBtn.style.display = "flex";
        urgencyFilterContainer.style.display = "block";
        nameFilterContainer.style.display = "block";
        cargarTrabajos();
      } else if (viewValue === "contracts") {
        contractsSection.style.display = "block";
        createContractBtn.style.display = "flex";
        nameFilterContainer.style.display = "block";
        cargarContratos();
      } else if (viewValue === "admins") {
        adminsSection.style.display = "block";
        nameFilterContainer.style.display = "block";
        if (btnAddAdmin) btnAddAdmin.style.display = "block"; 
        cargarAdmins();
      } else if (viewValue === "payments") {
        if (paymentsSection) paymentsSection.style.display = "block";
        nameFilterContainer.style.display = "block";
        cargarPagosPendientes();
      } else if (viewValue === "todos") {
        if (dashboardSection) dashboardSection.style.display = "block";
        actualizarContadoresDashboard();
        renderizarGraficos();
        cargarInfoUsuario();
      } else {
        actualizarContadoresDashboard();
      }

      // Resetear filtros
      urgencyFilter.value = "todas";
      nameFilter.value = "";
    }

    // Event listeners para el sidebar
    sidebarLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = link.getAttribute("data-view");
        updateView(view);

        // Cerrar sidebar en móviles tras selección
        const sidebar = document.getElementById("sidebar");
        if (window.innerWidth <= 991 && sidebar.classList.contains("show")) {
          sidebar.classList.remove("show");
        }
      });
    });

    // Toggle sidebar en móviles
    const mobileToggle = document.getElementById("mobileSidebarToggle");
    if (mobileToggle) {
      mobileToggle.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        sidebar.classList.toggle("show");
      });
    }

    // Event listener para redimensionar gráficos
    window.addEventListener("resize", () => {
      if (window.currentView === "todos") {
        renderizarGraficos();
      }
    });

    // Handle logout from sidebar (Tied to activarLogout)

    // Listeners para filtros secundarios
    urgencyFilter.addEventListener("change", applyFilters);
    nameFilter.addEventListener("input", applyFilters);

    async function actualizarContadoresDashboard() {
      const db = firebase.firestore();
      
      try {
        // Trabajos
        const trabajosSnap = await db.collection("trabajos").get();
        const countTrabajos = document.getElementById("countTrabajos");
        if (countTrabajos) countTrabajos.textContent = trabajosSnap.size;
        
        // Contratos
        const contratosSnap = await db.collection("contracts").get();
        const countContratos = document.getElementById("countContratos");
        if (countContratos) countContratos.textContent = contratosSnap.size;
        
        // Admins (Colección 'users', rol 'ADMIN_CONJUNTO')
        const adminsSnap = await db.collection("users").where("role", "==", "ADMIN_CONJUNTO").get();
        const countAdmins = document.getElementById("countAdmins");
        if (countAdmins) countAdmins.textContent = adminsSnap.size;
        
        // Pagos (Colección 'payments', status 'Pendiente')
        const pagosSnap = await db.collection("payments").where("status", "==", "Pendiente").get();
        const countPayments = document.getElementById("countPayments");
        if (countPayments) countPayments.textContent = pagosSnap.size;
        
      } catch (error) {
        console.error("Error al actualizar contadores:", error);
      }
    }

    // Inicializar dashboard al cargar
    if (window.currentView === "todos") {
      actualizarContadoresDashboard();
      renderizarGraficos();
      cargarInfoUsuario();
      cargarNotificacionesPagosPendientes();
    }

    function applyFilters() {
      const urgencyValue = urgencyFilter ? urgencyFilter.value : "todas";
      const nameValue = nameFilter.value.toLowerCase();
      const currentView = window.currentView;

      if (currentView === "finished" || currentView === "todos") {
        const filteredTrabajos = window.allTrabajos.filter(job => {
          const matchUrgency = urgencyValue === "todas" || job.jobUrgency === urgencyValue;
          const matchName = job.clientName.toLowerCase().includes(nameValue);
          return matchUrgency && matchName;
        });
        renderTrabajos(filteredTrabajos);
      }

      if (currentView === "contracts" || currentView === "todos") {
        const filteredContratos = window.allContratos.filter(contract => {
          const matchName = contract.clientName.toLowerCase().includes(nameValue);
          return matchName;
        });
        renderContratos(filteredContratos);
      }

      if (currentView === "admins") {
        const filteredAdmins = window.allAdmins.filter(admin => {
          const matchName = admin.adminName?.toLowerCase().includes(nameValue) || 
                            admin.complexName?.toLowerCase().includes(nameValue) ||
                            admin.email?.toLowerCase().includes(nameValue);
          return matchName;
        });
        renderAdmins(filteredAdmins);
      }

      if (currentView === "payments") {
        const filteredPayments = window.allPayments.filter(payment => {
          const matchName = payment.userEmail?.toLowerCase().includes(nameValue) || 
                            payment.service?.toLowerCase().includes(nameValue) ||
                            payment.enrichedAdminName?.toLowerCase().includes(nameValue) ||
                            payment.enrichedComplexName?.toLowerCase().includes(nameValue);
          return matchName;
        });
        renderPagos(filteredPayments);
      }
    }

    // Listener para generar PDF
    document.getElementById("generatePdfBtn").addEventListener("click", () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // ======================================================
      //  1. CONFIGURACIÓN DE ESTILOS Y COLORES
      // ======================================================
      const primaryColor = "#d4af37"; // Dorado
      const textColor = "#000"; // Blanco
      const backgroundColor = "#fff"; // Negro/Carbón

      // ======================================================
      //  2. CABECERA DEL DOCUMENTO
      // ======================================================
      const logo = new Image();
      logo.src = "assets/img/logoc.png"; // Usar logo claro para fondo oscuro

      logo.onload = function () {
        // Fondo general del documento
        doc.setFillColor(backgroundColor);
        doc.rect(0, 0, 210, 297, "F");

        // Fondo de la cabecera
        doc.setFillColor(primaryColor);
        doc.rect(0, 0, 210, 30, "F");

        // Logo
        doc.addImage(logo, "PNG", 15, 5, 20, 20);

        // Título
        doc.setFont("Times-Roman", "bold");
        doc.setFontSize(22);
        doc.setTextColor("#FFFFFF");
        doc.text("Informe Técnico de Trabajo", 45, 18);

        // ======================================================
        //  3. CUERPO DEL INFORME
        // ======================================================
        let y = 45; // Posición inicial en Y

        // --- Detalles del Cliente y Trabajo ---
        doc.setFont("Times-Roman", "bold");
        doc.setFontSize(16);
        doc.setTextColor(primaryColor);
        doc.text("Detalles del Cliente y Trabajo", 15, y);
        y += 8;

        doc.setFont("Times-Roman", "normal");
        doc.setFontSize(12);
        doc.setTextColor(textColor);
        doc.text(
          `Cliente: ${document.getElementById("reportClientName").textContent}`,
          20,
          y
        );
        y += 7;
        doc.text(
          `Fecha de Asignación: ${document.getElementById("reportJobDate").textContent
          }`,
          20,
          y
        );
        y += 12;

        // --- Detalles del Informe ---
        doc.setFont("Times-Roman", "bold");
        doc.setFontSize(16);
        doc.setTextColor(primaryColor);
        doc.text("Estado y Finalización del Informe", 15, y);
        y += 8;

        doc.setFont("Times-Roman", "normal");
        doc.setFontSize(12);
        doc.setTextColor(textColor);
        doc.text(
          `Estado: ${document.getElementById("reportStatus").textContent}`,
          20,
          y
        );
        y += 7;
        doc.text(
          `Finalizado el: ${document.getElementById("reportDate").textContent
          } a las: ${document.getElementById("reportTime").textContent}`,
          20,
          y
        );
        y += 12;

        // --- Informe Escrito ---
        doc.setFont("Times-Roman", "bold");
        doc.setFontSize(16);
        doc.setTextColor(primaryColor);
        doc.text("Informe de Trabajo Realizado", 15, y);
        y += 8;

        doc.setFont("Times-Roman", "normal");
        doc.setFontSize(12);
        doc.setTextColor(textColor);
        const reportText = doc.splitTextToSize(
          document.getElementById("reportText").textContent,
          175
        );
        doc.text(reportText, 20, y);
        y += reportText.length * 6 + 10;

        // --- Evidencia Fotográfica ---
        doc.setFont("Times-Roman", "bold");
        doc.setFontSize(16);
        doc.setTextColor(primaryColor);
        doc.text("Evidencia Fotográfica", 15, y);
        y += 10;

        const img1 = document.getElementById("reportImage1");
        const img2 = document.getElementById("reportImage2");

        if (img1.src) doc.addImage(img1, "PNG", 15, y, 80, 60);
        if (img2.src) doc.addImage(img2, "PNG", 115, y, 80, 60);
        y += 70;

        // ======================================================
        //  4. PIE DE PÁGINA
        // ======================================================
        doc.setFillColor(primaryColor);
        doc.rect(0, 287, 210, 10, "F");
        doc.setFont("Times-Roman", "normal");
        doc.setFontSize(10);
        doc.setTextColor("#FFFFFF");
        doc.text(
          "© 2025 Seguridad 247 Ecuador — Todos los derechos reservados",
          105,
          293,
          { align: "center" }
        );

        // ======================================================
        //  5. GUARDAR EL PDF
        // ======================================================
        doc.save("reporte-tecnico-final.pdf");
      };

      logo.onerror = function () {
        Swal.fire("Error", "No se pudo cargar el logo para el PDF.", "error");
      };
    });

    // Lógica para el formulario de contrato
    configurarFormularioContrato();
  }
});

// =========================================
//  CONFIGURAR FORMULARIO DE CONTRATO
// =========================================
function configurarFormularioContrato() {
  const contractForm = document.getElementById("contractForm");
  if (!contractForm) return;

  // Establecer valores por defecto
  document.getElementById("contractCity").value = "Quito";
  document.getElementById("contractDate").valueAsDate = new Date();

  contractForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const db = firebase.firestore();

    // Recopilar datos del formulario
    const contractData = {
      city: document.getElementById("contractCity").value,
      date: document.getElementById("contractDate").value,
      clientName: document.getElementById("contractClientName").value,
      clientId: document.getElementById("contractClientId").value,
      clientAddress: document.getElementById("contractClientAddress").value,
      clientPhone: document.getElementById("contractClientPhone").value,
      clientEmail: document.getElementById("contractClientEmail").value,
      servicePrice: document.getElementById("contractServicePrice").value, // Nuevo campo
      paymentMethod: document.getElementById("contractPaymentMethod").value,
      paymentPeriod: document.getElementById("contractPaymentPeriod").value,
      duration: document.getElementById("contractDuration").value,
      terminationNotice: document.getElementById("contractTerminationNotice")
        .value,
      companyName: document.getElementById("contractCompanyName").value,
      companyPosition: document.getElementById("contractCompanyPosition").value,
      createdAt: new Date(),
    };

    try {
      // Guardar en Firestore
      await db.collection("contracts").add(contractData);

      Swal.fire("Éxito", "Contrato guardado correctamente", "success");

      // Generar y mostrar el contrato
      mostrarContrato(contractData);

      // Cerrar modal de creación y abrir modal de visualización
      const createModal = bootstrap.Modal.getInstance(
        document.getElementById("createContractModal")
      );
      createModal.hide();

      const viewModal = new bootstrap.Modal(
        document.getElementById("viewContractModal")
      );
      viewModal.show();

      cargarContratos(); // Recargar contratos para mostrar el nuevo
    } catch (error) {
      Swal.fire(
        "Error",
        `No se pudo guardar el contrato: ${error.message}`,
        "error"
      );
    }
  });

  // Listener para generar PDF del contrato
  document
    .getElementById("generateContractPdfBtn")
    .addEventListener("click", async function () {
      const contractId = document.getElementById("currentContractId").value;

      if (!contractId) {
        Swal.fire(
          "Error",
          "No se pudo obtener la información del contrato.",
          "error"
        );
        return;
      }

      try {
        // Obtener datos completos del contrato
        const doc = await db.collection("contracts").doc(contractId).get();
        if (!doc.exists) {
          Swal.fire("Error", "No se encontró el contrato.", "error");
          return;
        }

        const data = doc.data();
        const { jsPDF } = window.jspdf;
        const pdfDoc = new jsPDF();
        const primaryColor = "#d4af37";
        const textColor = "#000";
        const backgroundColor = "#fff";
        const pageHeight = 297;
        const pageWidth = 210;
        const marginTop = 35;
        const marginBottom = 25;
        const maxY = pageHeight - marginBottom;

        // Función para agregar nueva página con cabecera moderna
        function addPageWithHeader() {
          pdfDoc.addPage();
          pdfDoc.setFillColor(backgroundColor);
          pdfDoc.rect(0, 0, pageWidth, pageHeight, "F");

          // Cabecera moderna con gradiente y diseño elegante
          pdfDoc.setFillColor("#1a1a1a");
          pdfDoc.rect(0, 0, pageWidth, 30, "F");
          pdfDoc.setFillColor(primaryColor);
          pdfDoc.rect(0, 0, pageWidth, 5, "F");

          // Título con estilo moderno
          pdfDoc.setFont("helvetica", "bold");
          pdfDoc.setFontSize(20);
          pdfDoc.setTextColor("#FFFFFF");
          pdfDoc.text(
            "CONTRATO DE PRESTACIÓN DEL SERVICIO",
            pageWidth / 2,
            13,
            { align: "center" }
          );
          pdfDoc.setFontSize(16);
          pdfDoc.text("DE GUARDIA VIRTUAL", pageWidth / 2, 22, {
            align: "center",
          });

          // Línea decorativa debajo del título
          pdfDoc.setDrawColor(primaryColor);
          pdfDoc.setLineWidth(0.5);
          pdfDoc.line(20, 28, pageWidth - 20, 28);

          return marginTop + 5;
        }

        // Función para agregar footer a una página (estilo moderno)
        function addFooterToPage() {
          // Fondo del footer con estilo moderno
          pdfDoc.setFillColor("#1a1a1a");
          pdfDoc.rect(0, maxY, pageWidth, 12, "F");
          pdfDoc.setFillColor(primaryColor);
          pdfDoc.rect(0, maxY, pageWidth, 2, "F");
          pdfDoc.setFont("helvetica", "normal");
          pdfDoc.setFontSize(8);
          pdfDoc.setTextColor("#FFFFFF");
          pdfDoc.text(
            "© 2025 Seguridad 247 Ecuador — Todos los derechos reservados",
            pageWidth / 2,
            maxY + 8,
            { align: "center" }
          );
        }

        // Función para verificar y agregar página si es necesario
        function checkAndAddPage(currentY, neededSpace = 10) {
          if (currentY + neededSpace > maxY) {
            // Agregar footer a la página actual antes de cambiar
            addFooterToPage();
            return addPageWithHeader();
          }
          return currentY;
        }

        // Función para agregar texto con manejo de páginas múltiples
        function addText(text, x, y, options = {}) {
          const lines = pdfDoc.splitTextToSize(text, options.maxWidth || 180);
          let currentY = y;

          for (let i = 0; i < lines.length; i++) {
            currentY = checkAndAddPage(currentY, 6);
            pdfDoc.text(lines[i], x, currentY);
            currentY += 6;
          }

          return currentY;
        }

        // Inicializar primera página con estilo moderno
        pdfDoc.setFillColor(backgroundColor);
        pdfDoc.rect(0, 0, pageWidth, pageHeight, "F");

        // Cabecera moderna
        pdfDoc.setFillColor("#1a1a1a");
        pdfDoc.rect(0, 0, pageWidth, 30, "F");
        pdfDoc.setFillColor(primaryColor);
        pdfDoc.rect(0, 0, pageWidth, 5, "F");

        // Título con estilo moderno
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(20);
        pdfDoc.setTextColor("#FFFFFF");
        pdfDoc.text("CONTRATO DE PRESTACIÓN DEL SERVICIO", pageWidth / 2, 13, {
          align: "center",
        });
        pdfDoc.setFontSize(16);
        pdfDoc.text("DE GUARDIA VIRTUAL", pageWidth / 2, 22, {
          align: "center",
        });

        // Línea decorativa debajo del título
        pdfDoc.setDrawColor(primaryColor);
        pdfDoc.setLineWidth(0.5);
        pdfDoc.line(20, 28, pageWidth - 20, 28);

        let y = marginTop + 5;

        // Fecha y ciudad
        const contractDate = new Date(data.date + "T00:00:00");
        const day = contractDate.getDate();
        const month = contractDate.toLocaleString("es-ES", { month: "long" });
        const year = contractDate.getFullYear();

        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(11);
        pdfDoc.setTextColor("#333333");
        y = addText(
          `En la ciudad de ${data.city}, a los ${day} días del mes de ${month} del año ${year}, se celebra el presente Contrato de Prestación del Servicio de Guardia Virtual, al tenor de las siguientes cláusulas:`,
          20,
          y,
          { maxWidth: 170 }
        );
        y += 10;

        // COMPARECIENTES con estilo moderno
        y = checkAndAddPage(y, 10);

        // Línea superior decorativa
        pdfDoc.setDrawColor(primaryColor);
        pdfDoc.setLineWidth(1);
        pdfDoc.line(15, y - 9, pageWidth - 15, y - 9);

        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(13);
        pdfDoc.setTextColor("#1a1a1a");
        pdfDoc.text("COMPARECIENTES", 15, y);
        y += 10;

        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(10.5);
        pdfDoc.setTextColor("#444444");
        y = addText(
          "Comparecen a la celebración del presente contrato, por una parte:",
          15,
          y,
          { maxWidth: 180 }
        );
        y = addText(
          '247 DEL ECUADOR, empresa dedicada a la prestación de servicios de seguridad electrónica y vigilancia virtual, legalmente constituida conforme a las leyes de la República del Ecuador, a quien en adelante se la denominará "LA EMPRESA".',
          15,
          y,
          { maxWidth: 180 }
        );
        y += 5;
        y = addText("Y por otra parte:", 15, y, { maxWidth: 180 });
        y = addText(
          `Nombre completo del contratante: ${data.clientName}`,
          15,
          y,
          { maxWidth: 180 }
        );
        y = addText(`Cédula de identidad: ${data.clientId}`, 15, y, {
          maxWidth: 180,
        });
        y = addText(`Dirección domiciliaria: ${data.clientAddress}`, 15, y, {
          maxWidth: 180,
        });
        y = addText(`Teléfono: ${data.clientPhone}`, 15, y, { maxWidth: 180 });
        y = addText(`Correo electrónico: ${data.clientEmail}`, 15, y, {
          maxWidth: 180,
        });
        y += 5;
        y = addText(
          'A quien en adelante se lo denominará "EL CONTRATANTE".',
          15,
          y,
          { maxWidth: 180 }
        );
        y = addText(
          "Las partes declaran tener capacidad legal para contratar y obligarse, y de mutuo acuerdo celebran el presente contrato bajo las siguientes cláusulas:",
          15,
          y,
          { maxWidth: 180 }
        );
        y += 5;

        // CLÁUSULAS con estilo moderno
        y = checkAndAddPage(y, 12);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(11.5);
        pdfDoc.setTextColor("#1a1a1a");
        pdfDoc.text("CLÁUSULA PRIMERA: OBJETO DEL CONTRATO", 15, y);
        y += 8;
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(10);
        pdfDoc.setTextColor("#444444");
        y = addText(
          "LA EMPRESA se obliga a prestar a EL CONTRATANTE el Servicio de Guardia Virtual, el cual consiste en la monitoreo remoto, vigilancia electrónica y supervisión virtual de los sistemas de seguridad instalados, tales como cámaras de videovigilancia, alarmas u otros dispositivos tecnológicos, según el plan contratado.",
          15,
          y,
          { maxWidth: 180 }
        );
        y += 5;

        y = checkAndAddPage(y, 12);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(11.5);
        pdfDoc.setTextColor("#1a1a1a");
        pdfDoc.text(
          "CLÁUSULA QUINTA: VALOR DEL CONTRATO Y FORMA DE PAGO",
          15,
          y
        );
        y += 8;
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(10);
        pdfDoc.setTextColor("#444444");
        y = addText(
          `El valor del servicio será de $${data.servicePrice} USD más IVA, acordado entre las partes según el plan contratado, el cual constará en un anexo o factura correspondiente.`,
          15,
          y,
          { maxWidth: 180 }
        );
        y = addText(`La forma de pago será: ${data.paymentMethod}`, 15, y, {
          maxWidth: 180,
        });
        y = addText(
          `La periodicidad del pago será: ${data.paymentPeriod}`,
          15,
          y,
          { maxWidth: 180 }
        );
        y += 5;

        y = checkAndAddPage(y, 12);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(11.5);
        pdfDoc.setTextColor("#1a1a1a");
        pdfDoc.text("CLÁUSULA SEXTA: PLAZO DE DURACIÓN", 15, y);
        y += 8;
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(10);
        pdfDoc.setTextColor("#444444");
        y = addText(
          `El presente contrato tendrá una duración de ${data.duration} meses, contados a partir de la fecha de su firma, pudiendo renovarse previo acuerdo entre las partes.`,
          15,
          y,
          { maxWidth: 180 }
        );
        y += 5;

        y = checkAndAddPage(y, 15);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(11.5);
        pdfDoc.setTextColor("#1a1a1a");
        pdfDoc.text("CLÁUSULA NOVENA: TERMINACIÓN DEL CONTRATO", 15, y);
        y += 8;
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(10);
        pdfDoc.setTextColor("#444444");
        y = addText(`El presente contrato podrá darse por terminado:`, 15, y, {
          maxWidth: 180,
        });
        y = addText("a) Por mutuo acuerdo entre las partes.", 20, y, {
          maxWidth: 175,
        });
        y = addText(
          "b) Por incumplimiento de cualquiera de las cláusulas.",
          20,
          y,
          { maxWidth: 175 }
        );
        y = addText(
          `c) Por decisión unilateral, con aviso previo de ${data.terminationNotice} días.`,
          20,
          y,
          { maxWidth: 175 }
        );
        y += 10;

        // FIRMAS - Estilo moderno y elegante
        y = checkAndAddPage(y, 100);
        const isCompleted = data.clientSignature && data.clientIdPhoto;

        // Línea separadora antes de las firmas
        pdfDoc.setDrawColor("#d4af37");
        pdfDoc.setLineWidth(0.5);
        pdfDoc.line(15, y - 5, pageWidth - 15, y - 5);
        y += 5;

        // Empresa (lado izquierdo)
        const empresaStartY = y;
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(11);
        pdfDoc.setTextColor("#1a1a1a");
        pdfDoc.text("POR LA EMPRESA", 15, y);
        y += 8;
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(10);
        pdfDoc.setTextColor("#444444");
        pdfDoc.text("247 DEL ECUADOR", 15, y);
        y += 7;

        // Agregar imagen de firma de la empresa
        try {
          const empresaFirmaImg = new Image();
          empresaFirmaImg.src = "assets/img/firma.png";
          await new Promise((resolve) => {
            empresaFirmaImg.onload = () => {
              // Verificar si hay espacio para la imagen
              if (y + 25 > maxY) {
                y = checkAndAddPage(y, 25);
              }
              pdfDoc.addImage(empresaFirmaImg, "PNG", 15, y, 50, 20);
              resolve();
            };
            empresaFirmaImg.onerror = () => {
              // Si falla la carga, mostrar línea de firma
              pdfDoc.text("Firma: ________________________________", 15, y);
              resolve();
            };
          });
          y += 25;
        } catch (e) {
          // Si hay error, mostrar línea de firma
          pdfDoc.text("Firma: ________________________________", 15, y);
          y += 7;
        }

        pdfDoc.text(`Nombre: ${data.companyName}`, 15, y);
        y += 6;
        pdfDoc.text(`Cargo: ${data.companyPosition}`, 15, y);

        // Cliente (lado derecho)
        let clientY = empresaStartY;
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(11);
        pdfDoc.setTextColor("#1a1a1a");
        pdfDoc.text("EL CONTRATANTE", 110, clientY);
        clientY += 8;

        // Si hay firma, agregarla
        if (isCompleted && data.clientSignature) {
          try {
            const signatureImg = new Image();
            signatureImg.src = data.clientSignature;
            await new Promise((resolve) => {
              signatureImg.onload = () => {
                // Verificar si hay espacio para la imagen
                if (clientY + 25 > maxY) {
                  clientY = checkAndAddPage(clientY, 25);
                }
                pdfDoc.addImage(signatureImg, "PNG", 110, clientY, 50, 20);
                resolve();
              };
              signatureImg.onerror = () => {
                pdfDoc.text(
                  "Firma: ________________________________",
                  110,
                  clientY
                );
                resolve();
              };
            });
            clientY += 28;
          } catch (e) {
            pdfDoc.text(
              "Firma: ________________________________",
              110,
              clientY
            );
            clientY += 7;
          }
        } else {
          pdfDoc.text("Firma: ________________________________", 110, clientY);
          clientY += 7;
        }

        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(10);
        pdfDoc.setTextColor("#444444");
        pdfDoc.text(`Nombre completo: ${data.clientName}`, 110, clientY);
        clientY += 7;
        pdfDoc.text(`Cédula: ${data.clientId}`, 110, clientY);
        clientY += 7;
        pdfDoc.text(`Fecha: ${day} de ${month} de ${year}`, 110, clientY);

        // Calcular la posición Y máxima después de las firmas
        const maxSignatureY = Math.max(y, clientY + 5);
        let cedulaY = maxSignatureY + 15;

        // Si hay foto de cédula, agregarla centrada debajo de las firmas
        if (isCompleted && data.clientIdPhoto) {
          try {
            const idPhotoImg = new Image();
            idPhotoImg.src = data.clientIdPhoto;

            await new Promise((resolve) => {
              idPhotoImg.onload = () => {
                // Espacio mínimo
                if (cedulaY + 85 > maxY) {
                  cedulaY = checkAndAddPage(cedulaY, 85);
                }

                // Título
                pdfDoc.setFont("helvetica", "bold");
                pdfDoc.setFontSize(10);
                pdfDoc.setTextColor("#1a1a1a");
                pdfDoc.text(
                  "Cédula de Identidad del Contratante",
                  pageWidth / 2,
                  cedulaY,
                  { align: "center" }
                );
                cedulaY += 5;

                // 📐 Tamaño REAL proporcional (basado en 85.60 × 53.98 mm)
                const imageWidth = 85.60; // mm
                const imageHeight = 53.98; // mm

                // Centro exacto horizontal
                const centerX = (pageWidth - imageWidth) / 2;

                // 🟢 Imagen HORIZONTAL y CENTRADA
                pdfDoc.addImage(
                  idPhotoImg,
                  "PNG",
                  centerX,
                  cedulaY,
                  imageWidth,
                  imageHeight
                );

                resolve();
              };

              idPhotoImg.onerror = resolve;
            });
          } catch (e) {
            // continuar sin imagen si falla
          }
        }

        // Agregar footer a todas las páginas
        const pageCount = pdfDoc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdfDoc.setPage(i);
          addFooterToPage();
        }

        // Guardar PDF
        pdfDoc.save(`contrato-${data.clientName}-${day}-${month}-${year}.pdf`);
      } catch (error) {
        console.error("Error al generar PDF:", error);
        Swal.fire("Error", "No se pudo generar el PDF del contrato.", "error");
      }
    });
}

// =========================================
//  MOSTRAR CONTRATO GENERADO
// =========================================
function mostrarContrato(data) {
  const contractContentArea = document.getElementById("contractContentArea");
  const contractDate = new Date(data.date + "T00:00:00"); // Asegurar que la fecha se interprete correctamente

  const day = contractDate.getDate();
  const month = contractDate.toLocaleString("es-ES", { month: "long" });
  const year = contractDate.getFullYear();

  // Verificar si el contrato está completado (tiene firma y cédula)
  const isCompleted = data.clientSignature && data.clientIdPhoto;

  // Mostrar firma si existe
  const firmaHTML =
    isCompleted && data.clientSignature
      ? `<p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Firma:</p><div style="margin: 15px 0;"><img src="${data.clientSignature}" alt="Firma del cliente" style="max-width: 200px; border: 2px solid #d4af37; background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); display: block;"></div>`
      : '<p style="font-size: 14px; margin-bottom: 10px; color: #555555;">Firma: ________________________________</p>';

  // Mostrar cédula si existe
  const cedulaHTML =
    isCompleted && data.clientIdPhoto
      ? `<p style="font-size: 14px; margin-bottom: 10px; color: #555555; margin-top: 20px;">Cédula de Identidad:</p><div style="margin: 15px 0; text-align: center;"><img src="${data.clientIdPhoto}" alt="Cédula del cliente" style="max-width: 100%; max-height: 200px; border: 2px solid #d4af37; background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); display: inline-block;"></div>`
      : "";

  const content = `
    <div style="font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.8; color: #2c3e50; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
      <h4 style="font-size: 24px; font-weight: 700; color: #1a1a1a; text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #d4af37; letter-spacing: 1px;">CONTRATO DE PRESTACIÓN DEL SERVICIO DE GUARDIA VIRTUAL</h4>
      
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">En la ciudad de <strong style="color: #1a1a1a; font-weight: 600;">${data.city
    }</strong>, a los ${day} días del mes de ${month} del año ${year}, se celebra el presente Contrato de Prestación del Servicio de Guardia Virtual, al tenor de las siguientes cláusulas:</p>
      
      <h5 style="font-size: 18px; font-weight: 700; color: #d4af37; margin-top: 30px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e8e8e8; letter-spacing: 0.5px;">COMPARECIENTES</h5>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">Comparecen a la celebración del presente contrato, por una parte:</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;"><strong style="color: #1a1a1a; font-weight: 600;">247 DEL ECUADOR</strong>, empresa dedicada a la prestación de servicios de seguridad electrónica y vigilancia virtual, legalmente constituida conforme a las leyes de la República del Ecuador, a quien en adelante se la denominará "LA EMPRESA".</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">Y por otra parte:</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;"><strong style="color: #1a1a1a; font-weight: 600;">Nombre completo del contratante:</strong> ${data.clientName
    }<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Cédula de identidad:</strong> ${data.clientId
    }<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Dirección domiciliaria:</strong> ${data.clientAddress
    }<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Teléfono:</strong> ${data.clientPhone
    }<br>
      <strong style="color: #1a1a1a; font-weight: 600;">Correo electrónico:</strong> ${data.clientEmail
    }</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">A quien en adelante se lo denominará "EL CONTRATANTE".</p>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">Las partes declaran tener capacidad legal para contratar y obligarse, y de mutuo acuerdo celebran el presente contrato bajo las siguientes cláusulas:</p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA PRIMERA: OBJETO DEL CONTRATO</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">LA EMPRESA se obliga a prestar a EL CONTRATANTE el Servicio de Guardia Virtual, el cual consiste en la monitoreo remoto, vigilancia electrónica y supervisión virtual de los sistemas de seguridad instalados, tales como cámaras de videovigilancia, alarmas u otros dispositivos tecnológicos, según el plan contratado.</p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA QUINTA: VALOR DEL CONTRATO Y FORMA DE PAGO</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">El valor del servicio será de <strong style="color: #1a1a1a; font-weight: 600;">$${data.servicePrice
    } USD más IVA</strong>, acordado entre las partes según el plan contratado, el cual constará en un anexo o factura correspondiente.<br>
      La forma de pago será: <strong style="color: #1a1a1a; font-weight: 600;">${data.paymentMethod
    }</strong><br>
      La periodicidad del pago será: <strong style="color: #1a1a1a; font-weight: 600;">${data.paymentPeriod
    }</strong></p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA SEXTA: PLAZO DE DURACIÓN</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">El presente contrato tendrá una duración de <strong style="color: #1a1a1a; font-weight: 600;">${data.duration
    } meses</strong>, contados a partir de la fecha de su firma, pudiendo renovarse previo acuerdo entre las partes.</p>

      <h6 style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 25px; margin-bottom: 12px; padding-left: 15px; border-left: 4px solid #d4af37;">CLÁUSULA NOVENA: TERMINACIÓN DEL CONTRATO</h6>
      <p style="font-size: 14px; line-height: 1.9; margin-bottom: 15px; color: #444444; text-align: justify;">El presente contrato podrá darse por terminado:<br>
      a) Por mutuo acuerdo entre las partes.<br>
      b) Por incumplimiento de cualquiera de las cláusulas.<br>
      c) Por decisión unilateral, con aviso previo de <strong style="color: #1a1a1a; font-weight: 600;">${data.terminationNotice
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

    <p style="font-size:14px;color:#555;">Nombre completo: ${data.clientName
    }</p>
    <p style="font-size:14px;color:#555;">Cédula: ${data.clientId}</p>
    <p style="font-size:14px;color:#555;">Fecha: ${contractDate.toLocaleDateString(
      "es-EC"
    )}</p>
  </div>

</div>

${data.clientIdPhoto
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

// ===========================
// ✅ LOGIN ADMIN
// ===========================
function activarLoginAdmin() {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("adminUser").value;
    const password = document.getElementById("adminPassword").value;

    auth
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "¡Login exitoso!",
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          const modalEl = document.getElementById("loginModalAdmin");
          const modal = bootstrap.Modal.getInstance(modalEl);
          modal.hide();

          window.location.href = "gestion_admin.html";
        });
      })
      .catch(() => {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Usuario o contraseña incorrectos",
        });
      });
  });
}

// ===========================
// 🚪 CERRAR SESIÓN
// ===========================
function activarLogout() {
  const logoutBtns = [
    document.getElementById("logoutBtn"),
    document.getElementById("sidebarLogout"),
    document.getElementById("logoutBtnMobile")
  ];

  logoutBtns.forEach(btn => {
    if (!btn) return;
    
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      
      Swal.fire({
        title: "¿Cerrar Sesión?",
        text: "¿Estás seguro de que deseas salir del sistema?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#d4af37",
        cancelButtonColor: "#000",
        confirmButtonText: "Sí, salir",
        cancelButtonText: "No, quedarme",
        background: "#1a1a1a",
        color: "#fff"
      }).then((result) => {
        if (result.isConfirmed) {
          auth.signOut()
            .then(() => {
              Swal.fire({
                icon: "success",
                title: "Sesión cerrada",
                timer: 1500,
                showConfirmButton: false,
                background: "#1a1a1a",
                color: "#fff"
              }).then(() => {
                window.location.href = "control_center.html";
              });
            })
            .catch((error) => {
              console.error("Error al cerrar sesión:", error);
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo cerrar sesión correctamente",
                background: "#1a1a1a",
                color: "#fff"
              });
            });
        }
      });
    });
  });
}

// ===========================================================
// 🛠️ CRUD DE TRABAJOS EN FIRESTORE
// ===========================================================

// ===========================
// 📝 GUARDAR TRABAJO NUEVO
// ===========================
function configurarFormulario() {
  const form = document.getElementById("jobForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const clientName = document.getElementById("clientName").value;
    const jobDate = document.getElementById("jobDate").value;
    const jobUrgency = document.getElementById("jobUrgency").value;
    const contactName = document.getElementById("contactName").value;
    const contactPhone = document.getElementById("contactPhone").value;

    try {
      await db.collection("trabajos").add({
        clientName,
        jobDate,
        jobUrgency,
        contactName,
        contactPhone,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      Swal.fire({
        icon: "success",
        title: "Trabajo agregado",
        timer: 1500,
        showConfirmButton: false,
      });

      form.reset();

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addJobModal")
      );
      modal.hide();

      cargarTrabajos();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo guardar el trabajo", "error");
    }
  });
}

// ===========================
// 📌 CARGAR TRABAJOS
// ===========================
async function cargarTrabajos() {
  const container = document.getElementById("jobsContainer");
  container.innerHTML = `<p style="color:white">Cargando trabajos...</p>`;

  try {
    const query = await db
      .collection("trabajos")
      .orderBy("createdAt", "desc")
      .get();

    // Guardar en variable global para filtrar sin recargar
    window.allTrabajos = [];
    query.forEach(doc => {
      window.allTrabajos.push({ id: doc.id, ...doc.data() });
    });

    renderTrabajos(window.allTrabajos);
  } catch (error) {
    console.error("Error cargando trabajos:", error);
    container.innerHTML = `<p style="color:red">Error al cargar trabajos</p>`;
  }
}

function renderTrabajos(trabajosList) {
  const container = document.getElementById("jobsContainer");
  container.innerHTML = "";

  if (trabajosList.length === 0) {
    container.innerHTML = `<p style="color:white; text-align:center;">No se encontraron trabajos.</p>`;
    return;
  }

  trabajosList.forEach((data) => {
    let reportButton = "";
    if (data.status === "Culminado") {
      reportButton = `
        <button class="btn-view-report mt-2" onclick="verReporte('${data.id}')">
          <i class="fa-solid fa-eye"></i> Ver Reporte
        </button>`;
    }

    container.innerHTML += `
      <div class="col-lg-4 col-md-6 col-12">
        <div class="job-card">
          <h5>${data.clientName}</h5>

          <div class="job-divider"></div>

          <p><strong>Fecha:</strong> ${data.jobDate}</p>

          <p>
            <strong>Urgencia:</strong>
            <span class="badge 
              ${data.jobUrgency === "Normal"
        ? "badge-normal"
        : data.jobUrgency === "Urgente"
          ? "badge-urgente"
          : "badge-critico"
      }">
              ${data.jobUrgency}
            </span>
          </p>

          <p><strong>Contacto:</strong> ${data.contactName}</p>
          <p><strong>Teléfono:</strong> ${data.contactPhone}</p>
          
          ${data.status ? `<p><strong>Estado:</strong> ${data.status}</p>` : ""}

          <div class="d-flex gap-2 mt-3">
            <button class="btn-edit" onclick="cargarTrabajoParaEditar('${data.id
      }')">
              <i class="fa-solid fa-pen-to-square"></i> Editar
            </button>

            <button class="btn-delete" onclick="eliminarTrabajo('${data.id}')">
              <i class="fa-solid fa-trash"></i> Eliminar
            </button>
          </div>
          ${reportButton}
        </div>
      </div>
    `;
  });
}

// ===========================
// 👁️ VER REPORTE
// ===========================
async function verReporte(id) {
  try {
    const doc = await db.collection("trabajos").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "No se encontró el trabajo", "error");
      return;
    }

    const data = doc.data();

    // Formatear fecha y hora
    const completionDateTime = data.reportDate.toDate();
    const completionDate = completionDateTime.toLocaleDateString("es-ES");
    const completionTime = completionDateTime.toLocaleTimeString("es-ES");

    // Llenar detalles del trabajo
    document.getElementById("reportClientName").innerText = data.clientName;
    document.getElementById("reportJobDate").innerText = data.jobDate;

    // Llenar informe técnico
    document.getElementById("reportStatus").innerText = data.status;
    document.getElementById("reportDate").innerText = completionDate;
    document.getElementById("reportTime").innerText = completionTime;
    document.getElementById("reportText").innerText = data.report;
    document.getElementById("reportImage1").src = data.evidenceBase64[0];
    document.getElementById("reportImage2").src = data.evidenceBase64[1];

    const reportModal = new bootstrap.Modal(
      document.getElementById("reportModal")
    );
    reportModal.show();
  } catch (error) {
    console.error("Error al cargar el reporte: ", error);
    Swal.fire("Error", "No se pudo cargar el reporte.", "error");
  }
}

// ===========================
// 🗑️ ELIMINAR TRABAJO
// ===========================
function eliminarTrabajo(id) {
  Swal.fire({
    title: "¿Eliminar trabajo?",
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d4af37",
    cancelButtonColor: "#000",
    confirmButtonText: "Eliminar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      await db.collection("trabajos").doc(id).delete();

      Swal.fire("Eliminado", "El trabajo ha sido eliminado.", "success");

      cargarTrabajos();
    }
  });
}

// ===========================================================
// ✏️ FUNCIONES PARA EDITAR TRABAJO
// ===========================================================

// ===========================
// ✏️ CARGAR DATOS EN EL MODAL
// ===========================
async function cargarTrabajoParaEditar(id) {
  const doc = await db.collection("trabajos").doc(id).get();
  const data = doc.data();

  document.getElementById("editJobId").value = id;
  document.getElementById("editClientName").value = data.clientName;
  document.getElementById("editJobDate").value = data.jobDate;
  document.getElementById("editJobUrgency").value = data.jobUrgency;
  document.getElementById("editContactName").value = data.contactName;
  document.getElementById("editContactPhone").value = data.contactPhone;

  const modal = new bootstrap.Modal(document.getElementById("editJobModal"));
  modal.show();
}

// ===========================
// 💾 ACTUALIZAR TRABAJO
// ===========================
function activarEdicion() {
  const editForm = document.getElementById("editJobForm");
  if (!editForm) return;

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("editJobId").value;

    const updatedData = {
      clientName: document.getElementById("editClientName").value,
      jobDate: document.getElementById("editJobDate").value,
      jobUrgency: document.getElementById("editJobUrgency").value,
      contactName: document.getElementById("editContactName").value,
      contactPhone: document.getElementById("editContactPhone").value,
    };

    try {
      await db.collection("trabajos").doc(id).update(updatedData);

      Swal.fire({
        icon: "success",
        title: "Trabajo actualizado",
        timer: 1500,
        showConfirmButton: false,
      });

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editJobModal")
      );
      modal.hide();

      cargarTrabajos();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo actualizar el trabajo", "error");
    }
  });
}

// =========================================
//  CARGAR CONTRATOS
// =========================================
async function cargarContratos() {
  const container = document.getElementById("contractsContainer");
  if (!container) return;

  container.innerHTML = `<p style="color:white">Cargando contratos...</p>`;

  try {
    const query = await db
      .collection("contracts")
      .orderBy("createdAt", "desc")
      .get();

    // Guardar en variable global para filtrar
    window.allContratos = [];
    query.forEach(doc => {
      window.allContratos.push({ id: doc.id, ...doc.data() });
    });

    renderContratos(window.allContratos);
  } catch (error) {
    console.error("Error al cargar contratos: ", error);
    container.innerHTML = `<p style="color:red">Error al cargar los contratos.</p>`;
  }
}

function renderContratos(contratosList) {
  const container = document.getElementById("contractsContainer");
  container.innerHTML = "";

  if (contratosList.length === 0) {
    container.innerHTML = `<p style="color:white; text-align:center;">No hay contratos para mostrar.</p>`;
    return;
  }

  contratosList.forEach((data) => {
    const contractDate = new Date(data.date + "T00:00:00");
    const formattedDate = contractDate.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Verificar si el contrato está completado
    const isCompleted = data.clientSignature && data.clientIdPhoto;
    const statusBadge = isCompleted
      ? '<span class="badge bg-success mb-2">Completado</span>'
      : '<span class="badge bg-warning text-dark mb-2">Pendiente</span>';

    container.innerHTML += `
      <div class="col-lg-4 col-md-6 col-12">
        <div class="job-card">
          <h5>Contrato: ${data.clientName}</h5>
          <div class="job-divider"></div>
          ${statusBadge}
          <p><strong>Fecha:</strong> ${formattedDate}</p>
          <p><strong>Cliente:</strong> ${data.clientName}</p>
          <p><strong>Cédula:</strong> ${data.clientId}</p>
          <p><strong>Precio:</strong> $${data.servicePrice} + IVA</p>
          <div class="d-flex gap-2 mt-3">
            <button class="btn-view-report" onclick="verContrato('${data.id
      }')">
              <i class="fa-solid fa-eye"></i> Ver
            </button>
            ${isCompleted
        ? `
              <button class="btn btn-primary" onclick="verContrato('${data.id}')">
                <i class="fa-solid fa-print"></i> Imprimir
              </button>
            `
        : ""
      }
            <button class="btn-delete" onclick="eliminarContrato('${data.id
      }')">
              <i class="fa-solid fa-trash"></i> Eliminar
            </button>
          </div>
        </div>
      </div>
    `;
  });
}

// =========================================
//  VER Y ELIMINAR CONTRATO
// =========================================
async function verContrato(id) {
  const doc = await db.collection("contracts").doc(id).get();
  const data = doc.data();

  // Guardar el ID del contrato actual para el PDF
  document.getElementById("currentContractId").value = id;

  mostrarContrato(data);
  const viewModal = new bootstrap.Modal(
    document.getElementById("viewContractModal")
  );
  viewModal.show();
}

function eliminarContrato(id) {
  Swal.fire({
    title: "¿Eliminar contrato?",
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d4af37",
    cancelButtonColor: "#000",
    confirmButtonText: "Eliminar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      await db.collection("contracts").doc(id).delete();
      Swal.fire("Eliminado", "El contrato ha sido eliminado.", "success");
      cargarContratos();
    }
  });
}

// =========================================
//  CARGAR Y MOSTRAR ADMINISTRADORES
// =========================================
async function cargarAdmins() {
  const container = document.getElementById("adminsContainer");
  if (!container) return;

  container.innerHTML = `<p style="color:white">Cargando administradores...</p>`;

  try {
    const query = await db.collection("users").orderBy("createdAt", "desc").get();
    
    // Filtrar solo los que tengan rol de admin si hay otros tipos, 
    // pero por ahora asumimos que la colección users es solo para estos admins.
    const admins = [];
    query.forEach(doc => {
      const data = doc.data();
      if (data.role === "ADMIN_CONJUNTO") {
        admins.push({ id: doc.id, ...data });
      }
    });

    // Guardar en variable global para filtrar
    window.allAdmins = admins;
    renderAdmins(admins);
  } catch (error) {
    console.error("Error cargando admins:", error);
    container.innerHTML = `<p style="color:red">Error al cargar administradores. Verifique permisos.</p>`;
  }
}

function renderAdmins(adminList) {
  const container = document.getElementById("adminsContainer");
  container.innerHTML = "";

  if (adminList.length === 0) {
    container.innerHTML = `<p style="color:white; text-align:center;">No hay administradores registrados.</p>`;
    return;
  }

  adminList.forEach(admin => {
    // Formatear fecha
    let dateStr = "---";
    if (admin.createdAt && admin.createdAt.toDate) {
      dateStr = admin.createdAt.toDate().toLocaleDateString("es-ES");
    }

    // Determinar estado (por defecto 'active' si no existe el campo)
    const status = admin.status || 'active';
    const isInactive = status !== 'active';
    
    // Configuración visual según estado
    const statusBadge = isInactive 
      ? `<span class="badge bg-danger">Inactivo</span>` 
      : `<span class="badge bg-success">Activo</span>`;
      
    // Botón Toggle (Ojo / Ojo Tachado)
    const toggleBtnClass = isInactive ? "btn-success" : "btn-delete"; // Verde para activar, Rojo style para desactivar
    const toggleIcon = isInactive ? "fa-eye" : "fa-eye-slash";
    const toggleText = isInactive ? "Activar" : "Desactivar";
    const toggleAction = isInactive ? "active" : "inactive";

    container.innerHTML += `
      <div class="col-lg-4 col-md-6 col-12">
        <div class="job-card" style="${isInactive ? 'opacity: 0.7;' : ''}">
          <div class="d-flex justify-content-between align-items-start">
             <h5>${admin.complexName}</h5>
             ${statusBadge}
          </div>
          
          <div class="job-divider"></div>

          <p><strong>Administrador:</strong> ${admin.adminName}</p>
          <p><strong>Email:</strong> ${admin.email}</p>
          <p><strong>Registrado:</strong> ${dateStr}</p>
          
          <div class="d-flex w-100 gap-2 mt-3">
             <!-- Botón Editar -->
             <button class="btn btn-gold flex-fill" onclick="editAdmin('${admin.id}', '${admin.complexName}', '${admin.adminName}', '${admin.email}')">
               <i class="fa-solid fa-pen"></i> Editar
             </button>

             <!-- Botón Activar/Desactivar -->
             <button class="${toggleBtnClass} flex-fill" onclick="toggleAdminStatus('${admin.id}', '${toggleAction}')">
               <i class="fa-solid ${toggleIcon}"></i> ${toggleText}
             </button>
          </div>
        </div>
      </div>
    `;
  });
}

// Función para cambiar estado (Activar/Desactivar)
window.toggleAdminStatus = function(id, newStatus) {
  const actionText = newStatus === 'active' ? "Activar" : "Desactivar";
  const confirmText = newStatus === 'active' 
    ? "El administrador podrá volver a ingresar al sistema." 
    : "El administrador perderá el acceso temporalmente.";

  Swal.fire({
    title: `¿${actionText} administrador?`,
    text: confirmText,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d4af37",
    cancelButtonColor: "#000",
    confirmButtonText: `Sí, ${actionText.toLowerCase()}`,
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await db.collection("users").doc(id).update({ status: newStatus });
        Swal.fire("Actualizado", `El administrador ha sido ${newStatus === 'active' ? 'activado' : 'desactivado'}.`, "success");
        cargarAdmins(); // Recargar lista
      } catch (error) {
        console.error("Error cambiando estado:", error);
        Swal.fire("Error", "No se pudo cambiar el estado.", "error");
      }
    }
  });
};

// =========================================
//  REGISTRO DE ADMINISTRADORES
// =========================================
function activarRegistroAdmin() {
  const form = document.getElementById("registerAdminForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const complexName = document.getElementById("adminComplexName").value;
    const adminName = document.getElementById("adminName").value;
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;
    const contractId = document.getElementById("adminContractSelect").value;

    if (!contractId) {
      Swal.fire("Error", "Debe seleccionar un contrato asociado para el administrador", "warning");
      return;
    }

    if (password.length < 6) {
      Swal.fire("Error", "La contraseña debe tener al menos 6 caracteres", "warning");
      return;
    }

    try {
      Swal.fire({
        title: 'Registrando...',
        text: 'Creando cuenta de administrador sin cerrar sesión...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 1. Crear app secundaria para no desloguear al admin actual
      // Verificar si ya existe y eliminarla para evitar errores
      let secondaryApp = firebase.apps.find(app => app.name === "Secondary");
      if (secondaryApp) {
        await secondaryApp.delete();
      }
      secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");

      // 2. Crear usuario en Auth
      const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;

      // 3. Guardar datos en Firestore (usando la instancia PRINCIPAL de db para consistencia)
      try {
        await db.collection("users").doc(uid).set({
          complexName: complexName,
          adminName: adminName,
          email: email,
          role: "ADMIN_CONJUNTO",
          contractId: contractId,
          status: "active", // Por defecto activo
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (firestoreError) {
        console.error("Error guardando en Firestore, revirtiendo Auth:", firestoreError);
        // ROLLBACK: Eliminar usuario de Auth si falla la BD para evitar registros huérfanos
        await userCredential.user.delete(); 
        throw new Error("FIRESTORE_PERMISSION_ERROR"); // Lanzar para manejar en el catch principal
      }

      // 4. Eliminar app secundaria liberando recursos
      await secondaryApp.delete();

      // 5. Éxito
      Swal.fire({
        icon: "success",
        title: "Administrador Registrado",
        text: "La cuenta ha sido creada exitosamente. Ahora puede usarla en el Login de Residentes.",
      });

      // 6. Resetear formulario y cerrar modal
      form.reset();
      const modal = bootstrap.Modal.getInstance(document.getElementById("addAdminModal"));
      if (modal) modal.hide();

    } catch (error) {
      console.error("Error al registrar admin:", error);
      
      // Intentar limpiar app secundaria si quedó abierta
      const appRef = firebase.apps.find(app => app.name === "Secondary");
      if (appRef) await appRef.delete();

      let msg = "No se pudo registrar al administrador.";
      
      if (error.message === "FIRESTORE_PERMISSION_ERROR" || error.code === "permission-denied") {
        msg = "Error de permisos en Base de Datos. Por favor verifica las Reglas de Firestore.";
        Swal.fire({
          icon: "error",
          title: "Permisos Insuficientes",
          html: `No se pudo guardar el administrador en la base de datos.<br><br>
                 <strong>Solución:</strong> Ve a tu <em>Firebase Console > Firestore Database > Reglas</em> y asegúrate de permitir escritura en la colección <code>users</code>.<br><br>
                 <em>Nota: El usuario creado se ha eliminado automáticamente para que puedas reintentar.</em>`
        });
        return;
      }

      if (error.code === 'auth/email-already-in-use') {
        msg = "El correo electrónico ya está registrado.";
      }
      Swal.fire("Error", msg, "error");
    }
  });
}

// =========================================
//  LÓGICA DE EDICIÓN DE ADMINISTRADORES
// =========================================
function editAdmin(id, complexName, adminName, email) {
  const modalEl = document.getElementById("editAdminModal");
  if (!modalEl) return;

  document.getElementById("editAdminId").value = id;
  document.getElementById("editAdminComplexName").value = complexName;
  document.getElementById("editAdminName").value = adminName;
  document.getElementById("editAdminEmail").value = email;

  // Configurar el botón de reset password
  const btnReset = document.getElementById("btnResetPassword");
  if (btnReset) {
    // Eliminamos listeners previos clonando el botón
    const newBtn = btnReset.cloneNode(true);
    btnReset.parentNode.replaceChild(newBtn, btnReset);
    
    newBtn.addEventListener("click", () => {
      enviarCorreoReset(email);
    });
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

async function enviarCorreoReset(email) {
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    Swal.fire({
      icon: 'success',
      title: 'Correo Enviado',
      text: `Se ha enviado un enlace para restablecer la contraseña a: ${email}`,
      confirmButtonColor: '#d4af37'
    });
  } catch (error) {
    console.error("Error enviando reset password:", error);
    let msg = "No se pudo enviar el correo.";
    if (error.code === 'auth/user-not-found') msg = "No existe cuenta con este correo.";
    Swal.fire("Error", msg, "error");
  }
}

// Inicializar listener para el form de editar
document.addEventListener("DOMContentLoaded", () => {
  const editForm = document.getElementById("editAdminForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("editAdminId").value;
      const newComplexName = document.getElementById("editAdminComplexName").value;
      const newAdminName = document.getElementById("editAdminName").value;

      try {
        await db.collection("users").doc(id).update({
          complexName: newComplexName,
          adminName: newAdminName
        });

        Swal.fire("Actualizado", "Datos del administrador actualizados correctamente.", "success");
        
        const modalEl = document.getElementById("editAdminModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        cargarAdmins(); // Recargar la lista
      } catch (error) {
        console.error("Error actualizando admin:", error);
        Swal.fire("Error", "No se pudo actualizar la información.", "error");
      }
    });
  }
});

// =========================================
//  CARGAR OPCIONES DE CONTRATO (PARA REGISTRO)
// =========================================
async function cargarOpcionesContrato() {
  const select = document.getElementById("adminContractSelect");
  if (!select) return;

  select.innerHTML = '<option value="" selected disabled>Cargando contratos...</option>';

  try {
    const snapshot = await db.collection("contracts").get();
    
    if (snapshot.empty) {
      select.innerHTML = '<option value="" selected disabled>No se encontraron contratos</option>';
      return;
    }

    let optionsHTML = '<option value="" selected disabled>Seleccione un contrato...</option>';
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Usamos el id del documento como valor y el nombre del cliente para el texto
      optionsHTML += `<option value="${doc.id}">${data.clientName} (${data.city})</option>`;
    });

    select.innerHTML = optionsHTML;

  } catch (error) {
    console.error("Error al cargar contratos:", error);
    select.innerHTML = '<option value="" selected disabled>Error al cargar contratos</option>';
  }
}

// =========================================
//  AUTORIZACIÓN DE PAGOS
// =========================================
async function cargarPagosPendientes() {
  const container = document.getElementById("paymentsContainer");
  if (!container) return;

  container.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>Cargando pagos pendientes...</div>';

  try {
    const snapshot = await db.collection("payments")
      .where("status", "==", "Pendiente")
      .orderBy("date", "desc")
      .get();

    // Guardar en variable global para filtrar
    const payments = [];
    const promises = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const paymentId = doc.id;
      
      const promise = (async () => {
        let complexName = 'Conjunto no especificado';
        let adminName = 'Administrador no especificado';
        
        if (data.userId) {
          try {
            const userDoc = await db.collection("users").doc(data.userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              complexName = userData.complexName || complexName;
              adminName = userData.adminName || adminName;
            }
          } catch (error) {
            console.error("Error al obtener datos del usuario para el pago:", error);
          }
        }
        
        return { 
          id: paymentId, 
          ...data,
          enrichedAdminName: adminName,
          enrichedComplexName: complexName
        };
      })();
      
      promises.push(promise);
    });

    window.allPayments = await Promise.all(promises);

    if (window.allPayments.length === 0) {
      container.innerHTML = '<div class="col-12 text-center text-white py-5">No hay pagos pendientes de aprobación.</div>';
      return;
    }

    renderPagos(window.allPayments);
  } catch (error) {
    console.error("Error al cargar pagos pendientes:", error);
    container.innerHTML = '<div class="col-12 text-center text-danger py-5">Error al cargar pagos pendientes: ' + error.message + '</div>';
  }
}

function renderPagos(paymentsList) {
  const container = document.getElementById("paymentsContainer");
  container.innerHTML = "";
  
  let html = "";
  paymentsList.forEach(data => {
    const id = data.id;
    let dateStr = "---";
    if (data.date && data.date.toDate) {
      dateStr = data.date.toDate().toLocaleDateString("es-ES", {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }

    html += `
      <div class="col-lg-4 col-md-6 col-12">
        <div class="card job-card h-100">
          <div class="card-body">
            <h5 class="card-title text-gold">${data.service}</h5>
            <div class="job-divider"></div>
            <p class="card-text mb-1"><strong>Conjunto:</strong> <span class="text-gold fw-bold">${data.enrichedComplexName || 'No especificado'}</span></p>
            <p class="card-text mb-1"><strong>Administrador:</strong> ${data.enrichedAdminName || 'No especificado'}</p>
            <p class="card-text mb-1"><strong>Monto:</strong> <span class="text-gold fw-bold">$${parseFloat(data.amount).toFixed(2)}</span></p>
            <p class="card-text mb-1"><strong>Método:</strong> ${data.method}</p>
            <p class="card-text mb-1"><strong>Fecha:</strong> ${dateStr}</p>
            <p class="card-text mb-3"><strong>Notas:</strong> ${data.notes || 'Sin notas'}</p>
            
            <div class="d-grid gap-2">
              ${data.proofUrl ? `
                <button class="btn btn-outline-info btn-sm" onclick="verComprobante('${data.proofUrl}')">
                  <i class="fa-solid fa-image"></i> Ver Comprobante
                </button>
              ` : ''}
              <div class="row g-2">
                <div class="col-6">
                  <button class="btn btn-success btn-sm w-100" onclick="aprobarPago('${id}')">
                    <i class="fa-solid fa-check"></i> Aprobar
                  </button>
                </div>
                <div class="col-6">
                  <button class="btn btn-danger btn-sm w-100" onclick="rechazarPago('${id}')">
                    <i class="fa-solid fa-xmark"></i> Rechazar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// =========================================
//  PERFIL DE USUARIO Y GRÁFICOS
// =========================================

async function cargarInfoUsuario() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      document.getElementById("userName").textContent = data.adminName || "Administrador";
      document.getElementById("userEmail").textContent = data.email || user.email;
      
      // Actualizar también en el sidebar
      const sidebarEmail = document.getElementById("sidebarUserEmail");
      if (sidebarEmail) {
        sidebarEmail.textContent = (data.email || user.email).split('@')[0]; // O el email completo si prefieres
        sidebarEmail.title = data.email || user.email; // Mostrar completo al pasar el mouse
      }
      
      document.getElementById("userProfileCard").style.display = "block";

      // Poblar info en el sidebar (NUEVO)
      const sidebarAdminName = document.getElementById("sidebarAdminName");
      const sidebarComplexName = document.getElementById("sidebarComplexName");
      
      if (sidebarAdminName) sidebarAdminName.textContent = data.adminName || "Administrador";
      if (sidebarComplexName) sidebarComplexName.textContent = data.complexName || "Conjunto No Especificado";
    }
  } catch (error) {
    console.error("Error cargando info usuario:", error);
  }
}

let jobsChartInstance = null;
let urgencyChartInstance = null;

async function renderizarGraficos() {
  try {
    const jobsSnap = await db.collection("trabajos").get();
    const stats = {
      estados: { "Pendiente": 0, "En Proceso": 0, "Culminado": 0 },
      urgencia: { "Normal": 0, "Urgente": 0, "Crítico": 0 }
    };

    jobsSnap.forEach(doc => {
      const data = doc.data();
      if (stats.estados[data.status] !== undefined) stats.estados[data.status]++;
      if (stats.urgencia[data.jobUrgency] !== undefined) stats.urgencia[data.jobUrgency]++;
    });

    const ctxJobs = document.getElementById('jobsChart');
    if (!ctxJobs) return;

    if (jobsChartInstance) jobsChartInstance.destroy();
    jobsChartInstance = new Chart(ctxJobs, {
      type: 'doughnut',
      data: {
        labels: Object.keys(stats.estados),
        datasets: [{
          data: Object.values(stats.estados),
          backgroundColor: ['#f1c40f', '#3498db', '#27ae60'],
          borderColor: 'rgba(0,0,0,0.1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#fff', padding: 20 } } }
      }
    });

    const ctxUrgency = document.getElementById('urgencyChart');
    if (!ctxUrgency) return;

    if (urgencyChartInstance) urgencyChartInstance.destroy();
    urgencyChartInstance = new Chart(ctxUrgency, {
      type: 'bar',
      data: {
        labels: Object.keys(stats.urgencia),
        datasets: [{
          label: 'Cantidad',
          data: Object.values(stats.urgencia),
          backgroundColor: '#d4af37'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#fff' }, grid: { display: false } },
          y: { ticks: { color: '#fff' }, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
        },
        plugins: { legend: { display: false } }
      }
    });
  } catch (error) {
    console.error("Error renderizando gráficos:", error);
  }
}

window.aprobarPago = async (id) => {
  const result = await Swal.fire({
    title: '¿Aprobar pago?',
    text: "Esta acción marcará el pago como completado.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, aprobar',
    cancelButtonText: 'Cancelar'
  });

  if (result.isConfirmed) {
    try {
      await db.collection("payments").doc(id).update({
        status: 'Aprobado',
        approvedAt: new Date()
      });

      Swal.fire('¡Aprobado!', 'El pago ha sido autorizado.', 'success');
      cargarPagosPendientes();
      // Actualizar notificaciones si estamos en el dashboard
      if (window.currentView === 'todos') {
        cargarNotificacionesPagosPendientes();
        actualizarContadoresDashboard();
      }
    } catch (error) {
      console.error("Error al aprobar pago:", error);
      Swal.fire('Error', 'No se pudo aprobar el pago.', 'error');
    }
  }
};

window.rechazarPago = async (id) => {
  const result = await Swal.fire({
    title: '¿Rechazar pago?',
    text: "Esta acción marcará el pago como rechazado.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Sí, rechazar',
    cancelButtonText: 'Cancelar'
  });

  if (result.isConfirmed) {
    try {
      await db.collection("payments").doc(id).update({
        status: 'Rechazado',
        rejectedAt: new Date()
      });

      Swal.fire('Rechazado', 'El pago ha sido marcado como rechazado.', 'info');
      cargarPagosPendientes();
      // Actualizar notificaciones si estamos en el dashboard
      if (window.currentView === 'todos') {
        cargarNotificacionesPagosPendientes();
        actualizarContadoresDashboard();
      }
    } catch (error) {
      console.error("Error al rechazar pago:", error);
      Swal.fire('Error', 'No se pudo rechazar el pago.', 'error');
    }
  }
};

// ===============================
// CARGAR NOTIFICACIONES DE PAGOS PENDIENTES
// ===============================
async function cargarNotificacionesPagosPendientes() {
  const db = firebase.firestore();
  const notificationsSection = document.getElementById("notificationsSection");
  const notificationsList = document.getElementById("notificationsList");
  const notificationBadge = document.getElementById("notificationBadge");
  const viewAllPaymentsBtn = document.getElementById("viewAllPaymentsBtn");

  if (!notificationsSection || !notificationsList || !notificationBadge) {
    return;
  }

  try {
    // Consultar TODOS los pagos pendientes para el badge
    const snapshotAll = await db.collection("payments")
      .where("status", "==", "Pendiente")
      .get();
    
    const pendingCount = snapshotAll.size;

    // Actualizar badge con el total real
    notificationBadge.textContent = pendingCount;

    if (pendingCount === 0) {
      notificationsSection.style.display = "none";
      return;
    }

    // Mostrar sección de notificaciones
    notificationsSection.style.display = "block";

    // Obtener los 3 más recientes para mostrar
    const snapshotDisplay = await db.collection("payments")
      .where("status", "==", "Pendiente")
      .orderBy("createdAt", "desc")
      .limit(3)
      .get();

    // Renderizar notificaciones
    let html = '';
    
    // Procesar cada pago y obtener datos del usuario
    const promises = [];
    snapshotDisplay.forEach(doc => {
      const data = doc.data();
      const paymentId = doc.id;
      
      // Crear promesa para obtener datos del usuario
      const promise = (async () => {
        let complexName = 'Conjunto no especificado';
        let adminName = 'Administrador no especificado';
        
        // Si existe userId, obtener datos de la colección users
        if (data.userId) {
          try {
            const userDoc = await db.collection("users").doc(data.userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              complexName = userData.complexName || complexName;
              adminName = userData.adminName || adminName;
            }
          } catch (error) {
            console.error("Error al obtener datos del usuario:", error);
          }
        }
        
        // Formatear fecha
        let fechaStr = 'Fecha no disponible';
        if (data.createdAt) {
          const fecha = data.createdAt.toDate();
          fechaStr = fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          });
        }

        // Formatear monto
        const monto = data.amount ? `$${parseFloat(data.amount).toFixed(2)}` : '$0.00';

        return `
          <div class="notification-item" data-payment-id="${paymentId}">
            <div class="notification-item-header">
              <p class="notification-item-title">${complexName}</p>
              <span class="notification-item-amount">${monto}</span>
            </div>
            <div class="notification-item-details">
              <span><i class="fa-solid fa-user"></i>${adminName}</span>
            </div>
            <div class="notification-item-details">
              <span><i class="fa-solid fa-calendar"></i>${fechaStr}</span>
              <span><i class="fa-solid fa-building"></i>${data.service || 'Servicio no especificado'}</span>
            </div>
          </div>
        `;
      })();
      
      promises.push(promise);
    });

    // Esperar a que todas las promesas se resuelvan
    const htmlParts = await Promise.all(promises);
    html = htmlParts.join('');

    notificationsList.innerHTML = html;

    // Agregar event listeners a cada notificación
    const notificationItems = notificationsList.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
      item.addEventListener('click', () => {
        // Cambiar a la vista de pagos
        const sidebarLinks = document.querySelectorAll('.sidebar-link[data-view]');
        sidebarLinks.forEach(link => {
          if (link.getAttribute('data-view') === 'payments') {
            link.click();
          }
        });
      });
    });

    // Event listener para el botón "Ver todos"
    if (viewAllPaymentsBtn) {
      viewAllPaymentsBtn.addEventListener('click', () => {
        const sidebarLinks = document.querySelectorAll('.sidebar-link[data-view]');
        sidebarLinks.forEach(link => {
          if (link.getAttribute('data-view') === 'payments') {
            link.click();
          }
        });
      });
    }

  } catch (error) {
    console.error("Error al cargar notificaciones de pagos:", error);
    notificationsSection.style.display = "none";
  }
}

