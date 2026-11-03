import { inject, ref, computed } from "vue";
import { CONFIG } from "../config.js";
import { createAuthService } from "./auth.js";
import { createReservationService } from "./reservations.js";
import { createContentService } from "./content.js";
import { defaultClasses, withClassDetails } from "../domain/classes.js";
import { createClassEnrollmentService } from "./class-enrollments.js";
export const AppKey = Symbol("SUM services");
export function useApp() {
  const app = inject(AppKey);
  if (!app) throw Error("Falta el contexto de aplicación.");
  return app;
}
export function createApplication({ storage, temp, password, pdf, flyer }) {
  const revision = ref(0),
    notice = ref(""),
    clock = ref(new Date());
  let noticeTimer;
  function notify(message) {
    clearTimeout(noticeTimer);
    notice.value = message;
    if (message)
      noticeTimer = setTimeout(() => {
        notice.value = "";
      }, 3000);
  }
  const repository = {
    read: (...args) => storage.read(...args),
    write: (...args) => {
      const durable = storage.write(...args);
      revision.value++;
      if (!durable)
        notify(
          "Los datos se guardaron en memoria: el navegador no permite conservarlos al cerrar.",
        );
      return durable;
    },
  };
  const read = (key, fallback) => {
    revision.value;
    return repository.read(key, fallback);
  };
  const session = computed(() => read("sesion", null));
  const user = computed(() =>
    session.value?.rol === "cliente"
      ? read("usuarios", []).find((u) => u.id === session.value.id)
      : null,
  );
  const court = computed(() =>
    read("cancha", { estado: "disponible", motivo: "", desde: "", hasta: "" }),
  );
  const reservations = computed(() => read("reservas", [])),
    activities = computed(() => read("actividades", []));
  const classes = computed(() =>
    read("clases", defaultClasses()).map(withClassDetails),
  );
  const info = computed(() => ({
    ...{
      direccion: CONFIG.DIRECCION,
      horario: CONFIG.HORARIO_TEXTO,
      ...CONFIG.INFO,
    },
    ...read("info", {}),
  }));
  const deps = {
    repository,
    temp,
    password,
    session: () => session.value,
    user: () => user.value,
  };
  const auth = createAuthService(deps),
    booking = createReservationService(deps),
    content = createContentService(deps),
    enrollments = createClassEnrollmentService(deps);
  const refresh = () => {
    revision.value++;
    clock.value = new Date();
    if (
      session.value?.rol === "cliente" &&
      (!user.value?.verificado || user.value?.acceso !== "aprobado")
    )
      repository.write("sesion", null);
  };
  return {
    session,
    user,
    pendingAccounts: computed(() =>
      session.value?.rol === "admin"
        ? read("usuarios", []).filter((u) => u.acceso === "pendiente")
        : [],
    ),
    court,
    reservations,
    activities,
    classes,
    teachers: computed(() =>
      session.value?.rol === "admin" ? read("profesores", []) : [],
    ),
    classEnrollments: computed(() =>
      session.value?.rol === "admin" ? read("inscripciones_clases", []) : [],
    ),
    enrollments,
    info,
    notice,
    notify,
    clock,
    refresh,
    auth,
    booking,
    content,
    pdf,
    flyer,
    temp,
    pressName: () => read("prensa", null)?.usuario || CONFIG.PRENSA.usuario,
  };
}
