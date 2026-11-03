<script setup>
import { computed } from "vue";
import { useApp } from "../application/context.js";
import { iso, fechaCorta } from "../domain/date.js";
import { sortReservations } from "../domain/availability.js";
import CourtStatus from "../components/CourtStatus.vue";
import CalendarView from "./CalendarView.vue";
import MyReservationsView from "./MyReservationsView.vue";
const app = useApp();
const today = computed(() => iso(app.clock.value));
const upcoming = computed(() =>
  sortReservations(
    app.reservations.value.filter(
      (r) => r.estado === "aprobada" && r.fecha >= today.value,
    ),
  ),
);
const states = {
  pendiente: "Pendientes",
  aprobada: "Aprobadas",
  rechazada: "Rechazadas",
};
</script>
<template>
  <CourtStatus
    :class="{ 'marcador--resumen': app.session.value.rol === 'admin' }"
    :admin="app.session.value.rol === 'admin'"
  >
    <div v-if="app.session.value.rol === 'admin'" class="cifras">
      <RouterLink
        v-for="(label, state) in states"
        :key="state"
        :to="{
          path:
            state === 'pendiente'
              ? '/administracion/solicitudes'
              : '/administracion/reservas',
          query: { estado: state },
        }"
        ><b>{{
          app.reservations.value.filter((r) => r.estado === state).length
        }}</b>
        <span>{{ label }}</span></RouterLink
      >
    </div>
  </CourtStatus>
  <template v-if="app.session.value.rol === 'admin'">
    <section class="seccion" aria-labelledby="admin-calendar-title">
      <h2 id="admin-calendar-title">Calendario de disponibilidad</h2>
      <p class="sub">
        Elegí un día para consultar los horarios y ver el detalle de las
        reservas.
      </p>
      <CalendarView />
    </section>
    <div class="dos-col">
      <section
        v-for="isToday in [true, false]"
        :key="String(isToday)"
        class="bloque"
      >
        <h2>{{ isToday ? "Reservas del día" : "Próximas reservas" }}</h2>
        <ul class="lista">
          <li
            v-for="r in upcoming
              .filter((r) => (isToday ? r.fecha === today : r.fecha > today))
              .slice(0, isToday ? undefined : 6)"
            :key="r.id"
            class="fila"
          >
            <div>
              <strong>{{ r.actividad }}</strong
              ><small
                >{{ fechaCorta(r.fecha) }} · {{ r.inicio }} – {{ r.fin }} ·
                {{ r.cliente.nombre }} {{ r.cliente.apellido }}</small
              >
            </div>
          </li>
        </ul>
        <p
          v-if="
            !upcoming.some((r) =>
              isToday ? r.fecha === today : r.fecha > today,
            )
          "
          class="vacio-msg"
        >
          No hay reservas aprobadas.
        </p>
      </section>
    </div>
  </template>
  <section
    v-else-if="app.session.value.rol === 'cliente'"
    class="seccion"
    aria-labelledby="client-reservations-title"
  >
    <div class="client-reservations-header">
      <h2 id="client-reservations-title">Mis reservas</h2>
      <RouterLink class="btn btn-primary btn-chico" to="/cliente/reservar">
        Reservar cancha
      </RouterLink>
    </div>
    <MyReservationsView />
  </section>
</template>
