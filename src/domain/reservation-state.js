import { checkAvailability } from "./availability.js";
import { ahoraLocal } from "./date.js";

function approve(reservation, { reservations, court, now }) {
  const availability = checkAvailability(
    reservation,
    reservations,
    court,
    now,
    reservation.id,
  );
  if (!availability.ok) throw Error(availability.motivo);
  return { estado: "aprobada" };
}

function reject() {
  return { estado: "rechazada" };
}

function cancel(_reservation, { reason = "" }) {
  const motivoCancelacion = reason.trim();
  if (!motivoCancelacion) throw Error("Indicá el motivo de la cancelación.");
  return { estado: "cancelada", motivoCancelacion };
}

// State con objetos: cada estado define sus operaciones disponibles y su comportamiento.
// Solo se persiste el nombre del estado; estos objetos pertenecen al dominio.
const pendingState = Object.freeze({
  aprobada: approve,
  rechazada: reject,
  cancelada: cancel,
});
const approvedState = Object.freeze({ cancelada: cancel });
const rejectedState = Object.freeze({ aprobada: approve });
const cancelledState = Object.freeze({});
const states = new Map([
  ["pendiente", pendingState],
  ["aprobada", approvedState],
  ["rechazada", rejectedState],
  ["cancelada", cancelledState],
]);

function stateFor(reservation) {
  const state = states.get(reservation.estado);
  if (!state) throw Error("El estado de la reserva no es válido.");
  return state;
}

export function reservationTransitions(reservation) {
  return Object.keys(stateFor(reservation));
}

// El contexto delega en el estado actual y devuelve una reserva nueva, sin guardar ni mutar.
export function transitionReservation(reservation, target, context) {
  const state = stateFor(reservation);
  if (!Object.hasOwn(state, target))
    throw Error("La solicitud ya cambió de estado.");
  return {
    ...reservation,
    ...state[target](reservation, context),
    decidida: ahoraLocal(context.now),
  };
}
