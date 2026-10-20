// Modern 2-Page Technical Report PDF Generator
// Seguridad 24/7 Ecuador - Departamento de Ingeniería y CCTV

/**
 * Generates an executive 2-page technical evaluation report
 * Page 1: Executive Cover Page (Carátula / Sello Técnico)
 * Page 2: Technical Report matching official CCTV Department layout
 *
 * @param {boolean} asBlob - If true, returns a Blob; otherwise downloads file
 * @param {object|null} customJobData - Optional job data object. If null, reads from DOM/global.
 * @returns {Promise<Blob|void>}
 */
function generateModernPDF(asBlob = false, customJobData = null) {
  return new Promise(async (resolve, reject) => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
      const margin = 15;
      const contentWidth = pageWidth - margin * 2; // 180 mm

      // Colors
      const gold = [212, 175, 55]; // #d4af37
      const cyan = [0, 159, 227]; // #009fe3 (Image 3 cyan)
      const darkNavy = [11, 26, 48]; // #0b1a30
      const charcoal = [17, 24, 39]; // #111827
      const textDark = [30, 41, 59]; // #1e293b
      const textMuted = [71, 85, 105]; // #475569
      const borderGray = [203, 213, 225]; // #cbd5e1

      // 1. Resolve Data (customJobData > window.currentReportingJob > DOM elements)
      const job = customJobData || window.currentReportingJob || {};

      const clientName =
        job.clientName ||
        document.getElementById("reportClientName")?.innerText ||
        "Cliente Final";

      const contactName =
        job.contactName ||
        document.getElementById("reportContactName")?.innerText ||
        "Administración / Contacto";

      const reportSender =
        job.reportSender ||
        job.jobSender ||
        document.getElementById("reportSender")?.value ||
        "Departamento Técnico - 24/7 Seguridad";

      const reportReason =
        job.reportReason ||
        job.jobReason ||
        document.getElementById("reportReason")?.value ||
        "Revisión y Mantenimiento Técnico de Seguridad";

      const reportTech =
        job.reportTech ||
        job.jobTech ||
        document.getElementById("reportTech")?.value ||
        "Servicio Técnico Especializado";

      const reportStatusFinal =
        job.reportStatusFinal ||
        document.getElementById("reportStatusFinal")?.value ||
        (job.status === "Culminado" ? "Operativo / Solucionado" : "Pendiente");

      const reportJobDescription =
        job.jobDescription ||
        job.reportJobDescription ||
        document.getElementById("reportJobDescription")?.value ||
        "";

      const reportRecommendations =
        job.reportRecommendations ||
        document.getElementById("reportRecommendations")?.value ||
        "Se recomienda mantener las rutinas de mantenimiento preventivo y monitoreo periódico del sistema para evitar interrupciones operativas.";

      const reportInitial =
        job.reportInitial ||
        document.getElementById("reportInitial")?.value ||
        "";

      const reportFinal =
        job.reportFinal ||
        document.getElementById("reportFinal")?.value ||
        document.getElementById("reportText")?.innerText ||
        "";

      const reportCode =
        job.reportCode ||
        document.getElementById("reportCode")?.value ||
        document.getElementById("reportCodeBadge")?.innerText ||
        `INF-CCTV-${new Date().getFullYear()}-001`;

      // Formatted Date
      let formattedDate = "";
      if (job.reportDate) {
        const d =
          typeof job.reportDate.toDate === "function"
            ? job.reportDate.toDate()
            : new Date(job.reportDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }
      }
      if (!formattedDate) {
        formattedDate = new Date().toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }

      // 2. Resolve Images Sources
      const logoSrc = "assets/img/logo.png";
      const sealSrc = "assets/img/sello.png";
      const firmaSrc = "assets/img/firma.png";

      // Initial Image
      let initialImgSrc = null;
      if (job.evidenceInitial && job.evidenceInitial.length > 0) {
        initialImgSrc = job.evidenceInitial[0];
      } else if (job.reportInitialImg1) {
        initialImgSrc = job.reportInitialImg1;
      } else {
        const domInit =
          document.getElementById("previewInitial")?.src ||
          document.getElementById("imgInitial1")?.src ||
          document.getElementById("displayInitial1")?.src;
        if (
          domInit &&
          (domInit.startsWith("data:") || domInit.startsWith("http"))
        ) {
          initialImgSrc = domInit;
        }
      }

      // Final Image
      let finalImgSrc = null;
      if (job.evidenceFinal && job.evidenceFinal.length > 0) {
        finalImgSrc = job.evidenceFinal[0];
      } else if (job.reportFinalImg1) {
        finalImgSrc = job.reportFinalImg1;
      } else {
        const domFinal =
          document.getElementById("previewFinal")?.src ||
          document.getElementById("imgFinal1")?.src ||
          document.getElementById("displayFinal1")?.src;
        if (
          domFinal &&
          (domFinal.startsWith("data:") || domFinal.startsWith("http"))
        ) {
          finalImgSrc = domFinal;
        }
      }

      // Client Signature
      let clientSigSrc = job.clientSignature || null;
      if (!clientSigSrc) {
        const domSig = document.getElementById("reportClientSignature")?.src;
        if (domSig && domSig.startsWith("data:")) {
          clientSigSrc = domSig;
        }
      }

      // Helper function to load images asynchronously
      const loadImage = (src) => {
        return new Promise((res) => {
          if (!src || typeof src !== "string" || src.trim() === "") {
            res(null);
            return;
          }
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => res(img);
          img.onerror = () => res(null);
          img.src = src;
        });
      };

      // Load all images in parallel
      const [logoImg, sealImg, firmaImg, pImg, sImg, sigImg] =
        await Promise.all([
          loadImage(logoSrc),
          loadImage(sealSrc),
          loadImage(firmaSrc),
          loadImage(initialImgSrc),
          loadImage(finalImgSrc),
          loadImage(clientSigSrc),
        ]);

      // =========================================================================
      // PAGE 1: PORTADA EJECUTIVA / SELLO DE SOPORTE TÉCNICO (Hoja 1)
      // =========================================================================

      // Dark background
      doc.setFillColor(charcoal[0], charcoal[1], charcoal[2]);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Top & bottom gold bars
      doc.setFillColor(gold[0], gold[1], gold[2]);
      doc.rect(0, 0, pageWidth, 7, "F");
      doc.rect(0, pageHeight - 7, pageWidth, 7, "F");

      // Header top badge text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text(
        "SEGURIDAD 24/7 ECUADOR · DEPARTAMENTO DE INGENIERÍA Y CCTV",
        pageWidth / 2,
        18,
        { align: "center" }
      );

      // Logo centered
      if (logoImg) {
        try {
          const lW = 54;
          const lH = 30;
          doc.addImage(logoImg, "PNG", (pageWidth - lW) / 2, 28, lW, lH);
        } catch (e) {
          console.warn("Logo page 1 error:", e);
        }
      }

      // Brand Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text("SEGURIDAD 24/7", pageWidth / 2, 70, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("ECUADOR", pageWidth / 2, 78, { align: "center" });

      // Golden Line with accent
      doc.setDrawColor(gold[0], gold[1], gold[2]);
      doc.setLineWidth(0.8);
      doc.line(margin + 20, 85, pageWidth - margin - 20, 85);
      doc.setFillColor(gold[0], gold[1], gold[2]);
      doc.circle(pageWidth / 2, 85, 2, "F");

      // Report Type Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.setTextColor(255, 255, 255);
      doc.text("INFORME TÉCNICO DE EVALUACIÓN", pageWidth / 2, 98, {
        align: "center",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(cyan[0], cyan[1], cyan[2]);
      doc.text("DEPARTAMENTO DE INGENIERÍA Y CCTV", pageWidth / 2, 106, {
        align: "center",
      });

      // Technical Seal of Guarantee
      if (sealImg) {
        try {
          const sSize = 48;
          doc.addImage(
            sealImg,
            "PNG",
            (pageWidth - sSize) / 2,
            116,
            sSize,
            sSize
          );
        } catch (e) {
          console.warn("Seal page 1 error:", e);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text(
        "SERVICIO TÉCNICO GARANTIZADO · VALIDACIÓN DIGITAL",
        pageWidth / 2,
        172,
        { align: "center" }
      );

      // Executive Information Card
      const cardY = 182;
      const cardH = 76;
      doc.setFillColor(30, 41, 59); // #1e293b
      doc.roundedRect(margin + 5, cardY, contentWidth - 10, cardH, 4, 4, "F");
      doc.setDrawColor(gold[0], gold[1], gold[2]);
      doc.setLineWidth(0.6);
      doc.roundedRect(margin + 5, cardY, contentWidth - 10, cardH, 4, 4, "S");

      // Card Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text("DATOS DE CONTROL Y SEGUIMIENTO TÉCNICO", margin + 12, cardY + 10);

      doc.setDrawColor(gold[0], gold[1], gold[2]);
      doc.setLineWidth(0.3);
      doc.line(
        margin + 12,
        cardY + 12,
        pageWidth - margin - 12,
        cardY + 12
      );

      const col1X = margin + 12;
      const col2X = margin + 95;

      // Card Row 1: REF & FECHA
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(cyan[0], cyan[1], cyan[2]);
      doc.text("CÓDIGO ÚNICO (REF):", col1X, cardY + 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(255, 255, 255);
      doc.text(reportCode, col1X, cardY + 26);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text("FECHA DE EMISIÓN:", col2X, cardY + 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(formattedDate, col2X, cardY + 26);

      // Card Row 2: CLIENTE & CONTACTO
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text("CLIENTE / CONJUNTO:", col1X, cardY + 37);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      const clientLines = doc.splitTextToSize(clientName, 75);
      doc.text(clientLines[0] || clientName, col1X, cardY + 43);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text("ADMINISTRACIÓN / CONTACTO:", col2X, cardY + 37);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      const contactLines = doc.splitTextToSize(contactName, 75);
      doc.text(contactLines[0] || contactName, col2X, cardY + 43);

      // Card Row 3: TÉCNICO & ESTADO
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text("TÉCNICO ASIGNADO:", col1X, cardY + 54);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(reportTech, col1X, cardY + 60);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(gold[0], gold[1], gold[2]);
      doc.text("ESTADO DEL SERVICIO:", col2X, cardY + 54);

      // Estado badge
      const isOk =
        reportStatusFinal.toLowerCase().includes("operativo") ||
        reportStatusFinal.toLowerCase().includes("solucionado");
      doc.setFillColor(isOk ? 40 : 220, isOk ? 167 : 53, isOk ? 69 : 69);
      doc.roundedRect(col2X, cardY + 56, 52, 7, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(reportStatusFinal, col2X + 26, cardY + 61, { align: "center" });

      // Footer of Page 1
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(
        "Documento oficial de evaluación técnica emitido por el Sistema de Gestión · Hoja 1 de 2",
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );

      // =========================================================================
      // PAGE 2: INFORME TÉCNICO DE EVALUACIÓN (Hoja 2)
      // Exactly matching Image 3 structure
      // =========================================================================
      doc.addPage();

      // White background for technical clarity
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // 1. Header (y = 12 to 32)
      if (logoImg) {
        try {
          doc.addImage(logoImg, "PNG", margin, 12, 36, 19);
        } catch (e) {}
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14.5);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text("INFORME TÉCNICO DE EVALUACIÓN", pageWidth - margin, 19, {
        align: "right",
      });

      doc.setFontSize(9.5);
      doc.setTextColor(cyan[0], cyan[1], cyan[2]);
      doc.text("DEPARTAMENTO DE INGENIERÍA Y CCTV", pageWidth - margin, 26, {
        align: "right",
      });

      // Horizontal Cyan line
      doc.setDrawColor(cyan[0], cyan[1], cyan[2]);
      doc.setLineWidth(1.0);
      doc.line(margin, 33, pageWidth - margin, 33);

      // 2. Metadata Box (y = 36 to 53, height = 17 mm)
      const metaY = 36;
      const metaH = 17;
      doc.setFillColor(248, 250, 252); // #f8fafc
      doc.roundedRect(margin, metaY, contentWidth, metaH, 2, 2, "F");
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, metaY, contentWidth, metaH, 2, 2, "S");

      // Vertical divider in metadata box
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(pageWidth / 2 + 5, metaY + 2, pageWidth / 2 + 5, metaY + metaH - 2);

      // Row 1 Metadata
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("PARA:", margin + 4, metaY + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      const paraText = `${contactName} / ${clientName}`;
      doc.text(
        paraText.length > 50 ? paraText.substring(0, 50) + "..." : paraText,
        margin + 17,
        metaY + 6
      );

      doc.setFont("helvetica", "bold");
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("FECHA:", pageWidth / 2 + 9, metaY + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(formattedDate, pageWidth / 2 + 23, metaY + 6);

      // Row 2 Metadata
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("DE:", margin + 4, metaY + 13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(
        reportSender.length > 50
          ? reportSender.substring(0, 50) + "..."
          : reportSender,
        margin + 17,
        metaY + 13
      );

      doc.setFont("helvetica", "bold");
      doc.setTextColor(cyan[0], cyan[1], cyan[2]);
      doc.text("REF:", pageWidth / 2 + 9, metaY + 13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(reportCode, pageWidth / 2 + 23, metaY + 13);

      // 3. Section 1: ANTECEDENTES (y = 57 to 76)
      let curY = 57;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text("1. ANTECEDENTES", margin, curY);

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + 2, pageWidth - margin, curY + 2);

      curY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

      const baseAntecedentes =
        reportJobDescription.trim().length > 10
          ? reportJobDescription.trim()
          : `Atendiendo el requerimiento reportado referente a ${reportReason}, el equipo técnico especializado de 24/7 Seguridad del Ecuador procedió con la inspección técnica, diagnóstico en sitio y solución definitiva de las novedades presentadas en las instalaciones de ${clientName}.`;

      const antLines = doc.splitTextToSize(baseAntecedentes, contentWidth);
      const maxAntLines = antLines.slice(0, 3); // Max 3 lines to fit strictly on page 2
      doc.text(maxAntLines, margin, curY);
      curY += maxAntLines.length * 3.8 + 3;

      // 4. Section 2: DIAGNÓSTICO TÉCNICO DE NOVEDADES (y = 78 to 123)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text("2. DIAGNÓSTICO TÉCNICO DE NOVEDADES", margin, curY);

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + 2, pageWidth - margin, curY + 2);

      curY += 5;
      const diagBoxY = curY;
      const diagBoxH = 39;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, diagBoxY, contentWidth, diagBoxH, 2, 2, "F");
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, diagBoxY, contentWidth, diagBoxH, 2, 2, "S");

      if (pImg) {
        // Layout: Text on Left (122 mm), Photo on Right (48 mm)
        const textW = 122;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        doc.setTextColor(0, 120, 200);
        const subTitle = `A. Problema Encontrado: ${reportReason}`;
        doc.text(
          subTitle.length > 55 ? subTitle.substring(0, 55) + "..." : subTitle,
          margin + 4,
          diagBoxY + 6
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        const diagLines = doc.splitTextToSize(
          reportInitial || "Inspección técnica de novedades y diagnóstico.",
          textW
        );
        doc.text(diagLines.slice(0, 6), margin + 4, diagBoxY + 12);

        // Photo on right
        const pX = margin + textW + 6;
        const pY = diagBoxY + 4;
        const pW = 46;
        const pH = 28;
        try {
          doc.addImage(pImg, "JPEG", pX, pY, pW, pH);
          doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
          doc.setLineWidth(0.2);
          doc.rect(pX, pY, pW, pH);
        } catch (e) {}

        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text("Evidencia Inicial", pX + pW / 2, pY + pH + 4, {
          align: "center",
        });
      } else {
        // No photo: Full width
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        doc.setTextColor(0, 120, 200);
        doc.text(`A. Problema Encontrado: ${reportReason}`, margin + 4, diagBoxY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        const diagLines = doc.splitTextToSize(
          reportInitial || "Inspección técnica de novedades y diagnóstico.",
          contentWidth - 8
        );
        doc.text(diagLines.slice(0, 7), margin + 4, diagBoxY + 12);
      }

      curY = diagBoxY + diagBoxH + 4;

      // 5. Section 3: PLAN DE PRUEBAS Y TRABAJO TÉCNICO A REALIZAR / SOLUCIÓN IMPLEMENTADA
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text("3. PLAN DE PRUEBAS Y TRABAJO TÉCNICO REALIZADO", margin, curY);

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + 2, pageWidth - margin, curY + 2);

      curY += 5;
      const solBoxY = curY;
      const solBoxH = 39;

      // Mint green box
      doc.setFillColor(240, 253, 244); // #f0fdf4
      doc.roundedRect(margin, solBoxY, contentWidth, solBoxH, 2, 2, "F");
      doc.setDrawColor(134, 239, 172); // #86efac
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, solBoxY, contentWidth, solBoxH, 2, 2, "S");

      if (sImg) {
        // Layout: Text on Left (122 mm), Photo on Right (48 mm)
        const textW = 122;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        doc.setTextColor(21, 128, 61); // Green
        doc.text("1. Solución Técnica Implementada:", margin + 4, solBoxY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        const solLines = doc.splitTextToSize(
          reportFinal || "Se ejecutó la solución técnica requerida en el sitio.",
          textW
        );
        doc.text(solLines.slice(0, 6), margin + 4, solBoxY + 12);

        // Photo on right
        const sX = margin + textW + 6;
        const sY = solBoxY + 4;
        const sW = 46;
        const sH = 28;
        try {
          doc.addImage(sImg, "JPEG", sX, sY, sW, sH);
          doc.setDrawColor(134, 239, 172);
          doc.setLineWidth(0.2);
          doc.rect(sX, sY, sW, sH);
        } catch (e) {}

        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(21, 128, 61);
        doc.text("Evidencia Final / Solución", sX + sW / 2, sY + sH + 4, {
          align: "center",
        });
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        doc.setTextColor(21, 128, 61);
        doc.text("1. Solución Técnica Implementada:", margin + 4, solBoxY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        const solLines = doc.splitTextToSize(
          reportFinal || "Se ejecutó la solución técnica requerida en el sitio.",
          contentWidth - 8
        );
        doc.text(solLines.slice(0, 7), margin + 4, solBoxY + 12);
      }

      curY = solBoxY + solBoxH + 4;

      // 6. Section 4: CONCLUSIONES Y RECOMENDACIONES (y = 175 to 216)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text("4. CONCLUSIONES Y RECOMENDACIONES", margin, curY);

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + 2, pageWidth - margin, curY + 2);

      curY += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text("Conclusión:", margin, curY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      const conclText = ` Las intervenciones y pruebas concluyeron con éxito dejando el sistema en estado ${reportStatusFinal}. Los parámetros técnicos de CCTV y seguridad fueron verificados en sitio.`;
      const conclLines = doc.splitTextToSize(conclText, contentWidth - 20);
      doc.text(conclLines.slice(0, 2), margin + 17, curY);

      curY += conclLines.slice(0, 2).length * 3.8 + 3;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text("Recomendaciones:", margin, curY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      const recLines = doc.splitTextToSize(
        reportRecommendations ||
          "Mantener las rutinas de revisión y monitoreo periódico para garantizar la estabilidad operativa.",
        contentWidth - 28
      );
      doc.text(recLines.slice(0, 2), margin + 27, curY);

      curY += recLines.slice(0, 2).length * 3.8 + 4;

      // 7. Signatures Area (Firmas de Conformidad) (y = 224 to 268)
      const sigLineY = 254;

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, curY, pageWidth - margin, curY);

      // Left Column: Departamento Técnico
      const col1Center = margin + 45;
      const col2Center = pageWidth - margin - 45;

      // Technical seal / stamp
      if (sealImg) {
        try {
          doc.addImage(sealImg, "PNG", col1Center - 26, curY + 2, 22, 22);
        } catch (e) {}
      }
      if (firmaImg) {
        try {
          doc.addImage(firmaImg, "PNG", col1Center - 2, curY + 3, 24, 18);
        } catch (e) {}
      }

      // Line for Dept Técnico
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.line(col1Center - 35, sigLineY, col1Center + 35, sigLineY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text("Departamento Técnico", col1Center, sigLineY + 4, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("24/7 Seguridad del Ecuador", col1Center, sigLineY + 8, {
        align: "center",
      });
      doc.text(`Técnico: ${reportTech}`, col1Center, sigLineY + 11.5, {
        align: "center",
      });

      // Right Column: Client / Administration
      if (sigImg) {
        try {
          doc.addImage(sigImg, "PNG", col2Center - 20, curY + 3, 40, 20);
        } catch (e) {}
      }

      // Line for Client
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.4);
      doc.line(col2Center - 35, sigLineY, col2Center + 35, sigLineY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.text(
        `${contactName} / Administración`,
        col2Center,
        sigLineY + 4,
        { align: "center" }
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(clientName, col2Center, sigLineY + 8, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.text("Firma y Sello de Conformidad", col2Center, sigLineY + 11.5, {
        align: "center",
      });

      // 8. Bottom Page Footer
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Seguridad 24/7 Ecuador · PBX / Soporte: +593 · Quito - Ecuador · www.seguridad247.ec",
        margin,
        pageHeight - 9
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(cyan[0], cyan[1], cyan[2]);
      doc.text("Hoja 2 de 2", pageWidth - margin, pageHeight - 9, {
        align: "right",
      });

      // Output resolution
      const safeFileName = `Informe_${(reportCode || "CCTV").replace(/\s+/g, "_")}_${clientName.replace(/\s+/g, "_")}.pdf`;

      if (asBlob) {
        resolve(doc.output("blob"));
      } else {
        doc.save(safeFileName);
        resolve();
      }
    } catch (err) {
      console.error("Critical error in generateModernPDF:", err);
      reject(err);
    }
  });
}

/**
 * Sends the current technical report via WhatsApp
 */
async function sendModernPDF(externalBtn = null, targetJob = null) {
  const job = targetJob || window.currentReportingJob;
  if (!job) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo identificar el trabajo para enviar el informe.",
      confirmButtonColor: "#d4af37",
      background: "#000",
      color: "#d4af37",
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
      background: "#000",
      color: "#d4af37",
    });
    return;
  }

  const btn = externalBtn || document.getElementById("sendReportBtn");
  const originalText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin me-2"></i> PREPARANDO...';
  }

  try {
    const pdfBlob = await generateModernPDF(true, job);
    const code = job.reportCode || "INF-CCTV";
    const fileName = `Informe_${code}_${job.clientName.replace(/\s+/g, "_")}.pdf`;

    // Clean phone number for WhatsApp
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 9 || cleanPhone.length === 10) {
      if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
      if (!cleanPhone.startsWith("593")) cleanPhone = "593" + cleanPhone;
    }

    const messageText =
      `🛠️ *SEGURIDAD 24/7 ECUADOR - INFORME TÉCNICO*\n` +
      `📄 *REF / CÓDIGO:* ${code}\n\n` +
      `Estimado cliente *${job.clientName}*,\n` +
      `Adjuntamos el informe técnico oficial de la intervención realizada.\n\n` +
      `📋 *Estado:* ${job.reportStatusFinal || job.status || "Operativo"}\n` +
      `📅 *Fecha:* ${job.jobDate || ""}\n\n` +
      `Gracias por confiar en Seguridad 24/7 Ecuador.`;

    // Try Web Share API (Mobile native)
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Informe Técnico ${code}`,
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
        return;
      } catch (shareError) {
        console.log("Share fallback:", shareError);
      }
    }

    // Download fallback + WhatsApp Web
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdfBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    const waWindow = window.open(waUrl, "_blank");

    if (!waWindow || waWindow.closed || typeof waWindow.closed === "undefined") {
      Swal.fire({
        icon: "info",
        title: "¡Reporte Descargado!",
        html: `Se ha descargado el informe en 2 hojas.<br><br><b>El navegador bloqueó la ventana de WhatsApp.</b><br>Haga clic abajo para abrirlo manualmente:`,
        showCancelButton: true,
        confirmButtonText:
          '<i class="fa-brands fa-whatsapp"></i> Abrir WhatsApp',
        confirmButtonColor: "#25d366",
        background: "#000",
        color: "#d4af37",
      }).then((result) => {
        if (result.isConfirmed) {
          window.open(waUrl, "_blank");
        }
      });
    } else {
      Swal.fire({
        icon: "info",
        title: "¡Reporte Descargado!",
        html: `El informe de 2 hojas se descargó en su equipo.<br><br><b>Por favor adjúntelo en el chat de WhatsApp</b> que se acaba de abrir.`,
        confirmButtonColor: "#d4af37",
        background: "#000",
        color: "#d4af37",
      });
    }
  } catch (error) {
    console.error("Error sending PDF:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Hubo un problema al procesar el informe.",
      confirmButtonColor: "#d4af37",
      background: "#000",
      color: "#d4af37",
    });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

// Export globally
window.generateModernPDF = generateModernPDF;
window.sendModernPDF = sendModernPDF;
