document.addEventListener("DOMContentLoaded", () => {
  const tutorialGrid = document.getElementById("tutorialGrid");
  const typeSelect = document.getElementById("typeSelect");
  const categorySelect = document.getElementById("categorySelect");
  const tutorialSearch = document.getElementById("tutorialSearch");

  let allTutorials = [];
  let currentType = "all";
  let currentCategory = "all";
  let searchQuery = "";

  // Cargar tutoriales desde Firestore
  async function cargarTutoriales() {
    try {
      const snapshot = await db
        .collection("trabajos")
        .where("isTutorial", "==", true)
        .get();

      allTutorials = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Ordenar manualmente por fecha descendente
      allTutorials.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
      });

      renderTutorials();
    } catch (error) {
      console.error("Error al cargar tutoriales:", error);
      tutorialGrid.innerHTML =
        '<p class="text-center text-danger w-100">Error al cargar los tutoriales.</p>';
    }
  }

  function renderTutorials() {
    tutorialGrid.innerHTML = "";

    let filtered = allTutorials.filter((t) => {
      const matchType = currentType === "all" || t.tutorialType === currentType;
      const matchCategory =
        currentCategory === "all" || t.category === currentCategory;
      const matchSearch = t.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchType && matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
      tutorialGrid.innerHTML =
        '<p class="text-center text-muted w-100 mt-4">No se encontraron tutoriales que coincidan con la búsqueda o filtros.</p>';
      return;
    }

    filtered.forEach((item) => {
      let mediaHtml = "";
      if (item.tutorialType === "video") {
        // VIDEO
        mediaHtml = `
          <div class="video-preview-container position-relative" style="height: 200px; overflow: hidden; border-radius: 8px 8px 0 0; border-bottom: 2px solid #d4af37; cursor: pointer;" onclick="window.open('${item.url || 'https://www.youtube.com/watch?v=' + item.videoId}', '_blank')">
            <img src="assets/img/portada.jfif" alt="Ver Video" class="w-100 h-100" style="object-fit: cover;">
            <div class="position-absolute top-0 end-0" style="width: 70px; height: 70px; background-color: #dc3545; clip-path: polygon(0 0, 100% 0, 100% 100%); display: flex; justify-content: flex-end; align-items: flex-start; padding: 8px;">
               <i class="fa-brands fa-youtube fa-2x text-white"></i>
            </div>
          </div>
        `;
      } else {
        // PDF
        mediaHtml = `
          <div class="pdf-preview-container position-relative" style="height: 200px; overflow: hidden; border-radius: 8px 8px 0 0; border-bottom: 2px solid #d4af37; cursor: pointer;" onclick="verTutorialPDF('${item.id}')">
            <img src="assets/img/portada.jfif" alt="Ver Documento" class="w-100 h-100" style="object-fit: cover;">
            <div class="position-absolute top-0 end-0" style="width: 70px; height: 70px; background-color: #dc3545; clip-path: polygon(0 0, 100% 0, 100% 100%); display: flex; justify-content: flex-end; align-items: flex-start; padding: 8px;">
               <i class="fa-solid fa-file-pdf fa-2x text-white"></i>
            </div>
          </div>
        `;
      }

      tutorialGrid.innerHTML += `
        <div class="col-md-6 col-lg-3 tutorial-item">
          <div class="video-card h-100 border-0 shadow-lg" style="background: rgba(20,20,20,0.8); backdrop-filter: blur(10px); transition: transform 0.3s ease;">
            ${mediaHtml}
            <div class="p-3">
              <h5 class="mt-2 text-gold fw-bold text-center">${item.title}</h5>
              <div class="d-flex gap-2 mt-2 justify-content-center">
                 <span class="badge bg-secondary small px-3 py-2">${item.category.toUpperCase()}</span>
                 <span class="badge ${item.tutorialType === 'video' ? 'bg-success' : 'bg-danger'} small px-3 py-2">${item.tutorialType.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }

  // Filtro por Tipo (Select)
  typeSelect.addEventListener("change", (e) => {
    currentType = e.target.value;
    renderTutorials();
  });

  // Filtro por Categoría (Select)
  categorySelect.addEventListener("change", (e) => {
    currentCategory = e.target.value;
    renderTutorials();
  });

  // Buscador
  tutorialSearch.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderTutorials();
  });

  // Función para ver PDF
  window.verTutorialPDF = function (id) {
    const item = allTutorials.find((t) => t.id === id);
    if (!item || !item.pdfData) return;

    const newTab = window.open();
    newTab.document.write(
      "<html><head><title>" +
        item.title +
        "</title></head>" +
        '<body style="margin:0">' +
        '<embed src="' +
        item.pdfData +
        '" width="100%" height="100%" type="application/pdf">' +
        "</body></html>"
    );
    newTab.document.close();
  };

  cargarTutoriales();
});
