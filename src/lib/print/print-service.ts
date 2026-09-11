/**
 * Isolated Iframe Print Service
 * Solusi cetak terisolasi untuk memastikan hasil cetak tepat 1 lembar (single sheet),
 * bersih dari elemen UI modal (header, tombol close, tombol cetak), dan kompatibel
 * dengan printer thermal (58mm/80mm) maupun dokumen format A4.
 */

export interface PrintOptions {
  title?: string;
  pageType?: "thermal" | "a4" | "card" | "auto";
  customCss?: string;
}

export function printHtmlElement(
  element: HTMLElement | null,
  options: PrintOptions = {}
): void {
  if (typeof window === "undefined") return;

  if (!element) {
    console.warn("[PrintService] Target element is null or undefined.");
    return;
  }

  const {
    title = "Dokumen Medis",
    pageType = "auto",
    customCss = "",
  } = options;

  // 1. Bersihkan iframe print lama jika ada
  const iframeId = "med_isolated_print_frame";
  const oldIframe = document.getElementById(iframeId);
  if (oldIframe) {
    oldIframe.remove();
  }

  // 2. Buat iframe tersembunyi dengan layout penuh agar render engine browser merender isi
  const iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "100vw";
  iframe.style.height = "100vh";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-99999";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error("[PrintService] Gagal mengakses iframe document.");
    return;
  }

  // 3. Kumpulkan seluruh stylesheet & style tags dari dokumen utama
  const stylesList: string[] = [];
  document.querySelectorAll("link[rel='stylesheet'], style").forEach((node) => {
    stylesList.push(node.outerHTML);
  });

  // 4. Konfigurasi aturan kertas sesuai format
  let pageCss = "@page { size: auto; margin: 5mm; }";
  let containerMaxWidth = "100%";

  if (pageType === "thermal") {
    // Standard 80mm / 58mm POS thermal receipt configuration
    pageCss = "@page { size: 80mm auto; margin: 2mm 3mm; }";
    containerMaxWidth = "74mm";
  } else if (pageType === "card") {
    // ID Card / Label sticker configuration
    pageCss = "@page { size: auto; margin: 4mm 5mm; }";
    containerMaxWidth = "130mm";
  } else if (pageType === "a4") {
    // Formal A4 medical summary / prescription
    pageCss = "@page { size: A4 portrait; margin: 8mm 10mm; }";
    containerMaxWidth = "100%";
  }

  // 5. Tulis HTML mandiri ke dalam iframe
  iframeDoc.open();
  const htmlContent = [
    "<!DOCTYPE html>",
    '<html lang="id">',
    "  <head>",
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <title>${title}</title>`,
    stylesList.join("\n"),
    "    <style>",
    `      ${pageCss}`,
    "",
    "      *, *::before, *::after {",
    "        box-sizing: border-box;",
    "        -webkit-print-color-adjust: exact !important;",
    "        print-color-adjust: exact !important;",
    "      }",
    "",
    "      html, body {",
    "        display: block !important;",
    "        visibility: visible !important;",
    "        margin: 0 !important;",
    "        padding: 0 !important;",
    "        background: #ffffff !important;",
    "        color: #0f172a !important;",
    "        width: 100% !important;",
    "        height: auto !important;",
    "        min-height: auto !important;",
    "        overflow: visible !important;",
    "      }",
    "",
    "      body {",
    "        display: flex !important;",
    "        flex-direction: column !important;",
    "        align-items: center !important;",
    "        justify-content: flex-start !important;",
    "        background: #ffffff !important;",
    "      }",
    "",
    "      .print-container {",
    "        display: block !important;",
    "        visibility: visible !important;",
    "        width: 100% !important;",
    `        max-width: ${containerMaxWidth} !important;`,
    "        margin: 0 auto !important;",
    "        padding: 0 !important;",
    "        page-break-inside: avoid !important;",
    "        break-inside: avoid !important;",
    "        background: #ffffff !important;",
    "        color: #0f172a !important;",
    "      }",
    "",
    "      .printable-area {",
    "        display: block !important;",
    "        visibility: visible !important;",
    "        overflow: visible !important;",
    "        max-height: none !important;",
    "        height: auto !important;",
    "        width: 100% !important;",
    "        margin: 0 auto !important;",
    "        page-break-inside: avoid !important;",
    "        break-inside: avoid !important;",
    "      }",
    "",
    "      .print-container *,",
    "      .printable-area * {",
    "        visibility: visible !important;",
    "      }",
    "",
    "      .no-print, button {",
    "        display: none !important;",
    "      }",
    "",
    `      ${customCss}`,
    "    </style>",
    "  </head>",
    "  <body>",
    '    <div class="print-container">',
    element.outerHTML,
    "    </div>",
    "  </body>",
    "</html>",
  ].join("\n");

  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // 6. Jalankan print dialog setelah dokumen siap
  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("[PrintService] Error executing print command:", err);
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 3000);
    }
  };

  // Berikan jeda rendering pendek untuk memuat font dan stylesheet
  setTimeout(triggerPrint, 250);
}
