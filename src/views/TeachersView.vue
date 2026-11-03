<script setup>
import { computed, ref } from "vue";
import { useApp } from "../application/context.js";
import { teacherCards } from "../domain/teachers.js";
import { scheduleLabel } from "../domain/class-enrollments.js";
import AppModal from "../components/AppModal.vue";
import FormField from "../components/FormField.vue";
const app = useApp();
const editing = ref(null);
const error = ref("");
const cards = computed(() =>
  teacherCards(
    app.teachers.value,
    app.classes.value,
    app.classEnrollments.value,
  ),
);
function edit(teacher = {}) {
  error.value = "";
  editing.value = {
    id: teacher.id || "",
    nombre: teacher.nombre || "",
    descripcion: teacher.descripcion || "",
    claseIds: (teacher.claseIds || []).filter((id) =>
      app.classes.value.some((lesson) => lesson.id === id),
    ),
  };
}
function save() {
  try {
    app.content.saveTeacher(editing.value);
    editing.value = null;
    app.notify("Profesor guardado.");
  } catch (e) {
    error.value = e.message;
  }
}
const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
</script>
<template>
  <div class="classes-toolbar">
    <p class="sub">
      Consultá las clases, horarios y alumnos inscriptos de cada profesor.
    </p>
    <button class="btn btn-primary" @click="edit()">+ Agregar profesor</button>
  </div>
  <div v-if="cards.length" class="classes-grid">
    <article
      v-for="teacher in cards"
      :key="teacher.id"
      class="class-card teacher-card"
    >
      <div class="teacher-header">
        <span class="teacher-avatar" aria-hidden="true">{{
          initials(teacher.nombre)
        }}</span>
        <div>
          <span class="sub">Profesor/a</span>
          <h2>{{ teacher.nombre }}</h2>
        </div>
      </div>
      <p v-if="teacher.descripcion" class="class-description">
        {{ teacher.descripcion }}
      </p>
      <section
        v-for="lesson in teacher.clases"
        :key="lesson.id"
        class="teacher-lesson"
        :aria-label="lesson.nombre"
      >
        <h3>{{ lesson.nombre }}</h3>
        <p class="teacher-count">
          <strong>{{ lesson.alumnos }}</strong>
          {{ lesson.alumnos === 1 ? "alumno inscripto" : "alumnos inscriptos" }}
        </p>
        <ul v-if="lesson.horarios.length" class="teacher-schedules">
          <li
            v-for="schedule in lesson.horarios"
            :key="scheduleLabel(schedule)"
          >
            {{ scheduleLabel(schedule) }}
          </li>
        </ul>
        <p v-else class="class-pending">Días y horarios a confirmar</p>
      </section>
      <p v-if="!teacher.clases.length" class="class-pending">
        Sin clases asignadas.
      </p>
      <button
        class="btn btn-sec btn-chico"
        :aria-label="`Editar profesor: ${teacher.nombre}`"
        @click="edit(teacher)"
      >
        Editar profesor
      </button>
    </article>
  </div>
  <p v-else class="vacio-msg">
    Todavía no hay profesores registrados. Agregá un profesor y asignale las
    clases que dicta.
  </p>
  <p v-if="cards.length" class="ayuda">
    El total de alumnos corresponde a las inscripciones registradas en cada
    clase, pendientes de confirmación de cupo.
  </p>
  <AppModal
    v-if="editing"
    :title="editing.id ? 'Editar profesor' : 'Agregar profesor'"
    @close="editing = null"
  >
    <form @submit.prevent="save">
      <FormField
        v-model="editing.nombre"
        name="teacher-name"
        label="Nombre y apellido"
        maxlength="100"
        required
      />
      <FormField
        v-model="editing.descripcion"
        name="teacher-description"
        label="Presentación (opcional)"
        type="textarea"
        maxlength="300"
      />
      <fieldset class="class-schedule-editor">
        <legend>Clases que dicta</legend>
        <label
          v-for="lesson in app.classes.value"
          :key="lesson.id"
          class="teacher-check"
          ><input
            v-model="editing.claseIds"
            type="checkbox"
            :value="lesson.id"
          />
          {{ lesson.nombre }}</label
        >
        <p v-if="!app.classes.value.length" class="ayuda">
          Primero agregá las clases en el apartado Clases.
        </p>
      </fieldset>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <div class="actions">
        <button type="button" class="btn btn-sec" @click="editing = null">
          Cancelar</button
        ><button class="btn btn-primary" type="submit">Guardar profesor</button>
      </div>
    </form>
  </AppModal>
</template>
<style scoped>
.teacher-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.teacher-header h2 {
  margin: 0;
  font-size: 1.3rem;
  overflow-wrap: anywhere;
}
.teacher-avatar {
  display: grid;
  place-items: center;
  flex: 0 0 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--ink);
  font-weight: 800;
  font-size: 1.2rem;
}
.teacher-lesson {
  border-top: 1px solid var(--line);
  padding: 16px 0;
}
.teacher-lesson h3 {
  margin: 0 0 8px;
}
.teacher-count {
  margin: 0 0 8px;
}
.teacher-count strong {
  font-size: 1.4rem;
}
.teacher-schedules {
  margin: 0;
  padding-left: 20px;
}
.teacher-check {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
}
.teacher-check input {
  width: auto;
}
.teacher-card > button {
  margin-top: auto;
  align-self: flex-start;
}
</style>
