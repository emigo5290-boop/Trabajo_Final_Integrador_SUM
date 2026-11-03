<script setup>
import { ref, computed } from "vue";
import { useApp } from "../application/context.js";
import { iso } from "../domain/date.js";
import {
  isPublicationVisible,
  sortPublications,
} from "../domain/publications.js";
import CourtStatus from "../components/CourtStatus.vue";
import AvailabilityCalendar from "../components/AvailabilityCalendar.vue";
import ActivityCard from "../components/ActivityCard.vue";
import ClassCard from "../components/ClassCard.vue";
const app = useApp(),
  day = ref(iso(new Date()));
const activities = computed(() =>
  sortPublications(
    app.activities.value.filter((a) =>
      isPublicationVisible(a, iso(app.clock.value)),
    ),
  ),
);
</script>
<template>
  <h1 class="sr-only" tabindex="-1">SUM Municipal · Bella Vista</h1>
  <section
    v-if="activities.length"
    class="seccion stack"
    aria-labelledby="public-news-title"
  >
    <h2 id="public-news-title">Eventos y avisos</h2>
    <div class="publications-grid">
      <ActivityCard v-for="a in activities" :key="a.id" :activity="a" />
    </div>
  </section>
  <CourtStatus reserve />
  <section class="seccion">
    <h2>Calendario de disponibilidad</h2>
    <p class="sub">
      Elegí un día para consultar los horarios libres, reservados, ocupados o
      bloqueados.
    </p>
    <AvailabilityCalendar v-model="day" />
    <!--<div class="actions"><ReserveButton /></div>-->
  </section>
  <section id="clases" class="seccion" aria-labelledby="public-classes-title">
    <h2 id="public-classes-title">Clases</h2>
    <p class="sub">Conocé las clases del SUM y sus horarios semanales.</p>
    <div v-if="app.classes.value.length" class="classes-grid">
      <ClassCard
        v-for="lesson in app.classes.value"
        :key="lesson.id"
        :lesson="lesson"
        enrollable
      />
    </div>
    <p v-else class="vacio-msg">
      Próximamente publicaremos nuevas clases y horarios.
    </p>
  </section>
  <section class="seccion">
    <h2>Información del SUM</h2>
    <dl class="info-datos">
      <div>
        <dt>Dirección</dt>
        <dd>{{ app.info.value.direccion }}</dd>
      </div>
      <div>
        <dt>Horarios</dt>
        <dd>{{ app.info.value.horario }}</dd>
      </div>
    </dl>
    <div class="info-listas">
      <div>
        <h3>Uso de la cancha</h3>
        <p>{{ app.info.value.uso }}</p>
      </div>
      <div>
        <h3>Actividades permitidas</h3>
        <ul>
          <li v-for="(item, i) in app.info.value.actividades" :key="i">
            {{ item }}
          </li>
        </ul>
      </div>
      <div>
        <h3>Normas de utilización</h3>
        <ul>
          <li v-for="(item, i) in app.info.value.normas" :key="i">
            {{ item }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
