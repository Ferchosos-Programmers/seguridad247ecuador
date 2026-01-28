// ===============================
// GLOBAL FUNCTIONS
// ===============================
// Function to open image in fullscreen
window.openImageFullscreen = function(imageUrl) {
  if (!imageUrl || imageUrl === window.location.href) return;
  
  Swal.fire({
    imageUrl: imageUrl,
    imageAlt: 'Imagen Ampliada',
    showConfirmButton: false,
    showCloseButton: true,
    background: '#000',
    backdrop: 'rgba(0,0,0,0.95)',
    customClass: {
      image: 'fullscreen-image-modal'
    },
    width: '90%',
    padding: '20px'
  });
};

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
    const complexesSection = document.getElementById("complexesSection");
    const createJobBtn = document.getElementById("createJobBtn");
    const createContractBtn = document.getElementById("createContractBtn");
    const addComplexBtn = document.getElementById("addComplexBtn");

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

      const usersManagementSection = document.getElementById("usersManagementSection");
      
      if (dashboardSection) dashboardSection.style.display = "none";
      jobsSection.style.display = "none";
      contractsSection.style.display = "none";
      if (paymentsSection) paymentsSection.style.display = "none";
      if (usersManagementSection) usersManagementSection.style.display = "none";
      if (complexesSection) complexesSection.style.display = "none";

      createJobBtn.style.display = "none";
      createContractBtn.style.display = "none";
      if (addComplexBtn) addComplexBtn.style.display = "none";
      urgencyFilterContainer.style.display = "none";
      nameFilterContainer.style.display = "none";
      
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
      } else if (viewValue === "payments") {
        if (paymentsSection) paymentsSection.style.display = "block";
        nameFilterContainer.style.display = "block";
        cargarPagosPendientes();
      } else if (viewValue === "users-management") {
        if (usersManagementSection) usersManagementSection.style.display = "block";
        cargarUsuariosManagement();
      } else if (viewValue === "complexes") {
        if (complexesSection) complexesSection.style.display = "block";
        if (addComplexBtn) addComplexBtn.style.display = "flex";
        cargarConjuntos();
        cargarOpcionesSelect2();
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
        // Trabajos (Excluyendo Guías)
        const trabajosSnap = await db.collection("trabajos").get();
        const realJobsCount = trabajosSnap.docs.filter(doc => !doc.data().isGuide).length;
        const countTrabajos = document.getElementById("countTrabajos");
        if (countTrabajos) countTrabajos.textContent = realJobsCount;
        
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

        // Conjuntos
        const complexesSnap = await db.collection("complexes").get();
        const statTotalComplexes = document.getElementById("statTotalComplexes");
        if (statTotalComplexes) statTotalComplexes.textContent = complexesSnap.size;
        
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
          const name = contract.complexName || contract.clientName || "";
          const matchName = name.toLowerCase().includes(nameValue);
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
    // Listener para generar PDF (One-time generation)
    const generatePdfBtn = document.getElementById("generatePdfBtn");
    generatePdfBtn.onclick = () => {
      if (typeof window.generateModernPDF === 'function') {
        const btn = document.getElementById("generatePdfBtn");
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Generando...';
        
        window.generateModernPDF()
          .then(() => {
            // Success
            Swal.fire({
              icon: 'success',
              title: 'PDF Generado',
              text: 'El informe se ha descargado correctamente.',
              timer: 3000,
              showConfirmButton: false,
              background: '#000', 
              color: '#d4af37'
            });
          })
          .catch(err => {
            console.error("PDF Generation Error:", err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Hubo un error al generar el PDF.',
              confirmButtonColor: '#d4af37'
            });
          })
          .finally(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
          });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'El generador de PDF no está disponible. Por favor, recargue la página.',
          confirmButtonColor: '#d4af37'
        });
      }
    };

    // Lógica para el formulario de conjunto
    window.formatAdminResult = function(admin) {
      if (!admin.id || !admin.element) return admin.text;
      const complex = $(admin.element).data("complex");
      return $(`
            <div class="p-1">
                <div class="admin-option-name" style="font-weight: 700; font-size: 0.95rem;">${admin.text}</div>
                <div class="admin-option-sub" style="font-size: 0.75rem; margin-top: 2px;">
                    <i class="fa-solid fa-building me-1"></i> ${complex || "Sin conjunto asignado"}
                </div>
            </div>
        `);
    };

    window.cargarOpcionesSelect2 = async function() {
      try {
        const snapshot = await db.collection("users").where("role", "==", "ADMIN_CONJUNTO").get();
        const select = $("#complexAdmin");
        select.empty().append('<option value="" disabled selected>Seleccione un administrador...</option>');

        snapshot.forEach((doc) => {
          const data = doc.data();
          const name = data.adminName || data.name || "Sin nombre";
          const complex = data.complexName || "No asignado";
          const option = new Option(name, name, false, false);
          $(option).attr("data-complex", complex);
          select.append(option);
        });

        $(".select2-admin").select2({
          dropdownParent: $("#addComplexModal"),
          width: "100%",
          templateResult: formatAdminResult,
          templateSelection: (state) => state.text
        }).on("select2:select", function (e) {
          const data = e.params.data;
          const complexName = $(data.element).data("complex");
          if (complexName && complexName !== "No asignado") {
            $("#complexName").val(complexName);
          }
        });
      } catch (error) {
        console.error("Error cargando admins para Select2:", error);
      }
    };

    document.getElementById("toggleAdminManual").addEventListener("change", function (e) {
      const manualWrapper = document.getElementById("adminManualWrapper");
      const linkWrapper = document.getElementById("adminLinkWrapper");
      const manualInput = document.getElementById("complexAdminManual");

      if (e.target.checked) {
        manualWrapper.style.display = "block";
        linkWrapper.style.display = "none";
        manualInput.setAttribute("required", "required");
      } else {
        manualWrapper.style.display = "none";
        linkWrapper.style.display = "block";
        manualInput.removeAttribute("required");
      }
    });

    document.getElementById("addComplexForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("complexName").value.trim().toUpperCase();
      const isManual = document.getElementById("toggleAdminManual").checked;
      const admin = (isManual ? document.getElementById("complexAdminManual").value.trim() : document.getElementById("complexAdmin").value || "").toUpperCase();

      Swal.fire({ title: "Guardando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        await db.collection("complexes").add({
          name: name,
          admin,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        Swal.fire("¡Éxito!", "El conjunto ha sido registrado correctamente.", "success");
        bootstrap.Modal.getInstance(document.getElementById("addComplexModal")).hide();
        e.target.reset();
        $("#complexAdmin").val("").trigger("change");
        cargarConjuntos();
        actualizarContadoresDashboard();
      } catch (error) {
        console.error("Error al guardar:", error);
        Swal.fire("Error", "No se pudo registrar.", "error");
      }
    });

    document.getElementById("editRegistryForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("editRegId").value;
      const complexName = document.getElementById("editRegComplexName").value;

      const residents = [];
      document.querySelectorAll("#editResidentsContainer > div").forEach((div) => {
        residents.push({
          name: div.querySelector(".resident-name").value.trim().toUpperCase(),
          lastname: div.querySelector(".resident-lastname").value.trim().toUpperCase(),
          phone: div.querySelector(".resident-phone").value.trim(),
        });
      });

      const vehicles = [];
      document.querySelectorAll("#editVehiclesContainer > div").forEach((div) => {
        vehicles.push({
          brand: div.querySelector(".v-brand").value.trim().toUpperCase(),
          model: div.querySelector(".v-model").value.trim().toUpperCase(),
          color: div.querySelector(".v-color").value.trim().toUpperCase(),
          plate: div.querySelector(".v-plate").value.trim().toUpperCase(),
        });
      });

      Swal.fire({ title: "Actualizando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        await db.collection("residents_registry").doc(id).update({
          houseNum: document.getElementById("editRegHouseNum").value.toUpperCase(),
          resType: document.getElementById("editRegResType").value.toUpperCase(),
          residents,
          vehicles,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        Swal.fire("¡Éxito!", "Registro actualizado correctamente.", "success");
        bootstrap.Modal.getInstance(document.getElementById("editRegistryModal")).hide();
        verRegistros(complexName);
      } catch (error) {
        console.error("Error al actualizar:", error);
        Swal.fire("Error", "No se pudo actualizar el registro.", "error");
      }
    });

    // Lógica para el formulario de contrato
    configurarFormularioContrato();
  }
});

