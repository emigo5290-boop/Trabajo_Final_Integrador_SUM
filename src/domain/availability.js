import { CONFIG } from "../config.js";
import { iso, mins, solapa, hh } from "./date.js";
export const outsideService = (court, date) =>
  court.estado === "fuera_de_servicio" &&
  (!court.desde || date >= court.desde) &&
  (!court.hasta || date <= court.hasta);
export function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;
  const [y, m, d] = date.split("-").map(Number);
  return iso(new Date(y, m - 1, d)) === date;
}
export function checkAvailability(
  { fecha, inicio, fin },
  reservations,
  court,
  now = new Date(),
  excludeId,
) {
  if (
    !validDate(fecha) ||
    !/^([01]\d|2[0-3]):00$/.test(inicio || "") ||
    !/^([01]\d|2[0-3]):00$/.test(fin || "")
  )
    return { ok: false, motivo: "Elegí una fecha válida y horas en punto." };
  const a = mins(inicio),
    b = mins(fin);
  if (b <= a)
    return {
      ok: false,
      motivo: "La finalización debe ser posterior al inicio.",
    };
  if (a < CONFIG.HORA_APERTURA * 60 || b > CONFIG.HORA_CIERRE * 60)
    return {
      ok: false,
      motivo: `El SUM funciona de ${hh(CONFIG.HORA_APERTURA)} a ${hh(CONFIG.HORA_CIERRE)}.`,
    };
  if (
    fecha < iso(now) ||
    (fecha === iso(now) && a <= now.getHours() * 60 + now.getMinutes())
  )
    return { ok: false, motivo: "El horario elegido ya pasó." };
  if (outsideService(court, fecha))
    return { ok: false, motivo: "La cancha estará fuera de servicio." };
  if (
    reservations.some(
      (r) =>
        r.estado === "aprobada" &&
        r.id !== excludeId &&
        r.fecha === fecha &&
        solapa(mins(r.inicio), mins(r.fin), a, b),
    )
  )
    return {
      ok: false,
      motivo: "El horario se superpone con una reserva aprobada.",
    };
  return { ok: true };
}
export function hourStatus(fecha, h, reservations, court, now = new Date()) {
  if (outsideService(court, fecha)) return "fuera";
  const r = reservations.find(
    (r) =>
      r.estado === "aprobada" &&
      r.fecha === fecha &&
      solapa(mins(r.inicio), mins(r.fin), h * 60, h * 60 + 60),
  );
  const m = now.getHours() * 60 + now.getMinutes();
  if (r)
    return fecha === iso(now) && mins(r.inicio) <= m && m < mins(r.fin)
      ? "ocupado"
      : "reservado";
  return fecha < iso(now) || (fecha === iso(now) && h * 60 <= m)
    ? "bloqueado"
    : "libre";
}
export const sortReservations = (rs) =>
  [...rs].sort((a, b) =>
    (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio),
  );
export function currentStatus(reservations, court, now = new Date()) {
  const today = iso(now),
    m = now.getHours() * 60 + now.getMinutes();
  if (outsideService(court, today)) return { clave: "fuera", ...court };
  const approved = sortReservations(
    reservations.filter((r) => r.estado === "aprobada"),
  );
  const current = approved.find(
    (r) => r.fecha === today && mins(r.inicio) <= m && m < mins(r.fin),
  );
  const future = approved.filter(
    (r) => r.fecha > today || (r.fecha === today && mins(r.inicio) > m),
  );
  const nextToday = future.find((r) => r.fecha === today);
  const clave =
    court.estado === "ocupada"
      ? "ocupada"
      : court.estado === "reservada"
        ? "reservada"
        : current
          ? "ocupada"
          : nextToday
            ? "reservada"
            : "libre";
  const ref =
    clave === "ocupada"
      ? current
      : clave === "reservada"
        ? nextToday || current
        : null;
  return {
    clave,
    motivo: ["ocupada", "reservada"].includes(court.estado)
      ? court.motivo
      : "",
    ref,
    proxima: future.find((r) => r !== ref),
    manual: ["ocupada", "reservada"].includes(court.estado),
  };
}
