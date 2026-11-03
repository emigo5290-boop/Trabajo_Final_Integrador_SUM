<script setup>
import { computed, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { useApp } from "../application/context.js";
import { scheduleLabel } from "../domain/class-enrollments.js";
import { isScheduleFull } from "../domain/classes.js";
import FormField from "../components/FormField.vue";

const app = useApp(),
  route = useRoute();
const lesson = computed(() =>
  app.classes.value.find((item) => item.id === route.params.id),
);
const form = reactive({
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  horario: "",
  observaciones: "",
  consentimiento: false,
});
const closed = computed(
  () =>
    lesson.value?.lleno ||
    (lesson.value?.horarios.length > 0 &&
      lesson.value.horarios.every((item) =>
        isScheduleFull(lesson.value, item),
      )),
);
const selectedFull = computed(() =>
  lesson.value?.horarios.some(
    (item) =>
      isScheduleFull(lesson.value, item) &&
      scheduleLabel(item) === form.horario,
  ),
);
const errors = ref({}),
  error = ref(""),
  receipt = ref(null),
  busy = ref(false);
function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  errors.value = {};
  try {
    app.notify("");
    receipt.value = app.enrollments.register({
      ...form,
      claseId: route.params.id,
      horario:
        lesson.value?.horarios.find(
          (item) => scheduleLabel(item) === form.horario,
        ) || null,
    });
  } catch (e) {
    errors.value = e.fields || {};
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="seccion enrollment-page">
    <RouterLink class="class-back" to="/clases"
      >← Volver a las clases</RouterLink
    >
    <template v-if="receipt">
      <div class="bloque enrollment-receipt" role="status">
        <h1 class="pag-tit">Inscripción registrada</h1>
        <p>
          <strong>{{ receipt.nombre }} {{ receipt.apellido }}</strong
          >, registramos tu inscripción a
          <strong>{{ receipt.claseNombre }}</strong
          >.
        </p>
        <p v-if="receipt.horario">
          Horario: {{ scheduleLabel(receipt.horario) }}.
        </p>
        <p v-else>El horario de la clase está a confirmar.</p>
        <p>
          La inscripción queda pendiente de confirmación de cupo por el SUM.
        </p>
        <p v-if="!receipt.durable" class="err">
          El navegador no pudo conservar la inscripción al cerrar. Mantené esta
          página abierta para no perderla.
        </p>
        <RouterLink class="btn btn-primary" to="/clases"
          >Ver otras clases</RouterLink
        >
      </div>
    </template>
    <template v-else-if="lesson">
      <h1 class="pag-tit">Inscripción a {{ lesson.nombre }}</h1>
      <p class="sub">
        Completá los datos de la persona que asistirá y un contacto para
        gestionar la inscripción. No necesitás crear una cuenta.
      </p>
      <p v-if="closed" class="aviso-caja" role="status">
        Lleno. Esta clase no admite nuevas inscripciones.
      </p>
      <form v-else class="bloque" @submit.prevent="submit">
        <div class="fila2">
          <FormField
            v-model="form.nombre"
            name="enrollment-name"
            label="Nombre"
            autocomplete="given-name"
            maxlength="80"
            :error="errors.nombre"
            required
          />
          <FormField
            v-model="form.apellido"
            name="enrollment-surname"
            label="Apellido"
            autocomplete="family-name"
            maxlength="80"
            :error="errors.apellido"
            required
          />
        </div>
        <FormField
          v-model="form.email"
          name="enrollment-email"
          label="Correo de contacto"
          type="email"
          autocomplete="email"
          maxlength="150"
          :error="errors.email"
          required
        />
        <FormField
          v-model="form.telefono"
          name="enrollment-phone"
          label="Teléfono de contacto"
          type="tel"
          autocomplete="tel"
          maxlength="30"
          help="Incluí el código de área. Si inscribís a un menor, usá los datos de contacto de una persona adulta responsable."
          :error="errors.telefono"
          required
        />
        <div v-if="lesson.horarios.length" class="campo">
          <label for="enrollment-schedule">Horario de la clase</label>
          <select id="enrollment-schedule" v-model="form.horario" required>
            <option value="">Elegí un horario</option>
            <option
              v-for="schedule in lesson.horarios"
              :key="scheduleLabel(schedule)"
              :value="scheduleLabel(schedule)"
              :disabled="isScheduleFull(lesson, schedule)"
            >
              {{ scheduleLabel(schedule)
              }}{{ isScheduleFull(lesson, schedule) ? " · Lleno" : "" }}
            </option>
          </select>
          <p v-if="selectedFull" class="err" role="alert">
            Este horario está lleno. Elegí otro horario.
          </p>
        </div>
        <p v-else class="class-enrollment-pending">
          Horarios a confirmar. Podés registrar tu inscripción ahora y consultar
          el horario más adelante.
        </p>
        <FormField
          v-model="form.observaciones"
          name="enrollment-notes"
          label="Consulta o comentario (opcional)"
          type="textarea"
          rows="3"
          maxlength="300"
          :error="errors.observaciones"
        />
        <label class="enrollment-consent"
          ><input
            v-model="form.consentimiento"
            type="checkbox"
            required
            :aria-invalid="!!errors.consentimiento"
          /><span
            >Acepto que el SUM use estos datos para gestionar mi inscripción y
            contactarme sobre esta clase.</span
          ></label
        >
        <p v-if="errors.consentimiento" class="err">
          {{ errors.consentimiento }}
        </p>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <div class="actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="busy || selectedFull"
          >
            {{ busy ? "Registrando…" : "Enviar inscripción" }}</button
          ><RouterLink class="btn btn-sec" to="/clases">Cancelar</RouterLink>
        </div>
      </form>
    </template>
    <div v-else class="bloque">
      <h1 class="pag-tit">Clase no disponible</h1>
      <p>
        Esta clase ya no está publicada. Podés consultar las demás actividades.
      </p>
      <RouterLink class="btn btn-primary" to="/clases">Ver clases</RouterLink>
    </div>
  </section>
</template>
