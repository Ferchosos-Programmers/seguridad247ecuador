// =========================================
// GESTIÓN COMERCIAL - CORE LOGIC
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initial State
  window.currentView = "dashboard";
  window.allProducts = [];
  window.allProformas = [];

  // 2. Navigation
  initNavigation();

  // 3. Load Data
  loadProducts();
  loadProformas();
  initDashboard();
  cargarInfoUsuario();

  // 4. Set Event Listeners
  initEventListeners();
});

// =========================================
// NAVIGATION SYSTEM
// =========================================
function initNavigation() {
  const sidebarLinks = document.querySelectorAll(".sidebar-link[data-view]");
  const views = {
    dashboard: document.getElementById("dashboardSection"),
    products: document.getElementById("productsSection"),
    proformas: document.getElementById("proformasSection"),
  };

  sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetView = link.getAttribute("data-view");
      switchView(targetView);
    });
  });

  // Manejar el botón "Atrás"
  window.addEventListener("popstate", (event) => {
    if (event.state && event.state.view) {
      switchView(event.state.view, true);
    } else {
      // BLOQUEO: Evitar que el usuario salga al presionar atrás en el dashboard
      switchView("dashboard", true);
      history.pushState({ view: "dashboard" }, "", "#dashboard");
    }
  });

  // Vista inicial desde Hash
  const initialHash = window.location.hash.replace("#", "");
  if (initialHash && views[initialHash]) {
    history.replaceState({ view: initialHash }, "", window.location.href);
    history.pushState({ view: initialHash }, "", window.location.href);
    setTimeout(() => switchView(initialHash, true), 100);
  } else {
    history.replaceState({ view: "dashboard" }, "", window.location.href);
    history.pushState({ view: "dashboard" }, "", "#dashboard");
    setTimeout(() => switchView("dashboard", true), 100);
  }

  const mobileToggle = document.getElementById("mobileSidebarToggle");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("show");
    });
  }

  // Logout logic
  const logoutHandler = () => {
    auth.signOut().then(() => {
      window.location.href = "control_center.html";
    });
  };
  document
    .getElementById("logoutBtn")
    ?.addEventListener("click", logoutHandler);
  document
    .getElementById("logoutBtnMobile")
    ?.addEventListener("click", logoutHandler);
}

function switchView(targetView, isPopState = false) {
  const sidebarLinks = document.querySelectorAll(".sidebar-link[data-view]");
  const views = {
    dashboard: document.getElementById("dashboardSection"),
    products: document.getElementById("productsSection"),
    proformas: document.getElementById("proformasSection"),
  };

  if (!isPopState) {
    const url = new URL(window.location.href);
    url.hash = targetView;
    history.pushState({ view: targetView }, "", url.href);
  }

  // Update Active Link
  sidebarLinks.forEach((l) => {
    if (l.getAttribute("data-view") === targetView) {
      l.classList.add("active");
    } else {
      l.classList.remove("active");
    }
  });

  // Update View
  Object.keys(views).forEach((v) => {
    if (views[v]) views[v].style.display = v === targetView ? "block" : "none";
  });

  window.currentView = targetView;

  // Trigger specific view updates
  if (targetView === "dashboard") refreshDashboard();

  // Close sidebar on mobile
  const sidebar = document.getElementById("sidebar");
  if (
    window.innerWidth <= 991 &&
    sidebar &&
    sidebar.classList.contains("show")
  ) {
    sidebar.classList.remove("show");
  }
}

// =========================================
// PRODUCTS MANAGEMENT
// =========================================
async function loadProducts() {
  try {
    const snapshot = await db.collection("products").orderBy("name").get();
    window.allProducts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    renderProducts(window.allProducts);
    updateCounters();
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

function renderProducts(products) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML =
      '<div class="col-12 text-center py-5 text-white-50">No hay productos registrados.</div>';
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
        <div class="col-xl-3 col-lg-4 col-md-6">
            <div class="product-card">
                <div class="product-img">
                    <img src="${p.imageUrl || "assets/img/logo.png"}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <div class="product-brand">${p.brand || "SIN MARCA"}</div>
                    <h5 class="product-title">${p.name}</h5>
                    <div class="product-price">$${parseFloat(p.price).toFixed(2)}</div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-gold w-100" onclick="editProduct('${p.id}')">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

// Event listeners for product search
document.getElementById("productSearch")?.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = window.allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query),
  );
  renderProducts(filtered);
});

