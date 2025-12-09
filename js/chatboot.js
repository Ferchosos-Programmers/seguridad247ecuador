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
    ¡Hola! Te saluda <b>Fernando</b> de <b>Seguridad 247</b>.<br>
    Te ofrecemos los siguientes servicios. Selecciona uno:
    <br><br>
    <button class="option-btn" onclick="selectService('fisica')">🔐 Seguridad Física</button>
    <button class="option-btn" onclick="selectService('electronica')">📡 Seguridad Electrónica</button>
    <button class="option-btn" onclick="selectService('patrullaje')">🚓 Patrullaje Móvil</button>
    <button class="option-btn" onclick="selectService('otro')">⭐ Otros Servicios</button>
  `;

  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Procesar servicio seleccionado
function selectService(type) {
  let precio = "";
  let nombreServicio = "";

  if (type === "fisica") {
    nombreServicio = "Seguridad Física";
    precio = "El servicio de Seguridad Física tiene un costo desde <b>$5 por hora</b>.";
  }
  if (type === "electronica") {
    nombreServicio = "Seguridad Electrónica";
    precio = "La Seguridad Electrónica tiene un costo desde <b>$150 instalación</b>.";
  }
  if (type === "patrullaje") {
    nombreServicio = "Patrullaje Móvil";
    precio = "El Patrullaje Móvil tiene un costo desde <b>$80 mensuales</b>.";
  }
  if (type === "otro") {
    nombreServicio = "Otros Servicios";
    precio = "Ofrecemos servicios personalizados. Cuéntame qué necesitas.";
  }

  // Mensaje del bot
  addMessage(precio, "bot");

  // Botón de WhatsApp con mensaje personalizado
  const wBtn = document.createElement("button");
  wBtn.classList.add("whatsapp-btn");
  wBtn.textContent = "Ir a WhatsApp";
  
  // Mensaje personalizado según servicio
  const mensaje = `Hola, quiero más información sobre ${nombreServicio}`;

  wBtn.onclick = () => {
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );
  };

  chatBody.appendChild(wBtn);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Procesar entrada del usuario
function processMessage(message) {
  message = message.toLowerCase();

  // Cualquier palabra activa al bot
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
