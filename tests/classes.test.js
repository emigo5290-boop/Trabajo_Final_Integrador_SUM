import test from "node:test";
import assert from "node:assert/strict";
import { createApplication } from "../src/application/context.js";
import { createStorage } from "../src/infrastructure/storage.js";
import { defaultClasses } from "../src/domain/classes.js";

function setup() {
  const data = new Map();
  const backing = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const storage = createStorage(backing);
  storage.write("sesion", { rol: "admin" });
  const app = createApplication({ storage, temp: createStorage(null) });
  return {
    app,
    storage,
    reload: () => createStorage(backing).read("clases", defaultClasses()),
    role: (rol) => {
      storage.write("sesion", rol ? { rol } : null);
      app.refresh();
    },
  };
}

test("las seis clases iniciales aparecen sin horarios inventados y se pueden editar", () => {
  const { app, storage, reload } = setup();
  storage.write("reservas", [{ id: "reserva-existente" }]);
  assert.deepEqual(
    app.classes.value.map((item) => item.nombre),
    [
      "Básquet",
      "Vóley",
      "Handball",
      "Taekwondo",
      "Gimnasia artística",
      "Gimnasia en tela",
    ],
  );
  assert.ok(app.classes.value.every((item) => item.horarios.length === 0));
  app.content.saveClass({
    ...app.classes.value[0],
    nombre: "Básquet infantil",
  });
  assert.equal(app.classes.value[0].nombre, "Básquet infantil");
  assert.deepEqual(reload(), app.classes.value);
  assert.equal(reload().length, 6);
  assert.deepEqual(storage.read("reservas"), [{ id: "reserva-existente" }]);
  assert.equal(defaultClasses()[0].nombre, "Básquet");
});

test("agregar y editar una clase guarda días y horas ordenados sin duplicarla", () => {
  const { app, reload } = setup();
  app.content.saveClass({
    nombre: "  Danza  ",
    descripcion: "  Nivel inicial.\nDesde 6 años.  ",
    horarios: [
      { dia: "Viernes", inicio: "17:30", fin: "18:45", key: 2 },
      { dia: "Lunes", inicio: "19:00", fin: "20:00", key: 1 },
      { dia: "Lunes", inicio: "18:00", fin: "19:00", key: 0 },
    ],
  });
  const saved = reload().at(-1);
  assert.ok(saved.id);
  assert.equal(saved.nombre, "Danza");
  assert.equal(saved.descripcion, "Nivel inicial.\nDesde 6 años.");
  assert.deepEqual(saved.horarios, [
    { dia: "Lunes", inicio: "18:00", fin: "19:00" },
    { dia: "Lunes", inicio: "19:00", fin: "20:00" },
    { dia: "Viernes", inicio: "17:30", fin: "18:45" },
  ]);
  app.content.saveClass({ ...saved, nombre: "Danza infantil", horarios: [] });
  assert.equal(reload().length, 7);
  assert.deepEqual(reload().at(-1), {
    ...saved,
    nombre: "Danza infantil",
    horarios: [],
  });
});

test("datos y horarios inválidos no sobrescriben una clase guardada", () => {
  const { app, reload } = setup();
  const lesson = app.classes.value[0];
  const schedule = { dia: "Martes", inicio: "18:00", fin: "19:00" };
  const before = reload();
  for (const change of [
    { nombre: " " },
    { nombre: "a".repeat(81) },
    { descripcion: "a".repeat(301) },
    { horarios: null },
    { horarios: [null] },
    { horarios: [{ ...schedule, dia: "Feriado" }] },
    { horarios: [{ ...schedule, inicio: "" }] },
    { horarios: [{ ...schedule, inicio: "24:00" }] },
    { horarios: [{ ...schedule, fin: "19:60" }] },
    { horarios: [{ ...schedule, fin: "18:00" }] },
    { horarios: [{ ...schedule, fin: "17:00" }] },
    { horarios: [schedule, schedule] },
    { horarios: [schedule, { ...schedule, inicio: "18:30", fin: "20:00" }] },
  ]) {
    assert.throws(() => app.content.saveClass({ ...lesson, ...change }));
    assert.deepEqual(reload(), before);
  }
});

test("eliminar todas las clases persiste el vacío y no repone las iniciales", () => {
  const { app, storage, reload } = setup();
  for (const lesson of [...app.classes.value])
    app.content.removeClass(lesson.id);
  assert.deepEqual(app.classes.value, []);
  assert.deepEqual(reload(), []);
  const reopened = createApplication({ storage, temp: createStorage(null) });
  assert.deepEqual(reopened.classes.value, []);
  reopened.content.saveClass({ nombre: "Nueva clase", horarios: [] });
  assert.equal(reload().length, 1);
});

test("una edición antigua no vuelve a crear una clase eliminada", () => {
  const { app, reload } = setup();
  const lesson = app.classes.value[0];
  app.content.removeClass(lesson.id);
  assert.throws(() => app.content.saveClass(lesson), /ya no existe/);
  assert.equal(reload().length, 5);
  assert.ok(reload().every((item) => item.id !== lesson.id));
});

test("solo Administración puede agregar, modificar o eliminar clases", () => {
  const { app, role, reload } = setup();
  const original = reload();
  for (const rol of [null, "cliente", "prensa"]) {
    role(rol);
    assert.throws(
      () => app.content.saveClass({ nombre: "Danza", horarios: [] }),
      /permiso/,
    );
    assert.throws(() => app.content.saveClass(original[0]), /permiso/);
    assert.throws(() => app.content.removeClass(original[0].id), /permiso/);
    assert.deepEqual(reload(), original);
  }
});

test("las clases anteriores reciben fotos sin perder textos ni horarios personalizados", () => {
  const { app, storage } = setup();
  const horarios = [{ dia: "Martes", inicio: "18:00", fin: "19:00" }];
  storage.write("clases", [
    { id: "basquet", nombre: "Básquet", descripcion: "Texto propio", horarios },
  ]);
  app.refresh();
  assert.equal(app.classes.value[0].descripcion, "Texto propio");
  assert.equal(app.classes.value[0].imagen, "/img/clases/basquet.jpg");
  assert.deepEqual(app.classes.value[0].horarios, horarios);
  app.content.saveClass({
    ...app.classes.value[0],
    imagen: "",
    descripcion: "",
  });
  app.refresh();
  assert.equal(app.classes.value[0].imagen, "");
  assert.equal(app.classes.value[0].descripcion, "");
});

test("las fotos admiten recursos propios y rechazan enlaces o formatos ajenos", () => {
  const { app, reload } = setup();
  const original = app.classes.value[0];
  for (const imagen of [
    "https://example.com/photo.jpg",
    "javascript:alert(1)",
    "data:text/html;base64,AA==",
    "data:image/svg+xml;base64,AA==",
  ])
    assert.throws(() => app.content.saveClass({ ...original, imagen }), /foto/);
  app.content.saveClass({ ...original, imagen: "data:image/png;base64,AAAA" });
  assert.equal(reload()[0].imagen, "data:image/png;base64,AAAA");
});
