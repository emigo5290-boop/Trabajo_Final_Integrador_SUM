<script setup>
import { ref } from "vue";

defineOptions({ inheritAttrs: false });
defineProps({
  modelValue: [String, Number],
  name: String,
  label: String,
  type: { type: String, default: "text" },
  error: String,
  help: String,
  options: Array,
});
defineEmits(["update:modelValue"]);
const passwordVisible = ref(false);
</script>
<template>
  <div class="campo">
    <label :for="name">{{ label }}</label
    ><textarea
      v-if="type === 'textarea'"
      :id="name"
      :name="name"
      :value="modelValue"
      :aria-invalid="!!error"
      :aria-describedby="name + '-help ' + name + '-error'"
      v-bind="$attrs"
      @input="$emit('update:modelValue', $event.target.value)"
    /><select
      v-else-if="options"
      :id="name"
      :name="name"
      :value="modelValue"
      :aria-invalid="!!error"
      :aria-describedby="name + '-error'"
      v-bind="$attrs"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">Elegí una opción</option>
      <option v-for="option in options" :key="option" :value="option">
        {{ option }}
      </option>
    </select>
    <div v-else :class="{ 'password-field': type === 'password' }">
      <input
        :id="name"
        :name="name"
        :type="type === 'password' && passwordVisible ? 'text' : type"
        :value="modelValue"
        :aria-invalid="!!error"
        :aria-describedby="name + '-help ' + name + '-error'"
        v-bind="$attrs"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <button
        v-if="type === 'password'"
        type="button"
        class="password-toggle"
        :aria-label="
          passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
        "
        :title="passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        :aria-controls="name"
        @click="passwordVisible = !passwordVisible"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          <path v-if="passwordVisible" d="m3 3 18 18" />
        </svg>
      </button>
    </div>
    <p :id="name + '-help'" class="ayuda" v-if="help">{{ help }}</p>
    <p :id="name + '-error'" class="err" v-if="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.password-field {
  position: relative;
}
.password-field input {
  padding-right: 56px;
}
.password-field input::-ms-reveal {
  display: none;
}
.password-toggle {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
}
.password-toggle:hover {
  background: var(--panel-2);
  color: var(--ink);
}
.password-toggle:focus-visible {
  outline-offset: -3px;
}
.password-toggle svg {
  width: 22px;
  height: 22px;
}
</style>
