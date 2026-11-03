export const CONFIG = {
  NOMBRE_SUM: "SUM Municipal",
  MUNICIPALIDAD: "Municipalidad de Bella Vista",

  // ★ Ruta del logo de la Municipalidad, contada desde la carpeta raíz (donde está index.html). Cambiar solo este valor.
  LOGO_RUTA: "/img/Logo.png",

  DIRECCION: "Calle y número a completar, Bella Vista, Tucumán",
  HORARIO_TEXTO: "Todos los días, de 08:00 a 23:00 hs",
  HORA_APERTURA: 8, // hora de apertura (0-23)
  HORA_CIERRE: 23, // hora de cierre (0-23). Los turnos son de 1 hora.

  // ★ Cuenta de Administración predeterminada. Modificar aquí cuando se necesite.
  //   (Nunca se muestran en la interfaz.)
  ADMIN: { usuario: "admin", clave: "admin123" },

  // Cuenta inicial del perfil Prensa (la Administración puede cambiarla desde su sección "Prensa").
  PRENSA: { usuario: "prensa", clave: "adminp123" },

  MI_ARGENTINA_URL: "https://mi.argentina.gob.ar",

  CIUDAD_NOTA: "San Miguel de Tucumán", // ciudad que aparece en la nota formal
  CODIGO_MINUTOS: 10, // duración de los códigos de 4 dígitos

  // Controla únicamente la carga inicial de reservas de ejemplo.
  // La autenticación y los códigos siguen siendo locales; desactivar esta
  // opción no conecta correo ni convierte la aplicación en un sistema productivo.
  MODO_DEMO: true,

  // Contenido informativo de la vista pública (editable)
  INFO: {
    uso: "La cancha se utiliza por turnos de una hora, previa solicitud y aprobación de la Administración. Las reservas pueden hacerse con cuenta verificada.",
    actividades: [
      "Fútbol sala",
      "Básquet",
      "Vóley",
      "Handball",
      "Actividades deportivas y recreativas",
      "Eventos comunitarios y escolares",
    ],
    normas: [
      "Usar calzado deportivo de suela limpia.",
      "Respetar el horario reservado y dejar la cancha ordenada.",
      "No se permite ingresar bebidas alcohólicas.",
      "El solicitante es responsable por los daños que se produzcan durante su turno.",
      "Los menores de edad deben estar acompañados por un adulto responsable.",
    ],
  },
};
