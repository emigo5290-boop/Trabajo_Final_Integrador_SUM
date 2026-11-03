import { iso, deISO, fechaCorta, cap, MESES } from "./date.js";
import { sortReservations } from "./availability.js";

export function rangoPeriodo(periodo, fecha) {
  const date = deISO(fecha);
  if (periodo === "dia")
    return { desde: fecha, hasta: fecha, texto: `Día ${fechaCorta(fecha)}` };
  if (periodo === "semana") {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      desde: iso(monday),
      hasta: iso(sunday),
      texto: `Semana del ${fechaCorta(iso(monday))} al ${fechaCorta(iso(sunday))}`,
    };
  }
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    desde: iso(firstDay),
    hasta: iso(lastDay),
    texto: `${cap(MESES[date.getMonth()])} de ${date.getFullYear()}`,
  };
}

export function prepareReservationReport(period, date, reservations) {
  const range = rangoPeriodo(period, date);
  // Conservamos pendientes y canceladas; las rechazadas no integran el informe.
  const records = sortReservations(
    reservations.filter(
      (reservation) =>
        reservation.estado !== "rechazada" &&
        reservation.fecha >= range.desde &&
        reservation.fecha <= range.hasta,
    ),
  );
  return {
    range,
    reservations: records,
    fileName: `informe-reservas-${period}-${date}.pdf`,
  };
}
