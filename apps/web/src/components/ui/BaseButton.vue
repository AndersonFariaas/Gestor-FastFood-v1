<script setup lang="ts">
import { PhSpinnerGap } from '@phosphor-icons/vue';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit';
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
  }>(),
  { variant: 'primary', size: 'md', type: 'button', loading: false, disabled: false, block: false },
);

const VARIANTS = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 focus-visible:ring-brand-500/40',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400/40',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40',
  success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500/40',
  ghost: 'text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-400/40',
};
const SIZES = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3.5 text-base' };

const classes = computed(() => [VARIANTS[props.variant], SIZES[props.size], props.block && 'w-full']);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading"
    class="inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:ring-4 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    :class="classes"
  >
    <PhSpinnerGap v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
