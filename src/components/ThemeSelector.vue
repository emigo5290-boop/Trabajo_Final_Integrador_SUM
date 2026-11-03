<script setup>
import { ref, onMounted, onUnmounted } from "vue";
const currentTheme = ref(document.documentElement.dataset.theme);
function sync() {
  currentTheme.value = document.documentElement.dataset.theme;
}
function toggle() {
  window.SUMTheme.setPreference(currentTheme.value === "dark" ? "light" : "dark");
}
onMounted(() => window.addEventListener("sum-theme-change", sync));
onUnmounted(() => window.removeEventListener("sum-theme-change", sync));
</script>
<template>
  <div class="theme-control">
    <div class="theme-switch">
      <button
        type="button"
        class="theme-option"
        :aria-label="currentTheme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'"
        :title="currentTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'"
        @click="toggle"
      >
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
          <template v-if="currentTheme === 'dark'">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </template>
          <path v-else d="M20.9 13.3A9 9 0 0 1 10.7 3.1 9 9 0 1 0 20.9 13.3Z" />
        </svg>
      </button>
    </div>
  </div>
</template>