// FUNCIONES TOP-LEVEL PARA CONJUNTOS
window.cargarConjuntos = async function() {
  const container = document.getElementById("complexesGrid");
  if (!container) return;
  try {
    const snapshot = await db.collection("complexes").orderBy("createdAt", "desc").get();
    container.innerHTML = "";
    if (snapshot.empty) {
      container.innerHTML = '<div class="col-12 text-center py-5 text-white-50">No hay conjuntos registrados aún.</div>';
      return;
    }
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = `
        <div class="col-xl-3 col-lg-4 col-md-6">
          <div class="stat-card" style="display: block; height: auto; padding: 20px; border-radius: 15px;">
            <div class="text-center mb-3">
              <div style="width: 50px; height: 50px; background: rgba(212,175,55,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 1px solid rgba(212,175,55,0.3);">
                <i class="fa-solid fa-building" style="font-size: 1.3rem; color: #d4af37;"></i>
              </div>
            </div>
            <h5 class="text-gold mb-2 text-center text-truncate" style="font-size: 1rem; font-weight: 700;">${data.name}</h5>
            <div class="text-center mb-3" style="padding: 8px; background: rgba(255,255,255,0.02); border-radius: 8px;">
              <i class="fa-solid fa-user-shield text-gold me-1" style="font-size: 0.75rem;"></i>
              <span class="small text-white" style="font-size: 0.75rem;">${data.admin}</span>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-gold w-100 py-2" onclick="verRegistros('${data.name}')" style="font-size: 0.75rem; border-radius: 8px;">
                <i class="fa-solid fa-clipboard-list me-1"></i> Registros
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="eliminarConjunto('${doc.id}')" title="Eliminar" style="width: 45px; border-radius: 8px;">
                <i class="fa-solid fa-trash" style="font-size: 0.8rem;"></i>
              </button>
            </div>
          </div>
        </div>`;
      container.innerHTML += card;
    });
  } catch (error) {
    console.error("Error al cargar conjuntos:", error);
    container.innerHTML = '<div class="col-12 text-center py-5 text-danger">Error al cargar la lista.</div>';
  }
};

window.verRegistros = async (complexName) => {
  document.getElementById("registriesComplexName").textContent = complexName;
  const modal = new bootstrap.Modal(document.getElementById("viewRegistriesModal"));
  modal.show();

  const container = document.getElementById("registriesTableContainer");
  try {
    const snapshot = await db.collection("residents_registry").where("complexName", "==", complexName).get();
    if (snapshot.empty) {
      container.innerHTML = '<div class="text-center py-5"><i class="fa-solid fa-inbox fa-3x text-muted mb-3"></i><p class="text-muted">No hay registros para este conjunto aún.</p></div>';
      return;
    }
    const registros = [];
    snapshot.forEach((doc) => registros.push({ id: doc.id, ...doc.data() }));
    registros.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

    let tableHTML = `<div class="table-responsive"><table class="table table-dark-premium table-hover align-middle"><thead><tr><th class="text-center">Vivienda</th><th class="text-center">Tipo</th><th class="text-center">Residente(s)</th><th class="text-center">Teléfono/WhatsApp</th><th class="text-center">Marca</th><th class="text-center">Modelo</th><th class="text-center">Color</th><th class="text-center">Placa</th><th class="text-center">Acciones</th></tr></thead><tbody>`;
    registros.forEach((data) => {
      const maxRows = Math.max(data.residents?.length || 0, data.vehicles?.length || 0, 1);
      const singleVehicle = data.vehicles?.length === 1 && data.residents?.length > 1;
      for (let i = 0; i < maxRows; i++) {
        const res = data.residents?.[i];
        const veh = data.vehicles?.[i];
        tableHTML += `<tr>`;
        if (i === 0) {
          tableHTML += `<td class="text-center fw-bold text-gold" rowspan="${maxRows}">${data.houseNum}</td><td class="text-center align-middle" rowspan="${maxRows}"><span class="badge ${data.resType === "PROPIETARIO" ? "bg-gold text-dark" : "bg-outline-gold"}">${data.resType || "PROPIETARIO"}</span></td>`;
        }
        tableHTML += `<td class="text-center align-middle">${res ? res.name + ' ' + res.lastname : '-'}</td>`;
        if (res?.phone) {
          const clean = res.phone.replace(/\D/g, "");
          tableHTML += `<td class="text-center"><div class="d-flex align-items-center justify-content-center gap-2"><span>${res.phone}</span><a href="https://wa.me/${clean}" target="_blank" class="text-success contact-icon"><i class="fa-brands fa-whatsapp"></i></a><a href="tel:${res.phone}" class="text-info contact-icon"><i class="fa-solid fa-phone" style="font-size: 0.8rem;"></i></a></div></td>`;
        } else { tableHTML += `<td class="text-center text-muted">-</td>`; }
        
        if (singleVehicle && i === 0) {
          const v = data.vehicles[0];
          tableHTML += `<td class="text-center fw-bold" rowspan="${maxRows}">${v.brand}</td><td class="text-center" rowspan="${maxRows}">${v.model}</td><td class="text-center" rowspan="${maxRows}">${v.color}</td><td class="text-center text-gold-premium" rowspan="${maxRows}">${v.plate}</td>`;
        } else if (!singleVehicle) {
          tableHTML += `<td class="text-center fw-bold">${veh?.brand || '-'}</td><td class="text-center">${veh?.model || '-'}</td><td class="text-center">${veh?.color || '-'}</td><td class="text-center text-gold-premium">${veh?.plate || '-'}</td>`;
        }
        if (i === 0) {
          tableHTML += `<td class="text-center align-middle" rowspan="${maxRows}"><div class="d-flex flex-column gap-1"><button class="btn-action-table btn-edit-registry" onclick="abrirEditarRegistro('${data.id}')" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button><button class="btn-action-table btn-delete-registry" onclick="eliminarRegistro('${data.id}', '${complexName}')" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button></div></td>`;
        }
        tableHTML += `</tr>`;
      }
    });
    tableHTML += `</tbody></table></div>`;
    container.innerHTML = tableHTML;
  } catch (error) {
    console.error("Error:", error);
    container.innerHTML = '<div class="alert alert-danger">Error al cargar los registros.</div>';
  }
};

window.eliminarConjunto = (id) => {
  Swal.fire({ title: "¿Eliminar?", text: "No se puede deshacer.", icon: "warning", showCancelButton: true, confirmButtonColor: "#d4af37", confirmButtonText: "Sí, eliminar" }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await db.collection("complexes").doc(id).delete();
        Swal.fire("Eliminado", "Borrado con éxito.", "success");
        cargarConjuntos();
        actualizarContadoresDashboard();
      } catch (error) { Swal.fire("Error", "No se pudo eliminar.", "error"); }
    }
  });
};

window.addResidentEntryEdit = (data = null) => {
  const container = document.getElementById("editResidentsContainer");
  const div = document.createElement("div");
  div.className = "p-3 rounded border border-secondary border-opacity-25 position-relative bg-dark bg-opacity-25";
  div.innerHTML = `<button type="button" class="btn-close btn-close-white position-absolute end-0 top-0 m-2" onclick="this.parentElement.remove()" style="font-size: 0.6rem;"></button><div class="row g-2"><div class="col-6"><label class="form-label-gold mb-1" style="font-size: 0.65rem;">NOMBRE</label><input type="text" class="form-control resident-name py-1" value="${data ? data.name : ""}" required /></div><div class="col-6"><label class="form-label-gold mb-1" style="font-size: 0.65rem;">APELLIDO</label><input type="text" class="form-control resident-lastname py-1" value="${data ? data.lastname : ""}" required /></div><div class="col-12"><label class="form-label-gold mb-1" style="font-size: 0.65rem;">TELÉFONO</label><input type="tel" class="form-control resident-phone py-1" value="${data ? data.phone : ""}" required /></div></div>`;
  container.appendChild(div);
};

window.addVehicleEntryEdit = (data = null) => {
  const container = document.getElementById("editVehiclesContainer");
  const div = document.createElement("div");
  div.className = "p-3 rounded border border-secondary border-opacity-25 position-relative bg-dark bg-opacity-25";
  div.innerHTML = `<button type="button" class="btn-close btn-close-white position-absolute end-0 top-0 m-2" onclick="this.parentElement.remove()" style="font-size: 0.6rem;"></button><div class="row g-2"><div class="col-6"><label class="form-label-gold mb-1" style="font-size: 0.65rem;">MARCA</label><input type="text" class="form-control v-brand py-1" value="${data ? data.brand : ""}" required /></div><div class="col-6"><label class="form-label-gold mb-1" style="font-size: 0.65rem;">MODELO</label><input type="text" class="form-control v-model py-1" value="${data ? data.model : ""}" required /></div><div class="col-6"><label class="form-label-gold mb-1" style="font-size: 0.65rem;">COLOR</label><input type="text" class="form-control v-color py-1" value="${data ? data.color : ""}" required /></div><div class="col-6"><label class="form-label-gold mb-1" style="font-size: 0.65rem;">PLACA</label><input type="text" class="form-control v-plate py-1" value="${data ? data.plate : ""}" required /></div></div>`;
  container.appendChild(div);
};

