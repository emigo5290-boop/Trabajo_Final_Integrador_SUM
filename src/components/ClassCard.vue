<script setup>
import { classPhotoCredit, isScheduleFull } from "../domain/classes.js";
defineProps({
  lesson: { type: Object, required: true },
  editable: Boolean,
  enrollable: Boolean,
});
defineEmits(["edit", "remove"]);
</script>

<template>
  <article class="class-card">
    <figure v-if="lesson.imagen" class="class-photo">
      <img
        :src="lesson.imagen"
        :alt="`Actividad de ${lesson.nombre}`"
        width="960"
        height="640"
        loading="lazy"
        decoding="async"
      />
      <figcaption v-if="classPhotoCredit(lesson.imagen)">
        Foto ilustrativa ·
        <a
          :href="classPhotoCredit(lesson.imagen).source"
          target="_blank"
          rel="noopener noreferrer"
          >{{ classPhotoCredit(lesson.imagen).author }}</a
        >
        ·
        <a
          v-if="classPhotoCredit(lesson.imagen).licenseUrl"
          :href="classPhotoCredit(lesson.imagen).licenseUrl"
          target="_blank"
          rel="noopener noreferrer"
          >{{ classPhotoCredit(lesson.imagen).license }}</a
        >
        <span v-else>{{ classPhotoCredit(lesson.imagen).license }}</span>
      </figcaption>
    </figure>
    <h3>{{ lesson.nombre }}</h3>
    <p v-if="lesson.descripcion" class="class-description">
      {{ lesson.descripcion }}
    </p>
    <div class="class-schedule-title">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4M17 3v4M3 11h18M7 15h2M15 15h2M7 18h2" />
      </svg>
      <span>Horarios semanales</span>
    </div>
    <ul v-if="lesson.horarios.length" class="class-schedule">
      <li v-for="(schedule, index) in lesson.horarios" :key="index">
        <span>{{ schedule.dia }}</span>
        <span v-if="isScheduleFull(lesson, schedule)">Lleno</span>
        <strong
          ><time>{{ schedule.inicio }}</time> –
          <time>{{ schedule.fin }}</time></strong
        >
      </li>
    </ul>
    <p v-else class="class-pending">Horarios a confirmar</p>
    <div v-if="enrollable" class="class-card-actions">
      <RouterLink
        v-if="
          !lesson.lleno &&
          (!lesson.horarios.length ||
            lesson.horarios.some((item) => !isScheduleFull(lesson, item)))
        "
        class="btn btn-primary"
        :to="`/clases/${lesson.id}/inscripcion`"
        :aria-label="`Inscribirme a ${lesson.nombre}`"
        >Inscribirme</RouterLink
      >
      <button v-else class="btn btn-sec" disabled>
        Lleno · Inscripciones cerradas
      </button>
    </div>
    <div v-if="editable" class="class-card-actions">
      <button
        type="button"
        class="btn btn-sec btn-chico"
        :aria-label="`Editar ${lesson.nombre}`"
        @click="$emit('edit', lesson)"
      >
        Editar
      </button>
      <button
        type="button"
        class="btn btn-sec btn-chico"
        :aria-label="`Eliminar ${lesson.nombre}`"
        @click="$emit('remove', lesson)"
      >
        Eliminar
      </button>
    </div>
  </article>
</template>
