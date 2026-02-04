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

    // Load assets
    const logo = new Image();
    const seal = new Image();
    logo.src = "assets/img/logo.png";
    seal.src = "assets/img/sello.png";

    // Data Sources
    const reportInitial = document.getElementById("reportInitial")?.value || "";
    const reportFinal = document.getElementById("reportFinal")?.value || "";
    const reportTextLegacy = document.getElementById("reportText")?.innerText || "";
    
    // Fallback if structured data is empty (legacy or admin view)
    let initialText = reportInitial;
    let finalText = reportFinal;

    // Only use legacy text if structured ones are empty (to handle admin view parsing if needed)
    // Actually, reportInitial/reportFinal are hidden inputs or textareas in some views. 
    // In admin view, we might need to rely on parsed 'reportText' if fields aren't separated.
    // BUT user asked for Admin view to show them too. 
    // For now, assume fields exist or are populated.

    // Images
    const imgJobDesc = document.getElementById("displayJobImage"); // New (Updated ID)
    const imgInit1 = document.getElementById("imgInitial1");
    const imgInit2 = document.getElementById("imgInitial2");
    const imgFinal1 = document.getElementById("imgFinal1");
    const imgFinal2 = document.getElementById("imgFinal2");

    // Also check legacy/admin fallback elements if new ones don't exist
    // This logic depends on the HTML structure of the modal in admin pages.
    // We will ensure the modal structure matches in next steps.

    let totalImagesToLoad = 2; // logo + seal
    const imagesToProcess = [];

    // Helper to add image to load queue
    const queueImage = (imgElement) => {
      // Check if src is valid (data URL or http URL)
      if (imgElement && imgElement.src && (imgElement.src.startsWith("data:") || imgElement.src.startsWith("http"))) {
        totalImagesToLoad++;
        const img = new Image();
        img.crossOrigin = "Anonymous"; // Important for external URLs
        img.src = imgElement.src;
        imagesToProcess.push(img);
        return img;
      }
      return null;
    };

    const jobImgObj = queueImage(imgJobDesc);
    const pImg1 = queueImage(imgInit1);
    const pImg2 = queueImage(imgInit2);
    const sImg1 = queueImage(imgFinal1);
    const sImg2 = queueImage(imgFinal2);

    let imagesLoaded = 0;
    const checkImages = () => {
      imagesLoaded++;
      if (imagesLoaded >= totalImagesToLoad) buildPDF(resolve);
    };

    logo.onload = checkImages;
    logo.onerror = checkImages;
    seal.onload = checkImages;
    seal.onerror = checkImages;
    
    // If no images to load, triggering checkImages might be needed if total is 2
    if (totalImagesToLoad === 2 && logo.complete && seal.complete) {
        buildPDF(resolve);
    }

    imagesToProcess.forEach(img => {
        img.onload = checkImages;
        img.onerror = checkImages;
    });

    function buildPDF(resolve) {
      // ==========================================
      // PAGE 1: COVER PAGE
      // ==========================================
      doc.setFillColor(darkGray);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setFillColor(gold);
      doc.rect(0, 0, pageWidth, 8, "F");
      doc.rect(0, pageHeight - 8, pageWidth, 8, "F");

      try {
        const logoSize = 60;
        doc.addImage(logo, "PNG", (pageWidth - logoSize) / 2, 50, logoSize, logoSize);
      } catch (e) {}

      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(gold);
      doc.text("SEGURIDAD 24/7", pageWidth / 2, 130, { align: "center" });

      doc.setFontSize(16);
      doc.setTextColor(white);
      doc.text("ECUADOR", pageWidth / 2, 142, { align: "center" });

      doc.setDrawColor(gold);
      doc.setLineWidth(1);
      doc.line(margin + 20, 155, pageWidth - margin - 20, 155);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(white);
      doc.text("INFORME TÉCNICO", pageWidth / 2, 175, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor("#cccccc");
      doc.text("DEPARTAMENTO TÉCNICO", pageWidth / 2, 188, { align: "center" });

      // Client Box
      doc.setFillColor("#2a2a2a");
      doc.roundedRect(margin + 10, 210, contentWidth - 20, 60, 5, 5, "F");

      const clientName = document.getElementById("reportClientName")?.innerText || "Cliente Final";
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(gold);
      doc.text("CLIENTE:", margin + 20, 225);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(white);
      doc.text(clientName, margin + 20, 235);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(gold);
      doc.text("FECHA:", margin + 20, 250);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(white);
      const today = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
      doc.text(today, margin + 20, 260);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor("#888888");
      doc.text("Documento generado automáticamente", pageWidth / 2, pageHeight - 20, { align: "center" });

      // Helper for Sections
      let y = 55;
      
      const checkPageBreak = (heightNeeded) => {
        if (y + heightNeeded > pageHeight - 40) {
            doc.addPage();
            addPageHeader(doc, "INFORME TÉCNICO (Cont.)");
            y = 55;
        }
      };

      const addSectionTitle = (title, color = gold) => {
          checkPageBreak(25);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(color);
          doc.text(title, margin, y);
          doc.setDrawColor(color);
          doc.setLineWidth(0.5);
          doc.line(margin, y + 2, pageWidth - margin, y + 2);
          y += 12;
      };

      const addParagraph = (text) => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(darkGray);
          const lines = doc.splitTextToSize(text || "Sin información registrada.", contentWidth);
          checkPageBreak(lines.length * 5 + 10);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 10;
      };
      
      const addImages = (imgA, imgB) => {
          if (!imgA && !imgB) return;
          
          let imgH = 50; // Smaller size for better fit
          let imgW = (contentWidth - 10) / 2;
          
          // No auto-page break here since we manage sections manually
          // checkPageBreak(imgH + 10);
          
          if (imgA) {
             try {
                doc.addImage(imgA, "JPEG", margin, y, imgW, imgH);
             } catch(e) { console.warn("Error adding imgA", e); }
             doc.setDrawColor(gold);
             doc.setLineWidth(0.1);
             doc.rect(margin, y, imgW, imgH);
          }
          if (imgB) {
             const xPos = imgA ? margin + imgW + 10 : margin;
             try {
                 doc.addImage(imgB, "JPEG", xPos, y, imgW, imgH);
             } catch(e) { console.warn("Error adding imgB", e); }
             doc.setDrawColor(gold);
             doc.setLineWidth(0.1);
             doc.rect(xPos, y, imgW, imgH);
          }
          y += imgH + 15;
      };

      // New Robust Section Builder with Dynamic Spacing without Auto-Break
      // We manually control pages now as requested
      const addDynamicSection = (title, text, images, color = gold) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(color);
          doc.text(title, margin, y);
          doc.setDrawColor(color);
          doc.setLineWidth(0.5);
          doc.line(margin, y + 2, pageWidth - margin, y + 2);
          y += 12;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(darkGray);
          const lines = doc.splitTextToSize(text || "Sin información registrada.", contentWidth);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 10;
          
          // Filter valid images
          const validImages = images.filter(img => img !== null);
          
          if (validImages.length > 0) {
              addImages(validImages[0], validImages[1]);
          } else {
              y += 5;
          }
      };

      // ==========================================
      // PAGE 2: DESCRIPTION + PROBLEM
      // ==========================================
      doc.addPage();
      addPageHeader(doc, "DETALLE DEL SERVICIO");
      y = 55;

      // 1. DESCRIPCIÓN DEL REQUERIMIENTO
      const jobDescText = document.getElementById("reportJobDescription")?.value || "Sin descripción inicial.";
      addDynamicSection("1. DESCRIPCIÓN DEL REQUERIMIENTO", jobDescText, [jobImgObj], "#d4af37");

      y += 10; // Spacer

      // 2. PROBLEMA ENCONTRADO
      addDynamicSection("2. PROBLEMA ENCONTRADO", initialText || "No se reportaron hallazgos adicionales.", [pImg1, pImg2], "#d63031");

      // ==========================================
      // PAGE 3: SOLUTION + SIGNATURES
      // ==========================================
      doc.addPage();
      addPageHeader(doc, "SOLUCIÓN Y CIERRE");
      y = 55;

      // 3. SOLUCIÓN IMPLEMENTADA
      addDynamicSection("3. SOLUCIÓN IMPLEMENTADA", finalText || "Se completó el trabajo.", [sImg1, sImg2], "#28a745");

      // 3. FIRMAS
      y += 20;
      checkPageBreak(60);
      
      doc.setDrawColor(gold);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(gold);
      doc.text("FIRMAS DE CONFORMIDAD", margin, y);
      y += 20;

      const sigW = 50; 
      const sigH = 30;

      // Tech Seal
      try {
          doc.addImage(seal, "PNG", margin + 10, y, sigW, sigH);
          doc.text("SELLO TÉCNICO", margin + 15, y + sigH + 5);
      } catch(e) {}

      // Client Sig
      const clientSigSrc = document.getElementById("reportClientSignature")?.src;
      if (clientSigSrc && clientSigSrc.startsWith("data:")) {
          const cX = pageWidth - margin - sigW - 20;
          doc.addImage(clientSigSrc, "PNG", cX, y, sigW, sigH);
          doc.text("FIRMA CLIENTE", cX + 10, y + sigH + 5);
      }

      addPageFooter(doc, 2);

      if (asBlob) {
        resolve(doc.output("blob"));
      } else {
        doc.save(`Informe_${clientName.replace(/\s+/g,"_")}.pdf`);
        resolve();
      }
    }

    function addPageHeader(doc, title) {
      doc.setFillColor(darkGray);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setFillColor(gold);
      doc.rect(0, 0, pageWidth, 3, "F");
      try { doc.addImage(logo, "PNG", margin, 7, 20, 20); } catch (e) {}
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(white);
      doc.text(title, 55, 18);
    }

    function addPageFooter(doc, pageNum) {
      doc.setDrawColor(gold);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor("#888888");
      doc.text(`Seguridad 24/7 Ecuador - Informe Técnico`, pageWidth / 2, pageHeight - 10, { align: "center" });
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

    const waWindow = window.open(waUrl, "_blank");
    
    // Check if pop-up was blocked
    if (!waWindow || waWindow.closed || typeof waWindow.closed === 'undefined') {
      Swal.fire({
        icon: "info",
        title: "¡Reporte Listo!",
        html: `Se ha descargado el informe.<br><br><b>El navegador bloqueó la ventana de WhatsApp.</b><br>Haga clic abajo para abrirlo manualmente:`,
        showCancelButton: true,
        confirmButtonText: '<i class="fa-brands fa-whatsapp"></i> Abrir WhatsApp',
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
        html: `El informe se ha descargado en su dispositivo.<br><br><b>Por favor, adjúntelo manualmente</b> en el chat de WhatsApp que se acaba de abrir.`,
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
    });
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Export functions
window.generateModernPDF = generateModernPDF;
window.sendModernPDF = sendModernPDF;
