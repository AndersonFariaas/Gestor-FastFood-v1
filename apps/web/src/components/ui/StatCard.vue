<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    hint?: string;
    tone?: 'neutral' | 'brand' | 'success' | 'danger';
  }>(),
  { tone: 'neutral', hint: undefined },
);

const ICON_TONES = {
  neutral: 'bg-gray-100 text-gray-500',
  brand: 'bg-brand-50 text-brand-500',
  success: 'bg-green-50 text-green-600',
  danger: 'bg-red-50 text-red-500',
};
</script>

<template>
  <div class="card flex items-center justify-between gap-4 p-5">
    <div class="min-w-0">
      <p class="text-sm font-medium text-gray-500">{{ label }}</p>
      <p class="mt-1 truncate text-2xl font-black text-gray-900 tabular-nums">{{ value }}</p>
      <p v-if="hint" class="mt-0.5 text-xs text-gray-500">{{ hint }}</p>
    </div>
    <div
      v-if="$slots.icon"
      class="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl"
      :class="ICON_TONES[tone]"
    >
      <slot name="icon" />
    </div>
  </div>
</template>
