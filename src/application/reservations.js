import { checkAvailability, sortReservations } from "../domain/availability.js";
import { mins, solapa, ahoraLocal } from "../domain/date.js";
import { transitionReservation } from "../domain/reservation-state.js";
export function createReservationService({
  repository,
  session,
  user,
  clock = () => new Date(),
  id = () => crypto.randomUUID(),
}) {
  const all = () => repository.read("reservas", []),
    court = () => repository.read("cancha", { estado: "disponible" });
  function requireRole(role) {
    if (session()?.rol !== role)
      throw Error("No tenés permiso para realizar esta operación.");
  }
  function validate(form) {
    requireRole("cliente");
    const u = user();
    if (!u?.verificado) throw Error("Verificá tu cuenta antes de reservar.");
    if (!["Vóley", "Básquet"].includes(form.actividad))
      throw Error("Elegí Vóley o Básquet.");
    if ((form.observaciones || "").length > 400)
      throw Error("Las observaciones admiten hasta 400 caracteres.");
    const c = checkAvailability(form, all(), court(), clock());
    if (!c.ok) throw Error(c.motivo);
    if (
      all().some(
        (r) =>
          r.userId === u.id &&
          r.estado === "pendiente" &&
          r.fecha === form.fecha &&
          solapa(
            mins(r.inicio),
            mins(r.fin),
            mins(form.inicio),
            mins(form.fin),
          ),
      )
    )
      throw Error("Ya tenés una solicitud pendiente en ese horario.");
  }
  return {
    validate,
    list: () => sortReservations(all()),
    request(form) {
      validate(form);
      const u = user(),
        n = repository.read("contador", 0) + 1;
      repository.write("contador", n);
      const r = {
        id: id(),
        userId: u.id,
        cliente: {
          nombre: u.nombre,
          apellido: u.apellido,
          dni: u.dni,
          email: u.email,
        },
        fecha: form.fecha,
        inicio: form.inicio,
        fin: form.fin,
        actividad: form.actividad,
        observaciones: (form.observaciones || "").trim(),
        estado: "pendiente",
        creada: ahoraLocal(),
        decidida: null,
        numero: `SUM-${clock().getFullYear()}-${String(n).padStart(4, "0")}`,
        pdfGenerado: null,
      };
      repository.write("reservas", [...all(), r]);
      return r;
    },
    cancelAll(reason = "") {
      requireRole("admin");
      const motivoCancelacion = reason.trim();
      if (!motivoCancelacion)
        throw Error("Indicá el motivo de la cancelación.");
      const records = all();
      const count = records.filter((r) => r.estado === "aprobada").length;
      if (!count) throw Error("No hay reservas aprobadas para cancelar.");
      const context = { reason: motivoCancelacion, now: clock() };
      repository.write(
        "reservas",
        records.map((r) =>
          r.estado === "aprobada"
            ? transitionReservation(r, "cancelada", context)
            : r,
        ),
      );
      return count;
    },
    decide(reservationId, state, reason = "") {
      requireRole("admin");
      const records = all(),
        r = records.find((r) => r.id === reservationId);
      if (!r) throw Error("La reserva no existe.");
      const updated = transitionReservation(r, state, {
        reservations: records,
        court: court(),
        now: clock(),
        reason,
      });
      repository.write(
        "reservas",
        records.map((x) => (x.id === r.id ? updated : x)),
      );
    },
  };
}
