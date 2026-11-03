<script setup>
defineProps({ type: { type: String, default: "evento" } });
</script>

<template>
  <svg
    class="publication-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="type === 'aviso'">
      <path d="M4 9h4l10-5v16L8 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z" />
      <path d="M8 9v6m-3 0 2 6h3l-2-6m13-6v6" />
    </template>
    <template v-else>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18m-13 5h3" />
    </template>
  </svg>
</template>
