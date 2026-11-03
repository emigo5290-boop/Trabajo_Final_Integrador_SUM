import { createRouter, createWebHashHistory } from "vue-router";
import PublicView from "../views/PublicView.vue";
import AuthView from "../views/AuthView.vue";
import DashboardView from "../views/DashboardView.vue";
import BookingView from "../views/BookingView.vue";
import ProfileView from "../views/ProfileView.vue";
import ReservationsView from "../views/ReservationsView.vue";
import CourtView from "../views/CourtView.vue";
import ClassesView from "../views/ClassesView.vue";
import TeachersView from "../views/TeachersView.vue";
import PublicClassesView from "../views/PublicClassesView.vue";
import ClassEnrollmentView from "../views/ClassEnrollmentView.vue";
import ClassEnrollmentsView from "../views/ClassEnrollmentsView.vue";
import AccountVerificationView from "../views/AccountVerificationView.vue";
import PressAccessView from "../views/PressAccessView.vue";
import PressView from "../views/PressView.vue";
export const home = (role) =>
  ({ cliente: "/cliente", admin: "/administracion", prensa: "/prensa" })[
    role
  ] || "/";
export const menus = {
  cliente: [
    ["/cliente", "Inicio"],
    ["/cliente/reservar", "Reservar cancha"],
    ["/cliente/perfil", "Perfil"],
  ],
  admin: [
    ["/administracion", "Inicio"],
    ["/administracion/reservas", "Reservas"],
    ["/administracion/solicitudes", "Solicitudes"],
    ["/administracion/verificacion-cuentas", "Verificación de cuentas"],
    ["/administracion/cancha", "Cancha"],
    ["/administracion/clases", "Clases"],
    ["/administracion/profesores", "Profesores"],
    ["/administracion/prensa", "Prensa"],
  ],
};
export function createAppRouter(app) {
  const secure = (path, component, role, title, props) => ({
    path,
    component,
    meta: { role, title },
    props,
  });
  const router = createRouter({
    history: createWebHashHistory(),
    scrollBehavior: () => ({ top: 0 }),
    routes: [
      { path: "/", component: PublicView, meta: { title: "SUM Municipal" } },
      {
        path: "/clases",
        component: PublicClassesView,
        meta: { title: "Clases" },
      },
      {
        path: "/clases/:id/inscripcion",
        component: ClassEnrollmentView,
        meta: { title: "Inscripción a clases" },
      },
      ...["login", "registro", "verificacion", "recuperar", "nueva-clave"].map(
        (mode) => ({
          path: "/" + mode,
          component: AuthView,
          props: { mode },
          meta: { title: "Acceso al SUM" },
        }),
      ),
      secure("/cliente", DashboardView, "cliente", "Inicio"),
      secure("/cliente/reservar", BookingView, "cliente", "Reservar cancha"),
      { path: "/cliente/reservas", redirect: "/cliente" },
      secure("/cliente/perfil", ProfileView, "cliente", "Perfil"),
      secure("/administracion", DashboardView, "admin", "Inicio"),
      { path: "/administracion/calendario", redirect: "/administracion" },
      secure(
        "/administracion/reservas",
        ReservationsView,
        "admin",
        "Reservas",
        { requests: false },
      ),
      secure(
        "/administracion/solicitudes",
        ReservationsView,
        "admin",
        "Solicitudes",
        { requests: true },
      ),
      secure("/administracion/cancha", CourtView, "admin", "Cancha"),
      secure("/administracion/clases", ClassesView, "admin", "Clases"),
      secure("/administracion/profesores", TeachersView, "admin", "Profesores"),
      secure(
        "/administracion/clases/inscripciones",
        ClassEnrollmentsView,
        "admin",
        "Inscripciones a clases",
      ),
      secure(
        "/administracion/verificacion-cuentas",
        AccountVerificationView,
        "admin",
        "Verificación de cuentas",
      ),
      secure("/administracion/prensa", PressAccessView, "admin", "Prensa"),
      secure("/prensa", PressView, "prensa", "Prensa"),
      { path: "/prensa/actividades", redirect: "/prensa" },
      { path: "/prensa/informacion", redirect: "/prensa" },
      { path: "/:pathMatch(.*)*", redirect: "/" },
    ],
  });
  router.beforeEach((to) => {
    app.refresh();
    if (to.meta.role && app.session.value?.rol !== to.meta.role)
      return app.session.value
        ? home(app.session.value.rol)
        : { path: "/login", query: { next: to.path } };
    if (to.path === "/verificacion" && !app.temp.read("verification", null))
      return "/login";
    if (to.path === "/nueva-clave") {
      const v = app.temp.read("verification", null);
      if (!v?.validado || v.expira <= Date.now()) return "/recuperar";
    }
  });
  router.afterEach((to) => {
    document.title = `${to.meta.title} · SUM Municipal`;
  });
  return router;
}
