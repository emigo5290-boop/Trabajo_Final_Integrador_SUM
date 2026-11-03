import { jsPDF } from "jspdf";
import { CONFIG } from "../config.js";
import { iso, fechaCorta, p2 } from "../domain/date.js";
import { datosNota } from "../domain/note.js";
import { createReservationReportService } from "../application/reservation-report.js";

// Conservamos el acceso existente para quienes importaban esta función desde PDF.
export { rangoPeriodo } from "../domain/reservation-report.js";
const ETIQ_SOL = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};
function renderReservationReportPdf({ range, reservations, generatedAt }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const mx = 20,
    cols = [
      { t: "Fecha", w: 28 },
      { t: "Horario", w: 34 },
      { t: "Actividad", w: 80 },
      { t: "Estado", w: 28 },
    ];
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("INFORME DE RESERVAS", mx, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(CONFIG.NOMBRE_SUM, mx, y);
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.text(CONFIG.MUNICIPALIDAD, mx, y);
  y += 8;
  doc.text("Período: " + range.texto, mx, y);
  y += 5.5;
  doc.text(
    `Fecha de generación: ${fechaCorta(iso(generatedAt))} ${p2(generatedAt.getHours())}:${p2(generatedAt.getMinutes())} hs`,
    mx,
    y,
  );
  y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.text("Cantidad de reservas: " + reservations.length, mx, y);
  y += 9;
  const drawTableHeader = () => {
    doc.setFillColor(230, 235, 232);
    doc.rect(mx, y - 5, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    let x = mx + 2;
    cols.forEach((c) => {
      doc.text(c.t, x, y);
      x += c.w;
    });
    y += 7;
    doc.setFont("helvetica", "normal");
  };
  drawTableHeader();
  if (!reservations.length) {
    doc.text("No hay reservas en el período seleccionado.", mx + 2, y + 2);
  }
  reservations.forEach((reservation) => {
    const activityLines = doc.splitTextToSize(
      reservation.actividad,
      cols[2].w - 4,
    );
    const rowHeight = Math.max(1, activityLines.length) * 5 + 3;
    if (y + rowHeight > 280) {
      doc.addPage();
      y = 22;
      drawTableHeader();
    }
    let x = mx + 2;
    doc.text(fechaCorta(reservation.fecha), x, y);
    x += cols[0].w;
    doc.text(`${reservation.inicio} - ${reservation.fin} hs`, x, y);
    x += cols[1].w;
    doc.text(activityLines, x, y);
    x += cols[2].w;
    doc.text(ETIQ_SOL[reservation.estado], x, y);
    doc.setDrawColor(210);
    doc.line(mx, y + rowHeight - 4, mx + 170, y + rowHeight - 4);
    y += rowHeight;
  });
  return doc;
}

const reservationReportService = createReservationReportService({
  render: renderReservationReportPdf,
  clock: () => new Date(),
});

export function generarInforme(periodo, fecha, reservations) {
  return reservationReportService.generate(periodo, fecha, reservations);
}

export function generarPDFNota(reservation) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }),
    n = datosNota(reservation);
  let y = 24;
  function paragraph(text, { size = 11, bold = false, space = 5 } = {}) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, 160);
    for (const line of lines) {
      if (y > 270) {
        doc.addPage();
        y = 24;
      }
      doc.text(line, 25, y);
      y += 6;
    }
    y += space;
  }
  paragraph(CONFIG.MUNICIPALIDAD.toUpperCase(), { bold: true });
  paragraph(CONFIG.NOMBRE_SUM);
  paragraph(n.titulo, { size: 15, bold: true });
  paragraph(n.lugarFecha);
  paragraph(n.destinatario);
  paragraph(n.cuerpo.map((s) => s.t).join(""));
  if (n.observaciones) paragraph(n.observaciones);
  paragraph(n.conformidad);
  paragraph(n.cierre);
  paragraph("Firma: __________________________");
  paragraph("Aclaración: " + n.aclaracion);
  paragraph("DNI: " + n.dni);
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Solicitud N° ${n.numero} · ${i}/${pages}`, 25, 285);
  }
  return doc;
}
export const createPdfService = () => ({
  note: (r) => generarPDFNota(r).save(`nota-solicitud-${r.numero}.pdf`),
  report: (period, date, rs) => {
    const { doc, nombre } = generarInforme(period, date, rs);
    doc.save(nombre);
  },
});
