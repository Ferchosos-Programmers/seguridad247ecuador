const btn = document.getElementById("chatbotBtn");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");
const chatBody = document.getElementById("chatBody");

// Tu número de WhatsApp
const whatsappNumber = "593984107006"; 

btn.onclick = () => {
  chatWindow.style.display = chatWindow.style.display === "flex" ? "none" : "flex";
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
    wBtn.innerHTML = '<i class="fa-brands fa-whatsapp me-2"></i> Contactar por WhatsApp';
    wBtn.onclick = () => {
      window.open(
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hola, deseo más información sobre el servicio de Seguridad Física.")}`,
        "_blank"
      );
    };

    // Botón de llamada telefónica directa
    const phoneBtn = document.createElement("button");
    phoneBtn.classList.add("option-btn");
    phoneBtn.style.marginTop = "8px";
    phoneBtn.innerHTML = '<i class="fa-solid fa-phone me-2"></i> Llamar al 0984107006';
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

    div.innerHTML = `
      Contamos con los siguientes planes de Seguridad Electrónica. Selecciona uno para ver el detalle:
      <br><br>
      <button class="option-btn" onclick="selectPlan('basico')">📦 Plan Básico</button>
      <button class="option-btn" onclick="selectPlan('medio')">💼 Plan Medio</button>
      <button class="option-btn" onclick="selectPlan('premium')">⭐ Plan Premium</button>
    `;

    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

// Procesar selección de plan
function selectPlan(plan) {
  let planName = "";
  let planDetails = "";

  if (plan === "basico") {
    planName = "Plan Básico";
    planDetails = "El <b>Plan Básico</b> incluye:<br>• Monitoreo residencial de alarma básica<br>• 1 sensor de movimiento infrarrojo<br>• 1 contacto magnético de puerta principal<br>• Reporte de eventos en app móvil.";
  } else if (plan === "medio") {
    planName = "Plan Medio";
    planDetails = "El <b>Plan Medio</b> incluye:<br>• Monitoreo residencial o comercial 24/7<br>• 3 sensores de movimiento avanzados<br>• 2 contactos magnéticos de puertas/ventanas<br>• App inteligente con notificaciones push<br>• 1 cámara IP con videoverificación.";
  } else if (plan === "premium") {
    planName = "Plan Premium";
    planDetails = "El <b>Plan Premium</b> incluye:<br>• Monitoreo avanzado de prioridad crítica 24/7<br>• Alarma inteligente completa (5 sensores)<br>• Circuito cerrado (CCTV) con 4 cámaras Full HD<br>• Automatización de accesos/cerraduras<br>• Soporte técnico prioritario y respuesta móvil inmediata.";
  }

  addMessage(planDetails, "bot");

  // Botón para más información que redirecciona
  const contactBtn = document.createElement("button");
  contactBtn.classList.add("whatsapp-btn");
  contactBtn.style.background = "#25d366";
  contactBtn.innerHTML = '<i class="fa-brands fa-whatsapp me-2"></i> Para más información comunícate a este número';
  contactBtn.onclick = () => {
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, quiero más información sobre el ${planName}`)}`,
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

chatInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendBtn.onclick();
});
