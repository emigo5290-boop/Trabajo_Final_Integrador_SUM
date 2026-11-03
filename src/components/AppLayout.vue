<script setup>
import { ref, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useApp } from "../application/context.js";
import { home, menus } from "../router/index.js";
import AppBrand from "./AppBrand.vue";
import ThemeSelector from "./ThemeSelector.vue";
defineProps({ secure: Boolean });
const app = useApp(),
  router = useRouter(),
  route = useRoute(),
  open = ref(false);
const role = computed(() => app.session.value?.rol);
const label = computed(
  () =>
    ({
      admin: "Administración",
      prensa: "Prensa",
      cliente: app.user.value?.nombre + " " + app.user.value?.apellido,
    })[role.value],
);
watch(
  () => route.path,
  () => (open.value = false),
);
function logout() {
  app.auth.logout();
  router.push("/");
}
</script>
<template>
  <template v-if="secure && role === 'prensa'">
    <header class="cab">
      <div class="cab-in">
        <AppBrand />
        <div class="cab-acc press-header-actions">
          <ThemeSelector />
          <button type="button" class="btn btn-sec btn-chico" @click="logout">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
    <main id="main" class="contenedor press-main" tabindex="-1"><slot /></main>
  </template>
  <div v-else-if="secure && role" class="app">
    <aside class="lado" :class="{ abierto: open }">
      <div class="lado-in">
        <AppBrand />
        <div class="lado-acc">
          <ThemeSelector />
          <button
            class="btn btn-sec menu-btn"
            :aria-expanded="open"
            aria-controls="nav-principal"
            @click="open = !open"
          >
            Menú
          </button>
        </div>
        <p class="usuario-chip">{{ label }}</p>
        <nav id="nav-principal" class="nav" aria-label="Menú principal">
          <RouterLink
            v-for="[path, title] in menus[role]"
            :key="path"
            :to="path"
            >{{ title }}</RouterLink
          ><button class="salir" @click="logout">Cerrar sesión</button>
        </nav>
      </div>
    </aside>
    <main id="main" class="cuerpo" tabindex="-1">
      <h1 class="pag-tit page-heading" tabindex="-1">{{ route.meta.title }}</h1>
      <slot />
    </main>
  </div>
  <template v-else
    ><header class="cab">
      <div class="cab-in">
        <AppBrand />
        <div class="cab-acc">
          <ThemeSelector />
          <RouterLink class="btn btn-sec btn-chico" to="/clases"
            >Clases</RouterLink
          >
          <RouterLink
            class="btn btn-sec btn-chico"
            :to="role ? home(role) : '/login'"
            >{{ role ? "Ir a mi panel" : "Ingresar" }}</RouterLink
          >
        </div>
      </div>
    </header>
    <main id="main" class="contenedor" tabindex="-1"><slot /></main>
    <footer class="contenedor pie">
      SUM Municipal · Municipalidad de Bella Vista<br /></footer
  ></template>
</template>