// Product CRUD operations
document
  .getElementById("productForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("productId").value;
    const name = document.getElementById("pName").value.toUpperCase();
    const brand = document.getElementById("pBrand").value.toUpperCase();
    const price = parseFloat(document.getElementById("pPrice").value);
    const imageFile = document.getElementById("pImage").files[0];

    Swal.fire({ title: "Guardando...", didOpen: () => Swal.showLoading() });

    try {
      let imageUrl = "";
      if (id) {
        const current = window.allProducts.find((p) => p.id === id);
        imageUrl = current.imageUrl || "";
      }

      // Simulación de subida de imagen (normalmente usaríamos Firebase Storage)
      // Para este MVP usaremos un placeholder o base64 si es pequeña
      if (imageFile) {
        imageUrl = await fileToBase64(imageFile);
      }

      const productData = {
        name,
        brand,
        price,
        imageUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (id) {
        await db.collection("products").doc(id).update(productData);
      } else {
        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("products").add(productData);
      }

      Swal.fire("¡Éxito!", "Producto guardado correctamente.", "success");
      bootstrap.Modal.getInstance(
        document.getElementById("addProductModal"),
      ).hide();
      e.target.reset();
      loadProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      Swal.fire("Error", "No se pudo guardar el producto.", "error");
    }
  });

window.editProduct = (id) => {
  const p = window.allProducts.find((p) => p.id === id);
  if (!p) return;

  document.getElementById("productId").value = p.id;
  document.getElementById("pName").value = p.name;
  document.getElementById("pBrand").value = p.brand;
  document.getElementById("pPrice").value = p.price;

  const modal = new bootstrap.Modal(document.getElementById("addProductModal"));
  modal.show();
};

window.deleteProduct = (id) => {
  Swal.fire({
    title: "¿Eliminar producto?",
    text: "No podrás revertir esto.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Sí, eliminar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      await db.collection("products").doc(id).delete();
      Swal.fire("Eliminado", "El producto ha sido borrado.", "success");
      loadProducts();
    }
  });
};

// =========================================
// PROFORMAS MANAGEMENT
// =========================================
function openNewProforma() {
  document.getElementById("proformaForm").reset();
  document.getElementById("proformaItems").innerHTML = "";
  document.getElementById("profDate").value = new Date()
    .toISOString()
    .split("T")[0];
  addItemRow();
  updateProformaTotals();
  const modal = new bootstrap.Modal(document.getElementById("proformaModal"));
  modal.show();
}

