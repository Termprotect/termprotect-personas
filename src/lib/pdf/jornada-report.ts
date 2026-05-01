// Usamos el build "standalone" de pdfkit, que tiene las fuentes embebidas
// como base64 y no depende de lectura de archivos .afm en disco.
// Esto evita errores ENOENT en entornos serverless (Vercel, etc.).
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { formatMinutes, formatTime, workedMinutes } from "@/lib/time";

type Entry = {
  id: string;
  date: Date;
  clockIn: Date;
  clockOut: Date | null;
  breakMinutes: number;
  breakStartedAt: Date | null;
  source: "WEB" | "MOBILE" | "MANUAL";
  isManual: boolean;
  manualReason: string | null;
};

type Holiday = { date: Date; description: string };

export type JornadaReportInput = {
  empresa: {
    nombre: string;
    cif?: string | null;
  };
  empleado: {
    nombres: string;
    apellidos: string;
    documentType: string;
    documentNumber: string;
    sedeName: string;
    position: string | null;
    socialSecurityNumber: string | null;
  };
  monthLabel: string;
  monthRange: { start: Date; end: Date };
  entries: Entry[];
  holidays: Holiday[];
  generatedBy: string;
  generatedAt: Date;
};

const COL = {
  fecha: 60,
  entrada: 170,
  salida: 230,
  pausa: 290,
  trabajado: 360,
  origen: 450,
  end: 535,
};

const ROW_HEIGHT = 18;

