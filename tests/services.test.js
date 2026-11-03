import test from "node:test";
import assert from "node:assert/strict";
import { createStorage } from "../src/infrastructure/storage.js";
import { createReservationService } from "../src/application/reservations.js";
import { createAuthService } from "../src/application/auth.js";
import { createContentService } from "../src/application/content.js";
import {
  checkAvailability,
  hourStatus,
  validDate,
} from "../src/domain/availability.js";
import {
  rangoPeriodo,
  generarPDFNota,
  generarInforme,
} from "../src/infrastructure/pdf.js";
const now = new Date(2030, 0, 10, 9),
  court = { estado: "disponible" },
  form = {
    fecha: "2030-01-11",
    inicio: "10:00",
    fin: "12:00",
    actividad: "Vóley",
    observaciones: "",
  };
function memory() {
  const data = new Map();
  return createStorage({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  });
}
const user = {
  id: "u1",
  nombre: "Ana",
  apellido: "Pérez",
  dni: "12345678",
  cuil: "27123456789",
  email: "ana@ejemplo.com",
  verificado: true,
  dniImagen: "data:image/png;base64,aGVsbG8=",
};
function bookings() {
  const repository = memory();
  let session = { rol: "cliente", id: "u1" };
  let n = 0;
  const service = createReservationService({
    repository,
    session: () => session,
    user: () => user,
    clock: () => now,
    id: () => String(++n),
  });
  return { service, repository, role: (r) => (session = { rol: r, id: "u1" }) };
}
test("fechas y rangos inválidos no se pueden reservar", () => {
  for (const change of [
    { fecha: "2030-02-31" },
    { inicio: "xx" },
    { fin: "10:00" },
    { inicio: "07:00" },
    { fin: "23:30" },
    { fecha: "2030-01-09" },
    { fecha: "2030-01-10", inicio: "09:00" },
  ])
    assert.equal(
      checkAvailability({ ...form, ...change }, [], court, now).ok,
      false,
    );
  assert.equal(validDate("2032-02-29"), true);
});
test("solapamiento estricto permite turnos contiguos", () => {
  const r = { ...form, id: "r", estado: "aprobada" };
  assert.equal(
    checkAvailability({ ...form, inicio: "11:00" }, [r], court, now).ok,
    false,
  );
  assert.equal(
    checkAvailability(
      { ...form, inicio: "12:00", fin: "13:00" },
      [r],
      court,
      now,
    ).ok,
    true,
  );
  assert.equal(checkAvailability(form, [r], court, now, "r").ok, true);
});
test("fuera de servicio bloquea fechas inclusivas", () => {
  assert.equal(
    checkAvailability(
      form,
      [],
      { estado: "fuera_de_servicio", desde: form.fecha, hasta: form.fecha },
      now,
    ).ok,
    false,
  );
  assert.equal(
    hourStatus(
      form.fecha,
      10,
      [],
      { estado: "fuera_de_servicio", desde: form.fecha },
      now,
    ),
    "fuera",
  );
});
test("solicitud pendiente no bloquea a otros pero no permite duplicados propios", () => {
  const b = bookings();
  const r = b.service.request(form);
  assert.equal(r.estado, "pendiente");
  assert.equal(checkAvailability(form, [r], court, now).ok, true);
  assert.throws(() => b.service.request(form), /pendiente/);
});
test("aprobación revalida el horario y estados finales no se reabren", () => {
  const b = bookings(),
    r = b.service.request(form);
  b.repository.write("reservas", [r, { ...r, id: "other", userId: "other" }]);
  b.role("admin");
  b.service.decide(r.id, "aprobada");
  assert.throws(() => b.service.decide("other", "aprobada"), /superpone/);
  assert.throws(() => b.service.decide(r.id, "cancelada"), /motivo/);
  assert.throws(() => b.service.decide(r.id, "cancelada", "   "), /motivo/);
  assert.equal(b.service.list().find((x) => x.id === r.id).estado, "aprobada");
  b.service.decide(r.id, "cancelada", "  Mantenimiento del SUM  ");
  assert.equal(
    b.service.list().find((x) => x.id === r.id).motivoCancelacion,
    "Mantenimiento del SUM",
  );
  assert.throws(() => b.service.decide(r.id, "aprobada"), /estado/);
  b.service.decide("other", "aprobada");
});
test("una rechazada se puede aceptar si el horario sigue disponible", () => {
  const b = bookings(),
    r = b.service.request(form);
  b.role("admin");
  b.service.decide(r.id, "rechazada");
  b.repository.write("reservas", [
    ...b.service.list(),
    { ...r, id: "other", estado: "aprobada" },
  ]);
  assert.throws(() => b.service.decide(r.id, "aprobada"), /superpone/);
  assert.equal(b.service.list().find((x) => x.id === r.id).estado, "rechazada");
  b.service.decide("other", "cancelada", "Cambio de horario");
  b.service.decide(r.id, "aprobada");
  assert.equal(b.service.list().find((x) => x.id === r.id).estado, "aprobada");
});