window.addItemRow = (data = null) => {
  const container = document.getElementById("proformaItems");
  const rowId = "row_" + Date.now();
  const div = document.createElement("div");
  div.className = "item-row";
  div.id = rowId;

  div.innerHTML = `
        <button type="button" class="btn-remove-item" onclick="document.getElementById('${rowId}').remove(); updateProformaTotals();">
            <i class="fa-solid fa-times"></i>
        </button>
        <div class="row g-2 align-items-center">
            <div class="col-3 col-md-auto">
                <div class="product-preview-container" style="width: 60px; height: 60px; background: rgba(0,0,0,0.4); border: 1px dashed var(--gold-primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <img class="item-img-preview" src="assets/img/placeholder-prod.png" style="max-width: 100%; max-height: 100%; object-fit: contain; display: none;" />
                    <i class="fa-solid fa-camera text-gold opacity-25 preview-icon" style="font-size: 1.2rem;"></i>
                </div>
            </div>
            <div class="col-9 col-md">
                <div class="row g-2 align-items-end">
                    <div class="col-12 col-md-6">
                        <label class="premium-label">PRODUCTO / SERVICIO</label>
                        <select class="form-select premium-input product-selector" id="select_${rowId}" required style="width: 100%">
                            <option value="">Seleccione...</option>
                            ${window.allProducts.map((p) => `<option value="${p.id}" data-price="${p.price}" data-image="${p.imageUrl || ""}" ${data && data.productId === p.id ? "selected" : ""}>${p.name}</option>`).join("")}
                            <option value="custom" ${data && !data.productId ? "selected" : ""}>-- OTRO / PERSONALIZADO --</option>
                        </select>
                        <input type="text" class="form-control premium-input mt-2 custom-name" style="display: ${data && !data.productId ? "block" : "none"}" placeholder="Nombre personalizado" value="${data ? data.name : ""}">
                    </div>
                    <div class="col-4 col-md-1">
                        <label class="premium-label">CANT.</label>
                        <input type="number" class="form-control premium-input item-qty" value="${data ? data.qty : "1"}" min="1" oninput="updateProformaTotals()" required>
                    </div>
                    <div class="col-8 col-md-2">
                        <label class="premium-label">P. UNIT.</label>
                        <div class="position-relative">
                            <span class="position-absolute translate-middle-y top-50 start-0 ps-3 text-gold">$</span>
                            <input type="number" step="0.01" class="form-control premium-input item-price ps-5" value="${data ? data.price : "0.00"}" oninput="updateProformaTotals()" required>
                        </div>
                    </div>
                    <div class="col-12 col-md-3">
                        <label class="premium-label d-none d-md-block">SUBTOTAL</label>
                        <input type="text" class="form-control premium-input item-subtotal text-gold fw-bold" value="$0.00" readonly>
                    </div>
                </div>
            </div>
        </div>
    `;
  container.appendChild(div);

  // Función para renderizar el item con imagen
  function formatProduct(item) {
    if (!item.id || item.id === "custom") return item.text;
    const imgUrl = $(item.element).data("image");
    if (!imgUrl) return item.text;

    return $(
      `<span class="d-flex align-items-center">
        <img src="${imgUrl}" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px; margin-right: 12px; background: #fff; padding: 2px; border: 1px solid #d4af37;" />
        <span>${item.text}</span>
      </span>`,
    );
  }

  // Inicializar Select2 para esta nueva fila con ancho completo e imágenes
  $(`#select_${rowId}`)
    .select2({
      placeholder: "Seleccione un producto...",
      allowClear: true,
      width: "100%",
      dropdownParent: $("#proformaModal"),
      templateResult: formatProduct,
      templateSelection: formatProduct,
    })
    .on("select2:open", function () {
      // Forzar que el desplegable no flote arriba en móviles
      const $container = $(".select2-container--open");
      $container.css("z-index", "9999");
    })
    .on("change", function () {
      onProductSelect(this);
    });

  if (data) {
    onProductSelect($(`#select_${rowId}`)[0]);
    updateProformaTotals();
  }
};

window.onProductSelect = (select) => {
  const $select = $(select);
  const row = $select.closest(".item-row");
  const customInput = row.find(".custom-name")[0];
  const priceInput = row.find(".item-price")[0];
  const imgPreview = row.find(".item-img-preview")[0];
  const previewIcon = row.find(".preview-icon")[0];

  const val = $select.val();

  if (!val) {
    if (imgPreview) imgPreview.style.display = "none";
    if (previewIcon) previewIcon.style.display = "block";
    return;
  }

  if (val === "custom") {
    customInput.style.display = "block";
    priceInput.value = "0.00";
    if (imgPreview) imgPreview.style.display = "none";
    if (previewIcon) previewIcon.style.display = "block";
  } else {
    customInput.style.display = "none";
    const $option = $select.find("option:selected");
    const price = $option.attr("data-price");
    const imgUrl = $option.attr("data-image");

    priceInput.value = price || "0.00";

    if (imgUrl && imgPreview) {
      imgPreview.src = imgUrl;
      imgPreview.style.display = "block";
      if (previewIcon) previewIcon.style.display = "none";
    } else {
      if (imgPreview) imgPreview.style.display = "none";
      if (previewIcon) previewIcon.style.display = "block";
    }
  }
  updateProformaTotals();
};

function updateProformaTotals() {
  let subtotal = 0;
  const rows = document.querySelectorAll(".item-row");

  rows.forEach((row) => {
    const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
    const price = parseFloat(row.querySelector(".item-price").value) || 0;
    const total = qty * price;
    subtotal += total;
    row.querySelector(".item-subtotal").value = "$" + total.toFixed(2);
  });

  const iva = subtotal * 0.15;
  const total = subtotal + iva;

  document.getElementById("profSubtotal").textContent =
    "$" + subtotal.toFixed(2);
  document.getElementById("profIva").textContent = "$" + iva.toFixed(2);
  document.getElementById("profTotal").textContent = "$" + total.toFixed(2);
}

