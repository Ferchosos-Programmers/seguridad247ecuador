document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("techLoginForm");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("techUser").value;
      const password = document.getElementById("techPassword").value;

      auth
        .signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          Swal.fire({
            icon: "success",
            title: "¡Login exitoso!",
            text: "Bienvenido al sistema",
            timer: 1500,
            showConfirmButton: false,
            allowOutsideClick: false,
          }).then(() => {
            const modalEl = document.getElementById("loginModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            window.location.href = "gestion_tecnica.html";
          });
        })
        .catch((error) => {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Usuario o contraseña incorrectos",
          });
        });
    });
  }

  if (window.location.pathname.endsWith("gestion_tecnica.html")) {
    if (document.readyState === "loading") {
      document.addEventListener('DOMContentLoaded', () => {
        cargarTrabajosTecnicos();
        configurarModalInforme();
      });
    } else {
      cargarTrabajosTecnicos();
      configurarModalInforme();
    }
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
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
        .catch(() => {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cerrar sesión",
          });
        });
    });
  }
});


// =======================================================
// 🛠️ CARGAR TRABAJOS PARA TÉCNICOS
// =======================================================
async function cargarTrabajosTecnicos() {
  const container = document.getElementById("jobsContainer");
  if (!container) return;

  container.innerHTML = `<p style="color:white">Cargando trabajos...</p>`;

  try {
    const query = await db
      .collection("trabajos")
      .orderBy("createdAt", "desc")
      .get();

    container.innerHTML = "";

    if (query.empty) {
      container.innerHTML = `<p style="color:white">No hay trabajos asignados.</p>`;
      return;
    }

    query.forEach((doc) => {
      const data = doc.data();

      const isCompleted = data.status === 'Culminado';

      const watermark = isCompleted
      ? `<div class="watermark-seal">✔ Trabajo Realizado</div>`
      : '';
    
      const reportButton = !isCompleted
        ? `<button class="btn btn-primary mt-3"
            data-bs-toggle="modal"
            data-bs-target="#technicalReportModal"
            data-id="${doc.id}">
            <i class="fa-solid fa-file-alt"></i> Informe Técnico
          </button>`
        : '';

      let badgeClass = '';
      switch (data.jobUrgency) {
        case 'Urgente':
          badgeClass = 'badge bg-warning text-dark';
          break;
        case 'Crítico':
          badgeClass = 'badge bg-danger';
          break;
        default:
          badgeClass = 'badge bg-success';
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
  } catch (error) {
    console.error("Error al cargar trabajos: ", error);
    container.innerHTML = `<p style="color:red">Error al cargar los trabajos.</p>`;
  }
}


// =======================================================
// 🛠️ CARGAR DETALLES EN EL MODAL DE INFORME
// =======================================================
function configurarModalInforme() {
  const reportModal = document.getElementById('technicalReportModal');
  if (!reportModal) return;

  reportModal.addEventListener('show.bs.modal', async (event) => {
    const button = event.relatedTarget;
    const jobId = button.getAttribute('data-id');
    document.getElementById('jobId').value = jobId;

    const jobDetailsContainer = document.getElementById('jobDetails');
    jobDetailsContainer.innerHTML = 'Cargando detalles...';

    try {
      const doc = await db.collection('trabajos').doc(jobId).get();
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
        jobDetailsContainer.innerHTML = '<p class="text-danger text-center">No se encontraron detalles del trabajo.</p>';
      }
    } catch (error) {
      console.error("Error al cargar detalles: ", error);
      jobDetailsContainer.innerHTML = '<p class="text-danger">Error al cargar detalles.</p>';
    }
  });

  const saveReportBtn = document.getElementById('saveReportBtn');

  saveReportBtn.addEventListener('click', async () => {
    const jobId = document.getElementById('jobId').value;
    const reportText = document.getElementById('reportText').value;
    const jobStatus = document.getElementById('jobStatus').value;

    const photo1 = document.getElementById('evidencePhoto1').files[0];
    const photo2 = document.getElementById('evidencePhoto2').files[0];

    if (!reportText || !jobStatus) {
      Swal.fire("Error", "El informe y el estado son obligatorios.", "error");
      return;
    }

    saveReportBtn.disabled = true;
    saveReportBtn.innerHTML = "Guardando...";

    try {
      const updateData = {
        report: reportText,
        status: jobStatus,
        reportDate: new Date(),
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
