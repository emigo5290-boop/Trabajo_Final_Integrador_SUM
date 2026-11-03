import test from "node:test";
import assert from "node:assert/strict";
import {
  reservationTransitions,
  transitionReservation,
} from "../src/domain/reservation-state.js";
import { createReservationService } from "../src/application/reservations.js";
import { createStorage } from "../src/infrastructure/storage.js";

const now = new Date(2030, 0, 10, 9, 15);
const reservation = Object.freeze({
  id: "r1",
  userId: "u1",
  numero: "SUM-2030-0001",
  fecha: "2030-01-11",
  inicio: "10:00",
  fin: "12:00",
  actividad: "Vóley",
  estado: "pendiente",
  creada: "2030-01-09T10:00",
  decidida: null,
});
const context = Object.freeze({
  reservations: Object.freeze([reservation]),
  court: Object.freeze({ estado: "disponible" }),
  now,
  reason: "  Mantenimiento  ",
});

test("cada estado ofrece y ejecuta únicamente las transiciones del negocio", () => {
  const expected = {
    pendiente: ["aprobada", "rechazada", "cancelada"],
    aprobada: ["cancelada"],
    rechazada: ["aprobada"],
    cancelada: [],
  };
  for (const [state, targets] of Object.entries(expected)) {
    const original = { ...reservation, estado: state };
    const record = Object.freeze({ ...original });
    assert.deepEqual(reservationTransitions(record), targets);
    for (const target of Object.keys(expected)) {
      if (targets.includes(target)) {
        const updated = transitionReservation(record, target, context);
        assert.deepEqual(updated, {
          ...original,
          estado: target,
          decidida: "2030-01-10T09:15",
          ...(target === "cancelada"
            ? { motivoCancelacion: "Mantenimiento" }
            : {}),
        });
      } else {
        assert.throws(
          () => transitionReservation(record, target, context),
          /ya cambió de estado/,
          `${state} -> ${target}`,
        );
      }
      assert.deepEqual(record, original);
    }
  }
});

test("estados y operaciones desconocidos se rechazan sin transiciones implícitas", () => {
  for (const estado of [undefined, "desconocida", "toString", "__proto__"]) {
    const record = { ...reservation, estado };
    assert.throws(() => reservationTransitions(record), /estado.*válido/);
    assert.throws(
      () => transitionReservation(record, "aprobada", context),
      /estado.*válido/,
    );
  }
  for (const target of [undefined, "desconocida", "toString", "__proto__"]) {
    assert.throws(
      () => transitionReservation(reservation, target, context),
      /estado/,
    );
  }
  const transitions = reservationTransitions(reservation);
  transitions.length = 0;
  assert.equal(reservationTransitions(reservation).length, 3);
});

test("aprobar pendientes y rechazadas revalida solapamientos, cierre y paso del tiempo", () => {
  const scenarios = [
    {
      reservations: [{ ...reservation, id: "other", estado: "aprobada" }],
      error: /superpone/,
    },
    {
      court: {
        estado: "fuera_de_servicio",
        desde: reservation.fecha,
        hasta: reservation.fecha,
      },
      error: /fuera de servicio/,
    },
    { now: new Date(2030, 0, 11, 10), error: /ya pasó/ },
  ];
  for (const estado of ["pendiente", "rechazada"]) {
    const record = Object.freeze({ ...reservation, estado });
    for (const { error, ...change } of scenarios) {
      assert.throws(
        () =>
          transitionReservation(record, "aprobada", { ...context, ...change }),
        error,
      );
      assert.equal(record.estado, estado);
      assert.equal(record.decidida, null);
    }
  }
});

