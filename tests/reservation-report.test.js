import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareReservationReport,
  rangoPeriodo,
} from "../src/domain/reservation-report.js";
import { createReservationReportService } from "../src/application/reservation-report.js";
import {
  generarInforme,
  rangoPeriodo as legacyRange,
} from "../src/infrastructure/pdf.js";

const reservation = Object.freeze({
  id: "r1",
  fecha: "2030-01-10",
  inicio: "10:00",
  fin: "12:00",
  actividad: "Entrenamiento",
  estado: "aprobada",
});

test("el informe conserva días, semanas de lunes a domingo y meses completos", () => {
  for (const [period, date, expected] of [
    ["dia", "2030-01-10", ["2030-01-10", "2030-01-10", "Día 10/01/2030"]],
    [
      "semana",
      "2030-01-13",
      ["2030-01-07", "2030-01-13", "Semana del 07/01/2030 al 13/01/2030"],
    ],
    [
      "semana",
      "2030-01-01",
      ["2029-12-31", "2030-01-06", "Semana del 31/12/2029 al 06/01/2030"],
    ],
    ["mes", "2032-02-15", ["2032-02-01", "2032-02-29", "Febrero de 2032"]],
    ["mes", "2030-02-15", ["2030-02-01", "2030-02-28", "Febrero de 2030"]],
    ["otro", "2030-01-10", ["2030-01-01", "2030-01-31", "Enero de 2030"]],
  ]) {
    const [desde, hasta, texto] = expected;
    assert.deepEqual(rangoPeriodo(period, date), { desde, hasta, texto });
    assert.deepEqual(legacyRange(period, date), { desde, hasta, texto });
  }
});

test("el informe incluye los extremos del período y excluye rechazadas sin cambiar las reservas", () => {
  const records = Object.freeze(
    [
      { ...reservation, id: "last", fecha: "2030-01-13", estado: "cancelada" },
      { ...reservation, id: "outside-before", fecha: "2030-01-06" },
      { ...reservation, id: "rejected", estado: "rechazada" },
      { ...reservation, id: "outside-after", fecha: "2030-01-14" },
      { ...reservation, id: "later", inicio: "13:00", fin: "14:00" },
      reservation,
      { ...reservation, id: "first", fecha: "2030-01-07", estado: "pendiente" },
    ].map(Object.freeze),
  );
  const before = structuredClone(records);
  const report = prepareReservationReport("semana", "2030-01-10", records);
  assert.deepEqual(
    report.reservations.map((item) => item.id),
    ["first", "r1", "later", "last"],
  );
  assert.equal(report.fileName, "informe-reservas-semana-2030-01-10.pdf");
  assert.deepEqual(records, before);
});

test("el servicio entrega el contenido y la fecha a un generador recibido por parámetro", () => {
  const now = new Date(2030, 0, 10, 9, 15);
  const document = { contenido: "documento de prueba" };
  let clockCalls = 0;
  const received = [];
  const service = createReservationReportService({
    clock: () => {
      clockCalls++;
      return now;
    },
    render: (report) => {
      received.push(report);
      return document;
    },
  });
  assert.deepEqual(service.generate("dia", "2030-01-10", [reservation]), {
    doc: document,
    nombre: "informe-reservas-dia-2030-01-10.pdf",
  });
  assert.equal(clockCalls, 1);
  assert.deepEqual(received, [
    {
      range: {
        desde: "2030-01-10",
        hasta: "2030-01-10",
        texto: "Día 10/01/2030",
      },
      reservations: [reservation],
      fileName: "informe-reservas-dia-2030-01-10.pdf",
      generatedAt: now,
    },
  ]);
});

test("el servicio no oculta los errores del generador del documento", () => {
  const failure = new Error("No se pudo generar el documento.");
  const service = createReservationReportService({
    clock: () => new Date(2030, 0, 10),
    render: () => {
      throw failure;
    },
  });
  assert.throws(
    () => service.generate("dia", "2030-01-10", [reservation]),
    (error) => error === failure,
  );
});

test("el PDF público conserva nombre, filas, estados y orden", () => {
  const { doc, nombre } = generarInforme("dia", "2030-01-10", [
    { ...reservation, inicio: "14:00", fin: "15:00", estado: "cancelada" },
    { ...reservation, inicio: "08:00", fin: "09:00", estado: "pendiente" },
    reservation,
    { ...reservation, estado: "rechazada", actividad: "NO-INCLUIR-RECHAZADA" },
    { ...reservation, fecha: "2030-01-11", actividad: "NO-INCLUIR-FUERA" },
  ]);
  const pdf = doc.output();
  assert.equal(nombre, "informe-reservas-dia-2030-01-10.pdf");
  assert.ok(pdf.startsWith("%PDF"));
  assert.match(pdf, /Cantidad de reservas: 3/);
  assert.match(pdf, /Pendiente/);
  assert.match(pdf, /Aprobada/);
  assert.match(pdf, /Cancelada/);
  assert.doesNotMatch(pdf, /NO-INCLUIR/);
  assert.ok(pdf.indexOf("08:00 - 09:00") < pdf.indexOf("10:00 - 12:00"));
  assert.ok(pdf.indexOf("10:00 - 12:00") < pdf.indexOf("14:00 - 15:00"));
});

test("un informe vacío conserva el aviso y genera un PDF válido", () => {
  const { doc } = generarInforme("dia", "2030-01-10", []);
  assert.equal(doc.getNumberOfPages(), 1);
  assert.match(doc.output(), /Cantidad de reservas: 0/);
  assert.match(doc.output(), /No hay reservas en el/);
});

test("el PDF repite los encabezados al paginar y conserva las actividades largas", () => {
  const records = Array.from({ length: 80 }, (_, i) => ({
    ...reservation,
    actividad: `Actividad ${i}`,
  }));
  const { doc } = generarInforme("mes", "2030-01-10", records);
  assert.equal(doc.getNumberOfPages(), 3);
  assert.equal((doc.output().match(/\(Fecha\) Tj/g) || []).length, 3);
  assert.match(doc.output(), /Actividad 79/);
  const longReport = generarInforme("dia", "2030-01-10", [
    {
      ...reservation,
      actividad:
        "Encuentro deportivo de escuelas municipales ".repeat(6) + "CIERRE",
    },
  ]);
  assert.match(longReport.doc.output(), /CIERRE/);
});
