import test from "node:test";
import assert from "node:assert/strict";
import { createApplication } from "../src/application/context.js";
import { createStorage } from "../src/infrastructure/storage.js";
import { createClassEnrollmentService } from "../src/application/class-enrollments.js";
import { defaultClasses } from "../src/domain/classes.js";

const form = {
  claseId: "basquet",
  nombre: "Ana",
  apellido: "Pérez",
  email: "ana@example.com",
  telefono: "+54 381 5551234",
  observaciones: "",
  consentimiento: true,
};
function setup() {
  const data = new Map();
  const backing = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const storage = createStorage(backing);
  const app = createApplication({ storage, temp: createStorage(null) });
  return {
    app,
    storage,
    reload: () => createStorage(backing).read("inscripciones_clases", []),
  };
}

test("los horarios llenos se guardan y bloquean inscripciones incluso con datos antiguos", () => {
  const { app, storage, reload } = setup();
  storage.write("sesion", { rol: "admin" });
  app.refresh();
  const open = { dia: "Lunes", inicio: "18:00", fin: "19:00" };
  const full = { dia: "Martes", inicio: "18:00", fin: "19:00", lleno: true };
  const lesson = { ...defaultClasses()[0], horarios: [open, full] };
  app.content.saveClass(lesson);
  assert.equal(storage.read("clases")[0].horarios[1].lleno, true);
  assert.throws(
    () =>
      app.enrollments.register({ ...form, horario: { ...full, lleno: false } }),
    /lleno/,
  );
  assert.equal(reload().length, 0);
  app.enrollments.register({ ...form, horario: open });
  app.content.saveClass({ ...lesson, lleno: true });
  assert.throws(
    () =>
      app.enrollments.register({
        ...form,
        email: "otra@example.com",
        horario: open,
      }),
    /llena/,
  );
  assert.equal(reload().length, 1);
  app.content.saveClass({
    ...lesson,
    lleno: false,
    horarios: [open, { ...full, lleno: false }],
  });
  app.enrollments.register({
    ...form,
    email: "otra@example.com",
    horario: full,
  });
  assert.equal(reload().length, 2);
});

test("clase llena por día bloquea todas sus franjas y conserva los otros días", () => {
  const { app, storage, reload } = setup();
  storage.write("sesion", { rol: "admin" });
  app.refresh();
  const monday = { dia: "Lunes", inicio: "18:00", fin: "19:00" };
  const later = { ...monday, inicio: "19:00", fin: "20:00" };
  const tuesday = { ...monday, dia: "Martes" };
  const lesson = {
    ...defaultClasses()[0],
    horarios: [monday, later, tuesday],
    diasLlenos: ["Lunes"],
  };
  app.content.saveClass(lesson);
  assert.deepEqual(storage.read("clases")[0].diasLlenos, ["Lunes"]);
  for (const horario of [monday, later])
    assert.throws(
      () => app.enrollments.register({ ...form, horario }),
      /lleno/,
    );
  app.enrollments.register({ ...form, horario: tuesday });
  assert.equal(reload().length, 1);
  const added = { ...monday, inicio: "20:00", fin: "21:00" };
  app.content.saveClass({ ...lesson, horarios: [...lesson.horarios, added] });
  assert.throws(
    () => app.enrollments.register({ ...form, horario: added }),
    /lleno/,
  );
  app.content.saveClass({ ...lesson, diasLlenos: [] });
  app.enrollments.register({
    ...form,
    email: "otra@example.com",
    horario: monday,
  });
  assert.equal(reload().length, 2);
});

test("la inscripción directa persiste sin crear una cuenta y admite horarios pendientes", () => {
  const { app, storage, reload } = setup();
  const receipt = app.enrollments.register({
    ...form,
    nombre: "  Ana  ",
    email: " ANA@example.com ",
  });
  assert.equal(receipt.durable, true);
  assert.equal(receipt.nombre, "Ana");
  assert.equal(receipt.email, "ana@example.com");
  assert.equal(receipt.horario, null);
  assert.equal(receipt.claseNombre, "Básquet");
  assert.ok(receipt.id && receipt.creada);
  assert.equal(reload()[0].id, receipt.id);
  assert.equal(storage.read("usuarios", null), null);
  assert.equal(storage.read("reservas", null), null);
});

test("nombre, contacto y consentimiento se validan antes de guardar", () => {
  const { app, reload } = setup();
  for (const change of [
    { nombre: " " },
    { apellido: "X" },
    { email: "incorrecto" },
    { telefono: "123" },
    { telefono: "abcdefgh" },
    { consentimiento: false },
    { observaciones: "x".repeat(301) },
  ]) {
    assert.throws(
      () => app.enrollments.register({ ...form, ...change }),
      /campos/,
    );
    assert.deepEqual(reload(), []);
  }
});

test("repetir una inscripción no la duplica, pero permite otros familiares o clases", () => {
  const { app, reload } = setup();
  app.enrollments.register(form);
  assert.throws(
    () =>
      app.enrollments.register({
        ...form,
        apellido: "Perez",
        email: "ANA@example.com",
      }),
    /Ya registraste/,
  );
  assert.equal(reload().length, 1);
  app.enrollments.register({ ...form, nombre: "Lucía" });
  app.enrollments.register({ ...form, claseId: "voley" });
  assert.equal(reload().length, 3);
});

test("solo permite clases existentes y horarios vigentes, no los enviados por el visitante", () => {
  const { app, storage, reload } = setup();
  const horario = { dia: "Lunes", inicio: "17:30", fin: "18:30" };
  const lesson = { ...defaultClasses()[0], horarios: [horario] };
  storage.write("clases", [lesson]);
  assert.throws(
    () => app.enrollments.register({ ...form, claseId: "inexistente" }),
    /disponible/,
  );
  assert.throws(() => app.enrollments.register(form), /horario/);
  assert.throws(
    () =>
      app.enrollments.register({
        ...form,
        horario: { ...horario, inicio: "11:00" },
      }),
    /horario/,
  );
  assert.deepEqual(reload(), []);
  const receipt = app.enrollments.register({
    ...form,
    horario,
    claseNombre: "Nombre falso",
  });
  assert.equal(receipt.claseNombre, "Básquet");
  assert.deepEqual(receipt.horario, horario);
  storage.write("clases", []);
  assert.equal(reload()[0].claseNombre, "Básquet");
  assert.deepEqual(reload()[0].horario, horario);
  assert.throws(
    () => app.enrollments.register({ ...form, nombre: "Pedro", horario }),
    /disponible/,
  );
});

test("los contactos solo se exponen en el contexto y servicio de Administración", () => {
  const { app, storage } = setup();
  app.enrollments.register(form);
  assert.deepEqual(app.classEnrollments.value, []);
  assert.throws(() => app.enrollments.list(), /permiso/);
  for (const role of ["prensa", "cliente", "admin"]) {
    storage.write("sesion", { rol: role });
    app.refresh();
    if (role === "admin") {
      assert.equal(app.classEnrollments.value.length, 1);
      assert.equal(app.enrollments.list()[0].email, form.email);
    } else {
      assert.deepEqual(app.classEnrollments.value, []);
      assert.throws(() => app.enrollments.list(), /permiso/);
    }
  }
});

test("el comprobante informa si el navegador no puede conservar la inscripción", () => {
  const storage = createStorage(null);
  const service = createClassEnrollmentService({
    repository: storage,
    session: () => null,
  });
  const receipt = service.register(form);
  assert.equal(receipt.durable, false);
  assert.equal(storage.read("inscripciones_clases", []).length, 1);
});
