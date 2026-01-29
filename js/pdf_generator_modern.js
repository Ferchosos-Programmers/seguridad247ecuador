// Modern PDF Generator for Technical Reports
// Seguridad 24/7 Ecuador - Department Técnico

function generateModernPDF(asBlob = false) {
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
    const contentWidth = pageWidth - margin * 2;

    // Load images
    const logo = new Image();
    const seal = new Image();
    logo.src = "assets/img/logo.png";
    seal.src = "assets/img/sello.png";

    // Check for problem image
    const problemImgElement = document.getElementById("reportProblemImage");
    const hasProblemImg =
      document.getElementById("initialProblemSection")?.style.display !==
        "none" &&
      document.getElementById("reportProblemImageContainer")?.style.display !==
        "none" &&
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
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Gold accent bars
      doc.setFillColor(gold);
      doc.rect(0, 0, pageWidth, 8, "F");
      doc.rect(0, pageHeight - 8, pageWidth, 8, "F");

      // Logo (centered, large)
      try {
        const logoSize = 60;
        doc.addImage(
          logo,
          "PNG",
          (pageWidth - logoSize) / 2,
          50,
          logoSize,
          logoSize,
        );
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
      doc.roundedRect(margin + 10, 210, contentWidth - 20, 60, 5, 5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(gold);
      doc.text("CLIENTE:", margin + 20, 225);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(white);
      doc.text(
        document.getElementById("reportClientName").innerText,
        margin + 20,
        235,
      );

      doc.setFont("helvetica", "bold");
      doc.setTextColor(gold);
      doc.text("FECHA:", margin + 20, 250);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(white);
      const today = new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(today, margin + 20, 260);

      // Footer
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor("#888888");
      doc.text(
        "Documento generado automáticamente",
        pageWidth / 2,
        pageHeight - 20,
        { align: "center" },
      );

      // ==========================================
      // PAGE 2: INITIAL PROBLEM REPORT
      // ==========================================
      doc.addPage();

      // Header
      addPageHeader(doc, "REPORTE INICIAL DEL PROBLEMA", 1);

      let y = 55;

      // Client info section
      doc.setFillColor(lightGray);
      doc.roundedRect(margin, y, contentWidth, 30, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(darkGray);
      doc.text("CLIENTE:", margin + 5, y + 10);
      doc.setFont("helvetica", "normal");
      doc.text(
        document.getElementById("reportClientName").innerText,
        margin + 30,
        y + 10,
      );

      doc.setFont("helvetica", "bold");
      doc.text("FECHA ASIGNACIÓN:", margin + 5, y + 20);
      doc.setFont("helvetica", "normal");
      doc.text(
        document.getElementById("reportJobDate").innerText,
        margin + 50,
        y + 20,
      );

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
      const problemDesc =
        document.getElementById("reportProblemDescription")?.innerText ||
        "Sin descripción";
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
          const maxImgWidth = (contentWidth - 20) * 0.5;
          const maxImgHeight = 120;
          const imgX = (pageWidth - maxImgWidth) / 2;

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

      addPageFooter(doc, 1);

      // ==========================================
      // PAGE 3: TECHNICAL REPORT
      // ==========================================
      doc.addPage();
      addPageHeader(doc, "INFORME TÉCNICO DE TRABAJO", 2);

      y = 55;

      doc.setFillColor(lightGray);
      doc.roundedRect(margin, y, contentWidth, 25, 3, 3, "F");

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
        y + 18,
      );

      y += 35;

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
        doc.addImage(
          img2.src,
          "JPEG",
          margin + imgWidth + 10,
          y,
          imgWidth,
          imgHeight,
        );
      }

      y += imgHeight + 20;

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

      try {
        doc.addImage(seal, "PNG", margin + 15, y, sigWidth, sigHeight);
        doc.setDrawColor(gold);
        doc.line(
          margin + 5,
          y + sigHeight + 3,
          margin + sigWidth + 25,
          y + sigHeight + 3,
        );
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(darkGray);
        doc.text("SELLO TÉCNICO", margin + 18, y + sigHeight + 9);
      } catch (e) {
        console.warn("Seal not available");
      }

      const clientSig = document.getElementById("reportClientSignature")?.src;
      if (clientSig && clientSig.startsWith("data:")) {
        const clientX = margin + sigWidth + sigSpacing + 30;
        doc.addImage(clientSig, "PNG", clientX, y, sigWidth, sigHeight);
        doc.setDrawColor(gold);
        doc.line(
          clientX - 10,
          y + sigHeight + 3,
          clientX + sigWidth + 10,
          y + sigHeight + 3,
        );
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(darkGray);
        doc.text("FIRMA CLIENTE", clientX + 5, y + sigHeight + 9);
      }

      addPageFooter(doc, 2);

      if (asBlob) {
        resolve(doc.output("blob"));
      } else {
        const clientName = document
          .getElementById("reportClientName")
          .innerText.replace(/\s+/g, "_");
        doc.save(`Informe_Tecnico_${clientName}_${Date.now()}.pdf`);
        resolve();
      }
    }

    function addPageHeader(doc, title, pageNum) {
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      doc.setFillColor(darkGray);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setFillColor(gold);
      doc.rect(0, 0, pageWidth, 3, "F");
      try {
        doc.addImage(logo, "PNG", margin, 8, 18, 18);
      } catch (e) {}
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(white);
      doc.text(title, 50, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#cccccc");
      doc.text("Seguridad 24/7 Ecuador", 50, 23);
    }

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
        { align: "center" },
      );
    }
  });
}