document
  .getElementById("proformaForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const clientName = document
      .getElementById("profClientName")
      .value.toUpperCase();
    const clientPhone = document.getElementById("profClientPhone").value;
    const date = document.getElementById("profDate").value;
    const expiry = parseInt(document.getElementById("profExpiry").value);

    const items = [];
    document.querySelectorAll(".item-row").forEach((row) => {
      const selector = row.querySelector(".product-selector");
      const productId = selector.value === "custom" ? null : selector.value;
      const name = productId
        ? selector.options[selector.selectedIndex].text
        : row.querySelector(".custom-name").value.toUpperCase();
      const qty = parseFloat(row.querySelector(".item-qty").value);
      const price = parseFloat(row.querySelector(".item-price").value);

      // Obtener imagen directamente de window.allProducts para mayor fiabilidad
      let imageUrl = "";
      if (productId) {
        const prod = window.allProducts.find((p) => p.id === productId);
        imageUrl = prod ? prod.imageUrl : "";
      }

      items.push({
        productId,
        name,
        qty,
        price,
        subtotal: qty * price,
        image: imageUrl,
      });
    });

    if (items.length === 0) {
      Swal.fire("Error", "Debe agregar al menos un item.", "error");
      return;
    }

    const subtotal = parseFloat(
      document.getElementById("profSubtotal").textContent.replace("$", ""),
    );
    const iva = parseFloat(
      document.getElementById("profIva").textContent.replace("$", ""),
    );
    const total = parseFloat(
      document.getElementById("profTotal").textContent.replace("$", ""),
    );

    Swal.fire({
      title: "Generando proforma...",
      didOpen: () => Swal.showLoading(),
    });

    try {
      const proformaData = {
        clientName,
        clientPhone,
        date,
        expiry,
        items,
        subtotal,
        iva,
        total,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("proformas").add(proformaData);
      Swal.fire("¡Éxito!", "Proforma generada correctamente.", "success");
      bootstrap.Modal.getInstance(
        document.getElementById("proformaModal"),
      ).hide();
      loadProformas();

      // Show view modal
      viewProforma(docRef.id);
    } catch (error) {
      console.error("Error saving proforma:", error);
      Swal.fire("Error", "No se pudo guardar la proforma.", "error");
    }
  });

async function loadProformas() {
  try {
    const snapshot = await db
      .collection("proformas")
      .orderBy("createdAt", "desc")
      .get();
    window.allProformas = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    renderProformas(window.allProformas);
  } catch (error) {
    console.error("Error loading proformas:", error);
  }
}

