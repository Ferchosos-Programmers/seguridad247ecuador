// Modern PDF Generator for Technical Reports
// Seguridad 24/7 Ecuador - Department Técnico

function generateModernPDF() {
  return new Promise((resolve, reject) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Colors
    const gold = "#d4af37";
    const darkGray = "#1a1a1a";
    const lightGray = "#f5f5f5";
    const white = "#ffffff";
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Load images
    const logo = new Image();
    const seal = new Image();
    logo.src = "assets/img/logo.png";
    seal.src = "assets/img/sello.png";
    
    // Check for problem image
    const problemImgElement = document.getElementById("reportProblemImage");
    const hasProblemImg = document.getElementById("initialProblemSection")?.style.display !== "none" && 
                          document.getElementById("reportProblemImageContainer")?.style.display !== "none" &&
                          problemImgElement?.src && 
                          problemImgElement.src !== window.location.href;
    
    let totalImagesToLoad = 2; // logo + seal
    let problemImg = null;
    
    if (hasProblemImg) {
      totalImagesToLoad++;
      problemImg = new Image();
      problemImg.crossOrigin = "Anonymous";
      problemImg.src = problemImgElement.src;
    }
    
    let imagesLoaded = 0;
    const checkImages = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImagesToLoad) buildPDF(resolve);
    };
    
    logo.onload = checkImages;
    logo.onerror = checkImages;
  seal.onload = checkImages;
  seal.onerror = checkImages;
  
  if (hasProblemImg) {
    problemImg.onload = checkImages;
    problemImg.onerror = checkImages;
  }
  
  function buildPDF(resolve) {
    // ==========================================
    // PAGE 1: COVER PAGE
    // ==========================================
    
    // Background gradient effect
    doc.setFillColor(darkGray);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Gold accent bars
    doc.setFillColor(gold);
    doc.rect(0, 0, pageWidth, 8, 'F');
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    
    // Logo (centered, large)
    try {
      const logoSize = 60;
      doc.addImage(logo, "PNG", (pageWidth - logoSize) / 2, 50, logoSize, logoSize);
    } catch (e) {
      console.error("Logo error", e);
    }
    
    // Company name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(gold);
    doc.text("SEGURIDAD 24/7", pageWidth / 2, 130, { align: "center" });
    
    doc.setFontSize(16);
    doc.setTextColor(white);
    doc.text("ECUADOR", pageWidth / 2, 142, { align: "center" });
    
    // Divider line
    doc.setDrawColor(gold);
    doc.setLineWidth(1);
    doc.line(margin + 20, 155, pageWidth - margin - 20, 155);
    
    // Document title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(white);
    doc.text("INFORME TÉCNICO", pageWidth / 2, 175, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor("#cccccc");
    doc.text("DEPARTAMENTO TÉCNICO", pageWidth / 2, 188, { align: "center" });
    
    // Client info box
    doc.setFillColor("#2a2a2a");
    doc.roundedRect(margin + 10, 210, contentWidth - 20, 60, 5, 5, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(gold);
    doc.text("CLIENTE:", margin + 20, 225);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(white);
    doc.text(document.getElementById("reportClientName").innerText, margin + 20, 235);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(gold);
    doc.text("FECHA:", margin + 20, 250);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(white);
    const today = new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(today, margin + 20, 260);
    
    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor("#888888");
    doc.text("Documento generado automáticamente", pageWidth / 2, pageHeight - 20, { align: "center" });
    
    // ==========================================
    // PAGE 2: INITIAL PROBLEM REPORT
    // ==========================================
    doc.addPage();
    
    // Header
    addPageHeader(doc, "REPORTE INICIAL DEL PROBLEMA", 1);
    
    let y = 55;
    
    // Client info section
    doc.setFillColor(lightGray);
    doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(darkGray);
    doc.text("CLIENTE:", margin + 5, y + 10);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById("reportClientName").innerText, margin + 30, y + 10);
    
    doc.setFont("helvetica", "bold");
    doc.text("FECHA ASIGNACIÓN:", margin + 5, y + 20);
    doc.setFont("helvetica", "normal");
    doc.text(document.getElementById("reportJobDate").innerText, margin + 50, y + 20);
    
    y += 40;
    
    // Problem description
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(gold);
    doc.text("DESCRIPCIÓN DEL PROBLEMA", margin, y);
    doc.setDrawColor(gold);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 12;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(darkGray);
    const problemDesc = document.getElementById("reportProblemDescription")?.innerText || "Sin descripción";
    const descLines = doc.splitTextToSize(problemDesc, contentWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 6 + 15;
    
    // Problem image
    if (hasProblemImg && problemImg) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(gold);
      doc.text("IMAGEN DEL PROBLEMA", margin, y);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 12;
      
      try {
        // Calculate image dimensions to fit nicely
        // Reduce width to 50% and center
        const maxImgWidth = (contentWidth - 20) * 0.5;
        const maxImgHeight = 120;
        
        // Center the image
        const imgX = (pageWidth - maxImgWidth) / 2;
        
        // Add border
        doc.setDrawColor(gold);
        doc.setLineWidth(1);
        doc.rect(imgX - 2, y - 2, maxImgWidth + 4, maxImgHeight + 4);
        
        doc.addImage(problemImg, "JPEG", imgX, y, maxImgWidth, maxImgHeight);
        y += maxImgHeight + 20;
      } catch (err) {
        console.warn("Could not add problem image", err);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor("#888888");
        doc.text("(Imagen no disponible)", margin + 10, y);
        y += 15;
      }
    }
    
    // Footer
    addPageFooter(doc, 1);
    
    // ==========================================
    // PAGE 3: TECHNICAL REPORT
    // ==========================================
    doc.addPage();
    
    // Header
    addPageHeader(doc, "INFORME TÉCNICO DE TRABAJO", 2);
    
    y = 55;
    
    // Status section
    doc.setFillColor(lightGray);
    doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(darkGray);
    doc.text("ESTADO:", margin + 5, y + 10);
    
    const status = document.getElementById("reportStatus").innerText;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(status === "Culminado" ? "#28a745" : gold);
    doc.text(status.toUpperCase(), margin + 30, y + 10);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkGray);
    doc.text("FECHA CIERRE:", margin + 5, y + 18);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${document.getElementById("reportDate").innerText} - ${document.getElementById("reportTime").innerText}`,
      margin + 40,
      y + 18
    );
    
    y += 35;
    
    // Work done
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(gold);
    doc.text("TRABAJO REALIZADO", margin, y);
    doc.setDrawColor(gold);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 12;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(darkGray);
    const reportText = document.getElementById("reportText").innerText;
    const reportLines = doc.splitTextToSize(reportText, contentWidth);
    doc.text(reportLines, margin, y);
    y += reportLines.length * 6 + 15;
    
    // Evidence photos
    if (y > 180) {
      doc.addPage();
      addPageHeader(doc, "EVIDENCIA FOTOGRÁFICA", 3);
      y = 55;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(gold);
    doc.text("EVIDENCIA FOTOGRÁFICA", margin, y);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 12;
    
    const img1 = document.getElementById("reportImage1");
    const img2 = document.getElementById("reportImage2");
    
    const imgWidth = (contentWidth - 10) / 2;
    const imgHeight = 60;
    
    if (img1?.src && img1.src.startsWith("data:")) {
      doc.setDrawColor(gold);
      doc.setLineWidth(0.5);
      doc.rect(margin - 1, y - 1, imgWidth + 2, imgHeight + 2);
      doc.addImage(img1.src, "JPEG", margin, y, imgWidth, imgHeight);
    }
    
    if (img2?.src && img2.src.startsWith("data:")) {
      doc.setDrawColor(gold);
      doc.rect(margin + imgWidth + 9, y - 1, imgWidth + 2, imgHeight + 2);
      doc.addImage(img2.src, "JPEG", margin + imgWidth + 10, y, imgWidth, imgHeight);
    }
    
    y += imgHeight + 20;
    
    // Signatures
    if (y > 220) {
      doc.addPage();
      addPageHeader(doc, "FIRMAS DE CONFORMIDAD", 4);
      y = 55;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(gold);
    doc.text("FIRMAS DE CONFORMIDAD", margin, y);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 15;
    
    const sigWidth = 50;
    const sigHeight = 35;
    const sigSpacing = 20;
    
    // Technical seal
    try {
      doc.addImage(seal, "PNG", margin + 15, y, sigWidth, sigHeight);
      doc.setDrawColor(gold);
      doc.line(margin + 5, y + sigHeight + 3, margin + sigWidth + 25, y + sigHeight + 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(darkGray);
      doc.text("SELLO TÉCNICO", margin + 18, y + sigHeight + 9);
    } catch (e) {
      console.warn("Seal not available");
    }
    
    // Client signature
    const clientSig = document.getElementById("reportClientSignature")?.src;
    if (clientSig && clientSig.startsWith("data:")) {
      const clientX = margin + sigWidth + sigSpacing + 30;
      doc.addImage(clientSig, "PNG", clientX, y, sigWidth, sigHeight);
      doc.setDrawColor(gold);
      doc.line(clientX - 10, y + sigHeight + 3, clientX + sigWidth + 10, y + sigHeight + 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(darkGray);
      doc.text("FIRMA CLIENTE", clientX + 5, y + sigHeight + 9);
    }
    
    // Footer
    addPageFooter(doc, 2);
    
    // Save PDF
    const clientName = document.getElementById("reportClientName").innerText.replace(/\s+/g, '_');
    doc.save(`Informe_Tecnico_${clientName}_${Date.now()}.pdf`);
    if (resolve) resolve();
  }
  
  // Helper: Add page header
  function addPageHeader(doc, title, pageNum) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    // Dark header background
    doc.setFillColor(darkGray);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Gold accent
    doc.setFillColor(gold);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    // Logo
    try {
      doc.addImage(logo, "PNG", margin, 8, 18, 18);
    } catch (e) {}
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(white);
    doc.text(title, 50, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor("#cccccc");
    doc.text("Seguridad 24/7 Ecuador", 50, 23);
  }
  
  // Helper: Add page footer
  function addPageFooter(doc, pageNum) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setDrawColor(gold);
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor("#888888");
    doc.text(
      `Página ${pageNum} | Seguridad 24/7 Ecuador - Informe Técnico`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
  });
}

// Export function
window.generateModernPDF = generateModernPDF;
