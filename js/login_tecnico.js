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
        cargarContratosTecnicos();
        configurarModalContrato();
      });
    } else {
      cargarTrabajosTecnicos();
      configurarModalInforme();
      cargarContratosTecnicos();
      configurarModalContrato();
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

// =======================================================
// 📋 CARGAR CONTRATOS PARA TÉCNICOS
// =======================================================
async function cargarContratosTecnicos() {
  const container = document.getElementById("contractsContainer");
  if (!container) return;

  container.innerHTML = `<p style="color:white">Cargando contratos...</p>`;

  try {
    const query = await db
      .collection("contracts")
      .orderBy("createdAt", "desc")
      .get();

    container.innerHTML = "";

    if (query.empty) {
      container.innerHTML = `<p style="color:white">No hay contratos disponibles.</p>`;
      return;
    }

    query.forEach((doc) => {
      const data = doc.data();
      const contractDate = new Date(data.date + 'T00:00:00');
      const formattedDate = contractDate.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });

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
              <p class="card-text"><i class="fa-solid fa-user"></i> <strong>Cliente:</strong> ${data.clientName}</p>
              <p class="card-text"><i class="fa-solid fa-id-card"></i> <strong>Cédula:</strong> ${data.clientId}</p>
              <p class="card-text"><i class="fa-solid fa-dollar-sign"></i> <strong>Precio:</strong> $${data.servicePrice} + IVA</p>
              ${!isCompleted ? `
                <button class="btn btn-primary mt-3" onclick="llenarContrato('${doc.id}')">
                  <i class="fa-solid fa-pen"></i> Llenar Contrato
                </button>
              ` : `
                <button class="btn btn-success mt-3" onclick="verContratoCompleto('${doc.id}')">
                  <i class="fa-solid fa-eye"></i> Ver Contrato Completo
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error("Error al cargar contratos: ", error);
    container.innerHTML = `<p style="color:red">Error al cargar los contratos.</p>`;
  }
}

// =======================================================
// 📝 CONFIGURAR MODAL DE CONTRATO
// =======================================================
function configurarModalContrato() {
  const fillContractModal = document.getElementById('fillContractModal');
  if (!fillContractModal) return;

  // Inicializar canvas de firma
  const canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Función para ajustar tamaño del canvas
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 200;
    // Reconfigurar estilo después de cambiar tamaño
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  // Inicializar tamaño
  resizeCanvas();

  // Configurar estilo del canvas
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  // Usar una propiedad del canvas para almacenar el estado
  canvas.hasSignature = false;

  // Eventos del mouse
  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousemove', (e) => {
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

  canvas.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  canvas.addEventListener('mouseout', () => {
    isDrawing = false;
  });

  // Eventos táctiles (para dispositivos móviles)
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
  });

  canvas.addEventListener('touchmove', (e) => {
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

  canvas.addEventListener('touchend', () => {
    isDrawing = false;
  });

  // Botón limpiar firma
  const clearSignatureBtn = document.getElementById('clearSignatureBtn');
  if (clearSignatureBtn) {
    clearSignatureBtn.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.hasSignature = false; // Reiniciar la variable
      // Reconfigurar estilo después de limpiar
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    });
  }

  // Preview de foto de cédula
  const idPhotoInput = document.getElementById('clientIdPhoto');
  const idPhotoPreview = document.getElementById('idPhotoPreview');
  const idPhotoPreviewImg = document.getElementById('idPhotoPreviewImg');

  if (idPhotoInput && idPhotoPreview && idPhotoPreviewImg) {
    idPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          idPhotoPreviewImg.src = event.target.result;
          idPhotoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Reinicializar canvas cuando se abre el modal
  fillContractModal.addEventListener('shown.bs.modal', () => {
    resizeCanvas();
  });

  // Guardar contrato completado
  const saveContractBtn = document.getElementById('saveContractBtn');
  if (saveContractBtn) {
    saveContractBtn.addEventListener('click', async () => {
      const contractId = document.getElementById('contractIdToFill').value;

      // Obtener foto de cédula
      const idPhotoFile = document.getElementById('clientIdPhoto').files[0];

      // Verificar si se ha dibujado algo en el canvas
      if (!canvas.hasSignature) {
        Swal.fire("Error", "Por favor, capture la firma del cliente.", "error");
        return;
      }

      // Obtener firma del canvas
      const signatureData = canvas.toDataURL('image/png');

      if (!idPhotoFile) {
        Swal.fire("Error", "Por favor, suba la foto de la cédula del cliente.", "error");
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
          completedBy: auth.currentUser.email
        });

        Swal.fire("¡Éxito!", "Contrato completado correctamente.", "success");

        const modal = bootstrap.Modal.getInstance(fillContractModal);
        modal.hide();

        // Limpiar formulario
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.hasSignature = false; // Reiniciar variable
        // Reconfigurar estilo después de limpiar
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        document.getElementById('clientIdPhoto').value = '';
        if (idPhotoPreview) {
          idPhotoPreview.style.display = 'none';
        }
        document.getElementById('contractIdToFill').value = '';

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
    document.getElementById('contractIdToFill').value = contractId;

    // Generar y mostrar el contrato
    mostrarContratoParaLlenar(data);

    // Limpiar canvas y preview
    const canvas = document.getElementById('signatureCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Reconfigurar estilo
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Resetear variable hasSignature cuando se abre el modal para llenar
      canvas.hasSignature = false;
    }
    document.getElementById('clientIdPhoto').value = '';
    const preview = document.getElementById('idPhotoPreview');
    if (preview) {
      preview.style.display = 'none';
    }

    // Mostrar sección de llenar contrato
    const fillSection = document.getElementById('fillContractSection');
    if (fillSection) {
      fillSection.style.display = 'block';
    }

    // Mostrar botón de guardar
    const saveBtn = document.getElementById('saveContractBtn');
    if (saveBtn) {
      saveBtn.style.display = 'block';
    }

    // Mostrar el hr
    const hrElement = document.getElementById('fillContractDivider');
    if (hrElement) {
      hrElement.style.display = 'block';
    }

    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('fillContractModal'));
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
  const contractContentArea = document.getElementById('contractContentToFill');
  const contractDate = new Date(data.date + 'T00:00:00');

  const day = contractDate.getDate();
  const month = contractDate.toLocaleString('es-ES', { month: 'long' });
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
    document.getElementById('contractIdToFill').value = contractId;

    // Generar y mostrar el contrato con firma y cédula
    mostrarContratoCompleto(data);

    // Ocultar sección de llenar contrato
    const fillSection = document.getElementById('fillContractSection');
    if (fillSection) {
      fillSection.style.display = 'none';
    }

    // Ocultar botón de guardar y mostrar solo cerrar
    const saveBtn = document.getElementById('saveContractBtn');
    if (saveBtn) {
      saveBtn.style.display = 'none';
    }

    // Ocultar el hr también
    const hrElement = document.getElementById('fillContractDivider');
    if (hrElement) {
      hrElement.style.display = 'none';
    }

    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('fillContractModal'));
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
  const contractContentArea = document.getElementById('contractContentToFill');
  const contractDate = new Date(data.date + 'T00:00:00');

  const day = contractDate.getDate();
  const month = contractDate.toLocaleString('es-ES', { month: 'long' });
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

    <p style="font-size:14px;color:#555;">Nombre completo: ${data.clientName}</p>
    <p style="font-size:14px;color:#555;">Cédula: ${data.clientId}</p>
    <p style="font-size:14px;color:#555;">Fecha: ${contractDate.toLocaleDateString('es-EC')}</p>
  </div>

</div>

${data.clientIdPhoto ? `
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
  ` : ''}
  
    </div>
  `;

  contractContentArea.innerHTML = content;
}
