<script setup>
import { reactive, ref, computed, watch } from "vue";
import { useApp } from "../application/context.js";
import { iso, hh, mins, ahoraLocal } from "../domain/date.js";
import { checkAvailability } from "../domain/availability.js";
import { CONFIG } from "../config.js";
import AvailabilityCalendar from "../components/AvailabilityCalendar.vue";
import FormField from "../components/FormField.vue";
import FormalNote from "../components/FormalNote.vue";
const app = useApp(),
  saved = app.temp.read("draft", null),
  form = reactive({
    fecha: iso(new Date()),
    inicio: "",
    fin: "",
    actividad: "",
    observaciones: "",
    ...(saved || {}),
  });
if (form.fecha < iso(new Date())) form.fecha = iso(new Date());
const step = ref("form"),
  error = ref(""),
  reservation = ref(null),
  busy = ref(false);
watch(form, (v) => app.temp.write("draft", { ...v }), { deep: true });
watch(
  () => form.inicio,
  (v) => {
    if (form.fin && mins(form.fin) <= mins(v)) form.fin = "";
  },
);
const starts = Array.from(
  { length: CONFIG.HORA_CIERRE - CONFIG.HORA_APERTURA },
  (_, i) => hh(CONFIG.HORA_APERTURA + i),
);
const ends = computed(() =>
  starts
    .concat(hh(CONFIG.HORA_CIERRE))
    .filter((h) => h > (form.inicio || hh(CONFIG.HORA_APERTURA))),
);
const availability = computed(() =>
  checkAvailability(
    form,
    app.reservations.value,
    app.court.value,
    app.clock.value,
  ),
);
const preview = computed(() => ({
  ...form,
  cliente: app.user.value,
  creada: ahoraLocal(),
  numero: "(se asigna al confirmar)",
}));
function review() {
  error.value = "";
  try {
    app.booking.validate(form);
    step.value = "preview";
  } catch (e) {
    error.value = e.message;
  }
}
function confirm() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    reservation.value = app.booking.request(form);
    app.temp.write("draft", null);
    step.value = "ok";
  } catch (e) {
    error.value = e.message;
    step.value = "form";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="stack">
    <template v-if="step === 'form'"
      ><h2>1. Elegí el día</h2>
      <AvailabilityCalendar v-model="form.fecha" future-only />
      <form class="bloque form-width" @submit.prevent="review">
        <h2>2. Completá la reserva</h2>
        <p>Fecha elegida: {{ form.fecha }}</p>
        <div class="fila2">
          <FormField
            v-model="form.inicio"
            name="inicio"
            label="Hora de inicio"
            :options="starts"
            required
          /><FormField
            v-model="form.fin"
            name="fin"
            label="Hora de finalización"
            :options="ends"
            required
          />
        </div>
        <p v-if="form.inicio && form.fin" class="disp" role="status">
          {{
            availability.ok
              ? "El horario elegido está disponible."
              : availability.motivo
          }}
        </p>
        <FormField
          v-model="form.actividad"
          name="actividad"
          label="Actividad o motivo"
          :options="['Vóley', 'Básquet']"
          required
        /><FormField
          v-model="form.observaciones"
          name="observaciones"
          label="Observaciones (opcional)"
          type="textarea"
          maxlength="400"
        />
        <p class="err" role="alert">{{ error }}</p>
        <button class="btn btn-primary">
          Comprobar disponibilidad y ver nota
        </button>
      </form></template
    ><template v-else-if="step === 'preview'"
      ><h2>Revisá la nota antes de confirmar</h2>
      <FormalNote :reservation="preview" />
      <div class="actions">
        <button class="btn btn-sec" @click="step = 'form'">
          Volver a editar</button
        ><button class="btn btn-primary" :disabled="busy" @click="confirm">
          Confirmar solicitud
        </button>
      </div></template
    >
    <section v-else class="bloque exito">
      <h2>Solicitud enviada</h2>
      <p>La Administración revisará tu solicitud. Estado: pendiente.</p>
      <p>{{ reservation.numero }}</p>
      <div class="actions">
        <button class="btn btn-primary" @click="app.pdf.note(reservation)">
          Descargar nota en PDF</button
        ><RouterLink class="btn btn-sec" to="/cliente"
          >Ver mis reservas</RouterLink
        >
      </div>
    </section>
  </div>
</template>
