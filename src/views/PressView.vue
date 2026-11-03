<script setup>
import { computed, nextTick, ref } from "vue";
import { useApp } from "../application/context.js";
import { isNotice, sortPublications } from "../domain/publications.js";
import ActivityCard from "../components/ActivityCard.vue";
import ActivityEditor from "../components/ActivityEditor.vue";
import AppModal from "../components/AppModal.vue";
import PublicationIcon from "../components/PublicationIcon.vue";

const app = useApp();
const editing = ref(null);
const removing = ref(null);
const error = ref("");
const addButton = ref(null);
const publications = computed(() => sortPublications(app.activities.value));

function confirmRemoval(publication) {
  error.value = "";
  removing.value = publication;
}

async function remove() {
  try {
    app.notify("");
    app.content.removeActivity(removing.value.id);
    removing.value = null;
    await nextTick();
    addButton.value?.focus();
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <div class="press-toolbar">
    <div>
      <h1 class="pag-tit page-heading" tabindex="-1">Prensa</h1>
      <p>Compartí los eventos y avisos del SUM con la comunidad.</p>
    </div>
    <button
      ref="addButton"
      type="button"
      class="btn btn-primary"
      @click="editing = {}"
    >
      <span aria-hidden="true">＋</span> Añadir evento
    </button>
  </div>

  <section aria-labelledby="publications-title">
    <h2 id="publications-title" class="sr-only">Eventos y avisos publicados</h2>
    <div v-if="publications.length" class="publications-grid">
      <ActivityCard
        v-for="publication in publications"
        :key="publication.id"
        :activity="publication"
        editable
        @edit="editing = $event"
        @remove="confirmRemoval"
      />
    </div>
    <div v-else class="press-empty">
      <PublicationIcon />
      <h3>Todavía no hay publicaciones</h3>
      <p>
        Usá «Añadir evento» y elegí entre un evento o un aviso para empezar.
      </p>
    </div>
  </section>

  <ActivityEditor v-if="editing" :activity="editing" @close="editing = null" />
  <AppModal
    v-if="removing"
    :title="isNotice(removing) ? 'Eliminar aviso' : 'Eliminar evento'"
    @close="removing = null"
  >
    <p>
      Se eliminará «{{ removing.titulo }}» y dejará de mostrarse en el sitio
      público.
    </p>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <template #actions>
      <button type="button" class="btn btn-sec" @click="removing = null">
        Cancelar
      </button>
      <button type="button" class="btn btn-peligro" @click="remove">
        Eliminar
      </button>
    </template>
  </AppModal>
</template>
