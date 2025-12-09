// ===============================
// INICIALIZACIÓN GENERAL
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  activarLoginAdmin();
  activarLogout();

  // Si estamos en gestion_admin.html
  if (document.getElementById("jobForm")) {
    configurarFormulario();
    cargarTrabajos();
    activarEdicion(); // Activa el formulario de edición

    // Listener para generar PDF
    document.getElementById('generatePdfBtn').addEventListener('click', () => {
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
      logo.src = 'assets/img/logoc.png'; // Usar logo claro para fondo oscuro

      logo.onload = function () {
        // Fondo general del documento
        doc.setFillColor(backgroundColor);
        doc.rect(0, 0, 210, 297, 'F');

        // Fondo de la cabecera
        doc.setFillColor(primaryColor);
        doc.rect(0, 0, 210, 30, 'F');

        // Logo
        doc.addImage(logo, 'PNG', 15, 5, 20, 20);

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
        doc.text(`Cliente: ${document.getElementById('reportClientName').textContent}`, 20, y);
        y += 7;
        doc.text(`Fecha de Asignación: ${document.getElementById('reportJobDate').textContent}`, 20, y);
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
        doc.text(`Estado: ${document.getElementById('reportStatus').textContent}`, 20, y);
        y += 7;
        doc.text(`Finalizado el: ${document.getElementById('reportDate').textContent} a las: ${document.getElementById('reportTime').textContent}`, 20, y);
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
        const reportText = doc.splitTextToSize(document.getElementById('reportText').textContent, 175);
        doc.text(reportText, 20, y);
        y += (reportText.length * 6) + 10;

        // --- Evidencia Fotográfica ---
        doc.setFont("Times-Roman", "bold");
        doc.setFontSize(16);
        doc.setTextColor(primaryColor);
        doc.text("Evidencia Fotográfica", 15, y);
        y += 10;

        const img1 = document.getElementById('reportImage1');
        const img2 = document.getElementById('reportImage2');

        if (img1.src) doc.addImage(img1, 'PNG', 15, y, 80, 60);
        if (img2.src) doc.addImage(img2, 'PNG', 115, y, 80, 60);
        y += 70;

        // ======================================================
        //  4. PIE DE PÁGINA
        // ======================================================
        doc.setFillColor(primaryColor);
        doc.rect(0, 287, 210, 10, 'F');
        doc.setFont("Times-Roman", "normal");
        doc.setFontSize(10);
        doc.setTextColor("#FFFFFF");
        doc.text("© 2025 Seguridad 247 Ecuador — Todos los derechos reservados", 105, 293, { align: 'center' });

        // ======================================================
        //  5. GUARDAR EL PDF
        // ======================================================
        doc.save("reporte-tecnico-final.pdf");
      };

      logo.onerror = function () {
        Swal.fire("Error", "No se pudo cargar el logo para el PDF.", "error");
      };
    });
  }
});


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
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", () => {
    auth
      .signOut()
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "Sesión cerrada",
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          window.location.href = "control_center.html";
        });
      })
      .catch(() => {
        Swal.fire("Error", "No se pudo cerrar sesión", "error");
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

  const query = await db
    .collection("trabajos")
    .orderBy("createdAt", "desc")
    .get();

  container.innerHTML = "";

  query.forEach((doc) => {
    const data = doc.data();

    let reportButton = '';
    if (data.status === 'Culminado') {
      reportButton = `
        <button class="btn-view-report mt-2" onclick="verReporte('${doc.id}')">
          <i class="fa-solid fa-eye"></i> Ver Reporte
        </button>`;
    }

    container.innerHTML += `
      <div class="col-md-4">
        <div class="job-card">
          <h5>${data.clientName}</h5>

          <div class="job-divider"></div>

          <p><strong>Fecha:</strong> ${data.jobDate}</p>

          <p>
            <strong>Urgencia:</strong>
            <span class="badge 
              ${data.jobUrgency === "Normal" ? "badge-normal" : 
                data.jobUrgency === "Urgente" ? "badge-urgente" : "badge-critico"}">
              ${data.jobUrgency}
            </span>
          </p>

          <p><strong>Contacto:</strong> ${data.contactName}</p>
          <p><strong>Teléfono:</strong> ${data.contactPhone}</p>
          
          ${data.status ? `<p><strong>Estado:</strong> ${data.status}</p>` : ''}

          <div class="d-flex gap-2 mt-3">
            <button class="btn-edit" onclick="cargarTrabajoParaEditar('${doc.id}')">
              <i class="fa-solid fa-pen-to-square"></i> Editar
            </button>

            <button class="btn-delete" onclick="eliminarTrabajo('${doc.id}')">
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
    const completionDate = completionDateTime.toLocaleDateString('es-ES');
    const completionTime = completionDateTime.toLocaleTimeString('es-ES');

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

    const reportModal = new bootstrap.Modal(document.getElementById('reportModal'));
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
