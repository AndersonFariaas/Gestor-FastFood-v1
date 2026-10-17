<script setup lang="ts">
import { PhHamburger } from '@phosphor-icons/vue';

withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' });

const SIZES = {
  sm: 'size-9 rounded-xl [&>svg]:size-6',
  md: 'size-12 rounded-2xl [&>svg]:size-8',
  lg: 'size-20 rounded-3xl [&>svg]:size-12',
};
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center bg-brand-600 text-accent-400 shadow-lg shadow-brand-900/30"
    :class="SIZES[size]"
    aria-hidden="true"
  >
    <PhHamburger weight="fill" />
  </span>
</template>
