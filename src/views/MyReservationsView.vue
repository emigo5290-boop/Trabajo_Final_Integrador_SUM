<script setup>
import { computed } from "vue";
import { useApp } from "../application/context.js";
import { sortReservations } from "../domain/availability.js";
import { iso, mins, fechaCorta } from "../domain/date.js";
import StatusBadge from "../components/StatusBadge.vue";
const app = useApp();
const records = computed(() =>
  sortReservations(
    app.reservations.value.filter(
      (r) =>
        r.userId === app.user.value?.id &&
        (r.fecha > iso(app.clock.value) ||
          (r.fecha === iso(app.clock.value) &&
            mins(r.fin) >
              app.clock.value.getHours() * 60 + app.clock.value.getMinutes())),
    ),
  ),
);
</script>
<template>
  <p class="sub">Tus reservas actuales y próximas.</p>
  <div class="stack">
    <article v-for="r in records" :key="r.id" class="tarjeta-sol">
      <div class="cab-sol">
        <h3>{{ fechaCorta(r.fecha) }}</h3>
        <StatusBadge :status="r.estado" />
      </div>
      <p>{{ r.inicio }} – {{ r.fin }} · {{ r.actividad }}</p>
      <button class="btn btn-sec" @click="app.pdf.note(r)">
        Descargar nota en PDF
      </button>
    </article>
    <section v-if="!records.length" class="bloque">
      <p>No tenés reservas actuales ni próximas.</p>
    </section>
  </div>
</template>
