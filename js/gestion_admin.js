document.addEventListener('DOMContentLoaded', async () => {
  // Obtener referencia a la base de datos de Firestore
  const db = firebase.firestore();

  // Obtener el formulario
  const jobForm = document.getElementById('jobForm');

  if (!jobForm) {
    console.error('Formulario no encontrado');
    return;
  }

  // Escuchar el evento de envío del formulario
  jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Obtener los valores del formulario
    const clientName = document.getElementById('clientName').value;
    const jobDate = document.getElementById('jobDate').value;
    const jobUrgency = document.getElementById('jobUrgency').value;
    const contactName = document.getElementById('contactName').value;
    const contactPhone = document.getElementById('contactPhone').value;

    try {
      // Guardar en Firestore
      await db.collection('trabajos').add({
        clientName: clientName,
        jobDate: jobDate,
        jobUrgency: jobUrgency,
        contactName: contactName,
        contactPhone: contactPhone,
        createdAt: new Date(),
        status: 'Pendiente'
      });

      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'Trabajo agregado correctamente',
        confirmButtonColor: '#d4af37'
      });

      // Limpiar el formulario
      jobForm.reset();

      // Cerrar el modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('addJobModal'));
      modal.hide();

    } catch (error) {
      console.error('Error al agregar trabajo:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al guardar el trabajo: ' + error.message,
        confirmButtonColor: '#d4af37'
      });
    }
  });
});