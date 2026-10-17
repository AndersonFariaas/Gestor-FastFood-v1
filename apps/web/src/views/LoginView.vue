<script setup lang="ts">
import {
  PhCookingPot,
  PhEye,
  PhEyeSlash,
  PhLockKey,
  PhStorefront,
  PhTelevisionSimple,
  PhUser,
} from '@phosphor-icons/vue';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BrandMark from '@/components/layout/BrandMark.vue';
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
const showPassword = ref(false);

const FEATURES = [
  { icon: PhStorefront, text: 'Caixa rápido com troco automático' },
  { icon: PhCookingPot, text: 'Pedidos na cozinha em tempo real' },
  { icon: PhTelevisionSimple, text: 'Painel de senhas para a TV' },
];

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
  <div class="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
    <!-- Marca -->
    <section
      class="relative hidden overflow-hidden bg-brand-600 p-12 text-white lg:flex lg:flex-col lg:justify-between"
    >
      <div class="absolute -right-24 -bottom-24 size-96 rounded-full bg-accent-400/90" aria-hidden="true" />
      <div class="absolute top-1/3 -right-10 size-40 rounded-full bg-brand-500" aria-hidden="true" />

      <div class="relative flex items-center gap-3">
        <BrandMark />
        <span class="font-display text-2xl font-bold">Lanchonete</span>
      </div>

      <div class="relative max-w-md">
        <h1 class="font-display text-5xl leading-tight font-bold">
          Atendimento rápido do pedido <span class="text-accent-400">à entrega.</span>
        </h1>
        <ul class="mt-8 space-y-4">
          <li v-for="f in FEATURES" :key="f.text" class="flex items-center gap-3 text-lg text-brand-50">
            <span class="flex size-10 items-center justify-center rounded-xl bg-white/15">
              <component :is="f.icon" class="size-6" weight="fill" aria-hidden="true" />
            </span>
            {{ f.text }}
          </li>
        </ul>
      </div>

      <p class="relative text-sm text-brand-100">Gestor FastFood</p>
    </section>

    <!-- Formulário -->
    <section class="flex items-center justify-center bg-canvas p-6">
      <div class="w-full max-w-sm">
        <div class="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
          <BrandMark size="lg" class="mb-5 lg:hidden" />
          <h2 class="font-display text-3xl font-bold text-stone-900">Bem-vindo!</h2>
          <p class="mt-1 text-stone-500">Entre com seu usuário para abrir o caixa.</p>
        </div>

        <form class="space-y-4" novalidate @submit.prevent="submit">
          <div>
            <label class="label" for="username">Usuário</label>
            <div class="relative">
              <PhUser
                class="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <input
                id="username"
                v-model="form.username"
                class="input h-12 pl-11 text-base"
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
              <PhLockKey
                class="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <input
                id="password"
                v-model="form.password"
                class="input h-12 pr-12 pl-11 text-base"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <component :is="showPassword ? PhEyeSlash : PhEye" class="size-5" />
              </button>
            </div>
          </div>

          <p
            v-if="error"
            class="rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-700"
            role="alert"
          >
            {{ error }}
          </p>

          <BaseButton
            type="submit"
            size="xl"
            block
            :loading="loading"
            :disabled="!form.username.trim() || !form.password"
          >
            Entrar
          </BaseButton>
        </form>
      </div>
    </section>
  </div>
</template>
