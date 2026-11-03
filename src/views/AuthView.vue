<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { home } from "../router/index.js";
import { useApp } from "../application/context.js";
import FormField from "../components/FormField.vue";
const props = defineProps({ mode: String }),
  app = useApp(),
  router = useRouter(),
  route = useRoute();
const d = reactive({
    usuario: "",
    apellido: "",
    nombre: "",
    cuil: "",
    email: "",
    clave: "",
    clave2: "",
    codigo: "",
    dniImagen: "",
  }),
  errors = ref({}),
  error = ref(""),
  busy = ref(false),
  formVersion = ref(0),
  verification = ref(app.temp.read("verification", null));
function clearLogin() {
  if (props.mode !== "login") return;
  d.usuario = "";
  d.clave = "";
  errors.value = {};
  error.value = "";
  formVersion.value++;
}
function restorePage(event) {
  if (event.persisted) clearLogin();
}
onMounted(() => {
  clearLogin();
  window.addEventListener("pageshow", restorePage);
});
onUnmounted(() => window.removeEventListener("pageshow", restorePage));
const titles = {
  login: "Iniciar sesión",
  registro: "Registrarse",
  verificacion: "Verificar código",
  recuperar: "Recuperar contraseña",
  "nueva-clave": "Nueva contraseña",
};
const fields = computed(
  () =>
    ({
      login: [
        ["usuario", "Usuario (correo electrónico)", "text"],
        ["clave", "Contraseña", "password"],
      ],
      registro: [
        ["nombre", "Nombre", "text"],
        ["apellido", "Apellido", "text"],
        ["email", "Usuario (correo electrónico)", "email"],
        ["clave", "Contraseña", "password"],
        ["clave2", "Confirmar contraseña", "password"],
      ],
      recuperar: [["email", "Email", "email"]],
      "nueva-clave": [
        ["clave", "Nueva contraseña", "password"],
        ["clave2", "Confirmar contraseña", "password"],
      ],
      verificacion: [["codigo", "Código de 4 dígitos", "text"]],
    })[props.mode],
);
async function submit() {
  if (busy.value) return;
  busy.value = true;
  errors.value = {};
  error.value = "";
  try {
    let destination;
    if (props.mode === "login") {
      const result = await app.auth.login(d);
      destination =
        result === "verificacion"
          ? "/verificacion"
          : typeof route.query.next === "string" &&
              route.query.next.startsWith(home(result) + "/")
            ? route.query.next
            : home(result);
    }
    if (props.mode === "registro") {
      await app.auth.register(d);
      destination = "/verificacion";
    }
    if (props.mode === "recuperar") {
      app.auth.recover(d.email.trim());
      destination = "/verificacion";
    }
    if (props.mode === "verificacion") {
      destination = "/" + app.auth.verify(d.codigo);
      if (destination === "/login")
        app.notify("Correo verificado. Administración debe aprobar tu acceso.");
    }
    if (props.mode === "nueva-clave") {
      await app.auth.reset(d);
      destination = "/login";
      app.notify("Contraseña actualizada.");
    }
    await router.push({
      path: destination,
      query: route.query.next ? { next: route.query.next } : {},
    });
  } catch (e) {
    errors.value = e.fields || {};
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function attachDni(event) {
  d.dniImagen = "";
  error.value = "";
  const file = event.target.files?.[0];
  if (!file) return;
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 2 * 1024 * 1024
  ) {
    error.value = "Adjuntá una imagen JPG, PNG o WebP de hasta 2 MB.";
    event.target.value = "";
    return;
  }
  busy.value = true;
  try {
    d.dniImagen = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(Error("No se pudo leer la imagen del QR del DNI."));
      reader.readAsDataURL(file);
    });
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
function resend() {
  app.auth.resend();
  verification.value = app.temp.read("verification", null);
  app.notify("Si existe la cuenta, se generó un nuevo código de demostración.");
}
</script>
<template>
  <div class="auth-card" :class="{ ancho: mode === 'registro' }">
    <h1 tabindex="-1">{{ titles[mode] }}</h1>
    <p v-if="mode === 'login' && route.query.next" class="aviso-caja">
      Para continuar, iniciá sesión con el perfil correspondiente.
    </p>
    <p v-if="mode === 'registro'" class="sub">
      Tu correo electrónico será tu usuario para iniciar sesión. Todos los
      campos son obligatorios. Elegí una contraseña de al menos 8 caracteres,
      con letras y números.
    </p>
    <p v-if="mode === 'recuperar'" class="sub">
      Ingresá el correo de tu cuenta para generar un código de prueba.
    </p>
    <template v-if="mode === 'verificacion'"
      ><p>
        Ingresá el código para {{ verification?.email }}. Vence en 10 minutos.
      </p>
      <p class="demo">
        Modo demostración: no se envían correos.
        <strong v-if="verification?.demoCodigo"
          >Código de prueba: {{ verification.demoCodigo }}</strong
        ><span v-else>Si existe la cuenta, habrá un código disponible.</span>
      </p></template
    >
    <form
      :key="formVersion"
      :autocomplete="mode === 'login' ? 'off' : undefined"
      @submit.prevent="submit"
    >
      <FormField
        v-for="[name, label, type] in fields"
        :key="name"
        v-model="d[name]"
        :name="name"
        :label="label"
        :type="type"
        :error="errors[name]"
        :data-lpignore="mode === 'login' ? 'true' : undefined"
        :data-1p-ignore="mode === 'login' ? '' : undefined"
        required
        :maxlength="
          name === 'codigo'
            ? 4
            : name === 'cuil'
              ? 11
              : name === 'dni'
                ? 10
                : 100
        "
        :inputmode="
          ['codigo', 'cuil', 'dni'].includes(name)
            ? 'numeric'
            : name === 'usuario' || name === 'email'
              ? 'email'
              : undefined
        "
        :autocomplete="
          mode === 'login'
            ? type === 'password'
              ? 'new-password'
              : 'off'
            : name === 'codigo'
              ? 'one-time-code'
              : type === 'password'
                ? 'new-password'
                : name === 'email'
                  ? 'email'
                  : 'off'
        "
      />
      <div v-if="mode === 'registro'" class="campo">
        <a
          class="btn btn-sec"
          href="https://mi.argentina.gob.ar/"
          target="_blank"
          rel="noopener noreferrer"
          >Ir a Mi Argentina (abre en otra pestaña)</a
        >
        <label for="dni-imagen">QR del DNI</label>
        <input
          id="dni-imagen"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          aria-describedby="dni-imagen-help"
          @change="attachDni"
        />
        <small id="dni-imagen-help"
          >Adjuntá una imagen del QR del DNI en JPG, PNG o WebP, hasta 2 MB.
          Administración revisará el QR para aprobar el acceso.</small
        >
        <p v-if="errors.dniImagen" class="err" role="alert">
          {{ errors.dniImagen }}
        </p>
      </div>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <div class="actions" :class="{ 'login-actions': mode === 'login' }">
        <button class="btn btn-primary" :disabled="busy">
          {{
            busy
              ? "Procesando…"
              : mode === "login"
                ? "Iniciar sesión"
                : mode === "registro"
                  ? "Crear cuenta"
                  : mode === "verificacion"
                    ? "Verificar"
                    : mode === "recuperar"
                      ? "Generar código"
                      : "Guardar contraseña"
          }}</button
        ><RouterLink
          v-if="mode === 'login'"
          class="btn btn-sec"
          :to="{ path: '/registro', query: route.query }"
          >Registrarse</RouterLink
        ><button
          v-if="mode === 'verificacion'"
          type="button"
          class="btn btn-sec"
          @click="resend"
        >
          Reenviar código
        </button>
      </div>
    </form>
    <div class="actions" :class="{ 'login-recovery': mode === 'login' }">
      <RouterLink v-if="mode === 'login'" to="/recuperar" class="btn-rec"
        >¿Olvidaste tu contraseña?</RouterLink
      ><RouterLink v-else :to="{ path: '/login', query: route.query }"
        >Volver al inicio de sesión</RouterLink
      >
    </div>
  </div>
</template>
