const btn = document.getElementById("chatbotBtn");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");
const chatBody = document.getElementById("chatBody");

// Tu número de WhatsApp
const whatsappNumber = "593984107006";

btn.onclick = () => {
  chatWindow.style.display =
    chatWindow.style.display === "flex" ? "none" : "flex";
};

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("msg", sender);
  msg.innerHTML = text;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Mostrar opciones de servicio
function showServiceOptions() {
  const div = document.createElement("div");
  div.classList.add("msg", "bot");

  div.innerHTML = `
    ¡Hola! Te ofrecemos los siguientes servicios:
    <br><br>
    <button class="option-btn" onclick="selectService('fisica')">🔐 Seguridad Física</button>
    <button class="option-btn" onclick="selectService('electronica')">📡 Seguridad Electrónica</button>
  `;

  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Procesar servicio seleccionado
function selectService(type) {
  if (type === "fisica") {
    // Mensaje del bot
    addMessage("Nos vamos a contactar con usted a la brevedad posible.", "bot");

    // Botón de WhatsApp con mensaje personalizado
    const wBtn = document.createElement("button");
    wBtn.classList.add("whatsapp-btn");
    wBtn.innerHTML =
      '<i class="fa-brands fa-whatsapp me-2"></i> Contactar por WhatsApp';
    wBtn.onclick = () => {
      window.open(
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hola, deseo más información sobre el servicio de Seguridad Física.")}`,
        "_blank",
      );
    };

    // Botón de llamada telefónica directa
    const phoneBtn = document.createElement("button");
    phoneBtn.classList.add("option-btn");
    phoneBtn.style.marginTop = "8px";
    phoneBtn.innerHTML =
      '<i class="fa-solid fa-phone me-2"></i> Llamar al 0984107006';
    phoneBtn.onclick = () => {
      window.open("tel:+593984107006", "_self");
    };

    chatBody.appendChild(wBtn);
    chatBody.appendChild(phoneBtn);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  if (type === "electronica") {
    const div = document.createElement("div");
    div.classList.add("msg", "bot");
    div.innerHTML = `Cargando planes de Seguridad Electrónica...`;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;

    getChatbotPlanes().then(planes => {
      const elecPlanes = planes.filter(p => p.type === "electronica");
      
      // Ordenar para que aparezca Básico -> Medio -> Premium
      const sorted = [...elecPlanes].sort((a, b) => {
        if (a.id.includes("premium")) return 1;
        if (b.id.includes("premium")) return -1;
        if (a.id.includes("basico")) return -1;
        if (b.id.includes("basico")) return 1;
        return 0;
      });

      div.innerHTML = `
        Contamos con los siguientes planes de Seguridad Electrónica. Selecciona uno para ver el detalle:
        <br><br>
        ${sorted.map(p => `<button class="option-btn" onclick="selectPlanById('${p.id}')">📦 ${p.name} (${p.price})</button>`).join("")}
      `;
      chatBody.scrollTop = chatBody.scrollHeight;
    });
  }
}

let chatbotPlanes = [];

async function getChatbotPlanes() {
  if (chatbotPlanes.length > 0) return chatbotPlanes;
  try {
    const db = firebase.firestore();
    const snapshot = await db.collection("planes").get();
    if (!snapshot.empty) {
      chatbotPlanes = [];
      snapshot.forEach(doc => {
        chatbotPlanes.push({ id: doc.id, ...doc.data() });
      });
      return chatbotPlanes;
    }
  } catch (e) {
    console.error("Error al obtener planes para el chatbot:", e);
  }
  
  // Fallback si Firestore no responde o está vacío
  chatbotPlanes = [
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
    }
  ];
  return chatbotPlanes;
}

// Procesar selección de plan dinámico
function selectPlanById(planId) {
  const plan = chatbotPlanes.find(p => p.id === planId);
  if (!plan) return;

  let featuresText = "";
  if (Array.isArray(plan.features)) {
    featuresText = plan.features.join("<br>• ");
  } else {
    featuresText = plan.features;
  }

  const planDetails = `El <b>${plan.name}</b> (${plan.price}) incluye:<br>• ${featuresText}`;
  addMessage(planDetails, "bot");

  // Botón para más información que redirecciona
  const contactBtn = document.createElement("button");
  contactBtn.classList.add("whatsapp-btn");
  contactBtn.style.background = "#25d366";
  contactBtn.innerHTML = '<i class="fa-brands fa-whatsapp me-2"></i> Para más información comunícate a este número';
  contactBtn.onclick = () => {
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, quiero más información sobre el ${plan.name}`)}`,
      "_blank"
    );
  };

  chatBody.appendChild(contactBtn);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Procesar entrada del usuario
function processMessage(message) {
  message = message.toLowerCase();

  // Cualquier mensaje activa las opciones
  if (message.length >= 1) {
    showServiceOptions();
    return;
  }

  addMessage("No entendí bien, pero estoy aquí para ayudarte 😊", "bot");
}

sendBtn.onclick = () => {
  const text = chatInput.value.trim();
  if (text === "") return;

  addMessage(text, "user");
  chatInput.value = "";

  setTimeout(() => {
    processMessage(text);
  }, 400);
};

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.onclick();
});
