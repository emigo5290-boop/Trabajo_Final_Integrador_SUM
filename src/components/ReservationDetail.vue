<script setup>
import { ref } from "vue";
import AppModal from "./AppModal.vue";
import FormalNote from "./FormalNote.vue";
import StatusBadge from "./StatusBadge.vue";
import { useApp } from "../application/context.js";
import { fechaCorta } from "../domain/date.js";
defineProps({ reservation: Object });
defineEmits(["close"]);
const note = ref(false),
  app = useApp();
</script>
<template>
  <AppModal title="Detalle de la solicitud" @close="$emit('close')"
    ><FormalNote v-if="note" :reservation="reservation" />
    <dl v-else class="dl">
      <dt>Solicitud</dt>
      <dd>{{ reservation.numero }}</dd>
      <dt>Solicitante</dt>
      <dd>
        {{ reservation.cliente.nombre }} {{ reservation.cliente.apellido }}
      </dd>
      <dt>DNI</dt>
      <dd>{{ reservation.cliente.dni }}</dd>
      <dt>Email</dt>
      <dd>{{ reservation.cliente.email }}</dd>
      <dt>Fecha de solicitud</dt>
      <dd>{{ fechaCorta(reservation.creada) }}</dd>
      <dt>Fecha de uso</dt>
      <dd>{{ fechaCorta(reservation.fecha) }}</dd>
      <dt>Horario</dt>
      <dd>{{ reservation.inicio }} – {{ reservation.fin }}</dd>
      <dt>Actividad</dt>
      <dd>{{ reservation.actividad }}</dd>
      <dt>Observaciones</dt>
      <dd>{{ reservation.observaciones || "Sin observaciones" }}</dd>
      <dt>Estado</dt>
      <dd><StatusBadge :status="reservation.estado" /></dd>
      <template v-if="reservation.motivoCancelacion">
        <dt>Motivo de la cancelación</dt>
        <dd>{{ reservation.motivoCancelacion }}</dd>
      </template>
    </dl>
    <template #actions
      ><button class="btn btn-sec" @click="note = !note">
        {{ note ? "Ver datos" : "Ver nota formal" }}</button
      ><button class="btn btn-primary" @click="app.pdf.note(reservation)">
        Descargar PDF
      </button></template
    ></AppModal
  >
</template>
