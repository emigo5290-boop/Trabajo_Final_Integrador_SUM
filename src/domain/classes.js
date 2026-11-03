import photos from "./class-photos.json" with { type: "json" };

export const CLASS_PHOTOS = photos;
export const isScheduleFull = (lesson, schedule) =>
  lesson.lleno === true ||
  schedule.lleno === true ||
  (lesson.diasLlenos || []).includes(schedule.dia);
export const CLASS_DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// Solo se usan cuando aún no existe un listado guardado, nunca sobre uno vacío.
export function defaultClasses() {
  return [
    [
      "basquet",
      "Básquet",
      "Práctica de pases, dribbling y lanzamientos al aro, con ejercicios de coordinación y juegos en equipo.",
    ],
    [
      "voley",
      "Vóley",
      "Ejercicios de saque, recepción, armado y remate para aprender a jugar en equipo y mejorar el control de la pelota.",
    ],
    [
      "handball",
      "Handball",
      "Pases, desplazamientos y lanzamientos al arco, combinados con juegos para trabajar la defensa y el ataque en equipo.",
    ],
    [
      "taekwondo",
      "Taekwondo",
      "Práctica de posiciones, patadas y secuencias técnicas, con ejercicios de coordinación, concentración y respeto por los compañeros.",
    ],
    [
      "gimnasia-artistica",
      "Gimnasia artística",
      "Ejercicios de equilibrio, saltos y movimientos de suelo para trabajar la coordinación, la flexibilidad y el control corporal.",
    ],
    [
      "gimnasia-en-tela",
      "Gimnasia en tela",
      "Exploración de figuras y secuencias en telas aéreas, con trabajo de fuerza, flexibilidad y expresión corporal.",
    ],
  ].map(([id, nombre, descripcion]) => ({
    id,
    nombre,
    descripcion,
    imagen: photos[id].src,
    horarios: [],
  }));
}

export function withClassDetails(lesson) {
  if (Object.hasOwn(lesson, "imagen")) return lesson;
  const original = defaultClasses().find(
    (item) => item.id === lesson.id && item.nombre === lesson.nombre,
  );
  return {
    ...lesson,
    descripcion: lesson.descripcion || original?.descripcion || "",
    imagen: original?.imagen || "",
  };
}

export const classPhotoCredit = (src) =>
  Object.values(photos).find((photo) => photo.src === src);

export function prepareClass(data) {
  const diasLlenos = data.diasLlenos ?? [];
  if (
    !Array.isArray(diasLlenos) ||
    diasLlenos.some((day) => !CLASS_DAYS.includes(day))
  )
    throw Error("Revisá los días marcados como clase llena.");
  const nombre = (data.nombre || "").trim();
  const descripcion = (data.descripcion || "").trim();
  const imagen = data.imagen || "";
  if (
    imagen &&
    !classPhotoCredit(imagen) &&
    (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      imagen,
    ) ||
      imagen.length > 2000000)
  )
    throw Error("Elegí una foto JPG, PNG o WebP de menor tamaño.");
  if (!nombre || nombre.length > 80)
    throw Error("Completá el nombre de la clase con hasta 80 caracteres.");
  if (descripcion.length > 300)
    throw Error("La descripción admite hasta 300 caracteres.");
  if (!Array.isArray(data.horarios))
    throw Error("Revisá los horarios de la clase.");

  const horarios = data.horarios.map((horario, index) => {
    const { dia, inicio, fin } = horario || {};
    if (
      !CLASS_DAYS.includes(dia) ||
      ![inicio, fin].every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    )
      throw Error(`Completá el día, inicio y fin del horario ${index + 1}.`);
    if (fin <= inicio)
      throw Error(
        `La hora de fin del horario ${index + 1} debe ser posterior al inicio.`,
      );
    return {
      dia,
      inicio,
      fin,
      ...(horario.lleno === true ? { lleno: true } : {}),
    };
  });
  horarios.sort(
    (a, b) =>
      CLASS_DAYS.indexOf(a.dia) - CLASS_DAYS.indexOf(b.dia) ||
      a.inicio.localeCompare(b.inicio),
  );
  for (let i = 1; i < horarios.length; i++) {
    const previous = horarios[i - 1],
      current = horarios[i];
    if (previous.dia === current.dia && current.inicio < previous.fin)
      throw Error(
        `Los horarios del ${current.dia.toLocaleLowerCase("es")} se superponen.`,
      );
  }
  return {
    nombre,
    descripcion,
    imagen,
    horarios,
    ...(data.lleno === true ? { lleno: true } : {}),
    ...(diasLlenos.length
      ? { diasLlenos: CLASS_DAYS.filter((day) => diasLlenos.includes(day)) }
      : {}),
  };
}
