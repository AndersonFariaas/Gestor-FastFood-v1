<script setup lang="ts">
import { PhTray } from '@phosphor-icons/vue';

defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center text-gray-500">
    <slot name="icon">
      <PhTray class="mb-3 size-10 text-gray-300" aria-hidden="true" />
    </slot>
    <p class="font-medium text-gray-700">{{ title }}</p>
    <p v-if="description" class="mt-1 text-sm">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4"><slot /></div>
  </div>
</template>