test("cancelar todas exige admin y motivo y conserva las solicitudes sin aprobar", () => {
  const b = bookings(),
    r = b.service.request(form);
  assert.throws(() => b.service.cancelAll("Mantenimiento"), /permiso/);
  const records = [
    r,
    { ...r, id: "a", estado: "aprobada" },
    { ...r, id: "b", estado: "aprobada" },
    { ...r, id: "c", estado: "rechazada" },
  ];
  b.repository.write("reservas", records);
  b.role("admin");
  assert.throws(() => b.service.cancelAll("   "), /motivo/);
  assert.deepEqual(b.repository.read("reservas"), records);
  assert.equal(b.service.cancelAll("  Mantenimiento  "), 2);
  for (const item of b.service
    .list()
    .filter((x) => ["a", "b"].includes(x.id))) {
    assert.equal(item.estado, "cancelada");
    assert.equal(item.motivoCancelacion, "Mantenimiento");
    assert.ok(item.decidida);
  }
  assert.deepEqual(
    b.service.list().find((x) => x.id === r.id),
    r,
  );
  assert.equal(b.service.list().find((x) => x.id === "c").estado, "rechazada");
  assert.throws(() => b.service.cancelAll("Mantenimiento"), /No hay/);
});

test("roles también se validan en los servicios", () => {
  const b = bookings();
  assert.throws(() => b.service.decide("1", "aprobada"), /permiso/);
  b.role("prensa");
  assert.throws(() => b.service.request(form), /permiso/);
});
test("almacenamiento bloqueado conserva datos en memoria", () => {
  const repo = createStorage({
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  });
  assert.equal(repo.write("x", { value: 1 }), false);
  assert.deepEqual(repo.read("x", null), { value: 1 });
});
function authentication() {
  const repository = memory(),
    temp = memory();
  let clock = 1000;
  const auth = createAuthService({
    repository,
    temp,
    password: {
      hash: async (v) => "hash:" + v,
      matches: async (v, h) => h === "hash:" + v,
    },
    clock: () => clock,
    code: () => "1234",
    session: () => ({ rol: "admin" }),
  });
  return { auth, repository, temp, tick: (n) => (clock += n) };
}
const account = { ...user, clave: "Prueba123", clave2: "Prueba123" };

test("el registro con QR del DNI permite omitir el número de documento", async () => {
  const a = authentication();
  const { dni, ...data } = account;
  await a.auth.register(data);
  const saved = a.repository.read("usuarios")[0];
  assert.equal(saved.dni, "");
  assert.equal(saved.dniImagen, data.dniImagen);
  assert.equal(saved.acceso, "pendiente");
  a.auth.verify("1234");
  a.auth.approveAccount(saved.id);
  assert.equal(
    await a.auth.login({ usuario: data.email, clave: data.clave }),
    "cliente",
  );
});

test("aprobar cuentas requiere admin, correo verificado e imagen del DNI", async () => {
  const a = authentication();
  assert.deepEqual(a.repository.read("usuarios", []), []);
  await assert.rejects(a.auth.register({ ...account, dniImagen: "" }));
  await a.auth.register(account);
  const id = a.repository.read("usuarios")[0].id;
  assert.throws(() => a.auth.approveAccount(id), /verificar/);
  a.auth.verify("1234");
  const unauthorized = createAuthService({
    repository: a.repository,
    temp: a.temp,
    password: {},
    session: () => ({ rol: "cliente", id }),
  });
  assert.throws(() => unauthorized.approveAccount(id), /permiso/);
  assert.equal(a.repository.read("usuarios")[0].acceso, "pendiente");
  a.auth.approveAccount(id);
  assert.equal(a.repository.read("usuarios")[0].acceso, "aprobado");
  assert.throws(() => a.auth.approveAccount(id), /pendiente/);
});
test("registro, verificación de un uso y acceso", async () => {
  const a = authentication();
  await a.auth.register(account);
  assert.equal(
    await a.auth.login({
      usuario: user.email,
      clave: account.clave,
    }),
    "verificacion",
  );
  assert.throws(() => a.auth.verify("0000"), /incorrecto/);
  assert.equal(a.auth.verify("1234"), "login");
  assert.throws(() => a.auth.verify("1234"));
  await assert.rejects(
    a.auth.login({ usuario: user.email, clave: account.clave }),
    /pendiente/,
  );
  a.auth.approveAccount(a.repository.read("usuarios")[0].id);
  assert.equal(
    await a.auth.login({
      usuario: user.email,
      clave: account.clave,
    }),
    "cliente",
  );
  await assert.rejects(a.auth.register(account));
});
test("el registro permite crear y verificar cuentas sin CUIL", async () => {
  const a = authentication();
  for (const [index, cuil] of [undefined, "", "   "].entries()) {
    const data = {
      dniImagen: user.dniImagen,
      nombre: "Ana",
      apellido: "Pérez",
      dni: String(23456780 + index),
      email: `registro${index}@ejemplo.com`,
      clave: "Prueba123",
      clave2: "Prueba123",
    };
    if (cuil !== undefined) data.cuil = cuil;
    await a.auth.register(data);
    assert.equal(a.temp.read("verification", null).email, data.email);
    assert.equal(a.auth.verify("1234"), "login");
    a.auth.approveAccount(
      a.repository.read("usuarios").find((u) => u.email === data.email).id,
    );
    assert.equal(
      await a.auth.login({ usuario: data.email, clave: data.clave }),
      "cliente",
    );
    a.auth.logout();
  }
  const users = a.repository.read("usuarios", []);
  assert.equal(users.length, 3);
  assert.ok(users.every((u) => u.verificado && u.cuil === ""));
});

