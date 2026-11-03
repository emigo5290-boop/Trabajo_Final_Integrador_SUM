import { CONFIG } from "../config.js";
import { norm, titulo } from "../domain/date.js";
import {
  assertValid,
  registrationErrors,
  passwordErrors,
} from "../domain/validation.js";
export function createAuthService({
  repository,
  temp,
  password,
  session = () => repository.read("sesion", null),
  clock = () => Date.now(),
  code = () =>
    String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000)),
}) {
  const users = () => repository.read("usuarios", []);
  function issue(email, tipo) {
    const value = code(),
      codes = repository.read("codigos", {});
    codes[`${tipo}:${norm(email)}`] = {
      codigo: value,
      expira: clock() + CONFIG.CODIGO_MINUTOS * 60000,
    };
    repository.write("codigos", codes);
    temp.write("verification", { email, tipo, demoCodigo: value });
  }
  return {
    approveAccount(id) {
      if (session()?.rol !== "admin") throw Error("No tenés permiso.");
      const account = users().find((u) => u.id === id);
      if (!account || account.acceso !== "pendiente")
        throw Error("La cuenta no está pendiente de aprobación.");
      if (!account.verificado || !account.dniImagen)
        throw Error(
          "La cuenta debe verificar su correo y adjuntar el QR del DNI.",
        );
      repository.write(
        "usuarios",
        users().map((u) => (u.id === id ? { ...u, acceso: "aprobado" } : u)),
      );
    },
    async login(d) {
      let session;
      if (
        norm(d.usuario) === norm(CONFIG.ADMIN.usuario) &&
        d.clave === CONFIG.ADMIN.clave
      )
        session = { rol: "admin" };
      const press = repository.read("prensa", null);
      if (
        !session &&
        norm(d.usuario) === norm(press?.usuario || CONFIG.PRENSA.usuario) &&
        (press
          ? await password.matches(d.clave, press.passHash)
          : d.clave === CONFIG.PRENSA.clave)
      )
        session = { rol: "prensa" };
      if (!session) {
        const candidates = users().filter(
          (u) => norm(u.email) === norm(d.usuario),
        );
        let found;
        for (const u of candidates)
          if (await password.matches(d.clave, u.passHash)) {
            found = u;
            break;
          }
        if (!found) throw Error("Los datos ingresados no son correctos.");
        if (!found.verificado) {
          issue(found.email, "registro");
          return "verificacion";
        }
        session = { rol: "cliente", id: found.id };
        if (found.acceso !== "aprobado")
          throw Error(
            "Tu cuenta está pendiente de aprobación por administración.",
          );
      }
      repository.write("sesion", session);
      return session.rol;
    },
    async register(d) {
      d = {
        ...d,
        nombre: d.nombre.trim(),
        apellido: d.apellido.trim(),
        email: d.email.trim(),
        dni: (d.dni || "").replace(/[.\s]/g, ""),
        cuil: (d.cuil || "").trim(),
      };
      assertValid(registrationErrors(d, users()));
      const passHash = await password.hash(d.clave);
      assertValid(registrationErrors(d, users()));
      repository.write("usuarios", [
        ...users(),
        {
          id: crypto.randomUUID(),
          nombre: titulo(d.nombre),
          apellido: titulo(d.apellido),
          email: d.email,
          dni: d.dni,
          cuil: d.cuil,
          passHash,
          verificado: false,
          acceso: "pendiente",
          dniImagen: d.dniImagen || "",
        },
      ]);
      issue(d.email, "registro");
    },
    recover(email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
        throw Error("Ingresá un correo válido.");
      temp.write("verification", { email, tipo: "recuperar" });
      if (users().some((u) => norm(u.email) === norm(email)))
        issue(email, "recuperar");
    },
    resend() {
      const v = temp.read("verification", null);
      if (v && users().some((u) => norm(u.email) === norm(v.email)))
        issue(v.email, v.tipo);
    },
    verify(value) {
      const v = temp.read("verification", null);
      if (!v) throw Error("Iniciá el registro o la recuperación.");
      const key = `${v.tipo}:${norm(v.email)}`,
        codes = repository.read("codigos", {}),
        c = codes[key];
      if (!c || c.expira <= clock())
        throw Error("El código venció. Solicitá uno nuevo.");
      if (c.codigo !== value) throw Error("El código es incorrecto.");
      delete codes[key];
      repository.write("codigos", codes);
      if (v.tipo === "registro") {
        repository.write(
          "usuarios",
          users().map((u) =>
            norm(u.email) === norm(v.email) ? { ...u, verificado: true } : u,
          ),
        );
        temp.write("verification", null);
        return "login";
      }
      temp.write("verification", {
        email: v.email,
        tipo: v.tipo,
        validado: true,
        expira: clock() + 600000,
      });
      return "nueva-clave";
    },
    async reset(d) {
      const v = temp.read("verification", null);
      if (!v?.validado || v.tipo !== "recuperar" || v.expira <= clock())
        throw Error(
          "Verificá un código vigente antes de cambiar la contraseña.",
        );
      assertValid(passwordErrors(d.clave, d.clave2));
      const hash = await password.hash(d.clave);
      repository.write(
        "usuarios",
        users().map((u) =>
          norm(u.email) === norm(v.email) ? { ...u, passHash: hash } : u,
        ),
      );
      temp.write("verification", null);
      repository.write("sesion", null);
    },
    logout() {
      repository.write("sesion", null);
      temp.write("draft", null);
      temp.write("verification", null);
    },
  };
}
