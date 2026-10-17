<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    hint?: string;
    tone?: 'neutral' | 'brand' | 'accent' | 'success' | 'muted';
  }>(),
  { tone: 'neutral', hint: undefined },
);

const ICON_TONES = {
  neutral: 'bg-stone-900 text-white',
  brand: 'bg-brand-600 text-white',
  accent: 'bg-accent-400 text-stone-900',
  success: 'bg-emerald-600 text-white',
  muted: 'bg-stone-200 text-stone-600',
};
</script>

<template>
  <div class="card flex items-center gap-4 p-5">
    <div
      v-if="$slots.icon"
      class="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
      :class="ICON_TONES[tone]"
    >
      <slot name="icon" />
    </div>
    <div class="min-w-0">
      <p class="text-sm font-medium text-stone-500">{{ label }}</p>
      <p class="truncate font-display text-2xl font-bold text-stone-900 tabular-nums">{{ value }}</p>
      <p v-if="hint" class="text-xs text-stone-500">{{ hint }}</p>
    </div>
  </div>
</template>