function renderProformas(proformas) {
  const grid = document.getElementById("proformasGrid");
  if (!grid) return;

  if (proformas.length === 0) {
    grid.innerHTML =
      '<div class="col-12 text-center py-5 text-white-50">No hay proformas generadas.</div>';
    return;
  }

  grid.innerHTML = proformas
    .map(
      (p) => `
        <div class="col-xl-4 col-md-6">
            <div class="stat-card" style="display: block; height: auto;">
                <div class="d-flex justify-content-between mb-3">
                    <span class="badge bg-gold text-dark">PROF-${p.id.substring(0, 6).toUpperCase()}</span>
                    <span class="text-white-50 small">${p.date}</span>
                </div>
                <h5 class="text-white mb-2 text-truncate">${p.clientName}</h5>
                <div class="d-flex justify-content-between align-items-end">
                    <div>
                        <div class="text-white-50 small">Total:</div>
                        <div class="text-gold fw-bold fs-5">$${p.total.toFixed(2)}</div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-gold" onclick="viewProforma('${p.id}')">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProforma('${p.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

window.deleteProforma = (id) => {
  Swal.fire({
    title: "¿Eliminar proforma?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Eliminar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      await db.collection("proformas").doc(id).delete();
      loadProformas();
    }
  });
};

// =========================================
// DASHBOARD & UTILS
// =========================================
function updateCounters() {
  document.getElementById("countProducts").textContent =
    window.allProducts.length;
  document.getElementById("countProformas").textContent =
    window.allProformas.length;

  const totalSales = window.allProformas.reduce((sum, p) => sum + p.total, 0);
  document.getElementById("totalSales").textContent =
    "$" + totalSales.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function initDashboard() {
  const ctx = document.getElementById("comercialChart");
  if (!ctx) return;

  window.myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      datasets: [
        {
          label: "Proformas Generadas",
          data: [12, 19, 15, 25, 22, 30],
          borderColor: "#d4af37",
          backgroundColor: "rgba(212, 175, 55, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          grid: { color: "rgba(255,255,255,0.05)" },
          border: { display: false },
        },
        x: { grid: { display: false }, border: { display: false } },
      },
    },
  });
}

function refreshDashboard() {
  updateCounters();
  // Here we could update chart data based on loaded proformas
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// =========================================
// VISTA PREVIA Y PDF
// =========================================
// =========================================
// VIEW PROFORMA (MODERN & RESPONSIVE)
// =========================================
window.viewProforma = (id) => {
  const p = window.allProformas.find((item) => item.id === id);
  if (!p) return;

  const htmlTemplate = `
        <div style="font-family: 'Inter', sans-serif; padding: 40px; color: #333; position: relative;">
            <!-- Decoración Superior -->
            <div style="position: absolute; top: 0; right: 0; width: 150px; height: 150px; background: linear-gradient(225deg, rgba(212,175,55,0.1) 0%, transparent 70%); border-radius: 0 0 0 100%;"></div>
            
            <div class="prof-header mb-4 d-flex justify-content-between align-items-start flex-wrap gap-4">
                <div class="prof-logo-section">
                    <img src="assets/img/logo.png" alt="Logo" style="height: 65px; margin-bottom: 10px;">
                    <div class="prof-company-info" style="font-size: 0.7rem; color: #666; line-height: 1.3;">
                        <p class="mb-0"><strong>SEGURIDAD 24/7 ECUADOR</strong></p>
                        <p class="mb-0">Vigilancia Virtual de Alta Gama</p>
                        <p class="mb-0">RUC: 1793205916001</p>
                        <p class="mb-0">Quito, Ecuador</p>
                    </div>
                </div>
                <div class="prof-title-section text-md-end">
                    <h1 style="color: #d4af37; font-size: clamp(2rem, 5vw, 2.8rem); font-weight: 900; margin-bottom: 0; letter-spacing: -1px; line-height: 1;">PROFORMA</h1>
                    <div class="prof-number mt-1 text-dark" style="font-size: 1rem; font-weight: 700;">N° PR-${p.id.substring(0, 6).toUpperCase()}</div>
                    <div class="badge bg-gold text-dark mt-2 px-3 py-2 rounded-pill shadow-sm" style="font-size: 0.7rem; letter-spacing: 1px;">FECHA: ${p.date}</div>
                </div>
            </div>

            <div class="prof-details-grid mb-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; background: #fdfaf0; border: 1px solid #f1e6c9; border-radius: 12px; padding: 20px;">
                <div class="prof-detail-box">
                    <h6 style="color: #b8922b; font-size: 0.6rem; text-transform: uppercase; font-weight: 800; letter-spacing: 1.2px; margin-bottom: 6px;">PREPARADO PARA:</h6>
                    <p style="font-size: 1.1rem; font-weight: 800; color: #000; margin-bottom: 2px;">${p.clientName}</p>
                    <p style="font-size: 0.8rem; color: #777;">${p.clientPhone || "Cliente Distinguido"}</p>
                </div>
                <div class="prof-detail-box text-md-end">
                    <h6 style="color: #b8922b; font-size: 0.6rem; text-transform: uppercase; font-weight: 800; letter-spacing: 1.2px; margin-bottom: 6px;">INFORMACIÓN ADICIONAL:</h6>
                    <p style="font-size: 0.9rem; color: #333; margin-bottom: 2px;">Validez: <strong>${p.expiry || 15} días</strong></p>
                    <p style="font-size: 0.8rem; color: #777;">ID: ${p.id.substring(0, 8)}</p>
                </div>
            </div>

            <div class="table-responsive" style="overflow-x: auto;">
                <table class="prof-table mb-4 w-100" style="border-collapse: separate; border-spacing: 0; min-width: 500px;">
                    <thead>
                        <tr>
                            <th style="background: #000; color: #d4af37; padding: 12px; border-radius: 8px 0 0 8px; font-size: 0.7rem; text-transform: uppercase;">CANT.</th>
                            <th style="background: #000; color: #d4af37; padding: 12px; font-size: 0.7rem; text-transform: uppercase;">DESCRIPCIÓN DE EQUIPO / SERVICIO</th>
                            <th style="background: #000; color: #d4af37; padding: 12px; font-size: 0.7rem; text-transform: uppercase;" class="text-end">P. UNIT</th>
                            <th style="background: #000; color: #d4af37; padding: 12px; border-radius: 0 8px 8px 0; font-size: 0.7rem; text-transform: uppercase;" class="text-end">VALOR TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${p.items
                          .map(
                            (item) => `
                            <tr>
                                <td style="padding: 15px 12px; border-bottom: 1px solid #eee; font-weight: 700; color: #000;">${item.qty}</td>
                                <td style="padding: 15px 12px; border-bottom: 1px solid #eee;">
                                    <div class="d-flex align-items-center">
                                        ${item.image ? `<img src="${item.image}" crossorigin="anonymous" style="width: 45px; height: 45px; object-fit: contain; border: 1px solid #eee; border-radius: 6px; margin-right: 15px; background: #fff; padding: 3px;">` : ""}
                                        <div>
                                            <div style="font-weight: 700; color: #000; font-size: 1rem;">${item.name}</div>
                                            <div style="font-size: 0.75rem; color: #777;">Tecnología de Seguridad Premium 24/7</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="text-end" style="padding: 15px 12px; border-bottom: 1px solid #eee; color: #333; font-size: 0.9rem;">$${item.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                <td class="text-end" style="padding: 15px 12px; border-bottom: 1px solid #eee; font-weight: 700; color: #000; font-size: 0.9rem;">$${item.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>

            <div class="row pt-4 g-4">
                <div class="col-md-7">
                    <div style="background: #fafafa; border-radius: 12px; padding: 20px; border: 1px dashed #ddd;">
                        <h6 style="font-weight: 800; font-size: 0.7rem; color: #000; text-transform: uppercase; margin-bottom: 12px; border-bottom: 2px solid #d4af37; display: inline-block;">TÉRMINOS Y CONDICIONES:</h6>
                        <ul style="padding-left: 15px; font-size: 0.7rem; color: #666; line-height: 1.5; margin-bottom: 0;">
                            <li>Todos nuestros equipos incluyen garantía de 1 año.</li>
                            <li>La instalación se coordina tras el primer pago (50%).</li>
                            <li>Forma de pago: Efectivo, Transferencia o Depósito.</li>
                            <li>Precios sujetos a cambios sin previo aviso tras la validez.</li>
                        </ul>
                    </div>
                </div>
                <div class="col-md-5">
                    <div style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #eee;">
                        <div class="d-flex justify-content-between mb-2">
                            <span style="color: #666; font-size: 0.85rem;">SUBTOTAL:</span>
                            <span style="font-weight: 700; color: #000;">$${p.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-3">
                            <span style="color: #666; font-size: 0.85rem;">IVA (15%):</span>
                            <span style="font-weight: 700; color: #000;">$${p.iva.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center p-3" style="background: #000; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                            <span style="color: #d4af37; font-weight: 900; font-size: 0.75rem;">TOTAL A PAGAR:</span>
                            <span style="color: #d4af37; font-weight: 900; font-size: 1.4rem;">$${p.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="prof-footer" style="margin-top: 60px; text-align: center; border-top: 1px solid #eee; padding-top: 30px;">
                <p style="font-weight: 800; color: #d4af37; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">SEGURIDAD 24/7 ECUADOR</p>
                <p style="font-size: 0.75rem; color: #999; margin-bottom: 0;">Gracias por permitirnos proteger lo que más le importa.</p>
                <div style="font-size: 0.6rem; color: #ccc; margin-top: 15px; text-transform: uppercase;">Este documento es un comprobante comercial generado electrónicamente.</div>
            </div>
        </div>
    `;

  // Poblar ambos contenedores
  document.getElementById("proformaPreview").innerHTML = htmlTemplate;
  document.getElementById("proformaPrintArea").innerHTML = htmlTemplate;

  const modal = new bootstrap.Modal(
    document.getElementById("viewProformaModal"),
  );
  modal.show();
  window.currentViewingProforma = p;
};

// =========================================
// DOWNLOAD PDF (FIXED LAYOUT)
// =========================================
window.downloadProformaPDF = async () => {
  // Usar el área de impresión fija (no la de previsualización)
  const element = document.getElementById("proformaPrintArea");
  const p = window.currentViewingProforma;

  if (!p) return;

  Swal.fire({
    title: "Generando Documento...",
    text: "Creando PDF de alta calidad",
    timerProgressBar: true,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const { jsPDF } = window.jspdf;

    // Optimizar captura con html2canvas
    const canvas = await html2canvas(element, {
      scale: 3, // Mayor escala para nitidez premium
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 800, // Forzar ancho de escritorio para la captura
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Añadir imagen al PDF
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

    // Guardar
    pdf.save(
      `PROFORMA_${p.clientName.replace(/\s+/g, "_").toUpperCase()}_${p.id.substring(0, 6)}.pdf`,
    );

    Swal.fire({
      icon: "success",
      title: "¡Éxito!",
      text: "La proforma se ha generado correctamente.",
      confirmButtonColor: "#d4af37",
    });
  } catch (error) {
    console.error("PDF Export Error:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo generar el PDF. Reintente.",
      confirmButtonColor: "#d4af37",
    });
  }
};

// =========================================
// ENVIAR POR WHATSAPP
// =========================================
window.sendProformaWhatsApp = async () => {
  const p = window.currentViewingProforma;
  if (!p) return;

  const phone = p.clientPhone;
  if (!phone) {
    Swal.fire({
      icon: "warning",
      title: "Atención",
      text: "Esta proforma no tiene un número de teléfono asignado.",
      confirmButtonColor: "#d4af37",
    });
    return;
  }

  Swal.fire({
    title: "Preparando envío...",
    text: "Generando PDF para WhatsApp",
    didOpen: () => Swal.showLoading(),
  });

  try {
    const element = document.getElementById("proformaPrintArea");
    const { jsPDF } = window.jspdf;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 800,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    const pdfBlob = pdf.output("blob");
    const fileName = `PROFORMA_${p.clientName.replace(/\s+/g, "_").toUpperCase()}.pdf`;

    // Limpiar teléfono
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 9 || cleanPhone.length === 10) {
      if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
      if (!cleanPhone.startsWith("593")) cleanPhone = "593" + cleanPhone;
    }

    const messageText = `*SEGURIDAD 24/7 ECUADOR*\n\nEstimado *${p.clientName}*, adjuntamos su *Proforma Digital* de seguridad de alta gama.\n\n_Quedamos a su disposición._`;

    // MÉTODO A: Web Share API (Móviles)
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Proforma Digital",
          text: messageText,
        });
        Swal.close();
        return;
      } catch (e) {
        console.log("Share cancelado/fallido, usando fallback.");
      }
    }

    // MÉTODO B: Descarga + WhatsApp (Desktop/Fallback)
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdfBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, "_blank");

      Swal.fire({
        icon: "success",
        title: "¡Listo para enviar!",
        html: `La proforma se ha descargado.<br><br><b>Adjúntela manualmente</b> en el chat que se acaba de abrir.`,
        confirmButtonColor: "#25D366",
      });
    }, 1000);
  } catch (error) {
    console.error("Error en WhatsApp:", error);
    Swal.fire("Error", "No se pudo procesar el envío por WhatsApp.", "error");
  }
};
function initEventListeners() {
  // Proformas search
  document.getElementById("proformaSearch")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = window.allProformas.filter(
      (p) =>
        p.clientName.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query),
    );
    renderProformas(filtered);
  });
}

