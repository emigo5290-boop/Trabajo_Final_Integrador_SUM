<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useApp } from "../application/context.js";
import { iso } from "../domain/date.js";
import AppModal from "./AppModal.vue";
import FormField from "./FormField.vue";
import PublicationIcon from "./PublicationIcon.vue";
const props = defineProps({ activity: Object }),
  emit = defineEmits(["close"]),
  app = useApp(),
  form = reactive({
    id: "",
    tipo: "evento",
    titulo: "",
    fecha: iso(new Date()),
    inicio: "",
    fin: "",
    descripcion: "",
    flyer: "",
    ...props.activity,
  }),
  error = ref(""),
  busy = ref(false);
const notice = computed(() => form.tipo === "aviso");
const kind = computed(() => (notice.value ? "aviso" : "evento"));
const flyerInput = ref(null);
watch(
  () => form.tipo,
  () => {
    error.value = "";
  },
);
async function upload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  busy.value = true;
  try {
    form.flyer = await app.flyer(file);
    error.value = "";
  } catch (e) {
    error.value = e.message;
    event.target.value = "";
  } finally {
    busy.value = false;
  }
}
function removeFlyer() {
  form.flyer = "";
  if (flyerInput.value) {
    flyerInput.value.value = "";
    flyerInput.value.focus();
  }
}
function save() {
  if (busy.value) return;
  try {
    app.notify("");
    app.content.saveActivity(form);
    emit("close");
  } catch (e) {
    error.value = e.message;
  }
}
</script>
<template>
  <AppModal
    :title="`${form.id ? 'Editar' : 'Añadir'} ${kind}`"
    @close="emit('close')"
    ><form @submit.prevent="save">
      <fieldset class="publication-type" :disabled="busy">
        <legend>¿Qué querés publicar?</legend>
        <div class="publication-type-options">
          <label
            v-for="type in ['evento', 'aviso']"
            :key="type"
            class="publication-type-option"
            :class="{ 'is-selected': form.tipo === type }"
          >
            <input
              v-model="form.tipo"
              type="radio"
              name="tipo-publicacion"
              :value="type"
            />
            <PublicationIcon :type="type" />
            <span>{{ type === "evento" ? "Evento" : "Aviso" }}</span>
          </label>
        </div>
        <p class="ayuda">
          {{
            notice
              ? "Un mensaje destacado con megáfono, visible hasta que lo elimines."
              : "Una tarjeta con fecha, horarios y un flyer opcional."
          }}
        </p>
      </fieldset>
      <FormField
        v-model="form.titulo"
        name="titulo"
        :label="notice ? 'Título del aviso' : 'Nombre del evento'"
        maxlength="100"
        required
      />
      <template v-if="!notice">
        <FormField
          v-model="form.fecha"
          name="fecha-act"
          label="Fecha"
          type="date"
          required
        />
        <div class="fila2">
          <FormField
            v-model="form.inicio"
            name="inicio-act"
            label="Hora de inicio (opcional)"
            type="time"
          /><FormField
            v-model="form.fin"
            name="fin-act"
            label="Hora de fin (opcional)"
            type="time"
          />
        </div>
      </template>
      <FormField
        v-model="form.descripcion"
        name="descripcion"
        :label="notice ? 'Mensaje del aviso' : 'Descripción (opcional)'"
        type="textarea"
        maxlength="400"
        :required="notice"
      />
      <template v-if="!notice">
        <div class="campo">
          <label for="flyer">Flyer (imagen de hasta 10 MB)</label
          ><input
            id="flyer"
            ref="flyerInput"
            type="file"
            accept="image/*"
            :disabled="busy"
            @change="upload"
          />
        </div>
        <div v-if="form.flyer" class="flyer-preview">
          <img
            class="act-flyer"
            :src="form.flyer"
            alt="Vista previa del flyer"
          />
          <button
            type="button"
            class="publication-remove"
            aria-label="Quitar flyer"
            title="Quitar flyer"
            :disabled="busy"
            @click="removeFlyer"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </template>
      <p class="err" role="alert">{{ error }}</p>
      <div class="actions">
        <button type="button" class="btn btn-sec" @click="emit('close')">
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? "Procesando imagen…" : `Guardar ${kind}` }}
        </button>
      </div>
    </form></AppModal
  >
</template>
