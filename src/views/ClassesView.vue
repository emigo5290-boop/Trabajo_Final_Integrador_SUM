<script setup>
import { nextTick, ref } from "vue";
import { useApp } from "../application/context.js";
import ClassCard from "../components/ClassCard.vue";
import ClassEditor from "../components/ClassEditor.vue";
import AppModal from "../components/AppModal.vue";

const app = useApp();
const editing = ref(null);
const removing = ref(null);
const error = ref("");
const addButton = ref(null);
function confirmRemoval(lesson) {
  error.value = "";
  removing.value = lesson;
}
async function remove() {
  try {
    app.notify("");
    app.content.removeClass(removing.value.id);
    removing.value = null;
    if (!app.notice.value) app.notify("Clase eliminada.");
    await nextTick();
    addButton.value?.focus();
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <div class="classes-toolbar">
    <RouterLink class="btn btn-sec" to="/administracion/clases/inscripciones"
      >Ver inscripciones</RouterLink
    >
    <p>
      Administrá las clases y los horarios que se muestran en la página
      principal.
    </p>
    <button
      ref="addButton"
      type="button"
      class="btn btn-primary"
      @click="editing = {}"
    >
      ＋ Agregar clase
    </button>
  </div>
  <div v-if="app.classes.value.length" class="classes-grid">
    <ClassCard
      v-for="lesson in app.classes.value"
      :key="lesson.id"
      :lesson="lesson"
      editable
      @edit="editing = $event"
      @remove="confirmRemoval"
    />
  </div>
  <p v-else class="vacio-msg">
    Todavía no hay clases. Usá “Agregar clase” para publicar la primera.
  </p>
  <ClassEditor v-if="editing" :lesson="editing" @close="editing = null" />
  <AppModal v-if="removing" title="Eliminar clase" @close="removing = null">
    <p>
      Se eliminará “{{ removing.nombre }}” y sus horarios de la página
      principal.
    </p>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <template #actions>
      <button type="button" class="btn btn-sec" @click="removing = null">
        Cancelar
      </button>
      <button type="button" class="btn btn-peligro" @click="remove">
        Eliminar clase
      </button>
    </template>
  </AppModal>
</template>
