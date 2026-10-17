<script setup lang="ts">
import { useNavigation } from '@/composables/useNavigation';
import { connectionState } from '@/services/realtime';
import BrandMark from './BrandMark.vue';
import UserMenu from './UserMenu.vue';

const { links, screens } = useNavigation();

const itemClass =
  'relative flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-semibold leading-tight transition-colors';
</script>

<template>
  <aside class="z-30 hidden w-24 shrink-0 flex-col items-center bg-ink py-4 text-stone-400 md:flex">
    <RouterLink to="/" aria-label="Início" class="mb-6">
      <BrandMark />
    </RouterLink>

    <nav class="flex w-full flex-1 flex-col gap-1 px-2" aria-label="Principal">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        v-slot="{ isExactActive, href, navigate }"
        :to="link.to"
        custom
      >
        <a
          :href="href"
          :class="[
            itemClass,
            isExactActive
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-950/40'
              : 'hover:bg-white/5 hover:text-white',
          ]"
          :aria-current="isExactActive ? 'page' : undefined"
          @click="navigate"
        >
          <component
            :is="link.icon"
            class="size-6"
            :weight="isExactActive ? 'fill' : 'regular'"
            aria-hidden="true"
          />
          {{ link.label }}
          <span
            v-if="link.badge"
            class="absolute top-1.5 right-3 flex min-w-5 items-center justify-center rounded-full bg-accent-400 px-1 text-[11px] font-bold text-stone-900"
            :aria-label="`${link.badge} pedido(s) pronto(s)`"
          >
            {{ link.badge }}
          </span>
        </a>
      </RouterLink>

      <div class="mx-3 my-3 border-t border-white/10" role="separator" />
      <p class="mb-1 text-center text-[10px] font-semibold tracking-wider text-stone-500 uppercase">Telas</p>
      <a
        v-for="s in screens"
        :key="s.to"
        :href="s.to"
        target="_blank"
        :class="[itemClass, 'hover:bg-white/5 hover:text-white']"
        :title="`Abrir ${s.label} em nova aba`"
      >
        <component :is="s.icon" class="size-6" aria-hidden="true" />
        {{ s.label }}
      </a>
    </nav>

    <div class="mt-4 flex flex-col items-center gap-4">
      <span
        class="size-2.5 rounded-full"
        :class="{
          'bg-emerald-400': connectionState === 'online',
          'animate-pulse bg-accent-400': connectionState === 'connecting',
          'bg-stone-600': connectionState === 'offline',
        }"
        role="status"
        :title="connectionState === 'online' ? 'Conectado em tempo real' : 'Reconectando...'"
        :aria-label="connectionState === 'online' ? 'Conectado em tempo real' : 'Reconectando'"
      />
      <UserMenu placement="side" />
    </div>
  </aside>
</template>
