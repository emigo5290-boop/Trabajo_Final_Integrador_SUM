<script setup>
import { computed, ref } from "vue";
import { useApp } from "../application/context.js";
import { scheduleLabel } from "../domain/class-enrollments.js";
import FormField from "../components/FormField.vue";
const app = useApp(),
  selected = ref("");
const names = computed(() =>
  [
    ...new Set(app.classEnrollments.value.map((item) => item.claseNombre)),
  ].sort(),
);
const records = computed(() =>
  [...app.classEnrollments.value]
    .filter((item) => !selected.value || item.claseNombre === selected.value)
    .reverse(),
);
const dateLabel = (value) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
</script>

<template>
  <RouterLink class="class-back" to="/administracion/clases"
    >← Administrar clases</RouterLink
  >
  <p class="sub">
    Consultá las solicitudes de inscripción y sus datos de contacto para
    coordinar la asistencia.
  </p>
  <FormField
    v-if="names.length"
    v-model="selected"
    name="enrollment-filter"
    label="Filtrar por clase"
    :options="names"
  />
  <p>
    {{ records.length }}
    {{ records.length === 1 ? "inscripción" : "inscripciones" }}
  </p>
  <div class="classes-grid">
    <article
      v-for="record in records"
      :key="record.id"
      class="class-card enrollment-record"
    >
      <h2>{{ record.nombre }} {{ record.apellido }}</h2>
      <p>
        <strong>{{ record.claseNombre }}</strong>
      </p>
      <p>
        {{
          record.horario
            ? scheduleLabel(record.horario)
            : "Horarios a confirmar"
        }}
      </p>
      <p>
        Correo: <a :href="`mailto:${record.email}`">{{ record.email }}</a>
      </p>
      <p>
        Teléfono:
        <a :href="`tel:${record.telefono.replace(/[^+\d]/g, '')}`">{{
          record.telefono
        }}</a>
      </p>
      <p v-if="record.observaciones" class="class-description">
        {{ record.observaciones }}
      </p>
      <small>Registrada el {{ dateLabel(record.creada) }}</small>
    </article>
  </div>
  <p v-if="!records.length" class="vacio-msg">
    No hay inscripciones para mostrar.
  </p>
</template>
