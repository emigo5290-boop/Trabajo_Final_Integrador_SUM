<script setup>
import { computed } from "vue";
import { fechaCorta } from "../domain/date.js";
import { isNotice } from "../domain/publications.js";
import PublicationIcon from "./PublicationIcon.vue";
const props = defineProps({
  activity: { type: Object, required: true },
  editable: Boolean,
});
defineEmits(["edit", "remove"]);
const notice = computed(() => isNotice(props.activity));
</script>
<template>
  <article class="publication" :class="{ 'publication--notice': notice }">
    <div class="publication-header">
      <span class="publication-label">
        <PublicationIcon :type="notice ? 'aviso' : 'evento'" />
        {{ notice ? "Aviso" : "Evento" }}
      </span>
      <button
        v-if="editable"
        type="button"
        class="publication-remove"
        :aria-label="`Eliminar ${notice ? 'aviso' : 'evento'}: ${activity.titulo}`"
        title="Eliminar publicación"
        @click="$emit('remove', activity)"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <h3>{{ activity.titulo }}</h3>
    <p v-if="!notice && activity.fecha" class="publication-date">
      <time :datetime="activity.fecha">{{ fechaCorta(activity.fecha) }}</time>
      <template v-if="activity.inicio">
        · {{ activity.inicio
        }}<template v-if="activity.fin"> – {{ activity.fin }}</template>
      </template>
    </p>
    <p v-if="activity.descripcion" class="publication-description">
      {{ activity.descripcion }}
    </p>
    <img
      v-if="
        !notice &&
        /^data:image\/(jpeg|png|webp);base64,/.test(activity.flyer || '')
      "
      class="act-flyer publication-flyer"
      :src="activity.flyer"
      :alt="'Flyer: ' + activity.titulo"
      loading="lazy"
    />
    <div v-if="editable" class="publication-actions">
      <button
        type="button"
        class="btn btn-sec btn-chico"
        :aria-label="`Editar ${notice ? 'aviso' : 'evento'}: ${activity.titulo}`"
        @click="$emit('edit', activity)"
      >
        Editar
      </button>
    </div>
  </article>
</template>
