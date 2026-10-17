<script setup lang="ts">
import { ROLE_LABELS } from '@fastfood/shared';
import { PhArrowSquareOut, PhKey, PhPrinter, PhSignOut } from '@phosphor-icons/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNavigation } from '@/composables/useNavigation';
import { useSettings } from '@/composables/useSettings';
import { useAuthStore } from '@/stores/auth';

/** `side`: abre à direita (barra lateral). `below`: abre para baixo (barra superior móvel). */
const props = withDefaults(defineProps<{ placement?: 'side' | 'below' }>(), { placement: 'side' });

const auth = useAuthStore();
const settings = useSettings();
const router = useRouter();
const { screens } = useNavigation();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

const initials = computed(() => (auth.user?.username ?? '?').slice(0, 2).toUpperCase());

async function logout() {
  open.value = false;
  await auth.logout();
  await router.push({ name: 'login' });
}

function onClickOutside(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false;
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false;
}
onMounted(() => {
  document.addEventListener('click', onClickOutside);
  document.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex size-11 items-center justify-center rounded-full bg-accent-400 font-display text-sm font-bold text-stone-900 ring-4 ring-white/10 transition hover:ring-white/25"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="`Menu do usuário ${auth.user?.username}`"
      @click="open = !open"
    >
      {{ initials }}
    </button>

    <Transition
      enter-from-class="opacity-0 scale-95"
      leave-to-class="opacity-0 scale-95"
      enter-active-class="transition duration-150"
      leave-active-class="transition duration-100"
    >
      <div
        v-if="open"
        role="menu"
        class="absolute z-50 w-72 overflow-hidden rounded-2xl bg-white text-stone-700 shadow-pop ring-1 ring-stone-900/5"
        :class="
          props.placement === 'side'
            ? 'bottom-0 left-full ml-3 origin-bottom-left'
            : 'top-full right-0 mt-2 origin-top-right'
        "
      >
        <div class="flex items-center gap-3 bg-stone-50 px-4 py-4">
          <span
            class="flex size-10 items-center justify-center rounded-full bg-accent-400 font-display text-sm font-bold text-stone-900"
          >
            {{ initials }}
          </span>
          <div class="min-w-0">
            <p class="truncate font-semibold text-stone-900">{{ auth.user?.username }}</p>
            <p class="text-xs text-stone-500">{{ auth.user && ROLE_LABELS[auth.user.role] }}</p>
          </div>
        </div>

        <label
          class="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-stone-50"
        >
          <span class="flex items-center gap-3">
            <PhPrinter class="size-5 text-stone-400" aria-hidden="true" /> Imprimir comprovante
          </span>
          <span class="relative inline-flex">
            <input v-model="settings.autoPrint" type="checkbox" role="switch" class="peer sr-only" />
            <span class="h-6 w-10 rounded-full bg-stone-300 transition peer-checked:bg-emerald-500" />
            <span
              class="absolute top-1 left-1 size-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
            />
          </span>
        </label>

        <!-- No celular as telas de exibição ficam aqui (a barra inferior mostra só o essencial). -->
        <div v-if="props.placement === 'below'" class="border-t border-stone-100">
          <a
            v-for="s in screens"
            :key="s.to"
            :href="s.to"
            target="_blank"
            role="menuitem"
            class="flex items-center gap-3 px-4 py-3 text-sm hover:bg-stone-50"
          >
            <component :is="s.icon" class="size-5 text-stone-400" aria-hidden="true" /> {{ s.label }}
            <PhArrowSquareOut class="ml-auto size-4 text-stone-300" aria-hidden="true" />
          </a>
        </div>

        <div class="border-t border-stone-100">
          <RouterLink
            to="/trocar-senha"
            role="menuitem"
            class="flex items-center gap-3 px-4 py-3 text-sm hover:bg-stone-50"
            @click="open = false"
          >
            <PhKey class="size-5 text-stone-400" aria-hidden="true" /> Trocar senha
          </RouterLink>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            @click="logout"
          >
            <PhSignOut class="size-5" aria-hidden="true" /> Sair
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
