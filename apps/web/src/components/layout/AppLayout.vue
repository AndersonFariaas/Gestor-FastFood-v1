<script setup lang="ts">
import { useNavigation } from '@/composables/useNavigation';
import AppSidebar from './AppSidebar.vue';
import BrandMark from './BrandMark.vue';
import ConnectionIndicator from './ConnectionIndicator.vue';
import UserMenu from './UserMenu.vue';

const { links } = useNavigation();
</script>

<template>
  <div class="flex h-dvh">
    <AppSidebar />

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Celular/tablet em pé: barra superior + abas inferiores. -->
      <header class="flex items-center justify-between bg-ink px-4 py-2.5 md:hidden">
        <RouterLink to="/" class="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <span class="font-display text-lg font-bold text-white">Lanchonete</span>
        </RouterLink>
        <div class="flex items-center gap-3">
          <ConnectionIndicator dark />
          <UserMenu placement="below" />
        </div>
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto">
        <slot />
      </main>

      <nav
        class="grid border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        :style="{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }"
        aria-label="Principal"
      >
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-stone-500"
          exact-active-class="!text-brand-600"
        >
          <component :is="link.icon" class="size-6" aria-hidden="true" />
          {{ link.label }}
          <span
            v-if="link.badge"
            class="absolute top-1 left-1/2 ml-2 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white"
          >
            {{ link.badge }}
          </span>
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
