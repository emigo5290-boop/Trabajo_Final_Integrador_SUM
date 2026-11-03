<script setup>
import { computed } from "vue";
import { useApp } from "../application/context.js";
import { currentStatus } from "../domain/availability.js";
import { fechaCorta } from "../domain/date.js";
import ReserveButton from "./ReserveButton.vue";
defineProps({ reserve: Boolean, admin: Boolean });
const app = useApp();
const status = computed(() =>
  currentStatus(app.reservations.value, app.court.value, app.clock.value),
);
const labels = {
  libre: "LIBRE",
  ocupada: "OCUPADA",
  reservada: "RESERVADA",
  fuera: "FUERA DE SERVICIO",
};
</script>
<template>
  <section
    class="marcador"
    :class="{ 'marcador--admin': admin }"
    aria-label="Estado actual de la cancha"
  >
    <div :class="'t-' + status.clave" aria-live="polite" id="card-estado">
      <h2 class="mar-estado" :class="{ largo: status.clave === 'fuera' }">
        <span class="lampara" aria-hidden="true" />{{ labels[status.clave] }}
      </h2>
      <p v-if="status.motivo" class="mar-nota">{{ status.motivo }}</p>
      <p v-if="status.hasta" class="mar-nota">
        Hasta {{ fechaCorta(status.hasta) }}
      </p>
      <dl v-if="status.ref" class="mar-horas">
        <div>
          <dt>Desde</dt>
          <dd>{{ status.ref.inicio }}</dd>
        </div>
        <div>
          <dt>Hasta</dt>
          <dd>{{ status.ref.fin }}</dd>
        </div>
      </dl>
      <div v-if="status.proxima" class="mar-prox">
        <span>Próxima reserva</span><b>{{ fechaCorta(status.proxima.fecha) }}</b
        ><b>{{ status.proxima.inicio }} – {{ status.proxima.fin }}</b>
      </div>
    </div>
    <ReserveButton v-if="reserve" class="btn-cta" />
    <slot />
  </section>
</template>
