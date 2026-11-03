<script setup>
import { useApp } from "../application/context.js";
import ClassCard from "../components/ClassCard.vue";
const app = useApp();
</script>

<template>
  <section class="seccion" aria-labelledby="classes-page-title">
    <RouterLink class="class-back" to="/">← Volver al inicio</RouterLink>
    <h1 id="classes-page-title" class="pag-tit">Clases del SUM</h1>
    <p class="sub">
      Conocé cada actividad y elegí la clase a la que querés inscribirte.
    </p>
    <div v-if="app.classes.value.length" class="classes-grid">
      <ClassCard
        v-for="lesson in app.classes.value"
        :key="lesson.id"
        :lesson="lesson"
        enrollable
      />
    </div>
    <p v-else class="vacio-msg">Próximamente publicaremos nuevas clases.</p>
  </section>
</template>
