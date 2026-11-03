import { validDate } from "../domain/availability.js";
import { passwordErrors, assertValid } from "../domain/validation.js";
import { preparePublication } from "../domain/publications.js";
import {
  defaultClasses,
  prepareClass,
  withClassDetails,
} from "../domain/classes.js";
export function createContentService({ repository, session, password }) {
  function allow(role) {
    if (session()?.rol !== role)
      throw Error("No tenés permiso para esta operación.");
  }
  return {
    saveTeacher(data) {
      allow("admin");
      const nombre = (data.nombre || "").trim();
      const descripcion = (data.descripcion || "").trim();
      if (!nombre || nombre.length > 100)
        throw Error(
          "Ingresá el nombre y apellido del profesor (hasta 100 caracteres).",
        );
      if (descripcion.length > 300)
        throw Error("La presentación admite hasta 300 caracteres.");
      const classes = repository.read("clases", defaultClasses());
      if (
        !Array.isArray(data.claseIds) ||
        data.claseIds.some((id) => !classes.some((lesson) => lesson.id === id))
      )
        throw Error("Elegí clases que estén publicadas.");
      const records = repository.read("profesores", []);
      if (data.id && !records.some((record) => record.id === data.id))
        throw Error("Este profesor ya no existe.");
      const record = {
        id: data.id || crypto.randomUUID(),
        nombre,
        descripcion,
        claseIds: [...new Set(data.claseIds)],
      };
      repository.write(
        "profesores",
        data.id
          ? records.map((item) => (item.id === record.id ? record : item))
          : [...records, record],
      );
    },
    saveClass(data) {
      allow("admin");
      const prepared = prepareClass(data);
      const records = repository
        .read("clases", defaultClasses())
        .map(withClassDetails);
      if (data.id && !records.some((record) => record.id === data.id))
        throw Error(
          "Esta clase ya no existe. Volvé a crearla si la necesitás.",
        );
      const record = { ...prepared, id: data.id || crypto.randomUUID() };
      repository.write(
        "clases",
        data.id
          ? records.map((item) => (item.id === record.id ? record : item))
          : [...records, record],
      );
    },
    removeClass(id) {
      allow("admin");
      repository.write(
        "clases",
        repository
          .read("clases", defaultClasses())
          .filter((item) => item.id !== id),
      );
    },
    saveCourt(c) {
      allow("admin");
      if (
        !["disponible", "ocupada", "reservada", "fuera_de_servicio"].includes(
          c.estado,
        )
      )
        throw Error("Estado inválido.");
      if (c.estado !== "disponible" && !c.motivo?.trim())
        throw Error("Escribí un mensaje breve para este estado.");
      if (
        c.estado === "fuera_de_servicio" &&
        (!validDate(c.desde) ||
          (c.hasta && (!validDate(c.hasta) || c.hasta < c.desde)))
      )
        throw Error("Indicá un período válido.");
      repository.write(
        "cancha",
        c.estado === "fuera_de_servicio"
          ? { ...c, motivo: c.motivo.trim() }
          : c.estado !== "disponible"
            ? {
                estado: c.estado,
                motivo: c.motivo.trim(),
                desde: "",
                hasta: "",
              }
            : { estado: c.estado, motivo: "", desde: "", hasta: "" },
      );
    },
    async savePress(d) {
      allow("admin");
      assertValid(passwordErrors(d.clave, d.clave2));
      if (!d.usuario.trim()) throw Error("Indicá el usuario.");
      repository.write("prensa", {
        usuario: d.usuario.trim(),
        passHash: await password.hash(d.clave),
      });
    },
    saveInfo(d) {
      allow("prensa");
      if (!d.direccion.trim() || !d.horario.trim())
        throw Error("Completá la dirección y los horarios.");
      repository.write("info", { ...d });
    },
    saveActivity(d) {
      allow("prensa");
      const publication = preparePublication(d);
      const records = repository.read("actividades", []),
        record = { ...publication, id: d.id || crypto.randomUUID() };
      repository.write("actividades", [
        ...records.filter((a) => a.id !== record.id),
        record,
      ]);
    },
    removeActivity(id) {
      allow("prensa");
      repository.write(
        "actividades",
        repository.read("actividades", []).filter((a) => a.id !== id),
      );
    },
  };
}