/**
 * Sends the current technical report via WhatsApp
 * Optimized to work without CORS issues by using native sharing or local delivery
 */
async function sendModernPDF() {
  const job = window.currentReportingJob;
  if (!job) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo identificar el trabajo para enviar el informe.",
      confirmButtonColor: "#d4af37",
    });
    return;
  }

  const phone = job.contactPhone;
  if (!phone) {
    Swal.fire({
      icon: "warning",
      title: "Atención",
      text: "No hay un número de teléfono registrado en este trabajo.",
      confirmButtonColor: "#d4af37",
    });
    return;
  }

  const btn = document.getElementById("sendReportBtn");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin me-2"></i> PREPARANDO...';

  try {
    // 1. Generate PDF as Blob
    const pdfBlob = await generateModernPDF(true);
    const fileName = `Informe_Tecnico_${job.clientName.replace(/\s+/g, "_")}.pdf`;

    // Clean phone number
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 9 || cleanPhone.length === 10) {
      if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
      if (!cleanPhone.startsWith("593")) cleanPhone = "593" + cleanPhone;
    }

    // Prepare message
    const messageText = `*SEGURIDAD 24/7 ECUADOR*\n\nEstimado cliente, adjuntamos el *Informe Técnico* de su requerimiento.\n\nGracias por su confianza.`;

    // METHOD A: Web Share API (Best for Mobile)
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Informe Técnico",
          text: messageText,
        });

        Swal.fire({
          icon: "success",
          title: "¡Enviado!",
          text: "El informe ha sido compartido correctamente.",
          timer: 3000,
          showConfirmButton: false,
          background: "#000",
          color: "#d4af37",
        });
        return; // Exit on success
      } catch (shareError) {
        console.log("Share failed or cancelled, using fallback:", shareError);
      }
    }

    // METHOD B: Download + WhatsApp (Most reliable for Desktop/Local)
    // 1. Download the file
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdfBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Open WhatsApp
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    setTimeout(() => {
      window.open(waUrl, "_blank");

      Swal.fire({
        icon: "info",
        title: "¡Reporte Descargado!",
        html: `El informe se ha descargado en su dispositivo.<br><br><b>Por favor, adjúntelo manualmente</b> en el chat de WhatsApp que se acaba de abrir.`,
        confirmButtonColor: "#d4af37",
        background: "#000",
        color: "#d4af37",
      });
    }, 1000);
  } catch (error) {
    console.error("Error sending PDF:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Hubo un problema al procesar el informe.",
      confirmButtonColor: "#d4af37",
    });
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Export functions
window.generateModernPDF = generateModernPDF;
window.sendModernPDF = sendModernPDF;
