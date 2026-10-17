<script setup lang="ts">
import { ROLE_LABELS } from '@fastfood/shared';
import {
  PhArrowSquareOut,
  PhCalculator,
  PhCaretDown,
  PhCookingPot,
  PhHamburger,
  PhKey,
  PhListDashes,
  PhPrinter,
  PhReceipt,
  PhSignOut,
  PhStorefront,
  PhTelevision,
  PhUserCircle,
  PhUsers,
} from '@phosphor-icons/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSettings } from '@/composables/useSettings';
import { useAuthStore } from '@/stores/auth';
import { useOrdersStore } from '@/stores/orders';
import ConnectionIndicator from './ConnectionIndicator.vue';

const auth = useAuthStore();
const orders = useOrdersStore();
const settings = useSettings();
const router = useRouter();

const menuOpen = ref(false);
const menuRoot = ref<HTMLElement | null>(null);

const links = computed(() =>
  [
    { to: '/', label: 'Caixa', icon: PhStorefront },
    { to: '/pedidos', label: 'Pedidos', icon: PhReceipt, badge: orders.countByStatus.PRONTO },
    { to: '/cardapio', label: 'Cardápio', icon: PhListDashes, admin: true },
    { to: '/fechamento', label: 'Fechamento', icon: PhCalculator, admin: true },
    { to: '/usuarios', label: 'Usuários', icon: PhUsers, admin: true },
  ].filter((l) => !l.admin || auth.isAdmin),
);

async function logout() {
  menuOpen.value = false;
  await auth.logout();
  await router.push({ name: 'login' });
}

function onClickOutside(event: MouseEvent) {
  if (!menuRoot.value?.contains(event.target as Node)) menuOpen.value = false;
}
onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>

<template>
  <header class="z-20 border-b border-gray-200 bg-white">
    <div class="flex items-center gap-4 px-4 py-3 sm:px-6">
      <RouterLink to="/" class="flex shrink-0 items-center gap-2 font-bold text-gray-900">
        <PhHamburger class="size-8 text-brand-500" weight="fill" aria-hidden="true" />
        <span class="hidden text-lg sm:inline">Lanchonete</span>
      </RouterLink>

      <nav class="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Principal">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          exact-active-class="!bg-brand-50 !text-brand-700"
        >
          <component :is="link.icon" class="size-5" aria-hidden="true" />
          {{ link.label }}
          <span
            v-if="link.badge"
            class="rounded-full bg-brand-500 px-1.5 text-xs font-bold text-white"
            :aria-label="`${link.badge} pedido(s) pronto(s)`"
          >
            {{ link.badge }}
          </span>
        </RouterLink>
      </nav>

      <div class="flex shrink-0 items-center gap-3">
        <div class="hidden gap-1 md:flex">
          <a
            href="/cozinha"
            target="_blank"
            class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <PhCookingPot class="size-5" aria-hidden="true" /> Cozinha
            <PhArrowSquareOut class="size-3.5 text-gray-400" aria-hidden="true" />
          </a>
          <a
            href="/painel"
            target="_blank"
            class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <PhTelevision class="size-5" aria-hidden="true" /> Painel TV
            <PhArrowSquareOut class="size-3.5 text-gray-400" aria-hidden="true" />
          </a>
        </div>

        <ConnectionIndicator class="hidden lg:inline-flex" />

        <div ref="menuRoot" class="relative">
          <button
            type="button"
            class="flex items-center gap-2 rounded-full border border-gray-200 py-1 pr-2 pl-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
            :aria-expanded="menuOpen"
            aria-haspopup="menu"
            @click="menuOpen = !menuOpen"
          >
            <PhUserCircle class="size-7 text-gray-400" weight="fill" aria-hidden="true" />
            <span class="hidden max-w-32 truncate sm:inline">{{ auth.user?.username }}</span>
            <PhCaretDown class="size-4 text-gray-400" aria-hidden="true" />
          </button>

          <div
            v-if="menuOpen"
            role="menu"
            class="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          >
            <div class="border-b border-gray-100 px-4 py-3">
              <p class="truncate font-semibold text-gray-900">{{ auth.user?.username }}</p>
              <p class="text-xs text-gray-500">{{ auth.user && ROLE_LABELS[auth.user.role] }}</p>
            </div>
            <label
              class="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-gray-50"
            >
              <span class="flex items-center gap-2 text-gray-700">
                <PhPrinter class="size-5 text-gray-400" aria-hidden="true" /> Imprimir cupom automaticamente
              </span>
              <input v-model="settings.autoPrint" type="checkbox" class="size-4 accent-brand-500" />
            </label>
            <RouterLink
              to="/trocar-senha"
              role="menuitem"
              class="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
              @click="menuOpen = false"
            >
              <PhKey class="size-5 text-gray-400" aria-hidden="true" /> Trocar senha
            </RouterLink>
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
              @click="logout"
            >
              <PhSignOut class="size-5" aria-hidden="true" /> Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
