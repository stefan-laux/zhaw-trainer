import { jsPDF } from "jspdf";

export interface PdfOption {
  label: string;
  text: string;
}
export interface PdfQuestion {
  number: number;
  type: string;
  title?: string;
  scenario?: string;
  prompt: string;
  options: PdfOption[];
  points: number;
}

export interface PdfExamInput {
  subjectName: string;
  label: string;
  minutes: number;
  questions: PdfQuestion[];
  date?: string;
}

const GOLD: [number, number, number] = [154, 123, 66];
const INK: [number, number, number] = [20, 26, 38];

export function generateExamPdf(input: PdfExamInput): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 44;
  let y = M;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };
  const text = (txt: string, size: number, style: "normal" | "bold" | "italic" = "normal", color = INK, x = M, maxW = W - 2 * M) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(txt, maxW);
    for (const l of lines) {
      newPageIfNeeded(size * 1.35);
      doc.text(l, x, y);
      y += size * 1.35;
    }
  };

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, W, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ZHAW Trainer", M, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${input.subjectName} · ${input.label}`, M, 48);
  doc.setFontSize(10);
  doc.text(`Dauer: ${input.minutes} Min`, W - M, 30, { align: "right" });
  doc.text(`Datum: ${input.date ?? new Date().toLocaleDateString("de-CH")}`, W - M, 46, { align: "right" });
  y = 96;

  text("Name: ______________________________    Punkte: ______ / ______", 11, "normal", GOLD);
  y += 4;
  text(
    "Anleitung: Kreuze bei jeder Frage die zutreffenden Optionen im Kästchen an (mehrere möglich). " +
      "Bei offenen Aufgaben schreibe die Antwort in die Zeilen. Danach die Seiten fotografieren/scannen und in der App hochladen.",
    9,
    "italic",
    [90, 100, 115]
  );
  y += 8;

  // Questions
  input.questions.forEach((q, idx) => {
    newPageIfNeeded(70);
    text(`${idx + 1}.  ${q.title || q.prompt.slice(0, 70)}`, 12, "bold", [30, 58, 95]);
    text(`(${q.points} P)${q.type === "open" ? " · offen" : q.type === "single" || q.type === "truefalse" ? " · genau eine Antwort" : " · Mehrfachauswahl"}`, 8.5, "normal", [120, 130, 145]);
    if (q.scenario) {
      y += 2;
      text(q.scenario, 10, "normal", [60, 66, 80]);
    }
    if (q.prompt) {
      y += 2;
      text(q.prompt, 10.5, "normal", INK);
    }
    y += 4;

    if (q.type === "open") {
      doc.setDrawColor(200, 205, 215);
      for (let i = 0; i < 6; i++) {
        newPageIfNeeded(22);
        doc.line(M, y + 10, W - M, y + 10);
        y += 22;
      }
    } else {
      q.options.forEach((o) => {
        newPageIfNeeded(24);
        const boxX = M + 4;
        doc.setDrawColor(120, 130, 145);
        doc.setLineWidth(0.8);
        doc.rect(boxX, y - 9, 11, 11);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(60, 70, 90);
        doc.text(`${o.label})`, boxX + 18, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(INK[0], INK[1], INK[2]);
        const lines = doc.splitTextToSize(o.text, W - 2 * M - 42);
        lines.forEach((l: string, li: number) => {
          if (li > 0) newPageIfNeeded(14);
          doc.text(l, boxX + 34, y);
          if (li < lines.length - 1) y += 14;
        });
        y += 20;
      });
    }
    y += 8;
    newPageIfNeeded(1);
  });

  // Answer sheet
  doc.addPage();
  y = M;
  text("Antwortblatt (zum Abgleich)", 14, "bold", [30, 58, 95]);
  text("Trage hier nochmals deine gewählten Buchstaben ein (z.B. A C).", 9, "italic", [90, 100, 115]);
  y += 8;
  const cols = 3;
  const colW = (W - 2 * M) / cols;
  const rows = Math.ceil(input.questions.length / cols);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (let r = 0; r < rows; r++) {
    newPageIfNeeded(26);
    for (let c = 0; c < cols; c++) {
      const qi = r + c * rows;
      if (qi >= input.questions.length) continue;
      const x = M + c * colW;
      const yy = y;
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(`${qi + 1}.`, x, yy);
      doc.setDrawColor(180, 186, 196);
      doc.rect(x + 22, yy - 11, 70, 15);
    }
    y += 26;
  }

  return doc.output("blob");
}

export function downloadExamPdf(input: PdfExamInput) {
  const blob = generateExamPdf(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(input.subjectName)}_${slug(input.label)}_Probepruefung.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function slug(s: string) {
  return s.normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");
}

function downscale(dataUrl: string, maxDim = 1700, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function filesToImages(files: File[], onProgress?: (done: number, total: number) => void): Promise<string[]> {
  const out: string[] = [];
  let total = files.length;
  let done = 0;
  for (const file of files) {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      total += pdf.numPages - 1;
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport } as never).promise;
        const jpg = await downscale(canvas.toDataURL("image/jpeg", 0.9));
        out.push(jpg);
        done += 1;
        onProgress?.(done, total);
      }
    } else {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.readAsDataURL(file);
      });
      out.push(await downscale(dataUrl));
      done += 1;
      onProgress?.(done, total);
    }
  }
  return out;
}
