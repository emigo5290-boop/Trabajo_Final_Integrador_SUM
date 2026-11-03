import { defaultClasses, isScheduleFull } from "../domain/classes.js";
import { enrollmentErrors } from "../domain/class-enrollments.js";
import { assertValid } from "../domain/validation.js";

export function createClassEnrollmentService({
  repository,
  session,
  clock = () => new Date(),
  id = () => crypto.randomUUID(),
}) {
  return {
    register(data) {
      assertValid(enrollmentErrors(data));
      const lesson = repository
        .read("clases", defaultClasses())
        .find((item) => item.id === data.claseId);
      if (!lesson)
        throw Error("La clase ya no está disponible. Elegí otra clase.");
      if (lesson.lleno)
        throw Error("Esta clase está llena. No admite nuevas inscripciones.");
      const horario = lesson.horarios.length
        ? lesson.horarios.find(
            (item) =>
              item.dia === data.horario?.dia &&
              item.inicio === data.horario?.inicio &&
              item.fin === data.horario?.fin,
          )
        : null;
      if (lesson.horarios.length && !horario)
        throw Error(
          "Elegí un horario vigente. Los horarios pueden haber cambiado.",
        );
      if (horario && isScheduleFull(lesson, horario))
        throw Error("Este horario está lleno. Elegí otro horario.");
      const email = data.email.trim().toLowerCase();
      const nombre = data.nombre.trim(),
        apellido = data.apellido.trim();
      const records = repository.read("inscripciones_clases", []);
      const normalize = (value) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
      if (
        records.some(
          (record) =>
            record.claseId === lesson.id &&
            record.email === email &&
            normalize(record.nombre) === normalize(nombre) &&
            normalize(record.apellido) === normalize(apellido),
        )
      )
        throw Error(
          "Ya registraste a esta persona en esta clase con ese correo.",
        );
      const record = {
        id: id(),
        claseId: lesson.id,
        claseNombre: lesson.nombre,
        nombre,
        apellido,
        email,
        telefono: data.telefono.trim(),
        observaciones: (data.observaciones || "").trim(),
        horario: horario ? { ...horario } : null,
        creada: clock().toISOString(),
        consentimiento: true,
      };
      const durable = repository.write("inscripciones_clases", [
        ...records,
        record,
      ]);
      return { ...record, durable };
    },
    list() {
      if (session()?.rol !== "admin")
        throw Error("No tenés permiso para ver las inscripciones.");
      return repository.read("inscripciones_clases", []);
    },
  };
}
