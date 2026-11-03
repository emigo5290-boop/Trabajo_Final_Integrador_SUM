<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useApp } from "../application/context.js";
import { sortReservations } from "../domain/availability.js";
import { fechaCorta } from "../domain/date.js";
import StatusBadge from "../components/StatusBadge.vue";
import ReservationDetail from "../components/ReservationDetail.vue";
import AppModal from "../components/AppModal.vue";
import ReportDialog from "../components/ReportDialog.vue";
import FormField from "../components/FormField.vue";
const props = defineProps({ requests: Boolean }),
  app = useApp(),
  route = useRoute(),
  selectedId = ref(null),
  pending = ref(null),
  report = ref(false),
  error = ref("");
const stateFilter = computed(() =>
  !props.requests && ["aprobada", "rechazada"].includes(route.query.estado)
    ? route.query.estado
    : null,
);
const records = computed(() =>
  sortReservations(
    app.reservations.value.filter((r) =>
      props.requests
        ? r.estado === "pendiente"
        : stateFilter.value
          ? r.estado === stateFilter.value
          : ["aprobada", "rechazada"].includes(r.estado),
    ),
  ),
);
const selected = computed(() =>
  app.reservations.value.find((r) => r.id === selectedId.value),
);
const approvedCount = computed(
  () => app.reservations.value.filter((r) => r.estado === "aprobada").length,
);
function confirmDecision() {
  if (!pending.value.all) {
    decide(pending.value.r.id, pending.value.state, pending.value.reason);
    return;
  }
  error.value = "";
  try {
    const count = app.booking.cancelAll(pending.value.reason);
    app.notify(`${count} reservas canceladas.`);
    pending.value = null;
  } catch (e) {
    error.value = e.message;
  }
}
function decide(id, value, reason = "") {
  error.value = "";
  try {
    app.booking.decide(id, value, reason);
    app.notify("Solicitud actualizada.");
    pending.value = null;
  } catch (e) {
    error.value = e.message;
  }
}
</script>
<template>
  <div v-if="!requests" class="barra">
    <p>
      {{ records.length }} reservas
      {{
        stateFilter === "aprobada"
          ? "aprobadas"
          : stateFilter === "rechazada"
            ? "rechazadas"
            : "registradas"
      }}
    </p>
    <div class="actions">
      <RouterLink
        v-if="stateFilter"
        to="/administracion/reservas"
        class="btn btn-sec"
      >
        Ver todas las reservas
      </RouterLink>
      <button class="btn btn-primary" @click="report = true">
        Generar informe PDF
      </button>
      <button
        class="btn btn-peligro"
        :disabled="!approvedCount"
        @click="
          error = '';
          pending = {
            all: true,
            state: 'cancelada',
            label: 'Cancelar todas las reservas',
            reason: '',
          };
        "
      >
        Cancelar todas las reservas
      </button>
    </div>
  </div>
  <p v-if="error" class="err" role="alert">{{ error }}</p>
  <div class="stack">
    <article v-for="r in records" :key="r.id" class="tarjeta-sol">
      <div class="cab-sol">
        <h2>{{ r.cliente.nombre }} {{ r.cliente.apellido }}</h2>
        <StatusBadge :status="r.estado" />
      </div>
      <p>
        {{ fechaCorta(r.fecha) }} · {{ r.inicio }} – {{ r.fin }} ·
        {{ r.actividad }}
      </p>
      <div class="actions">
        <button class="btn btn-sec btn-chico" @click="selectedId = r.id">
          Ver solicitud y nota</button
        ><button class="btn btn-sec btn-chico" @click="app.pdf.note(r)">
          Descargar PDF</button
        ><template v-if="r.estado === 'pendiente'"
          ><button
            class="btn btn-primary btn-chico"
            @click="decide(r.id, 'aprobada')"
          >
            Aprobar</button
          ><button
            class="btn btn-peligro btn-chico"
            @click="
              pending = { r, state: 'rechazada', label: 'Rechazar solicitud' }
            "
          >
            Rechazar
          </button></template
        ><button
          v-if="!requests && r.estado === 'rechazada'"
          class="btn btn-primary btn-chico"
          @click="decide(r.id, 'aprobada')"
        >
          Volver a aceptar
        </button>
        <button
          v-if="!requests && r.estado === 'aprobada'"
          class="btn btn-peligro btn-chico"
          @click="
            pending = {
              r,
              state: 'cancelada',
              label: 'Cancelar reserva',
              reason: '',
            }
          "
        >
          Cancelar
        </button>
      </div>
    </article>
    <p v-if="!records.length" class="bloque">
      {{
        requests
          ? "No hay solicitudes pendientes para mostrar."
          : stateFilter === "aprobada"
            ? "No hay reservas aprobadas para mostrar."
            : stateFilter === "rechazada"
              ? "No hay reservas rechazadas para mostrar."
              : "No hay reservas aprobadas o rechazadas para mostrar."
      }}
    </p>
  </div>
  <ReservationDetail
    v-if="selected"
    :reservation="selected"
    @close="selectedId = null"
  /><ReportDialog v-if="report" @close="report = false" /><AppModal
    v-if="pending"
    :title="pending.label"
    @close="pending = null"
    ><p v-if="pending.all">
      Se cancelarán las {{ approvedCount }} reservas aprobadas. El motivo
      quedará guardado en cada reserva y sus horarios quedarán disponibles.
    </p>
    <p v-else>
      {{ pending.label }} de {{ pending.r.cliente.nombre }}
      {{ pending.r.cliente.apellido }} del {{ fechaCorta(pending.r.fecha) }}. El
      horario quedará disponible.
    </p>
    <form id="reservation-decision" @submit.prevent="confirmDecision">
      <FormField
        v-if="pending.state === 'cancelada'"
        v-model="pending.reason"
        name="motivo-cancelacion"
        label="Motivo de la cancelación"
        type="textarea"
        required
      />
      <p v-if="error" class="err" role="alert">{{ error }}</p>
    </form>
    <template #actions
      ><button class="btn btn-sec" @click="pending = null">Volver</button
      ><button
        class="btn btn-peligro"
        type="submit"
        form="reservation-decision"
        :disabled="pending.state === 'cancelada' && !pending.reason.trim()"
      >
        {{ pending.label }}
      </button></template
    ></AppModal
  >
</template>