window.abrirEditarRegistro = async (id) => {
  Swal.fire({ title: "Cargando datos...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const doc = await db.collection("residents_registry").doc(id).get();
    const data = doc.data();
    document.getElementById("editRegId").value = id;
    document.getElementById("editRegComplexName").value = data.complexName;
    document.getElementById("editRegHouseNum").value = data.houseNum;
    document.getElementById("editRegResType").value = data.resType?.toLowerCase() || "propietario";
    const resCon = document.getElementById("editResidentsContainer"); resCon.innerHTML = "";
    if (data.residents?.length) data.residents.forEach(r => addResidentEntryEdit(r)); else addResidentEntryEdit();
    const vehCon = document.getElementById("editVehiclesContainer"); vehCon.innerHTML = "";
    if (data.vehicles?.length) data.vehicles.forEach(v => addVehicleEntryEdit(v));
    Swal.close();
    new bootstrap.Modal(document.getElementById("editRegistryModal")).show();
  } catch (error) { Swal.fire("Error", "No se pudieron cargar los datos.", "error"); }
};

window.eliminarRegistro = (id, complexName) => {
  Swal.fire({ title: "¿Estás seguro?", icon: "warning", showCancelButton: true, confirmButtonColor: "#dc3545", confirmButtonText: "Sí, eliminar" }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await db.collection("residents_registry").doc(id).delete();
        Swal.fire("¡Eliminado!", "El registro ha sido eliminado.", "success");
        verRegistros(complexName);
      } catch (error) { Swal.fire("Error", "No se pudo eliminar el registro.", "error"); }
    }
  });
};

// =========================================
//  CONFIGURAR FORMULARIO DE CONTRATO (UPDATED)
// =========================================
function configurarFormularioContrato() {
  const contractForm = document.getElementById("contractForm");
  if (!contractForm) return;

  // Set default date
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById("contractDate");
  const startDateInput = document.getElementById("contractStartDate");
  
  if (dateInput) dateInput.value = today;
  if (startDateInput) startDateInput.value = today;

  contractForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const db = firebase.firestore();

    // Recopilar datos del formulario
    const contractData = {
      complexName: document.getElementById("contractComplexName").value.toUpperCase(),
      complexRuc: document.getElementById("contractComplexRuc").value,
      complexRep: document.getElementById("contractComplexRep").value.toUpperCase(),
      canton: document.getElementById("contractCanton").value,
      address: document.getElementById("contractAddress").value.toUpperCase(),
      
      signDate: document.getElementById("contractDate").value,
      startDate: document.getElementById("contractStartDate").value,
      
      price: document.getElementById("contractPrice").value,
      duration: document.getElementById("contractDuration").value,
      annexDetails: document.getElementById("contractAnnex").value,
      
      city: "San Francisco de Quito", 
      companyRep: "EDWIN YUBILLO",
      companyName: "SEGURIDAD 24-7 DEL ECUADOR CIA. LTDA.",
      companyRuc: "1793205916001",
      
      createdAt: new Date(),
    };

    try {
      Swal.fire({
          title: 'Generando Contrato...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
      });

      // Guardar en Firestore
      const docRef = await db.collection("contracts").add(contractData);
      
      Swal.fire({
          icon: 'success',
          title: '¡Contrato Generado!',
          text: 'El contrato ha sido guardado y está listo para visualizar.',
          timer: 1500,
          showConfirmButton: false
      });

      // Prepare data for display (ID needed for PDF generation later)
      document.getElementById("currentContractId").value = docRef.id;

      // Render Contract HTML
      mostrarContrato(contractData);

      // Switch Modals
      const createModal = bootstrap.Modal.getInstance(document.getElementById("createContractModal"));
      if (createModal) createModal.hide();

      const viewModal = new bootstrap.Modal(document.getElementById("viewContractModal"));
      viewModal.show();

      // Refresh list if function exists
      if (typeof cargarContratos === 'function') cargarContratos();

    } catch (error) {
      console.error("Error generating contract:", error);
      Swal.fire("Error", "No se pudo generar el contrato.", "error");
    }
  });

  // PDF Generation Listener
  const pdfBtn = document.getElementById("generateContractPdfBtn");
  if (pdfBtn) {
    // Clone to remove old listeners
    const newBtn = pdfBtn.cloneNode(true);
    pdfBtn.parentNode.replaceChild(newBtn, pdfBtn);
    
    newBtn.addEventListener("click", async () => {
       const content = document.getElementById("contractContentArea");
       if(!content) return;

       Swal.fire({
         title: 'Generando PDF...',
         text: 'Procesando documento legal...',
         allowOutsideClick: false,
         didOpen: () => Swal.showLoading()
       });

       try {
         const { jsPDF } = window.jspdf;
         
         // Wait briefly for images/signatures to load
         await new Promise(resolve => setTimeout(resolve, 800));

         const doc = new jsPDF('p', 'pt', 'a4');
         await doc.html(content, {
            callback: function(doc) {
              const name = document.getElementById("contractComplexName")?.value || "Contrato";
              doc.save(`Contrato_${name.replace(/\s+/g, '_')}.pdf`);
              Swal.close();
            },
            x: 40,
            y: 35,
            html2canvas: {
                scale: 0.72,
                useCORS: true,
                letterRendering: true
            },
            width: 515,
            windowWidth: 800,
            autoPaging: 'text'
         });

       } catch (err) {
         console.error("PDF Error:", err);
         Swal.fire("Error", "No se pudo generar el PDF.", "error");
       }
    });
  }
}