// =========================================
//  USER PROFILE & AUTH PROTECTION
// =========================================
async function cargarInfoUsuario() {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "control_center.html";
      return;
    }

    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (!doc.exists) {
        if (user.email === "admin@gmail.com") {
          configurarUI(user, { adminName: "Super Admin", role: "admin" });
          return;
        }
        throw new Error("No se encontró perfil de usuario.");
      }

      const userData = doc.data();
      const role = userData.role ? userData.role.toLowerCase() : "";
      const isAuthorized =
        user.email === "admin@gmail.com" ||
        role === "administrador" ||
        role === "admin" ||
        role === "comercial";

      if (!isAuthorized) {
        await auth.signOut();
        Swal.fire({
          icon: "error",
          title: "Acceso Denegado",
          text: "No tiene permisos para acceder a este módulo.",
          confirmButtonColor: "#d4af37",
        }).then(() => {
          window.location.href = "control_center.html";
        });
        return;
      }

      configurarUI(user, userData);
    } catch (error) {
      console.error("Error validando sesión:", error);
    }
  });
}

function configurarUI(user, data) {
  const userNameEl = document.getElementById("userName");
  const userEmailEl = document.getElementById("userEmail");
  const userProfileCard = document.getElementById("userProfileCard");

  if (userNameEl)
    userNameEl.textContent = data.adminName || data.name || "Usuario Comercial";
  if (userEmailEl) userEmailEl.textContent = data.email || user.email;
  if (userProfileCard) userProfileCard.style.display = "block";
}
