<script setup lang="ts">
import { PhSpinnerGap } from '@phosphor-icons/vue';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'accent' | 'dark' | 'secondary' | 'danger' | 'success' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false, block: false },
);

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-900/20 hover:bg-brand-700 active:bg-brand-800',
  accent:
    'bg-accent-400 text-stone-900 shadow-sm shadow-accent-600/30 hover:bg-accent-300 active:bg-accent-500',
  dark: 'bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950',
  secondary: 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50 hover:ring-stone-300',
  danger: 'bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50',
  success: 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20 hover:bg-emerald-700',
  ghost: 'text-stone-600 hover:bg-stone-900/5 hover:text-stone-900',
};
const SIZES = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-13 px-5 text-base rounded-xl',
  xl: 'h-16 px-6 text-lg rounded-2xl font-display',
};

const classes = computed(() => [VARIANTS[props.variant], SIZES[props.size], props.block && 'w-full']);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
    class="inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
    :class="classes"
  >
    <PhSpinnerGap v-if="loading" class="size-5 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
