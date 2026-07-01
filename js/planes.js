// Planes y Precios - Script de Carga Dinámica desde Firebase Firestore
const defaultPlanes = [
  {
    id: "electronica_basico",
    name: "Plan Básico",
    type: "electronica",
    price: "$29.99/mes",
    features: [
      "Monitoreo residencial de alarma básica",
      "1 sensor de movimiento infrarrojo",
      "1 contacto magnético de puerta principal",
      "Reporte de eventos en app móvil"
    ]
  },
  {
    id: "electronica_medio",
    name: "Plan Profesional",
    type: "electronica",
    price: "$49.99/mes",
    features: [
      "Monitoreo residencial o comercial 24/7",
      "3 sensores de movimiento avanzados",
      "2 contactos magnéticos de puertas/ventanas",
      "App inteligente con notificaciones push",
      "1 cámara IP con videoverificación"
    ]
  },
  {
    id: "electronica_premium",
    name: "Plan Premium",
    type: "electronica",
    price: "$89.99/mes",
    features: [
      "Monitoreo avanzado de prioridad crítica 24/7",
      "Alarma inteligente completa (5 sensores)",
      "Circuito cerrado (CCTV) con 4 cámaras Full HD",
      "Automatización de accesos/cerraduras",
      "Soporte técnico prioritario y respuesta móvil inmediata"
    ]
  },
  {
    id: "fisica_basico",
    name: "Plan Básico Físico",
    type: "fisica",
    price: "$999/mes",
    features: [
      "1 Guardia físico capacitado por 8 horas",
      "Control de accesos y registros de entrada/salida",
      "Rondas básicas preventivas diurnas",
      "Comunicación directa con central de monitoreo"
    ]
  },
  {
    id: "fisica_medio",
    name: "Plan Profesional Físico",
    type: "fisica",
    price: "$1499/mes",
    features: [
      "1 Guardia físico capacitado por 12 horas",
      "Control de accesos vehicular y peatonal",
      "Rondas perimetrales continuas con marcación",
      "Comunicación radial encriptada y equipo de disuasión"
    ]
  },
  {
    id: "fisica_premium",
    name: "Plan Premium Físico 24/7",
    type: "fisica",
    price: "$2499/mes",
    features: [
      "Custodia física armada 24/7 (turnos rotativos)",
      "Supervisión constante por central de operaciones",
      "Rondas electrónicas QR de control",
      "Botón de pánico táctico con respuesta móvil armada"
    ]
  }
];

let activeCategory = "electronica";
let allPlanes = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarPlanes();
});

async function cargarPlanes() {
  const container = document.getElementById("plans-container");
  try {
    const snapshot = await db.collection("planes").get();
    if (snapshot.empty) {
      console.log("Firestore vacío, inicializando planes por defecto...");
      const batch = db.batch();
      defaultPlanes.forEach(plan => {
        const docRef = db.collection("planes").doc(plan.id);
        batch.set(docRef, plan);
      });
      await batch.commit();
      allPlanes = [...defaultPlanes];
    } else {
      allPlanes = [];
      snapshot.forEach(doc => {
        allPlanes.push({ id: doc.id, ...doc.data() });
      });
    }
  } catch (error) {
    console.error("Error al conectar con Firestore, usando planes locales:", error);
    allPlanes = [...defaultPlanes];
  }

  renderPlanes();
}

function renderPlanes() {
  const container = document.getElementById("plans-container");
  container.innerHTML = "";

  // Filtrar planes por categoría activa
  const filtered = allPlanes.filter(p => p.type === activeCategory);

  // Ordenar para que el Premium quede al final o en orden alfabético/ID
  const sorted = [...filtered].sort((a, b) => {
    if (a.id.includes("premium")) return 1;
    if (b.id.includes("premium")) return -1;
    if (a.id.includes("basico")) return -1;
    if (b.id.includes("basico")) return 1;
    return 0;
  });

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <p class="text-muted">No se encontraron planes para esta categoría.</p>
      </div>
    `;
    return;
  }

  sorted.forEach(plan => {
    const isPremium = plan.id.includes("premium");
    const cardClass = isPremium ? "plan-card premium-highlight" : "plan-card";
    const badgeHtml = isPremium ? '<span class="premium-badge">Recomendado</span>' : '';
    
    // Generar listado de características
    let featuresHtml = "";
    if (Array.isArray(plan.features)) {
      plan.features.forEach(f => {
        featuresHtml += `<li><i class="fa-solid fa-circle-check"></i> ${f}</li>`;
      });
    } else if (typeof plan.features === "string") {
      // Si por alguna razón se guardó como string largo
      plan.features.split("\n").forEach(f => {
        if (f.trim()) {
          featuresHtml += `<li><i class="fa-solid fa-circle-check"></i> ${f.replace(/^[•\-]\s*/, "").trim()}</li>`;
        }
      });
    }

    const col = document.createElement("div");
    col.className = "col-lg-4 col-md-6 col-sm-12";
    col.innerHTML = `
      <div class="${cardClass}">
        ${badgeHtml}
        <h3 class="plan-name">${plan.name}</h3>
        <div class="plan-price-box">
          <span class="plan-price">${plan.price}</span>
        </div>
        <div class="plan-divider"></div>
        <ul class="features-list">
          ${featuresHtml}
        </ul>
        <div class="d-grid mt-auto">
          <button class="btn btn-gold w-100" onclick="contratarPlan('${plan.name}', '${plan.type}')">
            <i class="fa-brands fa-whatsapp me-2"></i>Contratar Plan
          </button>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

function switchCategory(category) {
  activeCategory = category;
  
  // Actualizar botones activos
  document.getElementById("btn-electronica").classList.toggle("active", category === "electronica");
  document.getElementById("btn-fisica").classList.toggle("active", category === "fisica");

  renderPlanes();
}

function contratarPlan(planName, planType) {
  const whatsappNumber = "593984107006";
  const categoria = planType === "electronica" ? "Seguridad Electrónica" : "Seguridad Física";
  const mensaje = `Hola, estoy interesado en adquirir el ${planName} de la categoría ${categoria}. Deseo recibir más información.`;
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`, "_blank");
}