test("el registro sin CUIL conserva las validaciones y evita cuentas duplicadas", async () => {
  const a = authentication(),
    data = { ...account, cuil: "" };
  await a.auth.register(data);
  for (const [change, field] of [
    [{ nombre: "A" }, "nombre"],
    [{ apellido: "P" }, "apellido"],
    [{ dni: "123" }, "dni"],
    [{ email: "invalido" }, "email"],
    [{ clave: "corta", clave2: "corta" }, "clave"],
    [{ clave2: "Diferente123" }, "clave2"],
    [{ dni: data.dni }, "dni"],
    [{ email: data.email.toUpperCase() }, "email"],
  ]) {
    await assert.rejects(
      a.auth.register({
        ...data,
        dni: "23456789",
        email: "otra@ejemplo.com",
        ...change,
      }),
      (error) => {
        assert.deepEqual(Object.keys(error.fields), [field]);
        return true;
      },
    );
  }
  assert.equal(a.repository.read("usuarios", []).length, 1);
});

test("el acceso de clientes usa el correo y la contraseña elegida", async () => {
  const a = authentication();
  await a.auth.register(account);
  a.auth.verify("1234");
  a.auth.approveAccount(a.repository.read("usuarios")[0].id);
  for (const credentials of [
    { usuario: user.nombre, apellido: user.apellido, clave: account.clave },
    { usuario: user.dni, clave: account.clave },
    { usuario: user.email, clave: "Incorrecta123" },
  ]) {
    await assert.rejects(a.auth.login(credentials), /no son correctos/);
    assert.equal(a.repository.read("sesion", null), null);
  }
  assert.equal(
    await a.auth.login({
      usuario: `  ${user.email.toUpperCase()}  `,
      clave: account.clave,
    }),
    "cliente",
  );
});

test("código vencido y recuperación requieren una verificación vigente", async () => {
  const a = authentication();
  await a.auth.register(account);
  a.tick(600001);
  assert.throws(() => a.auth.verify("1234"), /venció/);
  a.auth.resend();
  a.auth.verify("1234");
  a.auth.approveAccount(a.repository.read("usuarios")[0].id);
  await assert.rejects(a.auth.reset(account), /Verificá/);
  a.auth.recover(user.email);
  assert.equal(a.auth.verify("1234"), "nueva-clave");
  await a.auth.reset({ clave: "Nueva1234", clave2: "Nueva1234" });
  await assert.rejects(a.auth.reset(account), /Verificá/);
  assert.equal(
    await a.auth.login({
      usuario: user.email,
      clave: "Nueva1234",
    }),
    "cliente",
  );
});
test("información y publicaciones requieren prensa; cancha requiere admin", () => {
  const repository = memory();
  let role = "cliente";
  const service = createContentService({
    repository,
    session: () => ({ rol: role }),
    password: { hash: async (x) => x },
  });
  assert.throws(() => service.saveCourt(court), /permiso/);
  role = "admin";
  assert.throws(() =>
    service.saveCourt({
      estado: "fuera_de_servicio",
      motivo: "Obras",
      desde: "2030-02-31",
    }),
  );
  assert.throws(() => service.saveActivity({}), /permiso/);
  role = "prensa";
  service.saveActivity({
    titulo: "Evento",
    fecha: "2030-01-11",
    inicio: "",
    fin: "",
    descripcion: "",
    flyer: "",
  });
  assert.equal(repository.read("actividades", []).length, 1);
});
test("rangos de informe y PDFs válidos, incluso con observaciones largas", () => {
  assert.equal(rangoPeriodo("semana", "2030-01-10").desde, "2030-01-07");
  const r = {
    ...form,
    cliente: user,
    numero: "SUM-TEST",
    creada: "2030-01-10T09:00",
    estado: "pendiente",
    observaciones: "Observación ".repeat(35),
  };
  assert.ok(generarPDFNota(r).output().startsWith("%PDF"));
  assert.ok(
    generarInforme("mes", form.fecha, [r]).doc.output().startsWith("%PDF"),
  );
});
