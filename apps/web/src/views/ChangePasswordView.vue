<script setup lang="ts">
import { PhArrowLeft, PhKey } from '@phosphor-icons/vue';
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useToast } from '@/composables/useToast';
import { safeRedirect } from '@/router';
import { errorMessage } from '@/services/http';
import { useAuthStore } from '@/stores/auth';

const MIN_LENGTH = 8;

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const form = reactive({ currentPassword: '', newPassword: '', confirmation: '' });
const error = ref('');
const loading = ref(false);

const mandatory = computed(() => auth.user?.mustChangePassword ?? false);
const mismatch = computed(() => form.confirmation.length > 0 && form.confirmation !== form.newPassword);
const canSubmit = computed(
  () =>
    form.currentPassword && form.newPassword.length >= MIN_LENGTH && form.newPassword === form.confirmation,
);

async function submit() {
  if (!canSubmit.value) return;
  error.value = '';
  loading.value = true;
  try {
    await auth.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
    toast.success('Senha alterada com sucesso.');
    await router.replace(safeRedirect(route.query.redirect));
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function logout() {
  await auth.logout();
  await router.replace({ name: 'login' });
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-gray-100 p-4">
    <div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-50">
          <PhKey class="size-9 text-brand-500" weight="fill" aria-hidden="true" />
        </div>
        <h1 class="text-xl font-bold text-gray-900">{{ mandatory ? 'Defina sua senha' : 'Trocar senha' }}</h1>
        <p class="mt-1 text-sm text-gray-500">
          {{
            mandatory
              ? 'Por segurança, troque a senha provisória antes de continuar.'
              : `Olá, ${auth.user?.username}. As outras sessões abertas serão encerradas.`
          }}
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="label" for="current">{{ mandatory ? 'Senha provisória' : 'Senha atual' }}</label>
          <input
            id="current"
            v-model="form.currentPassword"
            class="input"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <div>
          <label class="label" for="new">Nova senha</label>
          <input
            id="new"
            v-model="form.newPassword"
            class="input"
            type="password"
            autocomplete="new-password"
            :minlength="MIN_LENGTH"
            required
          />
          <p class="mt-1 text-xs text-gray-500">Mínimo de {{ MIN_LENGTH }} caracteres.</p>
        </div>
        <div>
          <label class="label" for="confirm">Confirme a nova senha</label>
          <input
            id="confirm"
            v-model="form.confirmation"
            class="input"
            type="password"
            autocomplete="new-password"
            :aria-invalid="mismatch"
            required
          />
          <p v-if="mismatch" class="mt-1 text-xs text-red-600">As senhas não conferem.</p>
        </div>

        <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {{ error }}
        </p>

        <BaseButton type="submit" size="lg" block :loading="loading" :disabled="!canSubmit"
          >Salvar senha</BaseButton
        >
        <BaseButton v-if="mandatory" variant="ghost" block @click="logout">Sair</BaseButton>
        <BaseButton v-else variant="ghost" block @click="router.back()">
          <PhArrowLeft class="size-4" aria-hidden="true" /> Voltar
        </BaseButton>
      </form>
    </div>
  </div>
</template>
