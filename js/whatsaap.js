document.addEventListener('DOMContentLoaded', function () {
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();

      // Obtener los valores del formulario
      const nombre = document.getElementById('nombre').value;
      const email = document.getElementById('email').value;
      const telefono = document.getElementById('telefono').value;
      const mensaje = document.getElementById('mensaje').value;

      // Número de teléfono de destino (reemplaza con tu número en formato internacional sin el '+')
      const telefonoDestino = '593984107006';

      // Crear el mensaje
      const textoMensaje = `¡Hola! 👋 Me gustaría solicitar información:\n\n*Nombre:* ${nombre}\n*Email:* ${email}\n*Teléfono:* ${telefono}\n*Mensaje:* ${mensaje}`;

      // Codificar el mensaje para la URL
      const urlWhatsapp = `https://wa.me/${telefonoDestino}?text=${encodeURIComponent(textoMensaje)}`;

      // Abrir WhatsApp en una nueva pestaña
      window.open(urlWhatsapp, '_blank');

      // Mostrar alerta de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Mensaje enviado!',
        text: 'Serás redirigido a WhatsApp para completar el envío.',
        confirmButtonText: 'Aceptar'
      });

      // Limpiar el formulario (opcional)
      document.getElementById('contactForm').reset();
    });
  }
});
