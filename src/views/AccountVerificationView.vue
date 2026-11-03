<script setup>
import { ref } from "vue";
import { useApp } from "../application/context.js";
const app = useApp();
const error = ref("");
function approve(id) {
  error.value = "";
  try {
    app.auth.approveAccount(id);
    app.notify("Acceso a la cuenta aprobado.");
  } catch (e) {
    error.value = e.message;
  }
}
</script>
<template>
  <section aria-label="Cuentas pendientes de verificación">
    <p class="sub">
      Revisá los datos y la imagen del QR del DNI antes de dar acceso al
      usuario.
    </p>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <p v-if="!app.pendingAccounts.value.length" class="vacio-msg">
      No hay cuentas pendientes de verificación.
    </p>
    <div v-else class="tabla-wrap">
      <table>
        <caption class="sub">
          Cuentas pendientes de aprobación
        </caption>
        <thead>
          <tr>
            <th scope="col">Gmail / correo electrónico</th>
            <th scope="col">Nombre</th>
            <th scope="col">Apellido</th>
            <th scope="col">QR del DNI</th>
            <th scope="col">Acceso</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="account in app.pendingAccounts.value" :key="account.id">
            <td>{{ account.email }}</td>
            <td>{{ account.nombre }}</td>
            <td>{{ account.apellido }}</td>
            <td>
              <a
                v-if="account.dniImagen"
                :href="account.dniImagen"
                target="_blank"
                rel="noopener"
                :aria-label="`Ampliar QR del DNI de ${account.nombre} ${account.apellido}`"
                ><img
                  class="account-dni"
                  :src="account.dniImagen"
                  :alt="`QR del DNI de ${account.nombre} ${account.apellido}`" /></a
              ><span v-else>Sin imagen adjunta</span>
            </td>
            <td>
              <p v-if="!account.verificado">Correo sin verificar</p>
              <button
                class="btn btn-primary btn-chico"
                :disabled="!account.verificado || !account.dniImagen"
                @click="approve(account.id)"
              >
                Dar acceso
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
<style scoped>
.account-dni {
  display: block;
  width: 180px;
  height: 110px;
  object-fit: contain;
  border: 1px solid var(--line);
  border-radius: 8px;
}
</style>
