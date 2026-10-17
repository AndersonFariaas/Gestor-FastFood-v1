<script setup lang="ts">
import { PhTray } from '@phosphor-icons/vue';

defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
    <div class="mb-4 flex size-16 items-center justify-center rounded-full bg-stone-100 text-stone-400">
      <slot name="icon">
        <PhTray class="size-8" aria-hidden="true" />
      </slot>
    </div>
    <p class="font-display text-lg font-semibold text-stone-800">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-stone-500">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5"><slot /></div>
  </div>
</template>
