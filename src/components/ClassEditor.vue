<script setup>
import { computed, nextTick, reactive, ref } from "vue";
import { useApp } from "../application/context.js";
import { CLASS_DAYS } from "../domain/classes.js";
import { CONFIG } from "../config.js";
import AppModal from "./AppModal.vue";
import FormField from "./FormField.vue";

const props = defineProps({ lesson: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const app = useApp();
let nextKey = 0;
const form = reactive({
  id: props.lesson.id || "",
  nombre: props.lesson.nombre || "",
  descripcion: props.lesson.descripcion || "",
  imagen: props.lesson.imagen || "",
  lleno: props.lesson.lleno === true,
  diasLlenos: [...(props.lesson.diasLlenos || [])],
  horarios: (props.lesson.horarios || []).map((schedule) => ({
    ...schedule,
    key: nextKey++,
  })),
});
const error = ref("");
const busy = ref(false);
const photoInput = ref(null);
const addButton = ref(null);

async function uploadPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  busy.value = true;
  try {
    const photo = await app.flyer(file);
    if (photo.length > 2000000) throw Error("Elegí una foto de menor tamaño.");
    form.imagen = photo;
    error.value = "";
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
    event.target.value = "";
  }
}

const customOpen = ref(false);
const custom = reactive({ dia: "Lunes", inicio: "", fin: "" });
const scheduleKey = (item) => `${item.dia}-${item.inicio}-${item.fin}`;
const options = computed(() => {
  const items = new Map();
  for (const dia of CLASS_DAYS) {
    for (let hour = CONFIG.HORA_APERTURA; hour < CONFIG.HORA_CIERRE; hour++) {
      const item = {
        dia,
        inicio: `${String(hour).padStart(2, "0")}:00`,
        fin: `${String(hour + 1).padStart(2, "0")}:00`,
      };
      items.set(scheduleKey(item), item);
    }
  }
  for (const item of [
    ...app.classes.value.flatMap((lesson) => lesson.horarios),
    ...form.horarios,
  ])
    items.set(scheduleKey(item), item);
  return [...items.values()].sort(
    (a, b) =>
      CLASS_DAYS.indexOf(a.dia) - CLASS_DAYS.indexOf(b.dia) ||
      a.inicio.localeCompare(b.inicio) ||
      a.fin.localeCompare(b.fin),
  );
});
const selected = (item) =>
  form.horarios.find((entry) => scheduleKey(entry) === scheduleKey(item));
function toggleSchedule(item, checked) {
  if (checked)
    form.horarios.push({
      dia: item.dia,
      inicio: item.inicio,
      fin: item.fin,
      key: nextKey++,
    });
  else
    form.horarios = form.horarios.filter(
      (entry) => scheduleKey(entry) !== scheduleKey(item),
    );
}
function toggleFull(item, checked) {
  const entry = selected(item);
  if (entry) entry.lleno = checked;
}
async function addSchedule() {
  if (!custom.inicio || !custom.fin || custom.fin <= custom.inicio) {
    error.value = "Indicá un inicio y un fin válidos para el horario.";
    return;
  }
  if (selected(custom)) {
    error.value = "Ese horario ya está seleccionado.";
    return;
  }
  toggleSchedule(custom, true);
  customOpen.value = false;
  error.value = "";
  await nextTick();
  addButton.value?.focus();
}
function save() {
  if (busy.value) return;
  try {
    app.notify("");
    app.content.saveClass(form);
    if (!app.notice.value) app.notify("Clase guardada.");
    emit("close");
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <AppModal
    :title="form.id ? 'Editar clase' : 'Agregar clase'"
    @close="emit('close')"
  >
    <form @submit.prevent="save">
      <FormField
        v-model="form.nombre"
        name="class-name"
        label="Nombre de la clase"
        maxlength="80"
        required
      />
      <FormField
        v-model="form.descripcion"
        name="class-description"
        label="Descripción (opcional)"
        type="textarea"
        rows="3"
        maxlength="300"
        help="Podés indicar edades, niveles o información de contacto."
      />
      <div class="campo">
        <label for="class-photo">Foto de la clase (opcional)</label>
        <input
          id="class-photo"
          ref="photoInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          :disabled="busy"
          @change="uploadPhoto"
        />
        <p class="ayuda">
          JPG, PNG o WebP, hasta 10 MB. Podés reemplazar la foto ilustrativa por
          una del SUM.
        </p>
        <img
          v-if="form.imagen"
          :src="form.imagen"
          alt="Vista previa de la foto de la clase"
          class="class-photo-preview"
        />
        <button
          v-if="form.imagen"
          type="button"
          class="btn btn-sec btn-chico"
          :disabled="busy"
          @click="form.imagen = ''"
        >
          Quitar foto
        </button>
      </div>
      <fieldset class="class-schedule-editor">
        <legend>Horarios semanales</legend>
        <p class="ayuda">
          Marcá los horarios de la clase. Usá Agregar horario si necesitás otro.
          Marcá Lleno para cerrar las inscripciones de un horario.
        </p>
        <label class="schedule-check"
          ><input v-model="form.lleno" type="checkbox" /> Clase llena (cerrar
          todas las inscripciones)</label
        >
        <details v-for="day in CLASS_DAYS" :key="day" class="schedule-day">
          <summary>
            {{ day }} ·
            {{ form.horarios.filter((item) => item.dia === day).length }}
            seleccionados
          </summary>
          <label class="schedule-check">
            <input v-model="form.diasLlenos" type="checkbox" :value="day" />
            Clase llena (bloquear las inscripciones de este día)
          </label>
          <p v-if="form.diasLlenos.includes(day)" class="ayuda">
            Todos los horarios de {{ day }} quedan cerrados a nuevas
            inscripciones, incluidos los que agregues después.
          </p>
          <div class="schedule-options">
            <div
              v-for="option in options.filter((item) => item.dia === day)"
              :key="scheduleKey(option)"
              class="schedule-option"
            >
              <label class="schedule-check"
                ><input
                  type="checkbox"
                  :checked="!!selected(option)"
                  @change="toggleSchedule(option, $event.target.checked)"
                />
                {{ option.inicio }} – {{ option.fin }}</label
              >
              <label v-if="selected(option)" class="schedule-check"
                ><input
                  type="checkbox"
                  :checked="!!selected(option).lleno"
                  :disabled="form.diasLlenos.includes(day) || form.lleno"
                  @change="toggleFull(option, $event.target.checked)"
                />
                Lleno</label
              >
            </div>
          </div>
        </details>
        <p v-if="!form.horarios.length" class="class-pending">
          Se mostrará “Horarios a confirmar”.
        </p>
        <button
          ref="addButton"
          type="button"
          class="btn btn-sec btn-chico"
          :aria-expanded="customOpen"
          @click="customOpen = !customOpen"
        >
          {{ customOpen ? "Cancelar nuevo horario" : "+ Agregar horario" }}
        </button>
        <div v-if="customOpen" class="class-schedule-row">
          <FormField
            v-model="custom.dia"
            name="custom-day"
            label="Día"
            :options="CLASS_DAYS"
          />
          <div class="class-time-fields">
            <FormField
              v-model="custom.inicio"
              name="custom-start"
              label="Desde"
              type="time"
            />
            <FormField
              v-model="custom.fin"
              name="custom-end"
              label="Hasta"
              type="time"
            />
          </div>
          <button
            type="button"
            class="btn btn-sec btn-chico"
            @click="addSchedule"
          >
            Agregar a la checklist
          </button>
        </div>
      </fieldset>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <div class="actions">
        <button type="button" class="btn btn-sec" @click="emit('close')">
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? "Procesando foto…" : "Guardar clase" }}
        </button>
      </div>
    </form>
  </AppModal>
</template>

<style scoped>
.schedule-day {
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
}
.schedule-day summary {
  cursor: pointer;
  font-weight: 700;
}
.schedule-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  padding-top: 12px;
}
.schedule-option {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px;
}
.schedule-check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  cursor: pointer;
}
.schedule-check input {
  width: auto;
}
</style>
