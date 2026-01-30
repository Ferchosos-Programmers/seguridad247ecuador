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
        proformas: document.getElementById("proformasSection")
    };

    sidebarLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetView = link.getAttribute("data-view");
            
            // Update Active Link
            sidebarLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            // Update View
            Object.keys(views).forEach(v => {
                if (views[v]) views[v].style.display = (v === targetView) ? "block" : "none";
            });

            window.currentView = targetView;

            // Trigger specific view updates
            if (targetView === "dashboard") refreshDashboard();
            
            // Close sidebar on mobile
            const sidebar = document.getElementById("sidebar");
            if (window.innerWidth <= 991 && sidebar.classList.contains("show")) {
                sidebar.classList.remove("show");
            }
        });
    });

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
    document.getElementById("logoutBtn")?.addEventListener("click", logoutHandler);
    document.getElementById("logoutBtnMobile")?.addEventListener("click", logoutHandler);
}

// =========================================
// PRODUCTS MANAGEMENT
// =========================================
async function loadProducts() {
    try {
        const snapshot = await db.collection("products").orderBy("name").get();
        window.allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        grid.innerHTML = '<div class="col-12 text-center py-5 text-white-50">No hay productos registrados.</div>';
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="col-xl-3 col-lg-4 col-md-6">
            <div class="product-card">
                <div class="product-img">
                    <img src="${p.imageUrl || 'assets/img/logo.png'}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <div class="product-brand">${p.brand || 'SIN MARCA'}</div>
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
    `).join('');
}

// Event listeners for product search
document.getElementById("productSearch")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = window.allProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.brand.toLowerCase().includes(query)
    );
    renderProducts(filtered);
});

// Product CRUD operations
document.getElementById("productForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("productId").value;
    const name = document.getElementById("pName").value.toUpperCase();
    const brand = document.getElementById("pBrand").value.toUpperCase();
    const price = parseFloat(document.getElementById("pPrice").value);
    const imageFile = document.getElementById("pImage").files[0];

    Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

    try {
        let imageUrl = '';
        if (id) {
            const current = window.allProducts.find(p => p.id === id);
            imageUrl = current.imageUrl || '';
        }

        // Simulación de subida de imagen (normalmente usaríamos Firebase Storage)
        // Para este MVP usaremos un placeholder o base64 si es pequeña
        if (imageFile) {
            imageUrl = await fileToBase64(imageFile);
        }

        const productData = { 
            name, brand, price, imageUrl, 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        };

        if (id) {
            await db.collection("products").doc(id).update(productData);
        } else {
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("products").add(productData);
        }

        Swal.fire('¡Éxito!', 'Producto guardado correctamente.', 'success');
        bootstrap.Modal.getInstance(document.getElementById("addProductModal")).hide();
        e.target.reset();
        loadProducts();
    } catch (error) {
        console.error("Error saving product:", error);
        Swal.fire('Error', 'No se pudo guardar el producto.', 'error');
    }
});

window.editProduct = (id) => {
    const p = window.allProducts.find(p => p.id === id);
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
        title: '¿Eliminar producto?',
        text: "No podrás revertir esto.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await db.collection("products").doc(id).delete();
            Swal.fire('Eliminado', 'El producto ha sido borrado.', 'success');
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
    document.getElementById("profDate").value = new Date().toISOString().split('T')[0];
    addItemRow();
    updateProformaTotals();
    const modal = new bootstrap.Modal(document.getElementById("proformaModal"));
    modal.show();
}

window.addItemRow = (data = null) => {
    const container = document.getElementById("proformaItems");
    const rowId = 'row_' + Date.now();
    const div = document.createElement("div");
    div.className = "item-row";
    div.id = rowId;
    
    div.innerHTML = `
        <button type="button" class="btn-remove-item" onclick="document.getElementById('${rowId}').remove(); updateProformaTotals();">
            <i class="fa-solid fa-times"></i>
        </button>
        <div class="row g-2 align-items-end">
            <div class="col-md-5">
                <label class="form-label text-gold small fw-bold">PRODUCTO / SERVICIO</label>
                <select class="form-select premium-input product-selector" onchange="onProductSelect(this)" required>
                    <option value="">Seleccione...</option>
                    ${window.allProducts.map(p => `<option value="${p.id}" data-price="${p.price}" ${data && data.productId === p.id ? 'selected' : ''}>${p.name} (${p.brand})</option>`).join('')}
                    <option value="custom" ${data && !data.productId ? 'selected' : ''}>-- OTRO / PERSONALIZADO --</option>
                </select>
                <input type="text" class="form-control premium-input mt-2 custom-name" style="display: ${data && !data.productId ? 'block' : 'none'}" placeholder="Nombre personalizado" value="${data ? data.name : ''}">
            </div>
            <div class="col-md-2">
                <label class="form-label text-gold small fw-bold">CANTIDAD</label>
                <input type="number" class="form-control premium-input item-qty" value="${data ? data.qty : '1'}" min="1" oninput="updateProformaTotals()" required>
            </div>
            <div class="col-md-2">
                <label class="form-label text-gold small fw-bold">PRECIO UNIT.</label>
                <input type="number" step="0.01" class="form-control premium-input item-price" value="${data ? data.price : '0.00'}" oninput="updateProformaTotals()" required>
            </div>
            <div class="col-md-3">
                <label class="form-label text-gold small fw-bold">SUBTOTAL</label>
                <input type="text" class="form-control premium-input item-subtotal" value="$0.00" readonly>
            </div>
        </div>
    `;
    container.appendChild(div);
};

window.onProductSelect = (select) => {
    const row = select.closest('.item-row');
    const customInput = row.querySelector('.custom-name');
    const priceInput = row.querySelector('.item-price');
    
    if (select.value === "custom") {
        customInput.style.display = "block";
        priceInput.value = "0.00";
    } else {
        customInput.style.display = "none";
        const selectedOption = select.options[select.selectedIndex];
        const price = selectedOption.getAttribute('data-price');
        priceInput.value = price;
    }
    updateProformaTotals();
};

function updateProformaTotals() {
    let subtotal = 0;
    const rows = document.querySelectorAll(".item-row");
    
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
        const price = parseFloat(row.querySelector(".item-price").value) || 0;
        const total = qty * price;
        subtotal += total;
        row.querySelector(".item-subtotal").value = "$" + total.toFixed(2);
    });

    const iva = subtotal * 0.15;
    const total = subtotal + iva;

    document.getElementById("profSubtotal").textContent = "$" + subtotal.toFixed(2);
    document.getElementById("profIva").textContent = "$" + iva.toFixed(2);
    document.getElementById("profTotal").textContent = "$" + total.toFixed(2);
}

document.getElementById("proformaForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const clientName = document.getElementById("profClientName").value.toUpperCase();
    const date = document.getElementById("profDate").value;
    const expiry = parseInt(document.getElementById("profExpiry").value);
    
    const items = [];
    document.querySelectorAll(".item-row").forEach(row => {
        const selector = row.querySelector(".product-selector");
        const productId = selector.value === "custom" ? null : selector.value;
        const name = productId ? selector.options[selector.selectedIndex].text : row.querySelector(".custom-name").value.toUpperCase();
        const qty = parseFloat(row.querySelector(".item-qty").value);
        const price = parseFloat(row.querySelector(".item-price").value);
        
        items.push({ productId, name, qty, price, subtotal: qty * price });
    });

    if (items.length === 0) {
        Swal.fire('Error', 'Debe agregar al menos un item.', 'error');
        return;
    }

    const subtotal = parseFloat(document.getElementById("profSubtotal").textContent.replace('$', ''));
    const iva = parseFloat(document.getElementById("profIva").textContent.replace('$', ''));
    const total = parseFloat(document.getElementById("profTotal").textContent.replace('$', ''));

    Swal.fire({ title: 'Generando proforma...', didOpen: () => Swal.showLoading() });

    try {
        const proformaData = {
            clientName, date, expiry, items, subtotal, iva, total,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection("proformas").add(proformaData);
        Swal.fire('¡Éxito!', 'Proforma generada correctamente.', 'success');
        bootstrap.Modal.getInstance(document.getElementById("proformaModal")).hide();
        loadProformas();
        
        // Show view modal
        viewProforma(docRef.id);
    } catch (error) {
        console.error("Error saving proforma:", error);
        Swal.fire('Error', 'No se pudo guardar la proforma.', 'error');
    }
});

async function loadProformas() {
    try {
        const snapshot = await db.collection("proformas").orderBy("createdAt", "desc").get();
        window.allProformas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProformas(window.allProformas);
    } catch (error) {
        console.error("Error loading proformas:", error);
    }
}

function renderProformas(proformas) {
    const grid = document.getElementById("proformasGrid");
    if (!grid) return;

    if (proformas.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-white-50">No hay proformas generadas.</div>';
        return;
    }

    grid.innerHTML = proformas.map(p => `
        <div class="col-xl-4 col-md-6">
            <div class="stat-card" style="display: block; height: auto;">
                <div class="d-flex justify-content-between mb-3">
                    <span class="badge bg-gold text-dark">PROF-${p.id.substring(0,6).toUpperCase()}</span>
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
    `).join('');
}

window.deleteProforma = (id) => {
    Swal.fire({
        title: '¿Eliminar proforma?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Eliminar'
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
    document.getElementById("countProducts").textContent = window.allProducts.length;
    document.getElementById("countProformas").textContent = window.allProformas.length;
    
    const totalSales = window.allProformas.reduce((sum, p) => sum + p.total, 0);
    document.getElementById("totalSales").textContent = "$" + totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function initDashboard() {
    const ctx = document.getElementById('comercialChart');
    if (!ctx) return;

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Proformas Generadas',
                data: [12, 19, 15, 25, 22, 30],
                borderColor: '#d4af37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                x: { grid: { display: false }, border: { display: false } }
            }
        }
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
        reader.onerror = error => reject(error);
    });
}

// =========================================
// VISTA PREVIA Y PDF
// =========================================
window.viewProforma = (id) => {
    const p = window.allProformas.find(p => p.id === id);
    if (!p) return;

    const area = document.getElementById("proformaPrintArea");
    area.innerHTML = `
        <div class="prof-header">
            <div class="prof-logo-section">
                <img src="assets/img/logo.png" alt="Logo">
                <div class="prof-company-info">
                    <strong>SEGURIDAD 24-7 DEL ECUADOR CIA. LTDA.</strong><br>
                    RUC: 1793205916001<br>
                    Tel: 02 3456789 / 098 765 4321<br>
                    Quito - Ecuador
                </div>
            </div>
            <div class="prof-title-section">
                <h1>PROFORMA</h1>
                <div class="prof-number">N° PROF-${p.id.substring(0,6).toUpperCase()}</div>
                <div class="text-muted">Fecha: ${p.date}</div>
            </div>
        </div>

        <div class="prof-details-grid">
            <div class="prof-detail-box">
                <h6>CLIENTE</h6>
                <p>${p.clientName}</p>
            </div>
            <div class="prof-detail-box text-end">
                <h6>VALIDEZ</h6>
                <p>${p.expiry || 15} DÍAS</p>
            </div>
        </div>

        <table class="prof-table">
            <thead>
                <tr>
                    <th>CANT</th>
                    <th>DESCRIPCIÓN</th>
                    <th class="text-end">P. UNIT</th>
                    <th class="text-end">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${p.items.map(item => `
                    <tr>
                        <td style="width: 80px">${item.qty}</td>
                        <td>
                            <div class="item-name">${item.name}</div>
                        </td>
                        <td class="text-end" style="width: 120px">$${item.price.toFixed(2)}</td>
                        <td class="text-end" style="width: 120px">$${item.subtotal.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="prof-totals-section">
            <table class="prof-totals-table">
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-end">$${p.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>IVA (15%):</td>
                    <td class="text-end">$${p.iva.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td class="pt-3">TOTAL:</td>
                    <td class="text-end pt-3 text-gold">$${p.total.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        <div class="prof-terms">
            <h6>TÉRMINOS Y CONDICIONES:</h6>
            <ul class="text-muted small">
                <li>Los precios no incluyen costos de instalación a menos que se especifique.</li>
                <li>Garantía de 1 año por defectos de fábrica.</li>
                <li>Forma de pago: 50% anticipo, 50% contra entrega/instalación.</li>
                <li>Esta proforma tiene una validez de ${p.expiry || 15} días calendario.</li>
            </ul>
        </div>

        <div class="prof-footer text-center">
            <p>Gracias por confiar en Seguridad 24/7 Ecuador</p>
            <div style="font-size: 0.7rem">Generado digitalmente por el Sistema Comercial 24/7</div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById("viewProformaModal"));
    modal.show();
    window.currentViewingProforma = p;
};

window.downloadProformaPDF = async () => {
    const element = document.getElementById("proformaPrintArea");
    const p = window.currentViewingProforma;
    
    Swal.fire({ title: 'Generando PDF...', didOpen: () => Swal.showLoading() });

    try {
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Proforma_${p.clientName.replace(/\s+/g, '_')}_${p.id.substring(0,6)}.pdf`);
        
        Swal.fire('¡Éxito!', 'PDF descargado correctamente.', 'success');
    } catch (error) {
        console.error("PDF Error:", error);
        Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
    }
};

function initEventListeners() {
    // Proformas search
    document.getElementById("proformaSearch")?.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = window.allProformas.filter(p => 
            p.clientName.toLowerCase().includes(query) || 
            p.id.toLowerCase().includes(query)
        );
        renderProformas(filtered);
    });
}
