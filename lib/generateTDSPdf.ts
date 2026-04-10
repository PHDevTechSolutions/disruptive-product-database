type TechSpec = {
  title: string;
  specs: { specId: string; value: string }[];
};

type Params = {
  jsPDF: any;
  autoTable: any;
  brand: string;
  productName: string;
  itemCode: string;
  mainImage?: { url: string } | null;
  technicalSpecifications?: TechSpec[] | null;
  dimensionalDrawing?: File | { url: string } | null;
  illuminanceDrawing?: File | { url: string } | null;
  hideEmptySpecs?: boolean;
};

function convertDriveToThumbnail(url: string) {
  const cleaned = cleanImageUrl(url);
  if (!cleaned) return "";
  if (!cleaned.includes("drive.google.com")) return cleaned;
  const matchByPath = cleaned.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const matchByQuery = cleaned.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const fileId = matchByPath?.[1] || matchByQuery?.[1] || "";
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  return cleaned;
}

function cleanImageUrl(url?: string | null) {
  if (!url) return "";
  const trimmed = String(url).trim();
  const unwrapped = trimmed.replace(/^[`"' ]+|[`"' ]+$/g, "");
  return unwrapped.trim();
}

function resolveDrawingSource(source?: File | { url: string } | null): File | string | null {
  if (!source) return null;
  if (source instanceof File) return source;
  const cleaned = cleanImageUrl(source.url);
  return cleaned || null;
}

async function toBase64(src: string | File): Promise<string> {
  if (src instanceof File) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(src);
    });
  }
  const cleaned = cleanImageUrl(src);
  if (!cleaned) throw new Error("Invalid image URL");
  const converted = convertDriveToThumbnail(cleaned);
  const proxyUrl = `/api/gdrive-image?url=${encodeURIComponent(converted)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error("Failed to load image");
  const blob = await response.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

export async function generateTDSPdf({
  jsPDF,
  autoTable,
  brand,
  productName,
  itemCode,
  mainImage,
  technicalSpecifications,
  dimensionalDrawing,
  illuminanceDrawing,
  hideEmptySpecs = true,
}: Params) {
  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const headerHeight = 100;
  const footerHeight = 30;
  let y = headerHeight + 20;

  // ── Header ──
  const brandLower = brand.toLowerCase();
  pdf.addImage(`/${brandLower}-header.png`, "PNG", 0, 0, pageWidth, headerHeight);

  // ── Product image ──
  const boxWidth = 150, boxHeight = 120;
  const imageX = pageWidth / 2 - boxWidth - 60;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(1.5);
  pdf.rect(imageX, y, boxWidth, boxHeight);

  const normalizedMainImageUrl = cleanImageUrl(mainImage?.url);
  if (normalizedMainImageUrl) {
    try {
      const imgData = await toBase64(normalizedMainImageUrl);
      const img = new Image();
      img.src = imgData;
      await new Promise((r) => { img.onload = r; });
      const pad = 10;
      const ratio = Math.min((boxWidth - pad * 2) / img.width, (boxHeight - pad * 2) / img.height);
      const fw = img.width * ratio, fh = img.height * ratio;
      pdf.addImage(imgData, "PNG", imageX + (boxWidth - fw) / 2, y + (boxHeight - fh) / 2, fw, fh);
    } catch {}
  }

  // ── Title ──
  const textColumnX = imageX + boxWidth + 60;
  const textColumnWidth = boxWidth + 40;
  const title = productName || "Product Name";
  let titleFontSize = 24;
  let titleLines: string[] = [];
  while (true) {
    pdf.setFontSize(titleFontSize);
    titleLines = pdf.splitTextToSize(title, textColumnWidth);
    if (titleLines.length <= 2) break;
    titleFontSize -= 1;
    if (titleFontSize <= 12) break;
  }
  const lineY   = y + boxHeight - 20;
  const titleY  = lineY - titleLines.length * 14 - 4;
  const centerX = textColumnX + textColumnWidth / 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(titleFontSize);
  pdf.text(titleLines, centerX, titleY, { maxWidth: textColumnWidth, align: "center" });
  const uw = textColumnWidth * 1.25;
  pdf.setLineWidth(0.8);
  pdf.line(centerX - uw / 2, lineY, centerX + uw / 2, lineY);

  // ── Table ──
  y += 135;
  const activeFilters: string[] = (window as any).__ACTIVE_FILTERS__ || [];

  const tableRows: any[] = [
    ["Brand :", { content: brand.toUpperCase(), styles: { fontStyle: "bold" } }],
    ["Item Code :", itemCode],
  ];

  (technicalSpecifications || [])
    .filter((g) => g.title !== "COMMERCIAL DETAILS")
    .forEach((group) => {
      const specs = hideEmptySpecs
        ? group.specs.filter((s) => s.value?.trim())
        : group.specs;
      if (hideEmptySpecs && !specs.length) return;
      tableRows.push([{ content: group.title, colSpan: 2, styles: { fillColor: [210, 215, 220], fontStyle: "bold" } }]);
      specs.forEach((spec) => {
        const raw   = spec.value || "";
        const vals  = raw.split("|").map((v) => v.trim()).filter(Boolean);
        const unique = Array.from(new Set(vals));
        let display = unique.join(" | ");
        if (activeFilters.length) {
          const filtered = unique.filter((v) => activeFilters.includes(v));
          if (filtered.length) display = filtered.join(" | ");
        }
        tableRows.push([spec.specId ? `${spec.specId} :` : "", display || ""]);
      });
    });

  const tableWidth = 450;
  const tableX = (pageWidth - tableWidth) / 2;

  const DRAWING_BLOCK_HEIGHT = 230;
  const FOOTER_REAL_HEIGHT   = 90;
  const SAFE_MARGIN          = 20;
  const maxTableHeight = pageHeight - FOOTER_REAL_HEIGHT - DRAWING_BLOCK_HEIGHT - SAFE_MARGIN - y;

  let fontSize = 11;
  while (fontSize > 6) {
    const test = new jsPDF("p", "pt", "a4");
    autoTable(test, { startY: y, theme: "grid", styles: { fontSize, cellPadding: 2 }, body: tableRows, tableWidth: 450, pageBreak: "avoid" });
    if ((test as any).lastAutoTable.finalY - y <= maxTableHeight) break;
    fontSize -= 0.4;
  }

  autoTable(pdf, {
    startY: y, theme: "grid", pageBreak: "avoid",
    tableWidth, margin: { left: tableX },
    styles: { fontSize, cellPadding: 2, overflow: "linebreak" },
    body: tableRows,
    columnStyles: { 0: { cellWidth: 230 }, 1: { cellWidth: 220 } },
  });

  // ── Drawings ──
  const dimensionalSource = resolveDrawingSource(dimensionalDrawing);
  const illuminanceSource = resolveDrawingSource(illuminanceDrawing);

  // Only show drawings section if at least one exists
  if (dimensionalSource || illuminanceSource) {
    const tableEndY  = (pdf as any).lastAutoTable.finalY;
    const drawingY   = tableEndY + 35;
    const drawingW   = 190, drawingH = 95;
    const gapBetween = 60;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");

    const hasBoth = dimensionalSource && illuminanceSource;

    if (hasBoth) {
      // Side by side
      const totalW = drawingW * 2 + gapBetween;
      const startX = (pageWidth - totalW) / 2;

      pdf.text("Dimensional Drawing",  startX + drawingW / 2,                     drawingY - 10, { align: "center" });
      pdf.text("Illuminance Level",    startX + drawingW + gapBetween + drawingW / 2, drawingY - 10, { align: "center" });

      try {
        const img = await toBase64(dimensionalSource);
        pdf.addImage(img, "PNG", startX, drawingY, drawingW, drawingH);
      } catch {}

      try {
        const img = await toBase64(illuminanceSource);
        pdf.addImage(img, "PNG", startX + drawingW + gapBetween, drawingY, drawingW, drawingH);
      } catch {}
    } else if (dimensionalSource) {
      // Only dimensional - center it
      const startX = (pageWidth - drawingW) / 2;
      pdf.text("Dimensional Drawing", startX + drawingW / 2, drawingY - 10, { align: "center" });

      try {
        const img = await toBase64(dimensionalSource);
        pdf.addImage(img, "PNG", startX, drawingY, drawingW, drawingH);
      } catch {}
    } else {
      // Only illuminance - center it
      const startX = (pageWidth - drawingW) / 2;
      pdf.text("Illuminance Level", startX + drawingW / 2, drawingY - 10, { align: "center" });

      try {
        const img = await toBase64(illuminanceSource!);
        pdf.addImage(img, "PNG", startX, drawingY, drawingW, drawingH);
      } catch {}
    }
  }

  // ── Footer ──
  try {
    const footerImg = new Image();
    footerImg.src = `/${brandLower}-footer.png`;
    await new Promise((r) => { footerImg.onload = r; });
    const ratio = pageWidth / footerImg.width;
    const fh = footerImg.height * ratio;
    pdf.addImage(`/${brandLower}-footer.png`, "PNG", 0, pageHeight - fh, pageWidth, fh);
  } catch {}

  pdf.save(`${productName || "Product"}-${itemCode || "Item"}-TDS.pdf`);
}