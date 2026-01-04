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
        mediaHtml = `
          <div class="ratio ratio-16x9">
            <iframe src="https://www.youtube.com/embed/${item.videoId}" allowfullscreen></iframe>
          </div>
        `;
      } else {
        mediaHtml = `
          <div class="pdf-preview text-center py-5 bg-dark" onclick="verTutorialPDF('${item.id}')" style="cursor:pointer; border-radius: 8px 8px 0 0; border-bottom: 2px solid #d4af37;">
            <i class="fa-solid fa-file-pdf fa-4x text-danger mb-2"></i>
            <p class="text-white small mb-0">Ver Documento PDF</p>
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
                 <span class="badge bg-dark border border-gold text-gold small px-3 py-2">${item.tutorialType.toUpperCase()}</span>
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
