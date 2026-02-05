// Modern PDF Generator for Technical Reports
// Seguridad 24/7 Ecuador - Department Técnico
// FORMATO APA 7ma EDICIÓN - SIN AMONTONAMIENTO

function generateModernPDF(asBlob = false) {
  return new Promise((resolve, reject) => {
    const { jsPDF } = window.jspdf;
    // Usamos puntos (pt) para mayor precisión con formato APA (72pt = 1 pulgada)
    const doc = new jsPDF('p', 'pt', 'a4');

    // Colors
    const gold = "#d4af37";
    const darkGray = "#1a1a1a";
    const lightGray = "#f5f5f5";
    const white = "#ffffff";

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 72; // 2.54 cm exactos (1 pulgada)
    const contentWidth = pageWidth - margin * 2;

    // Load assets
    const logo = new Image();
    const seal = new Image();
    logo.src = "assets/img/logo.png";
    seal.src = "assets/img/sello.png";

    // Data Sources
    const reportInitial = document.getElementById("reportInitial")?.value || "";
    const reportFinal = document.getElementById("reportFinal")?.value || "";
    
    let initialText = reportInitial;
    let finalText = reportFinal;

    // Images
    const imgJobDesc = document.getElementById("displayJobImage"); 
    const imgInit1 = document.getElementById("imgInitial1");
    const imgInit2 = document.getElementById("imgInitial2");
    const imgFinal1 = document.getElementById("imgFinal1");
    const imgFinal2 = document.getElementById("imgFinal2");

    let totalImagesToLoad = 2; // logo + seal
    const imagesToProcess = [];

    const queueImage = (imgElement) => {
      if (imgElement && imgElement.src && (imgElement.src.startsWith("data:") || imgElement.src.startsWith("http"))) {
        totalImagesToLoad++;
        const img = new Image();
        img.crossOrigin = "Anonymous";
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
    
    if (totalImagesToLoad === 2 && logo.complete && seal.complete) {
        buildPDF(resolve);
    }

    imagesToProcess.forEach(img => {
        img.onload = checkImages;
        img.onerror = checkImages;
    });

    function buildPDF(resolve) {
      // PAGE 1: COVER PAGE
      doc.setFillColor(darkGray);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setFillColor(gold);
      doc.rect(0, 0, pageWidth, 10, "F");
      doc.rect(0, pageHeight - 10, pageWidth, 10, "F");

      try {
        const logoSize = 100;
        doc.addImage(logo, "PNG", (pageWidth - logoSize) / 2, 80, logoSize, logoSize);
      } catch (e) {}

      doc.setFont("times", "bold");
      doc.setFontSize(32);
      doc.setTextColor(gold);
      doc.text("SEGURIDAD 24/7", pageWidth / 2, 220, { align: "center" });

      doc.setFontSize(18);
      doc.setTextColor(white);
      doc.text("ECUADOR", pageWidth / 2, 245, { align: "center" });

      doc.setDrawColor(gold);
      doc.setLineWidth(2);
      doc.line(margin + 50, 270, pageWidth - margin - 50, 270);

      doc.setFontSize(26);
      doc.setTextColor(white);
      doc.text("INFORME TÉCNICO", pageWidth / 2, 310, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor("#aaaaaa");
      doc.text("DEPARTAMENTO TÉCNICO", pageWidth / 2, 340, { align: "center" });

      // Client Box
      doc.setFillColor("#222222");
      doc.roundedRect(margin, 450, contentWidth, 120, 10, 10, "F");

      const clientName = document.getElementById("reportClientName")?.innerText || "Cliente Final";
      
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.setTextColor(gold);
      doc.text("CLIENTE:", margin + 30, 490);
      doc.setFont("times", "normal");
      doc.setTextColor(white);
      doc.text(clientName, margin + 30, 510);

      doc.setFont("times", "bold");
      doc.text("FECHA:", margin + 30, 540);
      doc.setFont("times", "normal");
      const today = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
      doc.text(today, margin + 30, 560);

      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.setTextColor("#777777");
      doc.text("Documento Oficial de Seguridad 24/7 Ecuador", pageWidth / 2, pageHeight - 40, { align: "center" });

      // PAGE 2 AND BEYOND
      doc.addPage();
      let y = 80;

      const checkPageBreak = (heightNeeded) => {
        if (y + heightNeeded > pageHeight - 80) {
            doc.addPage();
            addPageHeader(doc, "INFORME TÉCNICO (Continuación)");
            y = 100;
        }
      };

      const addPageHeader = (doc, title) => {
          doc.setFillColor(darkGray);
          doc.rect(0, 0, pageWidth, 70, "F");
          doc.setFillColor(gold);
          doc.rect(0, 0, pageWidth, 5, "F");
          try { doc.addImage(logo, "PNG", margin, 15, 40, 40); } catch (e) {}
          doc.setFont("times", "bold");
          doc.setFontSize(16);
          doc.setTextColor(white);
          doc.text(title, 130, 45);
      };

      const addPageFooter = (doc) => {
          const totalPages = doc.internal.getNumberOfPages();
          for (let i = 2; i <= totalPages; i++) {
              doc.setPage(i);
              doc.setDrawColor(gold);
              doc.setLineWidth(1);
              doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);
              doc.setFont("times", "italic");
              doc.setFontSize(9);
              doc.setTextColor("#666666");
              doc.text(`Página ${i-1} de ${totalPages-1}`, pageWidth - margin, pageHeight - 25, { align: "right" });
              doc.text(`Seguridad 24/7 Ecuador - Informe Técnico Profesional`, margin, pageHeight - 25);
          }
      };

      const addSectionTitle = (title, color = gold) => {
          checkPageBreak(50);
          doc.setFont("times", "bold");
          doc.setFontSize(14);
          doc.setTextColor(color);
          doc.text(title.toUpperCase(), margin, y);
          doc.setDrawColor(color);
          doc.setLineWidth(1.5);
          doc.line(margin, y + 5, pageWidth - margin, y + 5);
          y += 35;
      };

      const addParagraph = (text) => {
          doc.setFont("times", "normal");
          doc.setFontSize(12);
          doc.setTextColor(darkGray);
          const lines = doc.splitTextToSize(text || "Sin información registrada para este apartado.", contentWidth);
          // APA 7: Doble espacio (lineHeight = 2.0 * fontSize)
          const lineHeight = 24; 
          checkPageBreak(lines.length * lineHeight + 30);
          doc.text(lines, margin, y, { align: "justify" });
          y += lines.length * lineHeight + 20;
      };

      const addImages = (img1, img2) => {
          if (!img1 && !img2) return;
          const imgH = 180;
          const imgW = (contentWidth - 20) / 2;
          
          checkPageBreak(imgH + 40);
          
          if (img1) {
              try { doc.addImage(img1, "JPEG", margin, y, imgW, imgH); } catch(e) {}
          }
          if (img2) {
              try { doc.addImage(img2, "JPEG", margin + imgW + 20, y, imgW, imgH); } catch(e) {}
          }
          y += imgH + 30;
      };

      addPageHeader(doc, "INFORME TÉCNICO");

      // 1. DESCRIPCIÓN DEL REQUERIMIENTO
      addSectionTitle("1. Descripción del Requerimiento");
      const jobDesc = document.getElementById("reportJobDescription")?.value || "Mantenimiento Preventivo / Correctivo de Sistemas de Seguridad.";
      addParagraph(jobDesc);
      if (jobImgObj) {
          checkPageBreak(220);
          try { 
            doc.addImage(jobImgObj, "JPEG", margin + (contentWidth - 250)/2, y, 250, 200); 
            y += 220;
          } catch(e) {}
      }

      // 2. PROBLEMA ENCONTRADO (PAGE BREAK)
      doc.addPage();
      addPageHeader(doc, "INFORME TÉCNICO (Continuación)");
      y = 100;
      addSectionTitle("2. Problema Encontrado");
      addParagraph(initialText);
      addImages(pImg1, pImg2);

      // 3. SOLUCIÓN IMPLEMENTADA
      doc.addPage();
      addPageHeader(doc, "INFORME TÉCNICO (Continuación)");
      y = 100;
      addSectionTitle("3. Solución Implementada");
      addParagraph(finalText);
      addImages(sImg1, sImg2);

      // 4. FIRMAS
      checkPageBreak(150);
      addSectionTitle("4. Firmas de Conformidad");
      y += 20;
      
      const sigW = 180;
      const sigX = margin + (contentWidth - sigW) / 2;

      const clientSignature = document.getElementById("reportClientSignature");
      if (clientSignature && clientSignature.src && clientSignature.src.length > 100) {
          try {
              doc.addImage(clientSignature.src, "PNG", sigX, y, sigW, 80);
          } catch (e) {}
      }
      
      doc.setDrawColor(0);
      doc.setLineWidth(1);
      doc.line(sigX, y + 85, sigX + sigW, y + 85);
      
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(darkGray);
      doc.text(clientName, pageWidth / 2, y + 105, { align: "center" });
      doc.setFont("times", "normal");
      doc.text("Firma del Cliente / Representante", pageWidth / 2, y + 120, { align: "center" });

      try {
          doc.addImage(seal, "PNG", pageWidth - margin - 120, y + 50, 100, 100);
      } catch (e) {}

      addPageFooter(doc);

      if (asBlob) {
        resolve(doc.output("blob"));
      } else {
        const nameClean = clientName.replace(/\s+/g, '_');
        doc.save(`Informe_Tecnico_${nameClean}.pdf`);
        resolve();
      }
    }
  });
}

window.generateModernPDF = generateModernPDF;

window.sendModernPDF = async () => {
  try {
    Swal.fire({
      title: "Preparando Envío...",
      text: "Generando documento en formato APA 7 y configurando WhatsApp.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const pdfBlob = await generateModernPDF(true);
    const clientName = document.getElementById("reportClientName")?.innerText || "Cliente";
    const reportStatus = document.getElementById("reportStatus")?.innerText || "Finalizado";
    const reportDate = document.getElementById("reportDate")?.innerText || new Date().toLocaleDateString();

    const fileName = `Informe_Tecnico_${clientName.replace(/\s+/g, "_")}.pdf`;
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });

    const message = `*INFORME TÉCNICO - SEGURIDAD 24/7 ECUADOR*\n\n` +
                    `Hola, adjuntamos el informe técnico de su requerimiento.\n\n` +
                    `👤 *Cliente:* ${clientName}\n` +
                    `📅 *Fecha:* ${reportDate}\n` +
                    `✅ *Estado:* ${reportStatus}\n\n` +
                    `El documento ha sido generado siguiendo normas profesionales APA 7 para su debida revisión.`;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "Informe Técnico Seguridad 24/7",
        text: message,
      });
      Swal.close();
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      const waWindow = window.open(waUrl, "_blank");
      
      if (!waWindow || waWindow.closed || typeof waWindow.closed === "undefined") {
        Swal.fire({
          icon: "info",
          title: "Envío Manual",
          html: `No se pudo abrir WhatsApp automáticamente.<br><br><b>Haz clic abajo para enviar el link:</b>`,
          showCancelButton: true,
          confirmButtonText: '<i class="fa-brands fa-whatsapp"></i> Abrir WhatsApp',
          confirmButtonColor: "#25d366",
        }).then((result) => {
          if (result.isConfirmed) {
            window.open(waUrl, "_blank");
          }
        });
      } else {
          Swal.fire({
              icon: "success",
              title: "WhatsApp Abierto",
              text: "Hemos abierto WhatsApp con la descripción. Por favor adjunta el archivo PDF descargado.",
              confirmButtonColor: "#d4af37"
          });
      }
    }
  } catch (error) {
    console.error("Error al enviar PDF:", error);
    Swal.fire("Error", "No se pudo completar el envío.", "error");
  }
};