test("cancelar exige motivo en ambos estados y no necesita disponibilidad", () => {
  for (const estado of ["pendiente", "aprobada"]) {
    const record = Object.freeze({ ...reservation, estado });
    for (const reason of [undefined, "", "   "]) {
      assert.throws(
        () => transitionReservation(record, "cancelada", { now, reason }),
        /motivo/,
      );
    }
    assert.equal(
      transitionReservation(record, "cancelada", {
        now,
        reason: " Cambio de fecha ",
      }).motivoCancelacion,
      "Cambio de fecha",
    );
  }
  assert.equal(
    transitionReservation(reservation, "rechazada", { now }).estado,
    "rechazada",
  );
});

function setup(records) {
  const data = new Map();
  let writes = 0;
  const backing = {
    getItem: (key) => data.get(key) ?? null,
    setItem(key, value) {
      writes++;
      data.set(key, value);
    },
  };
  const repository = createStorage(backing);
  repository.write("reservas", records);
  let role = "admin";
  const service = createReservationService({
    repository,
    session: () => ({ rol: role }),
    clock: () => now,
  });
  return {
    service,
    repository,
    reload: () => createStorage(backing).read("reservas", []),
    writes: () => writes,
    role: (value) => {
      role = value;
    },
  };
}

test("el servicio consulta el estado persistido actual y no escribe si la decisión falla", () => {
  const b = setup([reservation]);
  assert.ok(reservationTransitions(b.service.list()[0]).includes("aprobada"));
  const cancelled = {
    ...reservation,
    estado: "cancelada",
    motivoCancelacion: "Cambio",
  };
  b.repository.write("reservas", [cancelled]);
  const before = b.writes();
  assert.throws(() => b.service.decide(reservation.id, "aprobada"), /estado/);
  assert.throws(() => b.service.decide("missing", "aprobada"), /no existe/);
  b.role("cliente");
  assert.throws(() => b.service.decide(reservation.id, "aprobada"), /permiso/);
  assert.throws(() => b.service.cancelAll("Cambio"), /permiso/);
  assert.equal(b.writes(), before);
  assert.deepEqual(b.reload(), [cancelled]);
});

test("una aprobación fallida conserva los datos y no realiza escrituras", () => {
  const records = [
    reservation,
    { ...reservation, id: "other", estado: "aprobada" },
  ];
  const b = setup(records);
  const before = b.writes();
  assert.throws(
    () => b.service.decide(reservation.id, "aprobada"),
    /superpone/,
  );
  assert.equal(b.writes(), before);
  assert.deepEqual(b.reload(), records);
});

test("cancelar individualmente o en lote aplica la misma regla y conserva los demás registros", () => {
  const approved = { ...reservation, estado: "aprobada" };
  const otherApproved = {
    ...approved,
    id: "r2",
    inicio: "12:00",
    fin: "13:00",
  };
  const untouched = [
    { ...reservation, id: "pending" },
    { ...reservation, id: "rejected", estado: "rechazada" },
    {
      ...reservation,
      id: "cancelled",
      estado: "cancelada",
      motivoCancelacion: "Anterior",
    },
  ];
  const records = [approved, otherApproved, ...untouched];
  const individual = setup(records);
  const batch = setup(records);
  const before = batch.writes();
  assert.throws(() => batch.service.cancelAll("  "), /motivo/);
  assert.equal(batch.writes(), before);
  assert.deepEqual(batch.reload(), records);
  individual.service.decide(approved.id, "cancelada", "  Mantenimiento  ");
  individual.service.decide(otherApproved.id, "cancelada", "  Mantenimiento  ");
  assert.equal(batch.service.cancelAll("  Mantenimiento  "), 2);
  assert.equal(batch.writes(), before + 1);
  assert.deepEqual(batch.reload(), individual.reload());
  assert.deepEqual(batch.reload().slice(2), untouched);
  for (const record of batch.reload().slice(0, 2)) {
    assert.equal(record.decidida, "2030-01-10T09:15");
    assert.equal(record.motivoCancelacion, "Mantenimiento");
    assert.deepEqual(reservationTransitions(record), []);
  }
});
