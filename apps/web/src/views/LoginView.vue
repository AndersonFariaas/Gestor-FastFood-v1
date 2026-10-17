<script setup lang="ts">
import { PhHamburger, PhLockKey, PhUser } from '@phosphor-icons/vue';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '@/components/ui/BaseButton.vue';
import { safeRedirect } from '@/router';
import { errorMessage } from '@/services/http';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ username: '', password: '' });
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login({ username: form.username.trim(), password: form.password });
    await router.replace(safeRedirect(route.query.redirect));
  } catch (err) {
    error.value = errorMessage(err);
    form.password = '';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-gray-100 p-4">
    <div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl sm:p-10">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-brand-50">
          <PhHamburger class="size-12 text-brand-500" weight="fill" aria-hidden="true" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Acesso restrito</h1>
        <p class="mt-1 text-sm text-gray-500">Faça login para continuar</p>
      </div>

      <form class="space-y-4" novalidate @submit.prevent="submit">
        <div>
          <label class="label" for="username">Usuário</label>
          <div class="relative">
            <PhUser class="absolute top-2.5 left-3 size-5 text-gray-400" aria-hidden="true" />
            <input
              id="username"
              v-model="form.username"
              class="input pl-10"
              autocomplete="username"
              autocapitalize="none"
              required
              autofocus
            />
          </div>
        </div>
        <div>
          <label class="label" for="password">Senha</label>
          <div class="relative">
            <PhLockKey class="absolute top-2.5 left-3 size-5 text-gray-400" aria-hidden="true" />
            <input
              id="password"
              v-model="form.password"
              class="input pl-10"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
        </div>

        <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {{ error }}
        </p>

        <BaseButton
          type="submit"
          size="lg"
          block
          :loading="loading"
          :disabled="!form.username.trim() || !form.password"
        >
          Entrar no sistema
        </BaseButton>
      </form>
    </div>
  </div>
</template>