// Genera el PDF como Buffer. runtime: nodejs (pdfkit no funciona en edge)
export async function buildJornadaReport(
  input: JornadaReportInput
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Registro de jornada — ${input.empleado.apellidos}, ${input.empleado.nombres} — ${input.monthLabel}`,
          Author: input.empresa.nombre,
          Subject: "Registro de jornada laboral",
          Keywords: "registro jornada inspección trabajo",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Cabecera ──────────────────────────────
      drawHeader(doc, input);

      // ── Tabla de fichajes ─────────────────────
      drawTable(doc, input);

      // ── Totales y firmas ──────────────────────
      drawFooter(doc, input);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawHeader(doc: PDFKit.PDFDocument, input: JornadaReportInput) {
  doc
    .fontSize(14)
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .text(input.empresa.nombre.toUpperCase(), { align: "left" });

  if (input.empresa.cif) {
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#64748b")
      .text(`CIF: ${input.empresa.cif}`);
  }

  doc.moveDown(0.5);

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor("#0f172a")
    .text("Registro diario de jornada", { align: "left" });

  doc
    .fontSize(9)
    .font("Helvetica-Oblique")
    .fillColor("#64748b")
    .text(
      "Art. 34.9 del Estatuto de los Trabajadores · RDL 8/2019 · Ley de Registro de Jornada"
    );

  doc.moveDown(1);

  // Datos del empleado en caja
  const y0 = doc.y;
  doc
    .rect(40, y0, 515, 70)
    .fillAndStroke("#f8fafc", "#e2e8f0")
    .fillColor("#0f172a");

  doc.fontSize(9).font("Helvetica-Bold").fillColor("#475569");
  const labelX = 52;
  const valueX = 165;
  const labelX2 = 310;
  const valueX2 = 410;
  let ty = y0 + 10;

  const rowH = 15;

  doc.text("Trabajador:", labelX, ty);
  doc
    .font("Helvetica")
    .fillColor("#0f172a")
    .text(
      `${input.empleado.apellidos}, ${input.empleado.nombres}`,
      valueX,
      ty,
      { width: 140 }
    );
  doc.font("Helvetica-Bold").fillColor("#475569").text("Sede:", labelX2, ty);
  doc
    .font("Helvetica")
    .fillColor("#0f172a")
    .text(input.empleado.sedeName, valueX2, ty, { width: 140 });

  ty += rowH;
  doc.font("Helvetica-Bold").fillColor("#475569").text("Documento:", labelX, ty);
  doc
    .font("Helvetica")
    .fillColor("#0f172a")
    .text(
      `${input.empleado.documentType} ${input.empleado.documentNumber}`,
      valueX,
      ty,
      { width: 140 }
    );
  doc.font("Helvetica-Bold").fillColor("#475569").text("NAF:", labelX2, ty);
  doc
    .font("Helvetica")
    .fillColor("#0f172a")
    .text(input.empleado.socialSecurityNumber ?? "—", valueX2, ty);

  ty += rowH;
  doc.font("Helvetica-Bold").fillColor("#475569").text("Puesto:", labelX, ty);
  doc
    .font("Helvetica")
    .fillColor("#0f172a")
    .text(input.empleado.position ?? "—", valueX, ty, { width: 140 });
  doc.font("Helvetica-Bold").fillColor("#475569").text("Periodo:", labelX2, ty);
  doc
    .font("Helvetica")
    .fillColor("#0f172a")
    .text(capitalize(input.monthLabel), valueX2, ty, { width: 140 });

  doc.y = y0 + 80;
  doc.moveDown(0.5);
}

function drawTable(doc: PDFKit.PDFDocument, input: JornadaReportInput) {
  // Construir filas día a día
  const byDate = new Map<string, Entry>();
  for (const e of input.entries) byDate.set(toIso(e.date), e);

  const holidayByDate = new Map<string, Holiday>();
  for (const h of input.holidays) holidayByDate.set(toIso(h.date), h);

  drawTableHeader(doc);

  const now = new Date();
  let totalWorked = 0;
  let totalBreak = 0;
  let daysWorked = 0;

  for (
    const cursor = new Date(input.monthRange.start);
    cursor < input.monthRange.end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    if (doc.y > 760) {
      doc.addPage();
      drawTableHeader(doc);
    }

    const iso = toIso(cursor);
    const entry = byDate.get(iso);
    const holiday = holidayByDate.get(iso);
    const dow = cursor.getDay();
    const isWeekend = dow === 0 || dow === 6;

    drawRow(doc, {
      label: formatDateLong(new Date(cursor)),
      clockIn: entry ? formatTime(entry.clockIn) : "—",
      clockOut: entry?.clockOut ? formatTime(entry.clockOut) : "—",
      pausa:
        entry && entry.breakMinutes > 0
          ? formatMinutes(entry.breakMinutes)
          : "—",
      trabajado:
        entry && entry.clockOut
          ? formatMinutes(workedMinutes(entry, now))
          : "—",
      origen: entry
        ? entry.isManual
          ? "Manual"
          : entry.source === "MOBILE"
            ? "Móvil"
            : "Web"
        : "—",
      holiday: holiday?.description ?? null,
      isWeekend,
    });

    if (entry && entry.clockOut) {
      totalWorked += workedMinutes(entry, now);
      daysWorked += 1;
    }
    if (entry) totalBreak += entry.breakMinutes;
  }

  doc.moveDown(0.5);

  // Línea resumen
  const yTotals = doc.y;
  doc.rect(40, yTotals, 515, 28).fillAndStroke("#f1f5f9", "#cbd5e1");
  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("TOTALES DEL PERIODO", 50, yTotals + 6);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#475569")
    .text(
      `Días fichados: ${daysWorked}    ·    Pausas: ${formatMinutes(
        totalBreak
      )}    ·    Trabajado: ${formatMinutes(totalWorked)}`,
      50,
      yTotals + 16
    );

  doc.y = yTotals + 34;
}

function drawTableHeader(doc: PDFKit.PDFDocument) {
  const y = doc.y;
  doc.rect(40, y, 515, 20).fillAndStroke("#0f172a", "#0f172a");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  doc.text("Fecha", COL.fecha - 20, y + 6);
  doc.text("Entrada", COL.entrada - 20, y + 6);
  doc.text("Salida", COL.salida - 20, y + 6);
  doc.text("Pausa", COL.pausa - 20, y + 6, { width: 60, align: "right" });
  doc.text("Trabajado", COL.trabajado - 40, y + 6, {
    width: 80,
    align: "right",
  });
  doc.text("Origen", COL.origen - 20, y + 6);
  doc.y = y + 20;
  doc.fillColor("#0f172a");
}

function drawRow(
  doc: PDFKit.PDFDocument,
  row: {
    label: string;
    clockIn: string;
    clockOut: string;
    pausa: string;
    trabajado: string;
    origen: string;
    holiday: string | null;
    isWeekend: boolean;
  }
) {
  const y = doc.y;
  const bg = row.holiday
    ? "#fff1f2"
    : row.isWeekend
      ? "#f8fafc"
      : "#ffffff";
  doc.rect(40, y, 515, ROW_HEIGHT).fillAndStroke(bg, "#e2e8f0");

  doc
    .fillColor("#0f172a")
    .font("Helvetica")
    .fontSize(8)
    .text(row.label, COL.fecha - 20, y + 5, { width: 110 });

  doc.text(row.clockIn, COL.entrada - 20, y + 5, { width: 60 });
  doc.text(row.clockOut, COL.salida - 20, y + 5, { width: 60 });
  doc.text(row.pausa, COL.pausa - 20, y + 5, { width: 60, align: "right" });
  doc.text(row.trabajado, COL.trabajado - 40, y + 5, {
    width: 80,
    align: "right",
  });
  doc.text(row.origen, COL.origen - 20, y + 5);

  if (row.holiday) {
    doc
      .fontSize(7)
      .fillColor("#be123c")
      .text(`(${row.holiday})`, 340, y + 5, { width: 200, align: "right" });
  }

  doc.y = y + ROW_HEIGHT;
}

function drawFooter(doc: PDFKit.PDFDocument, input: JornadaReportInput) {
  doc.moveDown(2);

  if (doc.y > 720) doc.addPage();

  const y = doc.y;
  doc
    .fontSize(8)
    .fillColor("#64748b")
    .font("Helvetica")
    .text(
      `Documento generado el ${formatDateTime(input.generatedAt)} por ${input.generatedBy}.`,
      40,
      y
    );

  doc
    .fontSize(7)
    .text(
      "Este registro se conserva durante 4 años a disposición de la Inspección de Trabajo y Seguridad Social, los trabajadores y sus representantes legales (art. 34.9 ET).",
      40,
      y + 14,
      { width: 515 }
    );

  // Firmas
  const yFirmas = y + 60;
  doc
    .moveTo(60, yFirmas)
    .lineTo(230, yFirmas)
    .strokeColor("#94a3b8")
    .stroke();
  doc
    .moveTo(330, yFirmas)
    .lineTo(500, yFirmas)
    .strokeColor("#94a3b8")
    .stroke();

  doc
    .fontSize(8)
    .fillColor("#475569")
    .text("Firma del trabajador", 60, yFirmas + 6, { width: 170 });
  doc.text("Firma y sello de la empresa", 330, yFirmas + 6, { width: 170 });
}

// ── utils ─────────────────────────
function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateLong(d: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