// =========================================
//  MOSTRAR CONTRATO GENERADO (TEXTO LEGAL ESPECÍFICO)
// =========================================
// =========================================
//  MOSTRAR CONTRATO GENERADO (TEXTO LEGAL ESPECÍFICO)
// =========================================
// =========================================
//  MOSTRAR CONTRATO GENERADO (TEXTO LEGAL ESPECÍFICO)
// =========================================
function mostrarContrato(data) {
  const contractContentArea = document.getElementById("contractContentArea");
  
  // Safe Data Access with Fallbacks for older records
  const city = data.city || "San Francisco de Quito";
  const signDate = data.signDate || data.date;
  const startDate = data.startDate || data.date; // Fallback to sign date
  
  const complexName = data.complexName || data.clientName || "_________________";
  const complexRuc = data.complexRuc || "_________________";
  const complexRep = data.complexRep || data.clientName || "_________________";
  const address = data.address || data.clientAddress || "_________________";
  const canton = data.canton || "_________________";
  const price = data.price || data.servicePrice || "0.00";
  const duration = data.duration || "12";
  const annexDetails = data.annexDetails || "No se han registrado equipos para este contrato.";

  // Hardcoded Company Info
  const companyName = "SEGURIDAD 24-7 DEL ECUADOR CIA. LTDA.";
  const companyRep = "EDWIN YUBILLO";
  const companyRuc = "1793205916001";

  // Format Dates
  const formatDateES = (dateString) => {
      if(!dateString) return "______";
      try {
        // Handle Firestore Timestamp if applicable
        if(dateString.toDate) dateString = dateString.toDate();
        
        const date = new Date(dateString);
        // Fix timezone offset issue manually if needed, or simple string split if YYYY-MM-DD
        if (typeof dateString === 'string' && dateString.includes('-')) {
             const [y, m, d] = dateString.split('-');
             const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
             return `${d} de ${months[parseInt(m)-1]} del ${y}`;
        }
        
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
      } catch (e) { return "______"; }
  };

  const signDateText = formatDateES(signDate);
  const startDateText = formatDateES(startDate);

  // Map signatures dynamically
  const firmaHTML = data.clientSignature 
    ? `
    <div style="margin-top: 80px; display: flex; justify-content: space-between; page-break-inside: avoid;">
        <div style="text-align: center; width: 45%;">
            <div style="border-bottom: 2px solid #000; margin-bottom: 12px; height: 100px; display: flex; align-items: flex-end; justify-content: center;">
                <!-- Company signature space -->
            </div>
            <p style="font-weight: 800; text-transform: uppercase; margin: 0; font-size: 14px; color: #000;">${companyRep}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #666; font-style: italic;">Representante Legal</p>
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #d4af37; letter-spacing: 1px;">COMPAÑÍA DE SEGURIDAD</p>
        </div>
        <div style="text-align: center; width: 45%;">
             <div style="border-bottom: 2px solid #000; margin-bottom: 12px; min-height: 100px; display: flex; align-items: center; justify-content: center;">
                <img src="${data.clientSignature}" crossorigin="anonymous" alt="Firma del cliente" style="max-height: 90px; max-width: 180px;">
             </div>
             <p style="font-weight: 800; text-transform: uppercase; margin: 0; font-size: 14px; color: #000;">${complexRep}</p>
             <p style="margin: 4px 0; font-size: 12px; color: #666; font-style: italic;">EL CLIENTE / CONTRATANTE</p>
             <p style="margin: 0; font-size: 11px; font-weight: 700; color: #000; text-transform: uppercase;">${complexName}</p>
        </div>
    </div>
  `
    : `
    <div style="margin-top: 80px; display: flex; justify-content: space-between; page-break-inside: avoid;">
        <div style="text-align: center; width: 45%;">
            <div style="border-bottom: 2px solid #000; margin-bottom: 12px; height: 100px;"></div>
            <p style="font-weight: 800; text-transform: uppercase; margin: 0; font-size: 14px; color: #000;">${companyRep}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #666; font-style: italic;">Representante Legal</p>
        </div>
        <div style="text-align: center; width: 45%;">
             <div style="border-bottom: 2px solid #000; margin-bottom: 12px; height: 100px;"></div>
             <p style="font-weight: 800; text-transform: uppercase; margin: 0; font-size: 14px; color: #000;">${complexRep}</p>
             <p style="margin: 4px 0; font-size: 12px; color: #666; font-style: italic;">EL CLIENTE</p>
        </div>
    </div>
  `;

  // Main Contract Template with Verbatim 11 clauses
  const content = `
    <div style="font-family: 'Times New Roman', serif; line-height: 1.6; color: #000; padding: 60px 50px; background: #fff; width: 800px; margin: 0 auto; box-sizing: border-box;">
      
      <!-- ELEGANT HEADER -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; border-bottom: 3px solid #d4af37; padding-bottom: 20px;">
        <div style="width: 160px;">
          <img src="assets/img/logo.png" alt="Logo" style="max-width: 100%; height: auto;">
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; color: #d4af37; font-size: 24px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">SEGURIDAD 24-7</h2>
          <p style="margin: 4px 0 0; font-size: 10px; color: #444; font-family: 'Helvetica', sans-serif; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Vigilancia Virtual de Alta Gama</p>
          <p style="margin: 2px 0 0; font-size: 9px; color: #777; font-family: 'Helvetica', sans-serif;">RUC: ${companyRuc}</p>
        </div>
      </div>

      <h3 style="text-align: center; font-weight: 900; margin-bottom: 40px; color: #000; text-transform: uppercase; font-size: 17px; letter-spacing: 0.5px; line-height: 1.4;">
        CONTRATO DE PRESTACIÓN DE SERVICIOS DE SEGURIDAD PRIVADA Y<br>VIGILANCIA CON GUARDIAS VIRTUALES
      </h3>

      <div style="text-align: justify; font-size: 14px; color: #000;">
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
            Teniendo como base los antecedentes enunciados, El Cliente contrata resguardo y protección privada virtual, mediante el monitoreo al sistema de cámaras, perifoneo las 24 horas de lunes a domingo, adicional la empresa en caso de emergencia como intentos de robo, asalto, hurto, etc., la compañía coordinará con ECU 911, auxilio inmediato, además que personal motorizado propio de la compañía acudirá en auxilio, en un tiempo promedio de 20 minutos, para socorrer ante el incidente presentado con el fin de proteger, custodiar y brindar máxima seguridad interna y externa al lugar indicado.
          </p>
          <p style="margin-top: 8px;">
            La Compañía de Seguridad se compromete a colocar la infraestructura necesaria que garantice:
            <br>Alerta de identificación de movimiento/detección de personas en horas de poco tránsito para que, La Compañía de Seguridad alerte de forma temprana e identifique posibles riesgos.
            <br>Para corroborar el cumplimiento de este, se anexará (Anexo 1) a este contrato un informe de los componentes instalados, Adicional, El Cliente podrá solicitar un nuevo informe del cumplimiento de cobertura de los vídeos cuando lo considere necesario. Si estos equipos presentan fallas y deben ser reparados o reposicionados, este costo lo asumirá la Compañía de Seguridad.
            <br>La Compañía de Seguridad brindará el servicio de rondas a través de un motorizado o camioneta que visitará el Domicilio una vez al día en un horario aleatorio.
          </p>
        </div>

        <!-- CLAUSE 3 -->
        <div style="margin-bottom: 18px; background: #fdfbf5; padding: 20px; border-left: 5px solid #d4af37;">
          <p style="margin: 0;"><strong>TERCERA. - PRECIO:</strong> El valor por el servicio de seguridad es por la cantidad de <span style="font-size: 18px; font-weight: 900; color: #d4af37;">$${price} USD</span> (+ IVA), cancelados los primeros 5 días del mes. El retiro del valor mensual a pagar será efectuado por un delegado oficial del personal administrativo debidamente autorizado de SEGURIDAD 24/7.</p>
        </div>

        <!-- CLAUSE 4 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>CUARTA. - PLAZO:</strong> El plazo de duración do el presente contrato es por <strong>${duration} meses</strong>, renovable automáticamente si no existe aviso previo de 30 días.</p>
        </div>

        <!-- CLAUSE 5 -->
        <div style="margin-bottom: 18px;">
          <p style="margin-bottom: 5px;"><strong>QUINTA. - CONDICIONES ESPECIALES:</strong> La empresa de seguridad., conjuntamente con el Supervisor de Seguridad controlarán coordinadamente la función de los Guardias Virtuales.</p>
        </div>

        <!-- CLAUSE 6 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>SEXTA. - RESPONSABILIDAD DE LA EMPRESA DE SEGURIDAD:</strong> La compañía se responsabiliza a disponer de una pantalla exclusiva para el monitoreo institucional y dar recomendaciones preventivas.</p>
        </div>

        <!-- CLAUSE 7 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>SEPTIMO. - SERVICIO ADICIONAL:</strong> SEGURIDAD 24/7 posee una póliza de responsabilidad civil de $100.000,00 USD contratada con la aseguradora Zúrich.</p>
        </div>

        <!-- CLAUSE 8 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>OCTAVA. - PARTES DEL CONTRATO:</strong> Nombramientos, copias de cédulas, oferta y Anexo 1 forman parte este contrato.</p>
        </div>

        <!-- CLAUSE 9 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>NOVENA. - FORMA DE PAGO:</strong> Pago dentro de los 5 primeros días. El incumplimiento causará la suspensión del servicio.</p>
        </div>

        <!-- CLAUSE 10 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>DECIMA. - TERMINACIÓN DEL CONTRATO:</strong> Terminación por violación de cláusulas o decisión unilateral con 30 días de aviso previo.</p>
        </div>

        <!-- CLAUSE 11 -->
        <div style="margin-bottom: 18px;">
            <p style="margin-bottom: 5px;"><strong>DECIMA PRIMERA. - JURISDICCIÓN Y COMPETENCIA:</strong> Sometimiento a mediación o a los jueces civiles del Distrito Metropolitano de Quito.</p>
        </div>

        <p style="margin-top: 40px; font-weight: 700; text-align: center; color: #111; padding-top: 20px; border-top: 1px solid #eee;">
          Para constancia de lo estipulado, las partes firman el presente contrato digital.
        </p>

        ${firmaHTML}

        <!-- ANNEX PAGE -->
        <div style="page-break-before: always; border-top: 2px dashed #d4af37; margin-top: 50px; padding-top: 50px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h4 style="font-weight: 900; color: #d4af37; text-transform: uppercase; font-size: 16px; letter-spacing: 1px;">ANEXO 1: EQUIPAMIENTO INSTALADO</h4>
          </div>
          <div style="border: 2px solid #f1e6c9; padding: 30px; min-height: 250px; background: #fffcf5; border-radius: 10px; white-space: pre-line; font-family: 'Courier New', monospace; font-size: 13px; color: #222;">
            ${annexDetails}
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 40px;">
               <div style="text-align: center; width: 45%;">
                   <p style="font-size: 11px; font-weight: 600; margin-bottom: 30px; color: #888;">ENTREGA EQUIPOS</p>
                   <p style="border-top: 2px solid #000; padding-top: 8px; font-weight: 900; font-size: 13px;">${companyRep}</p>
               </div>
               <div style="text-align: center; width: 45%;">
                   <p style="font-size: 11px; font-weight: 600; margin-bottom: 30px; color: #888;">RECIBE CONFORME</p>
                   <p style="border-top: 2px solid #000; padding-top: 8px; font-weight: 900; font-size: 13px;">${complexRep}</p>
               </div>
          </div>
        </div>

        ${
          data.clientIdPhoto
            ? `
          <div style="margin-top: 50px; text-align: center; page-break-before: always;">
            <div style="border-bottom: 3px solid #d4af37; padding-bottom: 10px; margin-bottom: 25px;">
                <h4 style="font-weight: 900; color: #000; text-transform: uppercase; font-size: 16px;">EVIDENCIA: CÉDULA DE IDENTIDAD / RUC</h4>
            </div>
            <div style="display: inline-block; padding: 10px; border: 1px solid #eee; background: #fff; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                <img src="${data.clientIdPhoto}" crossorigin="anonymous" alt="Cédula" style="max-width: 500px; width: 100%; height: auto; border-radius: 5px;">
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

// =========================================
//  MOSTRAR CONTRATO GENERADO
// =========================================
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
      .then(async (userCredential) => {
        const user = userCredential.user;
        
        // Validar Rol y Estado
        const doc = await db.collection("users").doc(user.uid).get();
        const userData = doc.exists ? doc.data() : null;
        
        console.log("Debug Login - User UID:", user.uid);
        console.log("Debug Login - User Data:", userData);

        // 1. Validar existencia de datos y Rol
        const role = userData ? userData.role : null;
        const isMainAdmin = user.email === 'admin@gmail.com';
        
        // Solo permitir Administradores en este formulario
        const isAuthorized = isMainAdmin || role === 'administrador' || role === 'admin';

        // 2. Validar Estado Activo (si no es el admin principal)
        const isActive = isMainAdmin || (userData && userData.status !== 'inactive');

        if (!isAuthorized || !isActive) {
          let errorMsg = "Su cuenta no tiene permisos para acceder a este apartado (Administración). Por favor use el formulario correcto.";
          if (!isActive && userData) errorMsg = "Su cuenta ha sido desactivada. Por favor, contacte con el administrador.";

          auth.signOut().then(() => {
            Swal.fire({
              icon: "error",
              title: "Acceso Denegado",
              text: errorMsg,
              confirmButtonColor: "#d4af37",
            }).then(() => {
              const form = document.getElementById("adminLoginForm");
              if (form) form.reset();
              window.location.href = "control_center.html";
            });
          });
          return;
        }

        // 3. Login Exitoso
        const userName = (userData && (userData.adminName || userData.nombre || userData.displayName)) || "Administrador";
        
        Swal.fire({
          icon: "success",
          title: "¡Bienvenido!",
          text: `Ingresando a Gestión Admin, ${userName}`,
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          // Intentar cerrar el modal de forma segura
          try {
            const modalEl = document.getElementById("loginModalAdmin");
            if (modalEl && typeof bootstrap !== 'undefined') {
              const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
              if (modal) modal.hide();
            }
          } catch (error) {
            console.warn("No se pudo cerrar el modal automáticamente:", error);
          }
          
          // Redirección inmediata
          window.location.href = "gestion_admin.html";
        });
      })
      .catch((error) => {
        console.error("Login Error:", error);
        let errorMsg = "Ocurrió un error al iniciar sesión.";

        // Detectar error de credenciales inválidas (Firebase Auth REST API o SDK)
        if (error.message && (error.message.includes("INVALID_LOGIN_CREDENTIALS") || error.message.includes("auth/wrong-password") || error.message.includes("auth/user-not-found") || error.message.includes("INVALID_PASSWORD"))) {
          errorMsg = "Credenciales incorrectas o usuario no encontrado";
        } else if (error.message) {
           // Intentar limpiar mensaje si es JSON
           try {
             // A veces el mensaje es un JSON stringificado
             if (error.message.startsWith('{')) {
                const parsed = JSON.parse(error.message);
                if (parsed.error && parsed.error.message === 'INVALID_LOGIN_CREDENTIALS') {
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
          confirmButtonColor: "#d4af37"
        }).then(() => {
          // Reset form on error
          const form = document.getElementById("adminLoginForm");
          if (form) form.reset();
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
// Helper: Resize Image
const resizeImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
     const reader = new FileReader();
     reader.readAsDataURL(file);
     reader.onload = (event) => {
       const img = new Image();
       img.src = event.target.result;
       img.onload = () => {
         const canvas = document.createElement('canvas');
         let width = img.width;
         let height = img.height;
         if (width > maxWidth) {
           height *= maxWidth / width;
           width = maxWidth;
         }
         canvas.width = width;
         canvas.height = height;
         const ctx = canvas.getContext('2d');
         ctx.drawImage(img, 0, 0, width, height);
         resolve(canvas.toDataURL(file.type, quality));
       };
       img.onerror = error => reject(error);
     };
     reader.onerror = error => reject(error);
  });
};

function configurarFormulario() {
  const form = document.getElementById("jobForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const clientName = document.getElementById("clientName").value.toUpperCase();
    const jobDate = document.getElementById("jobDate").value;
    const jobUrgency = document.getElementById("jobUrgency").value;
    const contactName = document.getElementById("contactName").value.toUpperCase();
    const contactPhone = document.getElementById("contactPhone").value;
    const jobDescription = document.getElementById("jobDescription").value; 
    const jobImageFile = document.getElementById("jobImage").files[0]; 

    Swal.fire({
        title: 'Guardando...',
        text: 'Procesando datos e imagen...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
      let jobImageUrl = "";

      // Convert image to Base64 and save to Firestore Database
      if (jobImageFile) {
          console.log("📸 Procesando imagen:", jobImageFile.name);
          try {
              console.log("🔄 Convirtiendo imagen a Base64...");
              jobImageUrl = await resizeImage(jobImageFile);
              console.log("✅ Imagen convertida a Base64 (tamaño:", jobImageUrl.length, "caracteres)");
          } catch (resizeError) {
              console.error("❌ Error al procesar imagen:", resizeError);
              Swal.fire({
                icon: "warning",
                title: "Advertencia",
                text: "No se pudo procesar la imagen. El trabajo se guardará sin imagen.",
                timer: 2000,
                showConfirmButton: false
              });
              jobImageUrl = "";
          }
      }

      console.log("💾 Guardando trabajo en Firestore Database...");
      const jobData = {
        clientName,
        jobDate,
        jobUrgency,
        contactName,
        contactPhone,
        jobDescription,
        jobImageUrl,
        status: "Pendiente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      console.log("📋 Datos a guardar:", { 
        ...jobData, 
        jobImageUrl: jobImageUrl ? `[Base64 - ${jobImageUrl.length} chars]` : "sin imagen" 
      });
      
      await db.collection("trabajos").add(jobData);
      console.log("✅ Trabajo guardado exitosamente en Firestore Database");

      Swal.fire({
        title: "¡Trabajo Guardado!",
        text: "La orden ha sido creada y se notificará por WhatsApp",
        icon: "success",
        timer: 3000,
        showConfirmButton: false
      }).then(() => {
        // Enviar WhatsApp
        let message = `🔔 *NUEVA ASIGNACIÓN TÉCNICA*\n\n` +
                      `📋 *Cliente:* ${jobData.clientName}\n` +
                      `📅 *Fecha:* ${jobData.jobDate}\n` +
                      `🚨 *Urgencia:* ${jobData.jobUrgency}\n` +
                      `👤 *Contacto:* ${jobData.contactName}\n` +
                      `📞 *Teléfono:* ${jobData.contactPhone}\n` +
                      `📝 *Problema:* ${jobDescription}\n`;

        if (jobImageUrl) {
            if (jobImageUrl.startsWith("http")) {
                message += `🖼️ *Foto del Problema:* ${jobImageUrl}\n\n`;
            } else {
                 message += `🖼️ *Foto del Problema:* (Adjunta en el reporte del sistema)\n\n`;
            }
        } else {
             message += `\n`;
        }
        
        message += `👉 *Por favor, revisar portal para gestión.*`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      });

      form.reset();
      bootstrap.Modal.getInstance(document.getElementById("addJobModal")).hide();
      cargarTrabajos(); // Recargar la lista

    } catch (error) {
      console.error("Error al guardar trabajo: ", error);
      Swal.fire("Error", "No se pudo guardar el trabajo.", "error");
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
      const data = doc.data();
      if (!data.isGuide) {
        window.allTrabajos.push({ id: doc.id, ...data });
      }
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
              <i class="fa-solid fa-pen-to-square"></i> 
            </button>

            <button class="btn-delete" onclick="eliminarTrabajo('${data.id}')">
              <i class="fa-solid fa-trash"></i> 
            </button>
            </div>
            


            ${reportButton}
          </div>
        </div>
      `;
    });
  }

  // Helper Whatsapp Global
  window.notificarWhatsapp = (type, id) => {
    let message = "";
    
    if (type === 'job') {
      const job = window.allTrabajos.find(j => j.id === id);
      if (!job) return;
      message = `🔔 *NUEVA ASIGNACIÓN TÉCNICA*\n\n` +
                `📋 *Cliente:* ${job.clientName}\n` +
                `📅 *Fecha:* ${job.jobDate}\n` +
                `🚨 *Urgencia:* ${job.jobUrgency}\n` +
                `👤 *Contacto:* ${job.contactName}\n` +
                `📞 *Teléfono:* ${job.contactPhone}\n\n` +
                `👉 *Por favor, revisa el portal de técnicos para más detalles.*`;
    } else if (type === 'contract') {
      const contract = window.allContratos.find(c => c.id === id);
      if (!contract) return;
       // Format Date
      const cDate = new Date(contract.date + "T00:00:00").toLocaleDateString("es-ES");
      
      message = `📄 *NUEVO CONTRATO DISPONIBLE*\n\n` +
                `🏢 *Cliente:* ${contract.clientName}\n` +
                `📅 *Fecha:* ${cDate}\n` +
                `💰 *Monto:* $${contract.servicePrice}\n` +
                `📍 *Ciudad:* ${contract.city}\n\n` +
                `👉 *Se requiere gestión técnica/administrativa. Revisa el portal.*`;
    }

    if (message) {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

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

    // Populate Initial Problem Section
    const problemSection = document.getElementById("initialProblemSection");
    const problemDesc = document.getElementById("reportProblemDescription");
    const problemImg = document.getElementById("reportProblemImage");
    
    if (data.jobDescription || data.jobImageUrl) {
        problemSection.style.display = "block";
        problemDesc.innerText = data.jobDescription || "Sin descripción detallada.";
        
        if (data.jobImageUrl) {
            document.getElementById("reportProblemImageContainer").style.display = "block";
            problemImg.src = data.jobImageUrl;
        } else {
            document.getElementById("reportProblemImageContainer").style.display = "none";
            problemImg.src = "";
        }
    } else {
        problemSection.style.display = "none";
    }

    // Manejar Firmas
    const signaturesSection = document.getElementById("reportSignaturesSection");
    const signatureImg = document.getElementById("reportClientSignature");
    if (data.clientSignature) {
      signatureImg.src = data.clientSignature;
      signaturesSection.style.display = "block";
    } else {
      signatureImg.src = "";
      signaturesSection.style.display = "none";
    }

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
    // Handling new and old field names
    const signDate = data.signDate || data.date;
    const name = data.complexName || data.clientName || "Sin Nombre";
    const idNum = data.complexRuc || data.clientId || "---";
    const priceVal = data.price || data.servicePrice || "0.00";

    let formattedDate = "---";
    if (signDate) {
      try {
        const contractDate = new Date(signDate + "T00:00:00");
        formattedDate = contractDate.toLocaleDateString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } catch (e) {
        formattedDate = "Error Fecha";
      }
    }

    // Verificar si el contrato está completado
    const isCompleted = data.clientSignature && data.clientIdPhoto;
    const statusBadge = isCompleted
      ? '<span class="badge bg-success mb-2">Completado</span>'
      : '<span class="badge bg-warning text-dark mb-2">Pendiente</span>';

    container.innerHTML += `
      <div class="col-lg-4 col-md-6 col-12">
        <div class="job-card">
          <h5>Contrato: ${name}</h5>
          <div class="job-divider"></div>
          ${statusBadge}
          <p><strong>Fecha:</strong> ${formattedDate}</p>
          <p><strong>Cliente:</strong> ${name}</p>
          <p><strong>Cédula/RUC:</strong> ${idNum}</p>
          <p><strong>Precio:</strong> $${priceVal} + IVA</p>
          <div class="d-flex gap-2 mt-3">
            <button class="btn-view-report" onclick="verContrato('${data.id}')">
              <i class="fa-solid fa-eye"></i> 
            </button>
            ${isCompleted
        ? `
              <button class="btn btn-primary" onclick="verContrato('${data.id}')">
                <i class="fa-solid fa-print"></i> 
              </button>
            `
        : ""
      }
            <button class="btn-delete" onclick="eliminarContrato('${data.id}')">
              <i class="fa-solid fa-trash"></i> 
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
  try {
    const doc = await db.collection("contracts").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Error", "El contrato no existe.", "error");
      return;
    }
    const data = doc.data();

    // Guardar el ID del contrato actual para el PDF
    const hiddenInput = document.getElementById("currentContractId");
    if (hiddenInput) {
      hiddenInput.value = id;
    } else {
      console.error("No se encontró el input hidden 'currentContractId'");
    }

    mostrarContrato(data);
    const viewModal = new bootstrap.Modal(
      document.getElementById("viewContractModal")
    );
    viewModal.show();
  } catch (error) {
    console.error("Error al ver contrato:", error);
    Swal.fire("Error", "No se pudo cargar el contrato.", "error");
  }
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
  const selects = [
    document.getElementById("newUserContract"),
    document.getElementById("editUserContract")
  ];

  try {
    const snapshot = await db.collection("contracts").orderBy("createdAt", "desc").get();
    
    selects.forEach(select => {
      if (!select) return;
      const currentValue = select.value;
      let optionsHTML = '<option value="" selected disabled>Seleccione un contrato...</option>';
      optionsHTML += '<option value="no-dispone">❌ No dispone de contrato</option>';
      snapshot.forEach(doc => {
        const data = doc.data();
        optionsHTML += `<option value="${doc.id}">${data.clientName} - ${data.date || ''}</option>`;
      });
      select.innerHTML = optionsHTML;
      if (currentValue) select.value = currentValue;
      
      // Inicializar Select2
      $(select).select2({
        dropdownParent: $(select).closest('.modal'),
        width: '100%',
        theme: 'default'
      });
    });
  } catch (error) {
    console.error("Error al cargar opciones de contrato:", error);
  }
}

// =========================================
//  CARGAR OPCIONES DE CONJUNTO (COMPLEXES)
// =========================================
async function cargarOpcionesComplejos() {
  const selects = [
    document.getElementById("newUserComplex"),
    document.getElementById("editUserComplex")
  ];

  try {
    const snapshot = await db.collection("complexes").orderBy("name", "asc").get();
    
    selects.forEach(select => {
      if (!select) return;
      const currentValue = select.value;
      let optionsHTML = '<option value="" selected disabled>Seleccione un conjunto...</option>';
      snapshot.forEach(doc => {
        const data = doc.data();
        // Mostrar campo 'admin' como texto principal
        optionsHTML += `<option value="${data.name}">${data.admin || data.name}</option>`;
      });
      select.innerHTML = optionsHTML;
      if (currentValue) select.value = currentValue;

      // Inicializar Select2
      $(select).select2({
        dropdownParent: $(select).closest('.modal'),
        width: '100%',
        theme: 'default'
      });
    });
  } catch (error) {
    console.error("Error al cargar opciones de complejos:", error);
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
  console.log("Iniciando protección de ruta...");
  
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.warn("No hay sesión activa, redirigiendo a control_center.html");
      window.location.href = "control_center.html";
      return;
    }

    try {
      console.log("Sesión activa detectada para:", user.email);
      const doc = await db.collection("users").doc(user.uid).get();
      
      if (!doc.exists) {
        // Excepción especial para el admin principal si no tiene documento
        if (user.email === 'admin@gmail.com') {
          console.log("Admin principal sin documento, acceso permitido.");
          configurarUIAdmin(user, { adminName: "Super Admin", role: "admin" });
          return;
        }
        
        console.error("No se encontró documento de usuario en Firestore.");
        throw new Error("Su cuenta no tiene perfil configurado.");
      }

      const userData = doc.data();
      const role = userData.role ? userData.role.toLowerCase() : "";
      const isMainAdmin = user.email === 'admin@gmail.com';
      const isAuthorized = isMainAdmin || role === 'administrador' || role === 'admin';

      console.log("Validación de rol:", { email: user.email, role: role, isAuthorized: isAuthorized });

      if (!isAuthorized) {
        await auth.signOut();
        Swal.fire({
          icon: "error",
          title: "Acceso Denegado",
          text: "Este portal es exclusivo para administradores.",
          confirmButtonColor: "#d4af37",
        }).then(() => {
          window.location.href = "control_center.html";
        });
        return;
      }

      // Usuario autorizado, configurar UI
      configurarUIAdmin(user, userData);

    } catch (error) {
      console.error("Error en validación de sesión:", error);
      await auth.signOut();
      Swal.fire({
        icon: "error",
        title: "Error de Sesión",
        text: error.message || "Ocurrió un error al verificar sus permisos.",
        confirmButtonColor: "#d4af37",
      }).then(() => {
        window.location.href = "control_center.html";
      });
    }
  });
}

function configurarUIAdmin(user, data) {
  const userNameEl = document.getElementById("userName");
  const userEmailEl = document.getElementById("userEmail");
  const userProfileCard = document.getElementById("userProfileCard");

  if (userNameEl) userNameEl.textContent = data.adminName || data.name || "Administrador";
  if (userEmailEl) userEmailEl.textContent = data.email || user.email;
  
  // Actualizar también en el sidebar
  const sidebarEmail = document.getElementById("sidebarUserEmail");
  if (sidebarEmail) {
    sidebarEmail.textContent = (data.email || user.email).split('@')[0];
    sidebarEmail.title = data.email || user.email;
  }
  
  if (userProfileCard) userProfileCard.style.display = "block";

  // Poblar info en el sidebar
  const sidebarAdminName = document.getElementById("sidebarAdminName");
  const sidebarComplexName = document.getElementById("sidebarComplexName");
  
  if (sidebarAdminName) sidebarAdminName.textContent = data.adminName || data.name || "Administrador";
  if (sidebarComplexName) sidebarComplexName.textContent = data.complexName || "Seguridad 247";
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
// =========================================
//  GESTIÓN DE USUARIOS (CREAR, LISTAR)
// =========================================
// Variables Globales para Filtros
window.currentUserRoleFilter = 'all';

// Función para cambiar el filtro de rol
window.filtrarUsuariosPorRol = (role) => {
  window.currentUserRoleFilter = role;
  
  // Actualizar UI de botones
  const buttons = document.querySelectorAll(".filter-btn");
  buttons.forEach(btn => {
    // Extraer el rol del atributo onclick
    const onclickAttr = btn.getAttribute("onclick");
    const btnRole = onclickAttr ? onclickAttr.match(/'([^']+)'/)[1] : 'all';
    
    if (btnRole === role) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  aplicarFiltrosUsuarios();
};

// Función principal de filtrado (Search + Role)
window.aplicarFiltrosUsuarios = () => {
  const searchTerm = document.getElementById("userSearchInput").value.toLowerCase();
  const roleFilter = window.currentUserRoleFilter;

  const filteredUsers = window.allUsers.filter(user => {
    const matchesSearch = (user.name || "").toLowerCase().includes(searchTerm) || 
                          (user.email || "").toLowerCase().includes(searchTerm) ||
                          (user.adminName || "").toLowerCase().includes(searchTerm);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  renderUsuariosGrid(filteredUsers);
};

// Cargar Usuarios
async function cargarUsuariosManagement() {
  const container = document.getElementById("usersGrid") || document.getElementById("usersCardsContainer");
  if (!container) return;

  container.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="fa-solid fa-spinner fa-spin fa-2x mb-3"></i><br>Cargando usuarios...</div>';

  try {
    const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();
    
    window.allUsers = [];
    snapshot.forEach(doc => {
      window.allUsers.push({ id: doc.id, ...doc.data() });
    });

    // Inyectar estilos modernos y elegantes (Sustituye por completo los anteriores)
    if (!document.getElementById("userManagementStyles")) {
      const styles = `
        <style id="userManagementStyles">
          /* Botones de Filtro Premium */
          .filter-btn {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(212,175,55,0.15);
            color: rgba(255,255,255,0.6);
            padding: 10px 22px;
            border-radius: 14px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            backdrop-filter: blur(8px);
            cursor: pointer;
            margin-bottom: 5px;
          }
          .filter-btn:hover {
            background: rgba(212,175,55,0.08);
            border-color: rgba(212,175,55,0.4);
            color: #d4af37;
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
          }
          .filter-btn.active {
            background: linear-gradient(135deg, #d4af37, #f1c40f) !important;
            color: #000 !important;
            border-color: transparent !important;
            font-weight: 700;
            box-shadow: 0 8px 20px rgba(212,175,55,0.4);
          }

          /* Buscador Pro */
          .premium-search {
            position: relative;
            display: flex;
            align-items: center;
          }
          .search-icon-gold {
            position: absolute;
            left: 22px;
            color: #d4af37;
            font-size: 1.2rem;
            pointer-events: none;
            z-index: 10;
          }
          .search-input-glass {
            background: rgba(255,255,255,0.02) !important;
            border: 1px solid rgba(212,175,55,0.15) !important;
            border-radius: 100px !important;
            padding: 16px 25px 16px 60px !important;
            color: #fff !important;
            font-size: 1rem;
            transition: all 0.4s ease !important;
            backdrop-filter: blur(20px);
            width: 100%;
          }
          .search-input-glass:focus {
            background: rgba(255,255,255,0.05) !important;
            border-color: #d4af37 !important;
            box-shadow: 0 0 30px rgba(212,175,55,0.2) !important;
            outline: none;
          }

          /* Tarjetas de Usuario Premium */
          .user-card {
            background: rgba(255,255,255,0.02) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 24px !important;
            transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
            backdrop-filter: blur(15px);
          }
          .user-card:hover {
            transform: translateY(-12px) scale(1.02);
            border-color: rgba(212,175,55,0.4) !important;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            background: rgba(255,255,255,0.05) !important;
          }
          .bg-gold-gradient {
            background: linear-gradient(135deg, #d4af37, #f9df91);
          }

          /* Estilos Select2 Premium Dark/Gold */
          .select2-container--default .select2-selection--single {
            background-color: #fff !important;
            border: 1px solid #d4af37 !important;
            height: 45px !important;
            border-radius: 8px !important;
            display: flex;
            align-items: center;
          }
          .select2-container--default .select2-selection--single .select2-selection__rendered {
            color: #000 !important;
            line-height: 45px !important;
            padding-left: 15px !important;
          }
          .select2-container--default .select2-selection--single .select2-selection__arrow {
            height: 45px !important;
          }
          .select2-dropdown {
            background-color: #1a1a1a !important;
            border: 1px solid #d4af37 !important;
            color: #fff !important;
            border-radius: 8px !important;
            overflow: hidden;
          }
          .select2-search__field {
            background-color: #000 !important;
            border: 1px solid #d4af37 !important;
            color: #fff !important;
            border-radius: 4px !important;
          }
          .select2-results__option--highlighted[aria-selected] {
            background-color: #d4af37 !important;
            color: #000 !important;
          }
          .select2-results__option[aria-selected="true"] {
            background-color: rgba(212, 175, 55, 0.2) !important;
            color: #d4af37 !important;
          }
        </style>
      `;
      document.head.insertAdjacentHTML("beforeend", styles);
    }

    // Renderizar con filtros actuales
    aplicarFiltrosUsuarios();

  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    container.innerHTML = '<div class="col-12 text-center py-4 text-danger">Error al cargar la lista de usuarios.</div>';
  }
}

// Función auxiliar para renderizar el grid de usuarios
function renderUsuariosGrid(users) {
  const container = document.getElementById("usersGrid") || document.getElementById("usersCardsContainer");
  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="fa-solid fa-users-slash fa-3x mb-3"></i><br>No se encontraron usuarios que coincidan con los filtros.</div>';
    return;
  }

  container.innerHTML = "";
  users.forEach(user => {
    const id = user.id;
    const roleBadgeMap = {
      'administrador': 'bg-gold',
      'ADMIN_CONJUNTO': 'bg-info',
      'tecnico': 'bg-secondary',
      'monitoreo': 'bg-primary'
    };

    const roleTextMap = {
      'administrador': 'Admin Gral.',
      'ADMIN_CONJUNTO': 'Admin Conjunto',
      'tecnico': 'Técnico',
      'monitoreo': 'Monitoreo / Ops'
    };

    const roleIconMap = {
      'administrador': 'fa-crown',
      'ADMIN_CONJUNTO': 'fa-building-shield',
      'tecnico': 'fa-toolbox',
      'monitoreo': 'fa-desktop'
    };

    const roleBadge = roleBadgeMap[user.role] || 'bg-dark';
    const roleText = roleTextMap[user.role] || user.role;
    const roleIcon = roleIconMap[user.role] || 'fa-user';

    const statusBadge = user.status === 'inactive' ? 'bg-danger' : 'bg-success';
    const statusText = user.status === 'inactive' ? 'Inactivo' : 'Activo';
    
    const toggleIcon = user.status === 'inactive' ? 'fa-eye' : 'fa-eye-slash';
    const toggleTitle = user.status === 'inactive' ? 'Activar Usuario' : 'Desactivar Usuario';
    const toggleAction = user.status === 'inactive' ? 'active' : 'inactive';
    const toggleBtnClass = user.status === 'inactive' ? 'btn-outline-success' : 'btn-outline-danger';

    const roleExtraInfoMap = {
      'administrador': 'Administración Global / Sede Central',
      'ADMIN_CONJUNTO': user.complexName || 'Conjunto sin asignar',
      'tecnico': user.subRole || 'Técnico General',
      'monitoreo': 'Centro de Operaciones 24/7'
    };

    const extraInfo = roleExtraInfoMap[user.role] || 'Información no disponible';

    const card = `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="user-card h-100 p-4 rounded-4 shadow-lg border border-secondary bg-dark position-relative overflow-hidden">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="user-avatar bg-gold-gradient rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
              <i class="fa-solid ${roleIcon} text-dark fs-4"></i>
            </div>
            <div class="text-end">
              <span class="badge ${roleBadge} mb-1">${roleText}</span><br>
              <span class="badge ${statusBadge}">${statusText}</span>
            </div>
          </div>
          
          <h4 class="text-white mb-1">${user.adminName || user.name || 'Sin nombre'}</h4>
          <p class="text-white-50 small mb-3"><i class="fa-solid fa-envelope me-2"></i>${user.email}</p>
          
          <div class="user-details mb-4">
            <div class="d-flex align-items-center text-white-50 small mb-2">
              <i class="fa-solid fa-circle-info me-2 text-gold"></i>
              <span class="text-truncate" title="${extraInfo}">${extraInfo}</span>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top border-secondary">
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-info" onclick="abrirEditarUsuario('${id}')" title="Editar Usuario">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-sm ${toggleBtnClass}" onclick="toggleUserStatus('${id}', '${toggleAction}')" title="${toggleTitle}">
                <i class="fa-solid ${toggleIcon}"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    container.innerHTML += card;
  });
}

// Abrir modal de edición
window.abrirEditarUsuario = (id) => {
  const user = window.allUsers.find(u => u.id === id);
  if (!user) return;

  const modalEl = document.getElementById("editUserManagementModal");
  if (!modalEl) return;

  document.getElementById("editUserId").value = id;
  document.getElementById("editUserName").value = user.adminName || user.name || "";
  document.getElementById("editUserEmail").value = user.email || "";
  
  const isTech = user.role === 'tecnico';
  const isAdmin = user.role === 'administrador' || user.role === 'ADMIN_CONJUNTO';

  const techFields = document.getElementById("editTechFields");
  const adminFields = document.getElementById("editAdminFields");
  const contractFieldEdit = document.getElementById("contractFieldEdit");
  const complexFieldEdit = document.getElementById("complexFieldEdit");
  
  if (techFields) techFields.style.display = isTech ? 'block' : 'none';
  if (adminFields) adminFields.style.display = isAdmin ? 'block' : 'none';
  if (contractFieldEdit) contractFieldEdit.style.display = user.role === 'ADMIN_CONJUNTO' ? 'block' : 'none';
  if (complexFieldEdit) complexFieldEdit.style.display = user.role === 'ADMIN_CONJUNTO' ? 'block' : 'none';

  if (isTech) document.getElementById("editUserSubRole").value = user.subRole || "tecnico-obrero";
  if (isAdmin && user.role === 'ADMIN_CONJUNTO') {
    cargarOpcionesContrato().then(() => {
      document.getElementById("editUserContract").value = user.contractId || "";
    });
    cargarOpcionesComplejos().then(() => {
      document.getElementById("editUserComplex").value = user.complexName || "";
    });
  }

  // Configurar el botón de reset password
  const btnReset = document.getElementById("btnResetPasswordUser");
  if (btnReset) {
    const newBtn = btnReset.cloneNode(true);
    btnReset.parentNode.replaceChild(newBtn, btnReset);
    newBtn.addEventListener("click", () => {
      enviarCorreoReset(user.email);
    });
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
};

// Cambiar estado de usuario (Activar/Desactivar)
window.toggleUserStatus = async (id, newStatus) => {
  try {
    const actionText = newStatus === 'active' ? 'activado' : 'desactivado';
    
    Swal.fire({
      title: 'Cambiando estado...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    await db.collection("users").doc(id).update({ status: newStatus });
    
    Swal.fire({
      icon: 'success',
      title: '¡Actualizado!',
      text: `El usuario ha sido ${actionText} correctamente.`,
      timer: 1500,
      showConfirmButton: false
    });

    cargarUsuariosManagement();
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    Swal.fire("Error", "No se pudo cambiar el estado del usuario", "error");
  }
};

// Listener para el formulario de edición
document.addEventListener("DOMContentLoaded", () => {
    const editUserForm = document.getElementById("editUserManagementForm");
    if (editUserForm) {
        editUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const id = document.getElementById("editUserId").value;
            const name = document.getElementById("editUserName").value;
            const subRole = document.getElementById("editUserSubRole").value;
            const contractId = document.getElementById("editUserContract") ? document.getElementById("editUserContract").value : "";
            const complexName = document.getElementById("editUserComplex") ? document.getElementById("editUserComplex").value : "";

            Swal.fire({
                title: 'Actualizando usuario...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const user = window.allUsers.find(u => u.id === id);
                const isTech = user.role === 'tecnico';
                const isAdmin = user.role === 'administrador' || user.role === 'ADMIN_CONJUNTO';

                const updateData = {
                    name: name,
                    adminName: name, // Compatibilidad
                };

                if (isTech) updateData.subRole = subRole;
                if (isAdmin) {
                    if (user.role === 'ADMIN_CONJUNTO') {
                        updateData.contractId = contractId;
                        updateData.complexName = complexName;
                    }
                }

                await db.collection("users").doc(id).update(updateData);
                
                Swal.fire("¡Éxito!", "Usuario actualizado correctamente.", "success");
                const modalEl = document.getElementById("editUserManagementModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                cargarUsuariosManagement();

            } catch (error) {
                console.error("Error al actualizar usuario:", error);
                Swal.fire("Error", error.message, "error");
            }
        });
    }

    const roleSelect = document.getElementById("newUserRole");
    if (roleSelect) {
        roleSelect.addEventListener("change", (e) => {
            const role = e.target.value;
            document.getElementById("techFields").style.display = role === 'tecnico' ? 'block' : 'none';
            document.getElementById("adminFields").style.display = (role === 'administrador' || role === 'ADMIN_CONJUNTO') ? 'block' : 'none';
            document.getElementById("contractFieldCreate").style.display = role === 'ADMIN_CONJUNTO' ? 'block' : 'none';
            document.getElementById("complexFieldCreate").style.display = role === 'ADMIN_CONJUNTO' ? 'block' : 'none';
            
            if (role === 'ADMIN_CONJUNTO') {
                cargarOpcionesContrato();
                cargarOpcionesComplejos();
            }
        });
    }

    // Generación automática de correo y contraseña
    const newUserNameInput = document.getElementById("newUserName");
    const newUserEmailInput = document.getElementById("newUserEmail");
    const newUserPasswordInput = document.getElementById("newUserPassword");
    const togglePasswordBtn = document.getElementById("toggleNewUserPassword");

    if (newUserNameInput && newUserEmailInput && newUserPasswordInput) {
        newUserNameInput.addEventListener("input", (e) => {
            const fullName = e.target.value.trim();
            if (!fullName) {
                newUserEmailInput.value = "";
                newUserPasswordInput.value = "";
                return;
            }

            const parts = fullName.split(/\s+/);
            if (parts.length >= 1) {
                const firstName = parts[0].toLowerCase();
                let email = firstName;
                let passwordBase = firstName;
                
                if (parts.length >= 2) {
                    const lastNameInitial = parts[1].charAt(0).toLowerCase();
                    email += lastNameInitial;
                    // Para la contraseña usamos el primer nombre completo para que sea más fácil de recordar pero segura
                }
                
                // Generar Correo
                newUserEmailInput.value = `${email}@seguridad247.com`;

                // Generar Contraseña (seg247 + nombre)
                newUserPasswordInput.value = `seg247${passwordBase}`;
            }
        });
    }

    // Toggle para ver contraseña
    if (togglePasswordBtn && newUserPasswordInput) {
        togglePasswordBtn.addEventListener("click", () => {
            const isPassword = newUserPasswordInput.type === "password";
            newUserPasswordInput.type = isPassword ? "text" : "password";
            togglePasswordBtn.innerHTML = isPassword ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
        });
    }

    const newUserForm = document.getElementById("newUserManagementForm");
    if (newUserForm) {
        newUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("newUserName").value;
            const email = document.getElementById("newUserEmail").value;
            const password = document.getElementById("newUserPassword").value;
            const role = document.getElementById("newUserRole").value;
            const subRole = document.getElementById("newUserSubRole").value;
            const contractId = document.getElementById("newUserContract") ? document.getElementById("newUserContract").value : "";
            const complexName = document.getElementById("newUserComplex") ? document.getElementById("newUserComplex").value : "";

            Swal.fire({
                title: 'Creando usuario...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // Instancia secundaria para Auth
                let secondaryApp = firebase.apps.find(app => app.name === "SecondaryUserApp");
                if (secondaryApp) await secondaryApp.delete();
                secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryUserApp");

                const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
                const uid = userCredential.user.uid;

                // Guardar en Firestore
                await db.collection("users").doc(uid).set({
                    name: name,
                    adminName: name, // Compatibilidad con dashboard actual
                    email: email,
                    role: role,
                    complexName: complexName,
                    subRole: role === 'tecnico' ? subRole : null,
                    contractId: role === 'ADMIN_CONJUNTO' ? contractId : null,
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await secondaryApp.delete();
                
                Swal.fire("¡Éxito!", `Usuario ${role} creado correctamente.`, "success");
                newUserForm.reset();
                const modal = bootstrap.Modal.getInstance(document.getElementById("addUserManagementModal"));
                if (modal) modal.hide();
                cargarUsuariosManagement();

            } catch (error) {
                console.error("Error al crear usuario:", error);
                Swal.fire("Error", error.message, "error");
            }
        });
    }
});


