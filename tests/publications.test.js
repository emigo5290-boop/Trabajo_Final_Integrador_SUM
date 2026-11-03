import test from "node:test";
import assert from "node:assert/strict";
import { createContentService } from "../src/application/content.js";
import { createStorage } from "../src/infrastructure/storage.js";
import {
  isNotice,
  isPublicationVisible,
  sortPublications,
} from "../src/domain/publications.js";

const event = {
  titulo: "Torneo de vóley",
  fecha: "2030-10-20",
  inicio: "18:00",
  fin: "20:00",
  descripcion: "Entrada libre.",
  flyer: "",
};
const notice = {
  tipo: "aviso",
  titulo: "Cambio de horario",
  descripcion: "El SUM abre a las 10 h el próximo lunes.",
};

function setup(initial = []) {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const repository = createStorage(storage);
  repository.write("actividades", initial);
  let role = "prensa";
  const content = createContentService({
    repository,
    session: () => (role ? { rol: role } : null),
  });
  return {
    content,
    role: (value) => (role = value),
    records: () => repository.read("actividades", []),
    reload: () => createStorage(storage).read("actividades", []),
  };
}

test("las actividades existentes se editan como eventos sin duplicar ni perder datos", () => {
  const original = { ...event, id: "legacy" };
  const app = setup([original]);
  assert.equal(isNotice(original), false);
  app.content.saveActivity({ ...original, titulo: "Torneo actualizado" });
  assert.deepEqual(app.reload(), [
    { ...original, titulo: "Torneo actualizado", tipo: "evento" },
  ]);
});

test("los eventos nuevos persisten el tipo y un identificador propio", () => {
  const app = setup();
  app.content.saveActivity({ ...event, tipo: "evento" });
  const [saved] = app.reload();
  assert.ok(saved.id);
  assert.deepEqual(saved, { ...event, tipo: "evento", id: saved.id });
});

test("un aviso se guarda sin fecha, horario ni imagen y conserva saltos de línea", () => {
  const app = setup();
  app.content.saveActivity({
    ...event,
    ...notice,
    titulo: "  Cambio de horario  ",
    descripcion: " Primera línea.\nSegunda línea. ",
    flyer: "imagen anterior",
  });
  const [saved] = app.reload();
  assert.deepEqual(saved, {
    ...notice,
    id: saved.id,
    descripcion: "Primera línea.\nSegunda línea.",
    fecha: "",
    inicio: "",
    fin: "",
    flyer: "",
  });
});

test("avisos incompletos, extensos o con tipo desconocido no modifican publicaciones", () => {
  const app = setup([{ ...event, id: "existing" }]);
  const before = app.records();
  for (const invalid of [
    { ...notice, titulo: " " },
    { ...notice, descripcion: "\n " },
    { ...notice, titulo: "a".repeat(101) },
    { ...notice, descripcion: "a".repeat(401) },
    { ...notice, tipo: "desconocido" },
  ]) {
    assert.throws(() => app.content.saveActivity(invalid));
    assert.deepEqual(app.reload(), before);
  }
});

test("los eventos validan fecha, horarios e imágenes antes de guardar", () => {
  const app = setup();
  for (const invalid of [
    { ...event, fecha: "" },
    { ...event, fecha: "2030-02-31" },
    { ...event, inicio: "25:00" },
    { ...event, fin: "19:99" },
    { ...event, inicio: "", fin: "20:00" },
    { ...event, fin: "18:00" },
    { ...event, fin: "17:00" },
    { ...event, flyer: "data:text/html;base64,AA==" },
  ]) {
    assert.throws(() => app.content.saveActivity(invalid));
    assert.deepEqual(app.records(), []);
  }
});

test("cambiar un evento a aviso y volver a evento conserva la misma publicación", () => {
  const app = setup([{ ...event, id: "shared" }]);
  app.content.saveActivity({ ...event, ...notice, id: "shared" });
  const [saved] = app.reload();
  assert.equal(saved.id, "shared");
  assert.equal(saved.fecha, "");
  assert.throws(
    () => app.content.saveActivity({ ...saved, tipo: "evento" }),
    /fecha/,
  );
  app.content.saveActivity({ ...saved, ...event, tipo: "evento" });
  assert.deepEqual(app.reload(), [{ ...event, id: "shared", tipo: "evento" }]);
});

test("crear, editar y eliminar publicaciones requiere el rol prensa", () => {
  const initial = [{ ...event, id: "protected" }];
  const app = setup(initial);
  for (const role of [null, "cliente", "admin"]) {
    app.role(role);
    assert.throws(() => app.content.saveActivity(notice), /permiso/);
    assert.throws(
      () => app.content.saveActivity({ ...notice, id: "protected" }),
      /permiso/,
    );
    assert.throws(() => app.content.removeActivity("protected"), /permiso/);
    assert.deepEqual(app.reload(), initial);
  }
});

test("eliminar una publicación persiste y deja intactas las restantes", () => {
  const app = setup([
    { ...event, id: "event" },
    { ...notice, id: "notice" },
  ]);
  app.content.removeActivity("notice");
  assert.deepEqual(app.reload(), [{ ...event, id: "event" }]);
  app.content.removeActivity("event");
  assert.deepEqual(app.reload(), []);
});

test("el sitio público conserva avisos sin fecha y oculta solamente eventos pasados", () => {
  assert.equal(isPublicationVisible(notice, "2030-10-21"), true);
  assert.equal(isPublicationVisible(event, "2030-10-19"), true);
  assert.equal(isPublicationVisible(event, "2030-10-20"), true);
  assert.equal(isPublicationVisible(event, "2030-10-21"), false);
});

test("las publicaciones destacan avisos y ordenan eventos sin mutar el listado original", () => {
  const early = { ...event, id: "early", inicio: "10:00" };
  const late = { ...event, id: "late" };
  const records = [late, notice, early];
  assert.deepEqual(sortPublications(records), [notice, early, late]);
  assert.deepEqual(records, [late, notice, early]);
});
