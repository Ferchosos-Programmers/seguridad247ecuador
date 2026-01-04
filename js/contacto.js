document.addEventListener('DOMContentLoaded', function () {
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();

      // Mostrar alerta de carga
      Swal.fire({
        title: 'Enviando mensaje...',
        text: 'Por favor espera un momento.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Obtener los datos del formulario
      const formData = new FormData(contactForm);
      
      // Enviar a FormSubmit usando AJAX (fetch)
      // Usamos el token de seguridad para ocultar tu email real
      fetch("https://formsubmit.co/ajax/2323bdfd8cba770afa4bac088bcb01aa", {
        method: "POST",
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
      })
      .then(async response => {
        // En algunos casos (como la primera vez sin activar) la respuesta no es JSON válido
        // Por eso priorizamos verificar si el estado es 'OK' (200-299)
        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: '¡Mensaje enviado!',
            text: 'Tu mensaje ha sido procesado correctamente. Si es la primera vez, recuerda activar el servicio en tu correo.',
            confirmButtonColor: '#d4af37'
          });
          contactForm.reset();
        } else {
          // Intentar obtener detalles del error
          const errorData = await response.json().catch(() => ({ message: "Error desconocido" }));
          console.error('Error del servidor:', errorData);
          
          if (response.status === 403) {
            throw new Error('El correo no ha sido activado. Por favor, revisa seguridad247@yopmail.com y confirma el mensaje de FormSubmit.');
          } else {
            throw new Error(errorData.message || `No se pudo enviar (Estado: ${response.status})`);
          }
        }
      })
      .catch(error => {
        console.error('Error en el envío:', error);
        Swal.fire({
          icon: 'error',
          title: 'No se pudo enviar',
          text: error.message || 'Hubo un problema de conexión. Inténtalo de nuevo.',
          confirmButtonColor: '#d4af37'
        });
      });
    });
  }
});
