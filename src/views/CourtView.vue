<script setup>
import { reactive, ref } from "vue";
import { useApp } from "../application/context.js";
import { outsideService } from "../domain/availability.js";
import FormField from "../components/FormField.vue";
import CourtStatus from "../components/CourtStatus.vue";
const app = useApp(),
  form = reactive({ ...app.court.value }),
  error = ref("");
const states = {
  disponible: "Disponible (automático según reservas)",
  ocupada: "Ocupada (manual)",
  reservada: "Reservada (manual)",
  fuera_de_servicio: "Fuera de servicio",
};
function save() {
  try {
    app.content.saveCourt(form);
    error.value = "";
    const count = app.reservations.value.filter(
      (r) => r.estado === "aprobada" && outsideService(form, r.fecha),
    ).length;
    app.notify(
      "Estado actualizado." +
        (count
          ? ` Hay ${count} reservas aprobadas en ese período: revisalas en Reservas.`
          : ""),
    );
  } catch (e) {
    error.value = e.message;
  }
}
</script>
<template>
  <div class="stack">
    <CourtStatus admin />
    <form class="bloque form-width" @submit.prevent="save">
      <h2>Administrar el estado</h2>
      <fieldset class="radios">
        <legend>Estado de la cancha</legend>
        <label v-for="(label, state) in states" :key="state" class="radio-op"
          ><input
            v-model="form.estado"
            type="radio"
            :value="state"
            name="estado"
          />{{ label }}</label
        >
      </fieldset>
      <FormField
        v-if="form.estado !== 'disponible'"
        v-model="form.motivo"
        name="motivo"
        label="Mensaje breve"
        maxlength="140"
        required
      />
      <template v-if="form.estado === 'fuera_de_servicio'"
        ><div class="fila2">
          <FormField
            v-model="form.desde"
            name="desde"
            label="Fecha de inicio"
            type="date"
            required
          /><FormField
            v-model="form.hasta"
            name="hasta"
            label="Fecha de finalización (opcional)"
            type="date"
            :min="form.desde"
          /></div
      ></template>
      <p class="err" role="alert">{{ error }}</p>
      <button class="btn btn-primary">Guardar estado</button>
    </form>
  </div>
</template>
