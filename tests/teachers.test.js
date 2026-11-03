import test from "node:test";
import assert from "node:assert/strict";
import { createApplication } from "../src/application/context.js";
import { createStorage } from "../src/infrastructure/storage.js";
import { teacherCards } from "../src/domain/teachers.js";

function setup() {
  const data = new Map();
  const storage = createStorage({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  });
  storage.write("sesion", { rol: "admin" });
  const app = createApplication({ storage, temp: createStorage(null) });
  return { storage, app };
}

test("profesores se guardan sin demos y pueden dictar varias clases", () => {
  const { app, storage } = setup();
  assert.deepEqual(app.teachers.value, []);
  app.content.saveTeacher({
    nombre: " Ana Pérez ",
    descripcion: " Profesora del SUM ",
    claseIds: ["basquet", "voley", "voley"],
  });
  const teacher = app.teachers.value[0];
  assert.equal(teacher.nombre, "Ana Pérez");
  assert.deepEqual(teacher.claseIds, ["basquet", "voley"]);
  app.content.saveTeacher({
    ...teacher,
    descripcion: "Nueva presentación",
    claseIds: ["handball"],
  });
  assert.equal(app.teachers.value.length, 1);
  assert.deepEqual(storage.read("profesores")[0].claseIds, ["handball"]);
  for (const change of [
    { nombre: "" },
    { descripcion: "x".repeat(301) },
    { claseIds: ["inexistente"] },
    { claseIds: null },
  ])
    assert.throws(() => app.content.saveTeacher({ ...teacher, ...change }));
  storage.write("sesion", { rol: "cliente" });
  app.refresh();
  assert.deepEqual(app.teachers.value, []);
  assert.throws(() => app.content.saveTeacher(teacher), /permiso/);
});

test("tarjetas muestran horarios y alumnos de cada clase sin mezclar nombres ni clases eliminadas", () => {
  const teachers = [
    { id: "p1", nombre: "Ana", claseIds: ["a", "b", "eliminada"] },
  ];
  const classes = [
    {
      id: "a",
      nombre: "Danza",
      horarios: [{ dia: "Lunes", inicio: "18:00", fin: "19:00" }],
    },
    { id: "b", nombre: "Danza", horarios: [] },
  ];
  const enrollments = [
    { claseId: "a" },
    { claseId: "a" },
    { claseId: "b" },
    { claseId: "otra" },
  ];
  const [card] = teacherCards(teachers, classes, enrollments);
  assert.equal(card.clases.length, 2);
  assert.deepEqual(
    card.clases.map((lesson) => lesson.alumnos),
    [2, 1],
  );
  assert.deepEqual(card.clases[0].horarios, classes[0].horarios);
  assert.equal(teacherCards(teachers, classes, [])[0].clases[0].alumnos, 0);
});
