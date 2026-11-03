import { validDate } from "./availability.js";

// Las actividades anteriores no tienen tipo y siguen siendo eventos.
export const isNotice = (publication) => publication.tipo === "aviso";

export function preparePublication(data) {
  const tipo = data.tipo ?? "evento";
  const titulo = (data.titulo || "").trim();
  const descripcion = (data.descripcion || "").trim();

  if (!["evento", "aviso"].includes(tipo))
    throw Error("Elegí si querés publicar un evento o un aviso.");
  if (!titulo || titulo.length > 100)
    throw Error("Completá un título de hasta 100 caracteres.");
  if (descripcion.length > 400)
    throw Error("La descripción admite hasta 400 caracteres.");

  if (tipo === "aviso") {
    if (!descripcion) throw Error("Escribí el mensaje del aviso.");
    return {
      tipo,
      titulo,
      descripcion,
      fecha: "",
      inicio: "",
      fin: "",
      flyer: "",
    };
  }

  const { fecha, inicio = "", fin = "", flyer = "" } = data;
  if (!validDate(fecha))
    throw Error("Completá una fecha válida para el evento.");
  if (
    [inicio, fin].some(
      (time) => time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time),
    )
  )
    throw Error("Indicá un horario válido.");
  if (fin && (!inicio || fin <= inicio))
    throw Error("La hora final debe ser posterior al inicio.");
  if (flyer && !/^data:image\/(jpeg|png|webp);base64,/.test(flyer))
    throw Error("Formato de imagen inválido.");

  return { tipo, titulo, descripcion, fecha, inicio, fin, flyer };
}

export const isPublicationVisible = (publication, today) =>
  isNotice(publication) || publication.fecha >= today;

export function sortPublications(publications) {
  return [...publications].sort((a, b) => {
    const noticeOrder = Number(isNotice(b)) - Number(isNotice(a));
    return (
      noticeOrder ||
      `${a.fecha || ""}${a.inicio || ""}`.localeCompare(
        `${b.fecha || ""}${b.inicio || ""}`,
      )
    );
  });
}
